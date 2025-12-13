import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {authStyles} from '../../css/authStyles';

const LoginScreen = ({navigation}) => {
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('RoleSelection');
  };

  const handlePhoneLogin = () => {
    navigation.navigate('PhoneOTP');
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView
        contentContainerStyle={authStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        
        <View style={authStyles.logoContainer}>
          <View style={authStyles.logo}>
            <Text style={authStyles.logoText}>GSS</Text>
          </View>
          <Text style={authStyles.logoSubtext}>Maasin City</Text>
        </View>

        <View style={authStyles.welcomeContainer}>
          <Text style={authStyles.welcomeText}>Welcome Back</Text>
          <Text style={authStyles.welcomeSubtext}>
            Sign in to continue to your account
          </Text>
        </View>

        <View style={authStyles.formContainer}>
          <View style={authStyles.inputWrapper}>
            <Text style={authStyles.inputLabel}>Email</Text>
            <View
              style={[
                authStyles.inputContainer,
                emailFocused && authStyles.inputContainerFocused,
              ]}>
              <Icon
                name="mail-outline"
                size={20}
                color="#6B7280"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={authStyles.inputWrapper}>
            <Text style={authStyles.inputLabel}>Password</Text>
            <View
              style={[
                authStyles.inputContainer,
                passwordFocused && authStyles.inputContainerFocused,
              ]}>
              <Icon
                name="lock-closed-outline"
                size={20}
                color="#6B7280"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={authStyles.inputRightIcon}
                onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={authStyles.checkboxContainer}>
            <TouchableOpacity
              style={[
                authStyles.checkbox,
                rememberMe && authStyles.checkboxChecked,
              ]}
              onPress={() => setRememberMe(!rememberMe)}>
              {rememberMe && <Icon name="checkmark" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            <Text style={authStyles.checkboxLabel}>Remember Me</Text>
          </View>

          <View style={authStyles.forgotPasswordContainer}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={authStyles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              authStyles.buttonPrimary,
              isLoading && authStyles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={authStyles.buttonPrimaryText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Social/phone login removed per request */}

          <View style={authStyles.signUpContainer}>
            <Text style={authStyles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={authStyles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
