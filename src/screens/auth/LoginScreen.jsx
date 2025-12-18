import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {authStyles} from '../../css/authStyles';

const LoginScreen = ({navigation}) => {
  const {login} = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Suspended account modal state
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspensionDetails, setSuspensionDetails] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password, selectedRole);
    setIsLoading(false);

    if (!result.success) {
      // Handle suspended account - show modal with details
      if (result.error === 'ACCOUNT_SUSPENDED' && result.suspensionDetails) {
        setSuspensionDetails(result.suspensionDetails);
        setShowSuspendedModal(true);
      } else if (result.errorType === 'ROLE_MISMATCH') {
        // Show role mismatch error with suggestion
        Alert.alert(
          'Wrong Account Type',
          result.error,
          [
            {text: 'OK', onPress: () => setSelectedRole(null)},
          ]
        );
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
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

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setEmail('');
    setPassword('');
  };

  const roleConfig = {
    CLIENT: {
      icon: 'person',
      color: '#00B14F',
      bgColor: '#DCFCE7',
      label: 'Client',
      description: 'Book services from trusted providers',
    },
    PROVIDER: {
      icon: 'briefcase',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      label: 'Provider',
      description: 'Manage jobs and grow your business',
    },
    ADMIN: {
      icon: 'shield-checkmark',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      label: 'Admin',
      description: 'Manage platform and users',
    },
  };

  // Role Selection Screen
  if (!selectedRole) {
    return (
      <SafeAreaView style={authStyles.container}>
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          keyboardShouldPersistTaps="handled">
          
          {/* Back Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#374151" />
            <Text style={{marginLeft: 8, fontSize: 16, color: '#374151'}}>Back</Text>
          </TouchableOpacity>

          <View style={authStyles.logoContainer}>
            <View style={authStyles.logo}>
              <Text style={authStyles.logoText}>GSS</Text>
            </View>
            <Text style={authStyles.logoSubtext}>Maasin City</Text>
          </View>

          <View style={authStyles.welcomeContainer}>
            <Text style={authStyles.welcomeText}>Welcome Back</Text>
            <Text style={authStyles.welcomeSubtext}>
              Choose how you want to sign in
            </Text>
          </View>

          <View style={{marginTop: 24}}>
            {/* Client Option */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 2,
                borderColor: 'transparent',
              }}
              onPress={() => setSelectedRole('CLIENT')}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: roleConfig.CLIENT.bgColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Icon name={roleConfig.CLIENT.icon} size={28} color={roleConfig.CLIENT.color} />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={{fontSize: 18, fontWeight: '600', color: '#1F2937'}}>
                  Login as Client
                </Text>
                <Text style={{fontSize: 14, color: '#6B7280', marginTop: 2}}>
                  {roleConfig.CLIENT.description}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Provider Option */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 2,
                borderColor: 'transparent',
              }}
              onPress={() => setSelectedRole('PROVIDER')}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: roleConfig.PROVIDER.bgColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Icon name={roleConfig.PROVIDER.icon} size={28} color={roleConfig.PROVIDER.color} />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={{fontSize: 18, fontWeight: '600', color: '#1F2937'}}>
                  Login as Provider
                </Text>
                <Text style={{fontSize: 14, color: '#6B7280', marginTop: 2}}>
                  {roleConfig.PROVIDER.description}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Admin Option */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 2,
                borderColor: 'transparent',
              }}
              onPress={() => setSelectedRole('ADMIN')}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: roleConfig.ADMIN.bgColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Icon name={roleConfig.ADMIN.icon} size={28} color={roleConfig.ADMIN.color} />
              </View>
              <View style={{flex: 1, marginLeft: 16}}>
                <Text style={{fontSize: 18, fontWeight: '600', color: '#1F2937'}}>
                  Login as Admin
                </Text>
                <Text style={{fontSize: 14, color: '#6B7280', marginTop: 2}}>
                  {roleConfig.ADMIN.description}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={[authStyles.signUpContainer, {marginTop: 32}]}>
            <Text style={authStyles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={authStyles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Login Form Screen
  const currentRole = roleConfig[selectedRole];

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView
        contentContainerStyle={authStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        
        {/* Back to Role Selection */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}
          onPress={handleBackToRoleSelection}>
          <Icon name="arrow-back" size={24} color="#374151" />
          <Text style={{marginLeft: 8, fontSize: 16, color: '#374151'}}>Back</Text>
        </TouchableOpacity>

        <View style={{alignItems: 'center', marginBottom: 24}}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: currentRole.bgColor,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <Icon name={currentRole.icon} size={40} color={currentRole.color} />
          </View>
          <Text style={authStyles.welcomeText}>{currentRole.label} Login</Text>
          <Text style={authStyles.welcomeSubtext}>
            Sign in to your {currentRole.label.toLowerCase()} account
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
              {backgroundColor: currentRole.color},
              isLoading && authStyles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={authStyles.buttonPrimaryText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Social/phone login removed per request */}

          {selectedRole !== 'ADMIN' && (
            <View style={authStyles.signUpContainer}>
              <Text style={authStyles.signUpText}>New to GSS Maasin? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={[authStyles.linkText, {color: currentRole.color}]}>
                  Create {currentRole.label} Account
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Suspended Account Modal */}
      <Modal
        visible={showSuspendedModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuspendedModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
          }}>
            {/* Warning Icon */}
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Icon name="ban" size={40} color="#DC2626" />
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#1F2937',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Account Suspended
            </Text>

            {/* Suspension Date */}
            {suspensionDetails?.suspendedAt && (
              <Text style={{
                fontSize: 13,
                color: '#6B7280',
                marginBottom: 16,
              }}>
                Suspended on: {suspensionDetails.suspendedAt}
              </Text>
            )}

            {/* Reason Label */}
            {suspensionDetails?.label && (
              <View style={{
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginBottom: 16,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#92400E',
                }}>
                  {suspensionDetails.label}
                </Text>
              </View>
            )}

            {/* Reason Details */}
            <View style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 16,
              width: '100%',
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 14,
                color: '#374151',
                lineHeight: 22,
                textAlign: 'center',
              }}>
                {suspensionDetails?.reason || 'Your account has been suspended. Please contact support for more information.'}
              </Text>
            </View>

            {/* Contact Support Info */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Icon name="mail-outline" size={18} color="#6B7280" />
              <Text style={{
                fontSize: 13,
                color: '#6B7280',
                marginLeft: 8,
              }}>
                Contact: support@gssmaasin.com
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#DC2626',
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 12,
                width: '100%',
                alignItems: 'center',
              }}
              onPress={() => setShowSuspendedModal(false)}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF',
              }}>
                I Understand
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default LoginScreen;
