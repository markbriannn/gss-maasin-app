import React, {useState, useEffect, useRef, useCallback} from 'react';
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
import {sendVerificationCode as sendEmailJSCode} from '../../services/emailJSService';

const EmailVerificationScreen = ({navigation, route}) => {
  const {contactInfo, ...otherParams} = route.params || {};
  const email = contactInfo?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const verifyingRef = useRef(false);

  const generateCode = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  const sendVerificationCode = useCallback(async () => {
    if (isSending) return;
    setIsSending(true);
    const newCode = generateCode();
    setGeneratedCode(newCode);

    try {
      const result = await sendEmailJSCode(email, newCode);
      setCountdown(60);
      if (result.success) {
        Alert.alert('Code Sent', `Verification code sent to ${email}`);
      } else {
        Alert.alert('Email Issue', `Code: ${newCode}\n\n(Use this for testing)`);
      }
    } catch (error) {
      setCountdown(60);
      Alert.alert('Error', `Code: ${newCode}`);
    } finally {
      setIsSending(false);
    }
  }, [email, generateCode, isSending]);

  const handleVerify = useCallback((enteredCodeParam) => {
    const enteredCode = enteredCodeParam || code.join('');
    if (enteredCode.length !== 6) return;

    setIsLoading(true);
    if (enteredCode === generatedCode) {
      setIsLoading(false);
      navigation.navigate('Location', {
        ...otherParams,
        contactInfo: {...contactInfo, emailVerified: true},
      });
    } else {
      setIsLoading(false);
      Alert.alert('Invalid Code', 'The code you entered is incorrect.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [code, contactInfo, generatedCode, navigation, otherParams]);

  useEffect(() => {
    sendVerificationCode();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const enteredCode = code.join('');
    if (enteredCode.length === 6 && generatedCode && !isLoading && !verifyingRef.current) {
      verifyingRef.current = true;
      handleVerify(enteredCode);
      setTimeout(() => { verifyingRef.current = false; }, 1000);
    }
  }, [code, generatedCode, isLoading, handleVerify]);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: '56%'}]} />
          </View>
          <Text style={styles.stepText}>Step 4 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Icon name="mail" size={32} color="#00B14F" />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Code Input */}
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

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#00B14F" size="large" />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendLabel}>Didn't receive the code?</Text>
          <TouchableOpacity 
            onPress={() => { setCode(['', '', '', '', '', '']); sendVerificationCode(); }} 
            disabled={countdown > 0 || isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#00B14F" />
            ) : countdown > 0 ? (
              <Text style={styles.resendDisabled}>Resend in {countdown}s</Text>
            ) : (
              <Text style={styles.resendLink}>Resend Code</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Icon name="bulb" size={20} color="#F59E0B" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Can't find the email?</Text>
            <Text style={styles.tipsText}>Check your spam or junk folder</Text>
          </View>
        </View>

        {/* Go Back */}
        <TouchableOpacity style={styles.backContainer} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Wrong email? <Text style={styles.backLink}>Go back</Text></Text>
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
  headerSection: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  emailText: { fontSize: 16, fontWeight: '600', color: '#00B14F', marginTop: 4 },
  codeContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  codeInput: { width: 48, height: 56, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, fontSize: 24, fontWeight: '700', textAlign: 'center', backgroundColor: '#F9FAFB', color: '#1F2937', marginHorizontal: 4 },
  codeInputFilled: { borderColor: '#00B14F', backgroundColor: '#ECFDF5' },
  loadingContainer: { alignItems: 'center', marginBottom: 16 },
  loadingText: { color: '#00B14F', marginTop: 8, fontSize: 14 },
  resendContainer: { alignItems: 'center', marginBottom: 24 },
  resendLabel: { color: '#6B7280', fontSize: 14 },
  resendDisabled: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  resendLink: { color: '#00B14F', fontSize: 14, fontWeight: '600', marginTop: 8 },
  tipsCard: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' },
  tipsContent: { flex: 1, marginLeft: 12 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: '#92400E', marginBottom: 2 },
  tipsText: { fontSize: 13, color: '#B45309' },
  backContainer: { alignItems: 'center', marginTop: 8 },
  backText: { color: '#6B7280', fontSize: 14 },
  backLink: { color: '#00B14F', fontWeight: '600' },
});

export default EmailVerificationScreen;
