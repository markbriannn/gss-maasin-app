import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';

const ContactInfoScreen = ({navigation, route}) => {
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
  });

  const sanitizePhone = (raw) => {
    if (!raw) return '';
    const digits = raw.replace(/[^0-9+]/g, '');
    if (digits.startsWith('+63')) return digits;
    const noPlus = digits.replace(/^\+/, '');
    // Strip leading 0 after country code when converting local format
    const withoutLeadingZero = noPlus.startsWith('0') ? noPlus.slice(1) : noPlus;
    return `+63${withoutLeadingZero}`;
  };

  const handleNext = () => {
    const normalizedPhone = sanitizePhone(formData.phoneNumber);
    if (formData.email && normalizedPhone) {
      // Navigate to email verification first
      navigation.navigate('EmailVerification', {
        ...route.params,
        contactInfo: {
          ...formData,
          phoneNumber: normalizedPhone,
        },
      });
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '28%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 2 of 7</Text>
        <Text style={authStyles.title}>Contact Information</Text>
        <Text style={authStyles.subtitle}>How can we reach you?</Text>

        <View style={authStyles.inputContainer}>
          <Icon name="mail-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Email Address *"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
          />
        </View>

        <View style={authStyles.inputContainer}>
          <Icon name="call-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Phone Number * (auto +63)"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
          />
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleNext}
          disabled={!formData.email || !formData.phoneNumber}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ContactInfoScreen;
