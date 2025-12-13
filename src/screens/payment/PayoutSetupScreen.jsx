import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {db} from '../../config/firebase';
import {doc, updateDoc, getDoc} from 'firebase/firestore';

/**
 * PayoutSetupScreen - Setup GCash/Maya for provider payouts
 */
export const PayoutSetupScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('gcash');
  const [formData, setFormData] = useState({
    accountName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
    accountNumber: '',
  });
  const [existingPayout, setExistingPayout] = useState(null);

  useEffect(() => {
    loadExistingPayoutMethod();
  }, []);

  const loadExistingPayoutMethod = async () => {
    try {
      const userId = user?.uid || user?.id;
      if (userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.payoutMethod) {
            setExistingPayout(data.payoutMethod);
            setSelectedMethod(data.payoutMethod.type || 'gcash');
            setFormData({
              accountName: data.payoutMethod.accountName || '',
              accountNumber: data.payoutMethod.accountNumber || '',
            });
            setStep(3);
          }
        }
      }
    } catch (error) {
      console.error('Error loading payout method:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSavePayoutMethod = async () => {
    if (!formData.accountName.trim()) {
      Alert.alert('Required', 'Please enter the account holder name');
      return;
    }
    if (!formData.accountNumber.trim() || formData.accountNumber.length < 10) {
      Alert.alert('Required', 'Please enter a valid mobile number (e.g., 09171234567)');
      return;
    }

    try {
      setLoading(true);
      const userId = user?.uid || user?.id;
      
      const payoutMethod = {
        type: selectedMethod,
        accountName: formData.accountName.trim(),
        accountNumber: formData.accountNumber.trim(),
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'users', userId), {
        payoutMethod: payoutMethod,
      });

      setExistingPayout(payoutMethod);
      setStep(3);
      Alert.alert('Success', 'Payout method saved successfully!');
    } catch (error) {
      console.error('Error saving payout method:', error);
      Alert.alert('Error', 'Failed to save payout method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayout = () => {
    setStep(2);
  };

  const colors = theme.colors;

  if (loadingData) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: isDark ? colors.background : '#FFFFFF', justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#00B14F" />
      </SafeAreaView>
    );
  }


  // Step 1: Select Payment Method
  if (step === 1) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: isDark ? colors.background : '#FFFFFF'}}>
        <ScrollView contentContainerStyle={{padding: 20}}>
          {/* Header */}
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 24}}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 16}}>
              <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : '#1F2937'} />
            </TouchableOpacity>
            <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? colors.text : '#1F2937'}}>
              Payout Setup
            </Text>
          </View>

          {/* Icon */}
          <View style={{alignItems: 'center', marginBottom: 24}}>
            <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center'}}>
              <Ionicons name="wallet" size={40} color="#00B14F" />
            </View>
          </View>

          <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? colors.text : '#1F2937', textAlign: 'center', marginBottom: 8}}>
            Choose Payout Method
          </Text>
          <Text style={{fontSize: 14, color: isDark ? colors.textSecondary : '#6B7280', textAlign: 'center', marginBottom: 24}}>
            Select how you want to receive your earnings
          </Text>

          {/* GCash Option */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: selectedMethod === 'gcash' ? '#D1FAE5' : (isDark ? colors.card : '#F9FAFB'),
              borderRadius: 12,
              borderWidth: 2,
              borderColor: selectedMethod === 'gcash' ? '#00B14F' : (isDark ? colors.border : '#E5E7EB'),
              marginBottom: 12,
            }}
            onPress={() => setSelectedMethod('gcash')}>
            <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
              <Text style={{fontSize: 12, fontWeight: '700', color: '#FFFFFF'}}>G</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? colors.text : '#1F2937'}}>GCash</Text>
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280'}}>Instant transfer to your GCash wallet</Text>
            </View>
            {selectedMethod === 'gcash' && (
              <Ionicons name="checkmark-circle" size={24} color="#00B14F" />
            )}
          </TouchableOpacity>

          {/* Maya Option */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: selectedMethod === 'maya' ? '#D1FAE5' : (isDark ? colors.card : '#F9FAFB'),
              borderRadius: 12,
              borderWidth: 2,
              borderColor: selectedMethod === 'maya' ? '#00B14F' : (isDark ? colors.border : '#E5E7EB'),
              marginBottom: 24,
            }}
            onPress={() => setSelectedMethod('maya')}>
            <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#00D26A', justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
              <Text style={{fontSize: 12, fontWeight: '700', color: '#FFFFFF'}}>M</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? colors.text : '#1F2937'}}>Maya</Text>
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280'}}>Instant transfer to your Maya wallet</Text>
            </View>
            {selectedMethod === 'maya' && (
              <Ionicons name="checkmark-circle" size={24} color="#00B14F" />
            )}
          </TouchableOpacity>

          {/* Benefits */}
          <View style={{backgroundColor: isDark ? colors.card : '#F0FDF4', padding: 16, borderRadius: 12, marginBottom: 24}}>
            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? colors.text : '#1F2937', marginBottom: 12}}>Benefits</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
              <Ionicons name="checkmark-circle" size={18} color="#00B14F" />
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280', marginLeft: 8}}>Instant or within 24 hours transfer</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
              <Ionicons name="checkmark-circle" size={18} color="#00B14F" />
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280', marginLeft: 8}}>No withdrawal fees</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="checkmark-circle" size={18} color="#00B14F" />
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280', marginLeft: 8}}>Secure and reliable</Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={{backgroundColor: '#00B14F', paddingVertical: 16, borderRadius: 12, alignItems: 'center'}}
            onPress={() => setStep(2)}>
            <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2: Enter Account Details
  if (step === 2) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: isDark ? colors.background : '#FFFFFF'}}>
        <ScrollView contentContainerStyle={{padding: 20}}>
          {/* Header */}
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 24}}>
            <TouchableOpacity onPress={() => setStep(1)} style={{marginRight: 16}}>
              <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : '#1F2937'} />
            </TouchableOpacity>
            <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? colors.text : '#1F2937'}}>
              {selectedMethod === 'gcash' ? 'GCash' : 'Maya'} Details
            </Text>
          </View>

          {/* Method Icon */}
          <View style={{alignItems: 'center', marginBottom: 24}}>
            <View style={{
              width: 64, 
              height: 64, 
              borderRadius: 32, 
              backgroundColor: selectedMethod === 'gcash' ? '#0066FF' : '#00D26A', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}>
              <Text style={{fontSize: 20, fontWeight: '700', color: '#FFFFFF'}}>
                {selectedMethod === 'gcash' ? 'G' : 'M'}
              </Text>
            </View>
          </View>

          {/* Account Name */}
          <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? colors.text : '#1F2937', marginBottom: 8}}>
            Account Holder Name
          </Text>
          <TextInput
            style={{
              backgroundColor: isDark ? colors.card : '#F9FAFB',
              borderWidth: 1,
              borderColor: isDark ? colors.border : '#E5E7EB',
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              color: isDark ? colors.text : '#1F2937',
              marginBottom: 16,
            }}
            placeholder="Enter full name as registered"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={formData.accountName}
            onChangeText={(text) => setFormData({...formData, accountName: text})}
          />

          {/* Mobile Number */}
          <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? colors.text : '#1F2937', marginBottom: 8}}>
            {selectedMethod === 'gcash' ? 'GCash' : 'Maya'} Mobile Number
          </Text>
          <TextInput
            style={{
              backgroundColor: isDark ? colors.card : '#F9FAFB',
              borderWidth: 1,
              borderColor: isDark ? colors.border : '#E5E7EB',
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              color: isDark ? colors.text : '#1F2937',
              marginBottom: 24,
            }}
            placeholder="e.g., 09171234567"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={formData.accountNumber}
            onChangeText={(text) => setFormData({...formData, accountNumber: text.replace(/[^0-9]/g, '')})}
            keyboardType="phone-pad"
            maxLength={11}
          />

          {/* Info Box */}
          <View style={{
            backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
            padding: 16,
            borderRadius: 12,
            flexDirection: 'row',
            marginBottom: 24,
          }}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={{fontSize: 13, color: isDark ? '#93C5FD' : '#1E40AF', marginLeft: 8, flex: 1}}>
              Make sure the name matches your {selectedMethod === 'gcash' ? 'GCash' : 'Maya'} registered name to avoid payout issues.
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{backgroundColor: '#00B14F', paddingVertical: 16, borderRadius: 12, alignItems: 'center'}}
            onPress={handleSavePayoutMethod}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>Save Payout Method</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3: Success / View Existing
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: isDark ? colors.background : '#FFFFFF'}}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        {/* Header */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 24}}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 16}}>
            <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : '#1F2937'} />
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? colors.text : '#1F2937'}}>
            Payout Method
          </Text>
        </View>

        {/* Success Icon */}
        <View style={{alignItems: 'center', marginBottom: 24}}>
          <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center'}}>
            <Ionicons name="checkmark-circle" size={50} color="#00B14F" />
          </View>
        </View>

        <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? colors.text : '#1F2937', textAlign: 'center', marginBottom: 24}}>
          Payout Method Connected
        </Text>

        {/* Current Method Card */}
        <View style={{
          backgroundColor: isDark ? colors.card : '#F9FAFB',
          padding: 20,
          borderRadius: 16,
          marginBottom: 24,
        }}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <View style={{
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              backgroundColor: existingPayout?.type === 'gcash' ? '#0066FF' : '#00D26A', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginRight: 16,
            }}>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#FFFFFF'}}>
                {existingPayout?.type === 'gcash' ? 'G' : 'M'}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? colors.text : '#1F2937'}}>
                {existingPayout?.type === 'gcash' ? 'GCash' : 'Maya'}
              </Text>
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280'}}>
                Primary payout method
              </Text>
            </View>
          </View>

          <View style={{borderTopWidth: 1, borderTopColor: isDark ? colors.border : '#E5E7EB', paddingTop: 16}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280'}}>Account Name</Text>
              <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? colors.text : '#1F2937'}}>
                {existingPayout?.accountName}
              </Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontSize: 13, color: isDark ? colors.textSecondary : '#6B7280'}}>Mobile Number</Text>
              <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? colors.text : '#1F2937'}}>
                {existingPayout?.accountNumber?.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={{
            backgroundColor: isDark ? colors.card : '#F3F4F6',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12,
          }}
          onPress={handleEditPayout}>
          <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? colors.text : '#1F2937'}}>
            Change Payout Method
          </Text>
        </TouchableOpacity>

        {/* Back to Wallet */}
        <TouchableOpacity
          style={{backgroundColor: '#00B14F', paddingVertical: 16, borderRadius: 12, alignItems: 'center'}}
          onPress={() => navigation.goBack()}>
          <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>Back to Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PayoutSetupScreen;
