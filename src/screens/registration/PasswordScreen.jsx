import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';

const PasswordScreen = ({navigation, route}) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNext = () => {
    if (formData.password === formData.confirmPassword && formData.password.length >= 8) {
      // Determine which registration flow we are in by checking available route names
      const routeNames = navigation.getState?.()?.routeNames || [];
      const isProviderFlow = routeNames.includes('DateOfBirth');
      const nextScreen = isProviderFlow ? 'DateOfBirth' : 'ProfilePhoto';

      navigation.navigate(nextScreen, {
        ...route.params,
        password: formData.password,
        isProvider: isProviderFlow,
      });
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '70%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 5 of 7</Text>
        <Text style={authStyles.title}>Create Password</Text>
        <Text style={authStyles.subtitle}>Secure your account</Text>

        <View style={authStyles.inputContainer}>
          <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Password *"
            secureTextEntry={!showPassword}
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
          />
          <TouchableOpacity
            style={authStyles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}>
            <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={authStyles.inputContainer}>
          <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Confirm Password *"
            secureTextEntry={!showConfirmPassword}
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
          />
          <TouchableOpacity
            style={authStyles.passwordToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Icon name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleNext}
          disabled={!formData.password || formData.password !== formData.confirmPassword}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PasswordScreen;
