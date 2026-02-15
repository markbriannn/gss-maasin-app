import {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import {API_BASE_URL} from '@env';

const API_URL = API_BASE_URL || 'https://gss-maasin-app.onrender.com/api';

const PhoneVerificationScreen = ({navigation, route}) => {
  let contactInfo = {};
  let otherParams = {};
  let rawPhone = '';
  
  try {
    contactInfo = route?.params?.contactInfo || {};
    otherParams = route?.params || {};
    rawPhone = contactInfo?.phoneNumber || '';
  } catch (e) {
    console.log('[PhoneVerification] Error reading params:', e);
  }

  const formatPhone = (phone) => {
    try {
      if (!phone) return '';
      const digits = phone.replace(/[^0-9]/g, '');
      if (!digits || digits.length < 9) return '';
      if (digits.startsWith('63')) return '+' + digits;
      if (digits.startsWith('0')) return '+63' + digits.substring(1);
      if (digits.length === 10) return '+63' + digits;
      return '+63' + digits;
    } catch (e) {
      return '';
    }
  };

  const phoneNumber = formatPhone(rawPhone);
  const isValidPhone = phoneNumber && phoneNumber.length >= 12;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [devOtp, setDevOtp] = useState(''); // For dev/testing fallback
  const inputRefs = useRef([]);
  const verifyingRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  const sendVerificationCode = useCallback(async () => {
    if (isSending || !isValidPhone) return;
    setIsSending(true);

    try {
      console.log('[PhoneVerification] Sending OTP to:', phoneNumber);
      
      const response = await axios.post(`${API_URL}/sms/send-otp`, {
        phoneNumber: phoneNumber,
      }, { timeout: 20000 });

      console.log('[PhoneVerification] Response:', response.data);

      if (response.data.success) {
        setCodeSent(true);
        setCountdown(60);
        Alert.alert('Code Sent', `Verification code sent to ${phoneNumber}`);
      } else {
        // SMS failed but OTP generated for dev/testing
        if (response.data.devOtp) {
          setDevOtp(response.data.devOtp);
          setCodeSent(true);
          setCountdown(60);
          Alert.alert(
            'SMS Service Issue',
            `SMS delivery failed, but you can use this code for testing:\n\n${response.data.devOtp}\n\nError: ${response.data.error || 'Unknown'}`,
            [{text: 'OK'}]
          );
        } else {
          throw new Error(response.data.error || 'Failed to send OTP');
        }
      }
    } catch (error) {
      console.log('[PhoneVerification] Error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to send verification code. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  }, [phoneNumber, isSending, isValidPhone]);

  const handleVerify = useCallback(async (enteredCodeParam) => {
    // Prevent multiple navigations
    if (hasNavigatedRef.current) return;
    
    const enteredCode = enteredCodeParam || code.join('');
    if (enteredCode.length !== 6) return;

    setIsLoading(true);
    
    try {
      console.log('[PhoneVerification] Verifying OTP:', enteredCode);
      
      const response = await axios.post(`${API_URL}/sms/verify-otp`, {
        phoneNumber: phoneNumber,
        otp: enteredCode,
      }, { timeout: 10000 });

      console.log('[PhoneVerification] Verify response:', response.data);

      if (response.data.success) {
        setIsLoading(false);
        hasNavigatedRef.current = true;
        navigation.navigate('EmailVerification', {
          ...otherParams,
          contactInfo: {...contactInfo, phoneVerified: true},
          phoneVerification: {verified: true, phoneNumber},
        });
      } else {
        setIsLoading(false);
        Alert.alert('Invalid Code', response.data.error || 'The code you entered is incorrect.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setIsLoading(false);
      console.log('[PhoneVerification] Verify error:', error);
      Alert.alert(
        'Verification Failed',
        error.response?.data?.error || error.message || 'Failed to verify code. Please try again.'
      );
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [code, contactInfo, navigation, otherParams, phoneNumber]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const enteredCode = code.join('');
    if (enteredCode.length === 6 && !isLoading && !verifyingRef.current) {
      verifyingRef.current = true;
      handleVerify(enteredCode);
      setTimeout(() => { verifyingRef.current = false; }, 1000);
    }
  }, [code, isLoading, handleVerify]);

  const handleCodeChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (!phoneNumber) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>No Phone Number</Text>
          <Text style={styles.errorMessage}>Please go back and enter your phone number.</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: '42%'}]} />
          </View>
          <Text style={styles.stepText}>Step 3 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Icon name="phone-portrait" size={32} color="#00B14F" />
          </View>
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            {codeSent ? "We've sent a 6-digit code to" : "We'll send a 6-digit code to"}
          </Text>
          <Text style={styles.phoneText}>{phoneNumber}</Text>
        </View>

        {/* Dev OTP Notice (only shown if SMS failed) */}
        {devOtp && (
          <View style={styles.devNotice}>
            <Icon name="information-circle" size={18} color="#92400E" />
            <Text style={styles.devNoticeText}>Testing code: {devOtp}</Text>
          </View>
        )}

        {/* Send Button */}
        {!codeSent && (
          <TouchableOpacity
            style={[styles.button, (!isValidPhone || isSending) && styles.buttonDisabled]}
            onPress={sendVerificationCode}
            disabled={!isValidPhone || isSending}>
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="send" size={20} color="#FFFFFF" style={{marginRight: 8}} />
                <Text style={styles.buttonText}>Send Verification Code</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Code Input */}
        {codeSent && (
          <View>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.codeInput, digit && styles.codeInputFilled]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                />
              ))}
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#00B14F" size="large" />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            )}

            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>Didn't receive the code?</Text>
              <TouchableOpacity 
                onPress={() => { 
                  setCode(['', '', '', '', '', '']); 
                  setDevOtp('');
                  sendVerificationCode(); 
                }} 
                disabled={countdown > 0 || isSending}>
                {countdown > 0 ? (
                  <Text style={styles.resendDisabled}>Resend in {countdown}s</Text>
                ) : (
                  <Text style={styles.resendLink}>Resend Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Go Back */}
        <TouchableOpacity style={styles.backContainer} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Wrong number? <Text style={styles.backLink}>Go back</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  progressSection: { marginBottom: 24 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#00B14F', borderRadius: 3 },
  stepText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  headerSection: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  phoneText: { fontSize: 18, fontWeight: '600', color: '#00B14F', marginTop: 4 },
  devNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginBottom: 20 },
  devNoticeText: { color: '#92400E', fontSize: 13, fontWeight: '500', marginLeft: 8 },
  button: { backgroundColor: '#00B14F', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  buttonDisabled: { backgroundColor: '#D1D5DB' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  codeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  codeInput: { width: 48, height: 56, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, fontSize: 24, fontWeight: '700', textAlign: 'center', backgroundColor: '#F9FAFB', color: '#1F2937', marginHorizontal: 4 },
  codeInputFilled: { borderColor: '#00B14F', backgroundColor: '#ECFDF5' },
  loadingContainer: { alignItems: 'center', marginBottom: 16 },
  loadingText: { color: '#00B14F', marginTop: 8, fontSize: 14 },
  resendContainer: { alignItems: 'center', marginTop: 16 },
  resendLabel: { color: '#6B7280', fontSize: 14 },
  resendDisabled: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  resendLink: { color: '#00B14F', fontSize: 14, fontWeight: '600', marginTop: 8 },
  backContainer: { alignItems: 'center', marginTop: 24 },
  backText: { color: '#6B7280', fontSize: 14 },
  backLink: { color: '#00B14F', fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#EF4444', marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
});

export default PhoneVerificationScreen;
