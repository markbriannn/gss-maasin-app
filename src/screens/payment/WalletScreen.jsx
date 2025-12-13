import {useState, useEffect} from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import paymentService from '../../services/paymentService';
import {doc, updateDoc, getDoc} from 'firebase/firestore';
import {db} from '../../config/firebase';

/**
 * WalletScreen - Provider earnings and payout management with GCash/Maya
 */
export const WalletScreen = () => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    available: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('gcash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchEarningsData();
    fetchPayoutAccount();
    fetchPayoutHistory();
  }, []);

  const fetchPayoutHistory = async () => {
    setLoadingHistory(true);
    try {
      const providerId = user?.id || user?.uid;
      if (!providerId) {
        setLoadingHistory(false);
        return;
      }

      const result = await Promise.race([
        paymentService.getPayoutHistory(providerId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      
      if (result.success) {
        setPayoutHistory(result.payouts || []);
      }
    } catch (error) {
      console.log('Error fetching payout history:', error.message);
      setPayoutHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPayoutAccount = async () => {
    try {
      const providerId = user?.id || user?.uid;
      if (!providerId) return;

      const userDoc = await getDoc(doc(db, 'users', providerId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.payoutAccount) {
          setPayoutAccount(data.payoutAccount);
        }
      }
    } catch (error) {
      console.error('Error fetching payout account:', error);
    }
  };

  const fetchEarningsData = async () => {
    try {
      setLoading(true);

      const providerId = user?.id || user?.uid;
      if (!providerId) {
        setEarnings({total: 0, thisMonth: 0, available: 0, pending: 0});
        setLoading(false);
        return;
      }

      // Try backend first with timeout, fallback to local calculation
      try {
        const balanceResult = await Promise.race([
          paymentService.getProviderBalance(providerId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        
        if (balanceResult.success) {
          setEarnings({
            total: balanceResult.totalEarnings || 0,
            thisMonth: balanceResult.totalEarnings || 0,
            available: balanceResult.availableBalance || 0,
            pending: balanceResult.pendingBalance || 0,
          });
          return;
        }
      } catch (backendError) {
        console.log('Backend unavailable, using local calculation:', backendError.message);
      }

      // Fallback to local calculation from Firestore
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const result = await paymentService.calculateEarnings(providerId, startOfMonth, now);
      
      setEarnings({
        total: user?.totalEarnings || result.earnings || 0,
        thisMonth: result.earnings || 0,
        available: Math.max((user?.totalEarnings || result.earnings || 0) - (user?.pendingPayout || 0), 0),
        pending: user?.pendingPayout || 0,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      // Set default values on error
      setEarnings({
        total: user?.totalEarnings || 0,
        thisMonth: 0,
        available: user?.availableBalance || 0,
        pending: user?.pendingPayout || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEarningsData();
    await fetchPayoutAccount();
    setRefreshing(false);
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
      const providerId = user?.id || user?.uid;
      await updateDoc(doc(db, 'users', providerId), {
        payoutAccount: {
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

  const handleRequestPayout = async () => {
    if (!payoutAccount) {
      Alert.alert('Setup Required', 'Please setup your GCash or Maya account first.', [
        {text: 'Cancel'},
        {text: 'Setup Now', onPress: () => setShowSetupModal(true)},
      ]);
      return;
    }

    if (earnings.available < 100) {
      Alert.alert(
        'Minimum Amount',
        `Minimum payout is ₱100. Your available balance is ₱${earnings.available.toFixed(2)}`,
      );
      return;
    }

    const methodName = payoutAccount.method === 'gcash' ? 'GCash' : 'Maya';
    const maskedNumber = payoutAccount.accountNumber.slice(-4).padStart(payoutAccount.accountNumber.length, '*');

    Alert.alert(
      'Request Payout',
      `Request payout of ₱${earnings.available.toFixed(2)} to your ${methodName} account (${maskedNumber})?`,
      [
        {text: 'Cancel'},
        {
          text: 'Request',
          onPress: async () => {
            try {
              const result = await paymentService.processProviderPayout(
                user?.id || user?.uid,
                earnings.available,
                [],
              );

              if (result.success) {
                Alert.alert(
                  'Payout Requested',
                  `Your payout of ₱${earnings.available.toFixed(2)} has been submitted. You will receive it in your ${methodName} account within 24 hours.`,
                );
                fetchEarningsData();
              } else {
                Alert.alert('Error', result.error || 'Failed to process payout');
              }
            } catch (error) {
              console.error('Error requesting payout:', error);
              Alert.alert('Error', 'Failed to process payout');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? theme.colors.background : '#F3F4F6'}}>
        <ActivityIndicator size="large" color="#00B14F" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: isDark ? theme.colors.background : '#F3F4F6'}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />}>
      {/* Header */}
      <LinearGradient
        colors={['#00B14F', '#00963F']}
        style={{paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20}}>
        <Text style={{fontSize: 24, fontWeight: '700', color: '#FFFFFF'}}>My Wallet</Text>
        <Text style={{fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4}}>
          Manage your earnings & payouts
        </Text>
      </LinearGradient>

      {/* Total Earnings Card */}
      <View style={{marginHorizontal: 20, marginTop: -20}}>
        <View
          style={{
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}>
          <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Available Balance</Text>
          <Text style={{fontSize: 36, fontWeight: '700', color: '#00B14F', marginTop: 4}}>
            ₱{earnings.available.toFixed(2)}
          </Text>

          <View style={{flexDirection: 'row', marginTop: 16, gap: 12}}>
            <View style={{flex: 1, backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderRadius: 12, padding: 12}}>
              <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>This Month</Text>
              <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                ₱{earnings.thisMonth.toFixed(2)}
              </Text>
            </View>
            <View style={{flex: 1, backgroundColor: isDark ? '#78350F' : '#FEF3C7', borderRadius: 12, padding: 12}}>
              <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Pending</Text>
              <Text style={{fontSize: 18, fontWeight: '600', color: '#D97706'}}>
                ₱{earnings.pending.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Payout Account Section */}
      <View style={{marginHorizontal: 20, marginTop: 20}}>
        <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 12}}>
          Payout Account
        </Text>

        {payoutAccount ? (
          <View
            style={{
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
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
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                {payoutAccount.method === 'gcash' ? 'GCash' : 'Maya'}
              </Text>
              <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
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
              <Icon name="pencil" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: isDark ? theme.colors.border : '#E5E7EB',
              borderStyle: 'dashed',
            }}
            onPress={() => setShowSetupModal(true)}>
            <Icon name="add-circle-outline" size={40} color="#00B14F" />
            <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginTop: 8}}>
              Setup Payout Account
            </Text>
            <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 4}}>
              Add your GCash or Maya to receive payouts
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Request Payout Button */}
      <View style={{marginHorizontal: 20, marginTop: 20}}>
        <TouchableOpacity
          style={{
            backgroundColor: earnings.available >= 100 ? '#00B14F' : '#D1D5DB',
            borderRadius: 12,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={handleRequestPayout}
          disabled={earnings.available < 100}>
          <Icon name="send" size={20} color="#FFFFFF" />
          <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginLeft: 8}}>
            Request Payout
          </Text>
        </TouchableOpacity>
        {earnings.available < 100 && (
          <Text style={{fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8}}>
            Minimum payout amount is ₱100
          </Text>
        )}
      </View>

      {/* Payout History */}
      <View style={{marginHorizontal: 20, marginTop: 20}}>
        <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 12}}>
          Payout History
        </Text>
        
        {loadingHistory ? (
          <View style={{backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center'}}>
            <ActivityIndicator color="#00B14F" />
          </View>
        ) : payoutHistory.length === 0 ? (
          <View style={{backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center'}}>
            <Icon name="wallet-outline" size={40} color="#D1D5DB" />
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 8}}>
              No payout history yet
            </Text>
          </View>
        ) : (
          <View style={{backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderRadius: 12, overflow: 'hidden'}}>
            {payoutHistory.slice(0, 5).map((payout, index) => (
              <View
                key={payout.id || index}
                style={{
                  padding: 14,
                  borderBottomWidth: index < Math.min(payoutHistory.length, 5) - 1 ? 1 : 0,
                  borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: payout.status === 'completed' ? '#D1FAE5' : 
                                   payout.status === 'approved' ? '#DBEAFE' : '#FEF3C7',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Icon 
                    name={payout.status === 'completed' ? 'checkmark-circle' : 
                          payout.status === 'approved' ? 'time' : 'hourglass'} 
                    size={20} 
                    color={payout.status === 'completed' ? '#10B981' : 
                           payout.status === 'approved' ? '#3B82F6' : '#F59E0B'} 
                  />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={{fontSize: 15, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                    ₱{(payout.amount || 0).toLocaleString()}
                  </Text>
                  <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
                    {payout.accountMethod?.toUpperCase()} • {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : 'Recently'}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: payout.status === 'completed' ? '#D1FAE5' : 
                                   payout.status === 'approved' ? '#DBEAFE' : '#FEF3C7',
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: payout.status === 'completed' ? '#059669' : 
                           payout.status === 'approved' ? '#2563EB' : '#D97706',
                  }}>
                    {payout.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* How it works */}
      <View style={{marginHorizontal: 20, marginTop: 24, marginBottom: 40}}>
        <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 12}}>
          How Payouts Work
        </Text>
        <View style={{backgroundColor: isDark ? theme.colors.card : '#FFFFFF', borderRadius: 12, padding: 16}}>
          {[
            {icon: 'checkmark-circle', text: 'Complete jobs and earn money', color: '#00B14F'},
            {icon: 'cut', text: '5% service fee is deducted', color: '#F59E0B'},
            {icon: 'wallet', text: 'Request payout (min ₱100)', color: '#3B82F6'},
            {icon: 'flash', text: 'Receive instantly or within 24 hours', color: '#8B5CF6'},
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: index < 3 ? 1 : 0,
                borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
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
              <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginLeft: 12, flex: 1}}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

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
              Setup Payout Account
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
                  backgroundColor: '#00B14F',
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
    </ScrollView>
  );
};

export default WalletScreen;
