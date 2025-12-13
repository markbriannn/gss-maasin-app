import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {sendEmailVerificationCode} from '../../services/emailService';

const EmailVerificationScreen = ({navigation, route}) => {
  const {contactInfo, ...otherParams} = route.params || {};
  const email = contactInfo?.email || '';
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  // Generate and send verification code on mount
  useEffect(() => {
    sendVerificationCode();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendVerificationCode = async () => {
    if (isSending) return;
    
    setIsSending(true);
    const newCode = generateCode();
    setGeneratedCode(newCode);
    
    try {
      const result = await sendEmailVerificationCode(email, newCode);
      if (result.success) {
        setCountdown(60); // 60 second cooldown
        Alert.alert('Code Sent', `A verification code has been sent to ${email}`);
      } else {
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeChange = (text, index) => {
    // Only allow numbers
    const digit = text.replace(/[^0-9]/g, '');
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to go to previous input
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const enteredCode = code.join('');
    
    if (enteredCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    
    // Verify the code
    if (enteredCode === generatedCode) {
      setIsLoading(false);
      // Navigate to next screen with verified email
      navigation.navigate('Location', {
        ...otherParams,
        contactInfo: {
          ...contactInfo,
          emailVerified: true,
        },
      });
    } else {
      setIsLoading(false);
      Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCode(['', '', '', '', '', '']);
    sendVerificationCode();
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '35%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Email Verification</Text>
        
        <View style={{alignItems: 'center', marginVertical: 20}}>
          <View style={{
            backgroundColor: '#D1FAE5',
            padding: 20,
            borderRadius: 50,
            marginBottom: 16,
          }}>
            <Icon name="mail" size={40} color="#00B14F" />
          </View>
          <Text style={authStyles.title}>Verify Your Email</Text>
          <Text style={[authStyles.subtitle, {textAlign: 'center'}]}>
            We've sent a 6-digit code to{'\n'}
            <Text style={{fontWeight: '600', color: '#00B14F'}}>{email}</Text>
          </Text>
        </View>

        {/* Code Input */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginVertical: 24,
          gap: 8,
        }}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={{
                width: 48,
                height: 56,
                borderWidth: 2,
                borderColor: digit ? '#00B14F' : '#E5E7EB',
                borderRadius: 12,
                fontSize: 24,
                fontWeight: '700',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                color: '#1F2937',
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleVerify}
          disabled={isLoading || code.join('').length !== 6}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
              Verify Email
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend Code */}
        <View style={{alignItems: 'center', marginTop: 24}}>
          <Text style={{color: '#6B7280', fontSize: 14}}>
            Didn't receive the code?
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={countdown > 0 || isSending}
            style={{marginTop: 8}}>
            {isSending ? (
              <ActivityIndicator size="small" color="#00B14F" />
            ) : countdown > 0 ? (
              <Text style={{color: '#9CA3AF', fontSize: 14}}>
                Resend in {countdown}s
              </Text>
            ) : (
              <Text style={{color: '#00B14F', fontSize: 14, fontWeight: '600'}}>
                Resend Code
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Change Email */}
        <TouchableOpacity
          style={{alignItems: 'center', marginTop: 24}}
          onPress={() => navigation.goBack()}>
          <Text style={{color: '#6B7280', fontSize: 14}}>
            Wrong email? <Text style={{color: '#00B14F', fontWeight: '600'}}>Go back</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmailVerificationScreen;
