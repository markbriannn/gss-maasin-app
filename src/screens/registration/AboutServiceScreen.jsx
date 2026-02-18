import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStyles } from '../../css/authStyles';

const AboutServiceScreen = ({ navigation, route }) => {
  const [aboutService, setAboutService] = useState('');
  const [experience, setExperience] = useState('');

  const handleNext = () => {
    if (aboutService.length >= 10) {
      navigation.navigate('Documents', {
        ...route.params,
        aboutService: {
          bio: aboutService,
          priceType: 'per_job',
          fixedPrice: 200, // System-managed rate
          experience,
        },
      });
    }
  };

  const isFormValid = aboutService.length >= 10;

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, { width: '84%' }]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 8 of 9</Text>
        <Text style={authStyles.title}>About Your Service</Text>
        <Text style={authStyles.subtitle}>
          Tell us about your experience
        </Text>

        <View style={{ marginTop: 24 }}>
          {/* Experience */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
            Years of Experience
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: '#1F2937',
              marginBottom: 16,
            }}
            placeholder="e.g., 3 years"
            value={experience}
            onChangeText={setExperience}
          />

          {/* About/Bio */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
            About Your Service *
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: '#1F2937',
              height: 120,
              textAlignVertical: 'top',
            }}
            placeholder="Describe your experience, skills, and services..."
            multiline
            numberOfLines={6}
            value={aboutService}
            onChangeText={setAboutService}
          />
          <Text
            style={{
              fontSize: 12,
              color: aboutService.length >= 10 ? '#00B14F' : '#9CA3AF',
              marginTop: 4,
              textAlign: 'right',
            }}>
            {aboutService.length} / 10 minimum
          </Text>

          {/* System Rate Info */}
          <View style={{
            backgroundColor: '#F0FDF4',
            borderRadius: 12,
            padding: 16,
            marginTop: 24,
            flexDirection: 'row',
            alignItems: 'flex-start',
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 4 }}>
                System Rate
              </Text>
              <Text style={{ fontSize: 13, color: '#15803D', lineHeight: 20 }}>
                The platform sets a fixed rate of{' '}
                <Text style={{ fontWeight: '700' }}>₱200 per job</Text>
                {route.params?.serviceCategory ? ` for ${route.params.serviceCategory}` : ''}.
                You will receive this amount for every completed job.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            authStyles.button,
            authStyles.buttonPrimary,
            !isFormValid && { backgroundColor: '#D1D5DB' },
          ]}
          onPress={handleNext}
          disabled={!isFormValid}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutServiceScreen;
