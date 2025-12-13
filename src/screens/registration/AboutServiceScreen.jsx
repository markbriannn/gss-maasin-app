import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';

const AboutServiceScreen = ({navigation, route}) => {
  const [aboutService, setAboutService] = useState('');
  const [priceType, setPriceType] = useState('per_job'); // 'per_job' or 'per_hire'
  const [fixedPrice, setFixedPrice] = useState('');
  const [experience, setExperience] = useState('');

  const handleNext = () => {
    if (aboutService.length >= 10 && fixedPrice) {
      navigation.navigate('Documents', {
        ...route.params,
        aboutService: {
          bio: aboutService,
          priceType,
          fixedPrice: parseFloat(fixedPrice) || 0,
          experience,
        },
      });
    }
  };

  const isFormValid = aboutService.length >= 10 && fixedPrice && parseFloat(fixedPrice) > 0;

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '84%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 8 of 9</Text>
        <Text style={authStyles.title}>About Your Service</Text>
        <Text style={authStyles.subtitle}>
          Tell us about your experience and set your pricing
        </Text>

        <View style={{marginTop: 24}}>
          {/* Experience */}
          <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
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
          <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
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

          {/* Pricing Section */}
          <View style={{marginTop: 24}}>
            <Text style={{fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 12}}>
              Set Your Pricing *
            </Text>
            
            {/* Price Type Selection */}
            <View style={{flexDirection: 'row', marginBottom: 16}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  borderRadius: 12,
                  marginRight: 8,
                  backgroundColor: priceType === 'per_job' ? '#00B14F' : '#F3F4F6',
                  borderWidth: priceType === 'per_job' ? 0 : 1,
                  borderColor: '#E5E7EB',
                }}
                onPress={() => setPriceType('per_job')}>
                <Icon 
                  name="briefcase-outline" 
                  size={18} 
                  color={priceType === 'per_job' ? '#FFFFFF' : '#6B7280'} 
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 14,
                  fontWeight: '600',
                  color: priceType === 'per_job' ? '#FFFFFF' : '#6B7280',
                }}>
                  Per Job
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  borderRadius: 12,
                  marginLeft: 8,
                  backgroundColor: priceType === 'per_hire' ? '#00B14F' : '#F3F4F6',
                  borderWidth: priceType === 'per_hire' ? 0 : 1,
                  borderColor: '#E5E7EB',
                }}
                onPress={() => setPriceType('per_hire')}>
                <Icon 
                  name="person-outline" 
                  size={18} 
                  color={priceType === 'per_hire' ? '#FFFFFF' : '#6B7280'} 
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 14,
                  fontWeight: '600',
                  color: priceType === 'per_hire' ? '#FFFFFF' : '#6B7280',
                }}>
                  Per Hire
                </Text>
              </TouchableOpacity>
            </View>

            {/* Price Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              paddingHorizontal: 16,
            }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>₱</Text>
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 8,
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#1F2937',
                }}
                placeholder="0.00"
                keyboardType="numeric"
                value={fixedPrice}
                onChangeText={setFixedPrice}
              />
              <Text style={{fontSize: 14, color: '#6B7280'}}>
                {priceType === 'per_job' ? '/ job' : '/ hire'}
              </Text>
            </View>

            <Text style={{fontSize: 12, color: '#6B7280', marginTop: 8}}>
              {priceType === 'per_job' 
                ? 'This is the fixed price you charge for completing a job'
                : 'This is the fixed price you charge each time you are hired'
              }
            </Text>

            {/* Fee Notice */}
            <View style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 10,
              padding: 12,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}>
              <Icon name="information-circle" size={20} color="#F59E0B" />
              <Text style={{flex: 1, marginLeft: 8, fontSize: 12, color: '#92400E', lineHeight: 18}}>
                Note: Clients will be charged an additional 5% service fee on top of your price. 
                You will receive the full amount you set here.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            authStyles.button, 
            authStyles.buttonPrimary,
            !isFormValid && {backgroundColor: '#D1D5DB'}
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
