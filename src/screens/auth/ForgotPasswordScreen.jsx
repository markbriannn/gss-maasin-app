import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {globalStyles} from '../../css/globalStyles';
import {authService} from '../../services/authService';

const ForgotPasswordScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
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
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
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
          Enter your email address and we'll send you instructions to reset your password
        </Text>

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
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>

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
