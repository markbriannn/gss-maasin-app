import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {globalStyles} from '../../css/globalStyles';
import {authService} from '../../services/authService';
import {sendPasswordResetEmail} from '../../services/emailService';

const ForgotPasswordScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const generateResetCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      // Generate a 6-digit reset code
      const code = generateResetCode();
      setGeneratedCode(code);
      
      // Send reset code via Resend email
      const result = await sendPasswordResetEmail(email, code);
      
      if (result.success) {
        setShowCodeInput(true);
        Alert.alert(
          'Code Sent',
          'A 6-digit reset code has been sent to your email. Please check your inbox.',
        );
      } else {
        // Fallback to Firebase password reset
        await authService.forgotPassword(email);
        Alert.alert(
          'Success',
          'Password reset instructions have been sent to your email',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (resetCode !== generatedCode) {
      Alert.alert('Error', 'Invalid reset code. Please try again.');
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
      // Use Firebase to reset password with email link
      await authService.forgotPassword(email);
      Alert.alert(
        'Success',
        'Password reset link has been sent to your email. Please click the link to set your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
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
        <TouchableOpacity
          style={{marginBottom: 24}}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <Text style={authStyles.title}>Forgot Password?</Text>
        <Text style={authStyles.subtitle}>
          {showCodeInput 
            ? 'Enter the 6-digit code sent to your email'
            : 'Enter your email address and we\'ll send you a reset code'}
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
              <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={authStyles.inputContainer}>
              <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
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
              onPress={handleVerifyCode}
              disabled={isLoading}>
              <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
                {isLoading ? 'Verifying...' : 'Reset Password'}
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
              <Text style={{color: '#6B7280', fontSize: 14}}>
                Didn't receive code? Try again
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={{marginTop: 16, alignSelf: 'center'}}
          onPress={() => navigation.navigate('Login')}>
          <Text style={{color: '#00B14F', fontSize: 14, fontWeight: '600'}}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
