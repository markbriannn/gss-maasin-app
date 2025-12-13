import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {authService} from '../../services/authService';
import {useAuth} from '../../context/AuthContext';

const PhoneOTPScreen = ({navigation}) => {
  const {setSession} = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
    if (!phone) {
      Alert.alert('Missing phone', 'Please enter your phone number (e.g., +63...)');
      return;
    }
    try {
      setIsSending(true);
      setError('');
      const c = await authService.startPhoneOTP(phone);
      setConfirmation(c);
      setStatus('Code sent. Check your SMS.');
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
    if (!code) {
      Alert.alert('Missing code', 'Enter the OTP you received.');
      return;
    }
    try {
      setIsVerifying(true);
      setError('');
      const {token, user} = await authService.verifyPhoneOTP(confirmation, code);
      await setSession(token, user);
      setStatus('Verified');
      // Auth state change will remount the app navigator into the appropriate authenticated stack
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
      <View style={[authStyles.formContainer, {marginTop: 24}]}> 
        <Text style={authStyles.title}>Phone OTP Login</Text>
        <Text style={[authStyles.subtitle, {marginBottom: 16}]}>Use your phone number to sign in</Text>

        <View style={authStyles.inputWrapper}>
          <Text style={authStyles.inputLabel}>Phone Number</Text>
          <View style={authStyles.inputContainer}>
            <Icon name="call-outline" size={20} color="#6B7280" style={authStyles.inputIcon} />
            <TextInput
              style={authStyles.input}
              placeholder="e.g., +63 912 345 6789"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[authStyles.buttonPrimary, (isSending || resendTimer > 0) && authStyles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={isSending || resendTimer > 0}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={authStyles.buttonPrimaryText}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Send Code'}
            </Text>
          )}
        </TouchableOpacity>
        {resendTimer > 0 && (
          <Text style={{marginTop: 8, textAlign: 'center', color: '#6B7280'}}>
            You can resend a code after {resendTimer}s
          </Text>
        )}

        <View style={[authStyles.inputWrapper, {marginTop: 20}]}> 
          <Text style={authStyles.inputLabel}>OTP Code</Text>
          <View style={authStyles.inputContainer}>
            <Icon name="key-outline" size={20} color="#6B7280" style={authStyles.inputIcon} />
            <TextInput
              style={authStyles.input}
              placeholder="6-digit code"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[authStyles.buttonPrimary, isVerifying && authStyles.buttonDisabled, {marginTop: 12}]}
          onPress={handleVerify}
          disabled={isVerifying}>
          {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={authStyles.buttonPrimaryText}>Verify & Continue</Text>}
        </TouchableOpacity>

        {!!status && (
          <Text style={{marginTop: 12, color: '#10B981', textAlign: 'center'}}>{status}</Text>
        )}
        {!!error && (
          <Text style={{marginTop: 8, color: '#EF4444', textAlign: 'center'}}>{error}</Text>
        )}

        <TouchableOpacity style={{marginTop: 20}} onPress={() => navigation.goBack()}>
          <Text style={authStyles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PhoneOTPScreen;
