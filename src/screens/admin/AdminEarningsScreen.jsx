import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';
import {globalStyles} from '../../css/globalStyles';
import {doc, updateDoc, getDoc, collection, onSnapshot, addDoc, serverTimestamp} from 'firebase/firestore';
import {db} from '../../config/firebase';
import paymentService from '../../services/paymentService';

const AdminEarningsScreen = ({navigation}) => {
  const {user} = useAuth();
  const [earnings, setEarnings] = useState({
    totalSystemFee: 0,
    availableBalance: 0,
    pendingWithdrawal: 0,
    totalWithdrawn: 0,
    completedJobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('gcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [activeTab, setActiveTab] = useState('earnings'); // 'earnings' or 'payouts'

  useEffect(() => {
    fetchAdminPayoutAccount();
    fetchPendingPayouts();
    const unsubscribe = setupEarningsListener();
    return () => unsubscribe && unsubscribe();
  }, []);

  const fetchPendingPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const result = await paymentService.getAdminPayouts('pending');
      if (result.success) {
        setPendingPayouts(result.payouts || []);
      }
    } catch (error) {
      console.error('Error fetching pending payouts:', error);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const handleApprovePayout = async (payout) => {
    Alert.alert(
      'Approve Payout',
      `Approve payout of ₱${payout.amount.toLocaleString()} to ${payout.providerName}?\n\nAccount: ${payout.accountMethod?.toUpperCase()} - ${payout.accountNumber}`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const result = await paymentService.approvePayout(payout.id, user?.uid || user?.id);
              if (result.success) {
                Alert.alert('Success', 'Payout approved successfully');
                fetchPendingPayouts();
              } else {
                Alert.alert('Error', result.error || 'Failed to approve payout');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve payout');
            }
          },
        },
      ]
    );
  };

  const fetchAdminPayoutAccount = async () => {
    try {
      const adminId = user?.id || user?.uid;
      if (!adminId) return;

      const userDoc = await getDoc(doc(db, 'users', adminId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.adminPayoutAccount) {
          setPayoutAccount(data.adminPayoutAccount);
        }
      }
    } catch (error) {
      console.error('Error fetching admin payout account:', error);
    }
  };

  const setupEarningsListener = () => {
    // Listen to bookings to calculate system fees in real-time
    const unsubscribe = onSnapshot(collection(db, 'bookings'), async (snapshot) => {
      let totalSystemFee = 0;
      let completedJobs = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'completed') {
          completedJobs++;
          const amount = data.totalAmount || data.fixedPrice || data.price || 0;
          const systemFee = data.systemFee || (amount * 0.05);
          totalSystemFee += systemFee;
        }
      });

      // Get admin withdrawal data
      const adminId = user?.id || user?.uid;
      let totalWithdrawn = 0;
      let pendingWithdrawal = 0;

      if (adminId) {
        const adminDoc = await getDoc(doc(db, 'users', adminId));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          totalWithdrawn = adminData.totalWithdrawn || 0;
          pendingWithdrawal = adminData.pendingWithdrawal || 0;
        }
      }

      setEarnings({
        totalSystemFee,
        availableBalance: Math.max(totalSystemFee - totalWithdrawn - pendingWithdrawal, 0),
        pendingWithdrawal,
        totalWithdrawn,
        completedJobs,
      });

      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminPayoutAccount();
  };


  const handleSavePayoutAccount = async () => {
    if (!accountNumber || accountNumber.length < 10) {
      Alert.alert('Invalid', 'Please enter a valid account number');
      return;
    }
    if (!accountName || accountName.length < 2) {
      Alert.alert('Invalid', 'Please enter the account holder name');
      return;
    }

    setSavingAccount(true);
    try {
      const adminId = user?.id || user?.uid;
      await updateDoc(doc(db, 'users', adminId), {
        adminPayoutAccount: {
          method: selectedMethod,
          accountNumber: accountNumber,
          accountName: accountName,
          updatedAt: new Date(),
        },
      });

      setPayoutAccount({
        method: selectedMethod,
        accountNumber: accountNumber,
        accountName: accountName,
      });
      setShowSetupModal(false);
      Alert.alert('Success', 'Payout account saved successfully!');
    } catch (error) {
      console.error('Error saving payout account:', error);
      Alert.alert('Error', 'Failed to save payout account');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!payoutAccount) {
      Alert.alert('Setup Required', 'Please setup your GCash or Maya account first.', [
        {text: 'Cancel'},
        {text: 'Setup Now', onPress: () => setShowSetupModal(true)},
      ]);
      return;
    }

    if (earnings.availableBalance < 100) {
      Alert.alert(
        'Minimum Amount',
        `Minimum withdrawal is ₱100. Your available balance is ₱${earnings.availableBalance.toFixed(2)}`,
      );
      return;
    }

    const methodName = payoutAccount.method === 'gcash' ? 'GCash' : 'Maya';
    const maskedNumber = payoutAccount.accountNumber.slice(-4).padStart(payoutAccount.accountNumber.length, '*');

    Alert.alert(
      'Request Withdrawal',
      `Withdraw ₱${earnings.availableBalance.toFixed(2)} to your ${methodName} account (${maskedNumber})?`,
      [
        {text: 'Cancel'},
        {
          text: 'Withdraw',
          onPress: async () => {
            try {
              const adminId = user?.id || user?.uid;
              const withdrawalAmount = earnings.availableBalance;

              // Create withdrawal record
              await addDoc(collection(db, 'adminWithdrawals'), {
                adminId,
                amount: withdrawalAmount,
                method: payoutAccount.method,
                accountNumber: payoutAccount.accountNumber,
                accountName: payoutAccount.accountName,
                status: 'processing',
                createdAt: serverTimestamp(),
              });

              // Update admin's pending withdrawal
              await updateDoc(doc(db, 'users', adminId), {
                pendingWithdrawal: (earnings.pendingWithdrawal || 0) + withdrawalAmount,
              });

              Alert.alert(
                'Withdrawal Requested',
                `Your withdrawal of ₱${withdrawalAmount.toFixed(2)} has been submitted. You will receive it in your ${methodName} account within 24 hours.`,
              );
            } catch (error) {
              console.error('Error requesting withdrawal:', error);
              Alert.alert('Error', 'Failed to process withdrawal');
            }
          },
        },
      ],
    );
  };

  const formatCurrency = (amount) => {
    return `₱${(amount || 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F3F4F6'}} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />}>
        {/* Header */}
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          style={{paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={{marginRight: 12}}>
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text style={{fontSize: 24, fontWeight: '700', color: '#FFFFFF'}}>Admin Earnings</Text>
              <Text style={{fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4}}>
                System Fee Collection (5%)
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Balance Card */}
        <View style={{marginHorizontal: 20, marginTop: -20}}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            }}>
            <Text style={{fontSize: 14, color: '#6B7280'}}>Available Balance</Text>
            <Text style={{fontSize: 36, fontWeight: '700', color: '#F59E0B', marginTop: 4}}>
              {formatCurrency(earnings.availableBalance)}
            </Text>

            <View style={{flexDirection: 'row', marginTop: 16, gap: 12}}>
              <View style={{flex: 1, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12}}>
                <Text style={{fontSize: 12, color: '#6B7280'}}>Total Collected</Text>
                <Text style={{fontSize: 18, fontWeight: '600', color: '#1F2937'}}>
                  {formatCurrency(earnings.totalSystemFee)}
                </Text>
              </View>
              <View style={{flex: 1, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12}}>
                <Text style={{fontSize: 12, color: '#6B7280'}}>Withdrawn</Text>
                <Text style={{fontSize: 18, fontWeight: '600', color: '#10B981'}}>
                  {formatCurrency(earnings.totalWithdrawn)}
                </Text>
              </View>
            </View>

            {earnings.pendingWithdrawal > 0 && (
              <View style={{marginTop: 12, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10}}>
                <Text style={{fontSize: 13, color: '#D97706', textAlign: 'center'}}>
                  Pending Withdrawal: {formatCurrency(earnings.pendingWithdrawal)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={{marginHorizontal: 20, marginTop: 20}}>
          <View style={{backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, flexDirection: 'row'}}>
            <View style={{flex: 1, alignItems: 'center'}}>
              <Icon name="checkmark-done-circle" size={28} color="#10B981" />
              <Text style={{fontSize: 24, fontWeight: '700', color: '#1F2937', marginTop: 4}}>
                {earnings.completedJobs}
              </Text>
              <Text style={{fontSize: 12, color: '#6B7280'}}>Completed Jobs</Text>
            </View>
            <View style={{width: 1, backgroundColor: '#E5E7EB'}} />
            <View style={{flex: 1, alignItems: 'center'}}>
              <Icon name="calculator" size={28} color="#F59E0B" />
              <Text style={{fontSize: 24, fontWeight: '700', color: '#1F2937', marginTop: 4}}>5%</Text>
              <Text style={{fontSize: 12, color: '#6B7280'}}>Service Fee</Text>
            </View>
          </View>
        </View>


        {/* Payout Account Section */}
        <View style={{marginHorizontal: 20, marginTop: 20}}>
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12}}>
            Withdrawal Account
          </Text>

          {payoutAccount ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: payoutAccount.method === 'gcash' ? '#007DFE' : '#00D66C',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Icon name="wallet" size={24} color="#FFFFFF" />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
                  {payoutAccount.method === 'gcash' ? 'GCash' : 'Maya'}
                </Text>
                <Text style={{fontSize: 14, color: '#6B7280'}}>
                  {payoutAccount.accountNumber.slice(-4).padStart(payoutAccount.accountNumber.length, '*')}
                </Text>
                <Text style={{fontSize: 12, color: '#9CA3AF'}}>{payoutAccount.accountName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedMethod(payoutAccount.method);
                  setAccountNumber(payoutAccount.accountNumber);
                  setAccountName(payoutAccount.accountName);
                  setShowSetupModal(true);
                }}>
                <Icon name="pencil" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#E5E7EB',
                borderStyle: 'dashed',
              }}
              onPress={() => setShowSetupModal(true)}>
              <Icon name="add-circle-outline" size={40} color="#F59E0B" />
              <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 8}}>
                Setup Withdrawal Account
              </Text>
              <Text style={{fontSize: 13, color: '#6B7280', marginTop: 4}}>
                Add your GCash or Maya to withdraw earnings
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Withdraw Button */}
        <View style={{marginHorizontal: 20, marginTop: 20}}>
          <TouchableOpacity
            style={{
              backgroundColor: earnings.availableBalance >= 100 ? '#F59E0B' : '#D1D5DB',
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleRequestWithdrawal}
            disabled={earnings.availableBalance < 100}>
            <Icon name="cash" size={20} color="#FFFFFF" />
            <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginLeft: 8}}>
              Withdraw Earnings
            </Text>
          </TouchableOpacity>
          {earnings.availableBalance < 100 && (
            <Text style={{fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8}}>
              Minimum withdrawal amount is ₱100
            </Text>
          )}
        </View>

        {/* Pending Provider Payouts */}
        <View style={{marginHorizontal: 20, marginTop: 24}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
            <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
              Provider Payout Requests
            </Text>
            <TouchableOpacity onPress={fetchPendingPayouts}>
              <Icon name="refresh" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loadingPayouts ? (
            <View style={{backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center'}}>
              <ActivityIndicator color="#F59E0B" />
            </View>
          ) : pendingPayouts.length === 0 ? (
            <View style={{backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center'}}>
              <Icon name="checkmark-circle" size={40} color="#10B981" />
              <Text style={{fontSize: 14, color: '#6B7280', marginTop: 8}}>No pending payout requests</Text>
            </View>
          ) : (
            <View style={{backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden'}}>
              {pendingPayouts.map((payout, index) => (
                <View
                  key={payout.id}
                  style={{
                    padding: 16,
                    borderBottomWidth: index < pendingPayouts.length - 1 ? 1 : 0,
                    borderBottomColor: '#F3F4F6',
                  }}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <View style={{flex: 1}}>
                      <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937'}}>
                        {payout.providerName || 'Provider'}
                      </Text>
                      <Text style={{fontSize: 13, color: '#6B7280', marginTop: 2}}>
                        {payout.accountMethod?.toUpperCase()} - {payout.accountNumber}
                      </Text>
                      <Text style={{fontSize: 12, color: '#9CA3AF', marginTop: 2}}>
                        {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : 'Recently'}
                      </Text>
                    </View>
                    <Text style={{fontSize: 18, fontWeight: '700', color: '#F59E0B'}}>
                      ₱{(payout.amount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#10B981',
                      borderRadius: 8,
                      paddingVertical: 10,
                      marginTop: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => handleApprovePayout(payout)}>
                    <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 14}}>Approve Payout</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* How it works */}
        <View style={{marginHorizontal: 20, marginTop: 24, marginBottom: 40}}>
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12}}>
            How System Fees Work
          </Text>
          <View style={{backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16}}>
            {[
              {icon: 'briefcase', text: 'Provider completes a job', color: '#3B82F6'},
              {icon: 'cut', text: '5% service fee is collected', color: '#F59E0B'},
              {icon: 'wallet', text: 'Fee added to your balance', color: '#10B981'},
              {icon: 'flash', text: 'Withdraw anytime (min ₱100)', color: '#8B5CF6'},
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: index < 3 ? 1 : 0,
                  borderBottomColor: '#F3F4F6',
                }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: `${item.color}20`,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={{fontSize: 14, color: '#4B5563', marginLeft: 12, flex: 1}}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Setup Payout Account Modal */}
      <Modal visible={showSetupModal} animationType="slide" transparent>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 40,
            }}>
            <View style={{alignItems: 'center', marginBottom: 20}}>
              <View style={{width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2}} />
            </View>

            <Text style={{fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 20}}>
              Setup Withdrawal Account
            </Text>

            {/* Payment Method Selection */}
            <Text style={{fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8}}>
              Select Payment Method
            </Text>
            <View style={{flexDirection: 'row', gap: 12, marginBottom: 20}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedMethod === 'gcash' ? '#007DFE' : '#E5E7EB',
                  backgroundColor: selectedMethod === 'gcash' ? '#EFF6FF' : '#FFFFFF',
                  alignItems: 'center',
                }}
                onPress={() => setSelectedMethod('gcash')}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#007DFE',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                  <Text style={{fontSize: 16, fontWeight: '700', color: '#FFFFFF'}}>G</Text>
                </View>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937'}}>GCash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedMethod === 'maya' ? '#00D66C' : '#E5E7EB',
                  backgroundColor: selectedMethod === 'maya' ? '#F0FDF4' : '#FFFFFF',
                  alignItems: 'center',
                }}
                onPress={() => setSelectedMethod('maya')}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#00D66C',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                  <Text style={{fontSize: 16, fontWeight: '700', color: '#FFFFFF'}}>M</Text>
                </View>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937'}}>Maya</Text>
              </TouchableOpacity>
            </View>

            {/* Account Number */}
            <Text style={{fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8}}>
              {selectedMethod === 'gcash' ? 'GCash' : 'Maya'} Number
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginBottom: 16,
              }}
              placeholder="09XX XXX XXXX"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={accountNumber}
              onChangeText={setAccountNumber}
              maxLength={11}
            />

            {/* Account Name */}
            <Text style={{fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8}}>
              Account Holder Name
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginBottom: 24,
              }}
              placeholder="Juan Dela Cruz"
              placeholderTextColor="#9CA3AF"
              value={accountName}
              onChangeText={setAccountName}
            />

            {/* Buttons */}
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                }}
                onPress={() => setShowSetupModal(false)}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#6B7280'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#F59E0B',
                  alignItems: 'center',
                }}
                onPress={handleSavePayoutAccount}
                disabled={savingAccount}>
                {savingAccount ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminEarningsScreen;
