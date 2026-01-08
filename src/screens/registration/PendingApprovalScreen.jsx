import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {authService} from '../../services/authService';

const PendingApprovalScreen = ({navigation, route}) => {
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    submitProviderApplication();
  }, []);

  const submitProviderApplication = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      const params = route?.params || {};
      const email = params?.contactInfo?.email;
      const password = params?.password;
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const providerData = {
        email,
        password,
        role: 'PROVIDER',
        status: 'pending',
        providerStatus: 'pending',
        phoneNumber: params?.contactInfo?.phoneNumber,
        firstName: params?.personalInfo?.firstName,
        middleName: params?.personalInfo?.middleName,
        lastName: params?.personalInfo?.lastName,
        suffix: params?.personalInfo?.suffix,
        dateOfBirth: params?.dateOfBirth,
        // Location fields - use defaults if not set
        barangay: params?.location?.barangay,
        streetAddress: params?.location?.streetAddress,
        houseNumber: params?.location?.houseNumber,
        landmark: params?.location?.landmark,
        latitude: params?.location?.latitude || 10.1335,
        longitude: params?.location?.longitude || 124.8513,
        // Service info
        serviceCategory: params?.serviceCategory,
        services: params?.services,
        bio: params?.aboutService?.bio,
        experience: params?.aboutService?.experience,
        // Pricing - Fixed price instead of hourly rate
        priceType: params?.aboutService?.priceType || 'per_job', // 'per_job' or 'per_hire'
        fixedPrice: params?.aboutService?.fixedPrice || 0,
      };

      const documents = params?.documents || {};

      await authService.registerProvider(providerData, documents);
      setSubmitted(true);
    } catch (error) {
      const message = error?.message || 'Registration failed';
      setError(message);
      console.error('Provider registration error:', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <SafeAreaView style={authStyles.container}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={{marginTop: 16, fontSize: 16, color: '#6B7280'}}>
            Submitting your application...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={authStyles.container}>
        <ScrollView contentContainerStyle={authStyles.scrollContent}>
          <View style={{alignItems: 'center', marginVertical: 60}}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <Icon name="close-circle" size={60} color="#EF4444" />
            </View>
            <Text style={[authStyles.title, {textAlign: 'center'}]}>
              Registration Failed
            </Text>
            <Text style={[authStyles.subtitle, {textAlign: 'center', marginTop: 16}]}>
              {error}
            </Text>
          </View>

          <TouchableOpacity
            style={[authStyles.button, authStyles.buttonPrimary]}
            onPress={() => navigation.navigate('RoleSelection')}>
            <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={{alignItems: 'center', marginVertical: 60}}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#FEF3C7',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <Icon name="time" size={60} color="#F59E0B" />
          </View>
          <Text style={[authStyles.title, {textAlign: 'center'}]}>
            Application Submitted!
          </Text>
          <Text style={[authStyles.subtitle, {textAlign: 'center', marginTop: 16}]}>
            Your provider application is under review. We'll notify you once it's approved.
          </Text>
          <Text style={{fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 24}}>
            Review typically takes 1-2 business days
          </Text>
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={() => navigation.navigate('Login')}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PendingApprovalScreen;
