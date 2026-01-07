import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {sendPasswordResetCode} from '../../services/emailService';
import {attemptPasswordReset} from '../../utils/rateLimiter';
import {API_CONFIG} from '../../config/config';

const ForgotPasswordScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Helper function to fetch with retry
  const fetchWithRetry = async (url, options, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Check rate limit before sending reset code
    const rateLimitCheck = await attemptPasswordReset(email);
    if (!rateLimitCheck.allowed) {
      Alert.alert('Please Wait', rateLimitCheck.message);
      return;
    }

    setIsLoading(true);
    try {
      // First, wake up the server with a health check
      try {
        await fetch(`${API_CONFIG.BASE_URL.replace('/api', '')}/api/health`, {
          method: 'GET',
        });
      } catch {
        // Ignore health check errors, continue with main request
      }

      // Generate code via backend (validates user exists) - with retry
      const response = await fetchWithRetry(
        `${API_CONFIG.BASE_URL}/auth/generate-reset-code`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: email.toLowerCase()}),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server error. Please try again.');
      }

      const data = await response.json();

      if (data.code) {
        // Send reset code via Brevo
        const emailResult = await sendPasswordResetCode(email, data.code);

        if (emailResult.success) {
          setShowCodeInput(true);
          Alert.alert(
            'Code Sent',
            'A 6-digit reset code has been sent to your email. Please check your inbox (and spam folder).',
          );
        } else {
          throw new Error('Failed to send email. Please try again.');
        }
      } else {
        // Still show success for security (don't reveal if email exists)
        Alert.alert(
          'Check Your Email',
          'If an account exists with this email, a reset code will be sent.',
        );
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert(
          'Connection Timeout',
          'Server is taking too long to respond. Please check your internet connection and try again.',
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to send reset code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!resetCode || resetCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Call backend to verify code and update password
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: email.toLowerCase(),
          code: resetCode,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      Alert.alert(
        'Success!',
        'Your password has been updated. You can now login with your new password.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <TouchableOpacity style={{marginBottom: 24}} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <Text style={authStyles.title}>Forgot Password?</Text>
        <Text style={authStyles.subtitle}>
          {showCodeInput
            ? 'Enter the 6-digit code sent to your email'
            : "Enter your email address and we'll send you a reset code"}
        </Text>

        {!showCodeInput ? (
          <>
            <View style={authStyles.inputContainer}>
              <Icon name="mail-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[authStyles.button, authStyles.buttonPrimary]}
              onPress={handleSubmit}
              disabled={isLoading}>
              <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={authStyles.inputContainer}>
              <Icon name="keypad-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="6-digit Code"
                keyboardType="number-pad"
                maxLength={6}
                value={resetCode}
                onChangeText={setResetCode}
              />
            </View>

            <View style={authStyles.inputContainer}>
              <Icon
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={authStyles.inputContainer}>
              <Icon
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.input}
                placeholder="Confirm Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={[authStyles.button, authStyles.buttonPrimary]}
              onPress={handleVerifyAndReset}
              disabled={isLoading}>
              <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{marginTop: 12, alignSelf: 'center'}}
              onPress={() => {
                setShowCodeInput(false);
                setResetCode('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
              <Text style={{color: '#6B7280', fontSize: 14}}>Didn't receive code? Try again</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={{marginTop: 16, alignSelf: 'center'}}
          onPress={() => navigation.navigate('Login')}>
          <Text style={{color: '#00B14F', fontSize: 14, fontWeight: '600'}}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
