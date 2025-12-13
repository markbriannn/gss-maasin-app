import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {useAuth} from '../../context/AuthContext';

const CompletionScreen = ({navigation, route}) => {
  const {register} = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      const params = route?.params || {};
      const email = params?.contactInfo?.email;
      const password = params?.password;
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const payload = {
        email,
        password,
        role: 'CLIENT',
        phoneNumber: params?.contactInfo?.phoneNumber,
        firstName: params?.personalInfo?.firstName,
        middleName: params?.personalInfo?.middleName,
        lastName: params?.personalInfo?.lastName,
        suffix: params?.personalInfo?.suffix,
        // Location fields
        barangay: params?.location?.barangay,
        streetAddress: params?.location?.streetAddress,
        houseNumber: params?.location?.houseNumber,
        landmark: params?.location?.landmark,
        latitude: params?.location?.latitude,
        longitude: params?.location?.longitude,
      };

      // Auth state change will remount the app navigator into the authenticated stack
      const res = await register(payload);
      if (!res?.success) {
        throw new Error(res?.error || 'Registration failed');
      }
    } catch (error) {
      const message = error?.message || 'Registration failed';
      setError(message);
      console.error('Registration error:', message);
      Alert.alert('Registration error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '100%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 7 of 7</Text>
        
        <View style={{alignItems: 'center', marginVertical: 40}}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#D1FAE5',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Icon name="checkmark" size={60} color="#00B14F" />
          </View>
          <Text style={authStyles.title}>All Set!</Text>
          <Text style={[authStyles.subtitle, {textAlign: 'center', marginTop: 8}]}>
            Your account has been created successfully
          </Text>
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary, isSubmitting && authStyles.buttonDisabled]}
          onPress={handleComplete}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
              Get Started
            </Text>
          )}
        </TouchableOpacity>

        {!!error && (
          <Text style={{marginTop: 12, color: '#EF4444', textAlign: 'center'}}>{error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CompletionScreen;
