import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {authService} from '../../services/authService';

const PhoneVerificationScreen = ({navigation, route}) => {
  const rawPhone = route.params?.contactInfo?.phoneNumber || '';
  const sanitizePhone = (p) => {
    if (!p) return '';
    const digits = p.replace(/[^0-9+]/g, '');
    if (digits.startsWith('+63')) return digits;
    const noPlus = digits.replace(/^\+/, '');
    const withoutLeadingZero = noPlus.startsWith('0') ? noPlus.slice(1) : noPlus;
    return `+63${withoutLeadingZero}`;
  };
  const phoneNumber = sanitizePhone(rawPhone);
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // auto-send on mount if phone provided
    if (phoneNumber) {
      handleSendCode();
    }
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => Math.max(t - 1, 0)), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      Alert.alert('Missing phone', 'Phone number is required from previous step.');
      return;
    }
    try {
      setIsSending(true);
      setError('');
      const c = await authService.startPhoneOTP(phoneNumber);
      setConfirmation(c);
      setStatus(`Code sent to ${phoneNumber}`);
      setResendTimer(60);
    } catch (err) {
      const message = err?.message || 'Failed to send code';
      setError(message);
      Alert.alert('Error sending code', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!confirmation) {
      Alert.alert('No code sent', 'Send a code first.');
      return;
    }
    if (otp.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit OTP.');
      return;
    }
    try {
      setIsVerifying(true);
      setError('');
      const {token, user} = await authService.verifyPhoneOTP(confirmation, otp);
      setStatus('Phone verified');
      navigation.navigate('Password', {
        ...route.params,
        phoneVerification: {
          token,
          user,
        },
      });
    } catch (err) {
      const message = err?.message || 'Invalid code';
      setError(message);
      Alert.alert('Verification failed', message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '56%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 4 of 7</Text>
        <Text style={authStyles.title}>Phone Verification</Text>
        <Text style={authStyles.subtitle}>
          Enter the 6-digit code sent to {phoneNumber || 'your phone'}
        </Text>

        <View style={authStyles.inputContainer}>
          <Icon name="key-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Enter OTP *"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
        </View>

        <TouchableOpacity
          style={{alignSelf: 'center', marginBottom: 8}}
          onPress={handleSendCode}
          disabled={isSending || resendTimer > 0}>
          {isSending ? (
            <ActivityIndicator color="#00B14F" />
          ) : (
            <Text style={{color: (isSending || resendTimer > 0) ? '#9CA3AF' : '#00B14F', fontSize: 14, fontWeight: '600'}}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </Text>
          )}
        </TouchableOpacity>
        {resendTimer > 0 && (
          <Text style={{textAlign: 'center', color: '#6B7280', marginBottom: 16}}>
            You can resend after {resendTimer}s
          </Text>
        )}

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleVerify}
          disabled={otp.length !== 6 || isVerifying}>
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Verify</Text>
          )}
        </TouchableOpacity>

        {!!status && (
          <Text style={{marginTop: 12, color: '#10B981', textAlign: 'center'}}>{status}</Text>
        )}
        {!!error && (
          <Text style={{marginTop: 8, color: '#EF4444', textAlign: 'center'}}>{error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PhoneVerificationScreen;
