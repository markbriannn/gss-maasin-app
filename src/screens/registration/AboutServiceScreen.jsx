import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { authStyles } from '../../css/authStyles';

const AboutServiceScreen = ({ navigation, route }) => {
  const [aboutService, setAboutService] = useState('');
  const [experience, setExperience] = useState('');
  const [basePrice, setBasePrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  const serviceCategory = route.params?.serviceCategory || '';

  // Fetch the admin-configured base price for this service category
  useEffect(() => {
    const fetchBasePrice = async () => {
      try {
        const snap = await getDocs(collection(db, 'serviceCategories'));
        const match = snap.docs.find(d => d.data().name === serviceCategory);
        if (match) {
          setBasePrice(match.data().basePrice || 200);
        } else {
          setBasePrice(200); // fallback if category not found
        }
      } catch (error) {
        console.error('Error fetching service base price:', error);
        setBasePrice(200); // fallback on error
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchBasePrice();
  }, [serviceCategory]);

  const handleNext = () => {
    if (aboutService.length >= 10 && basePrice !== null) {
      navigation.navigate('Documents', {
        ...route.params,
        aboutService: {
          bio: aboutService,
          priceType: 'per_job',
          fixedPrice: basePrice, // Use admin-configured rate
          experience,
        },
      });
    }
  };

  const isFormValid = aboutService.length >= 10 && basePrice !== null;

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
              {loadingPrice ? (
                <ActivityIndicator size="small" color="#15803D" />
              ) : (
                <Text style={{ fontSize: 13, color: '#15803D', lineHeight: 20 }}>
                  The platform sets a fixed rate of{' '}
                  <Text style={{ fontWeight: '700' }}>₱{basePrice} per job</Text>
                  {serviceCategory ? ` for ${serviceCategory}` : ''}.
                  You will receive this amount for every completed job.
                </Text>
              )}
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
