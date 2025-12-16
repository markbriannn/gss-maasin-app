import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

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
    const withoutLeadingZero = noPlus.startsWith('0') ? noPlus.slice(1) : noPlus;
    return `+63${withoutLeadingZero}`;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const canContinue = formData.email && formData.phoneNumber && isValidEmail(formData.email);

  const handleNext = () => {
    const normalizedPhone = sanitizePhone(formData.phoneNumber);
    if (canContinue) {
      navigation.navigate('PhoneVerification', {
        ...route.params,
        contactInfo: {
          ...formData,
          phoneNumber: normalizedPhone,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: '28%'}]} />
          </View>
          <Text style={styles.stepText}>Step 2 of 7</Text>
        </View>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Icon name="mail" size={32} color="#00B14F" />
          </View>
          <Text style={styles.title}>Contact Information</Text>
          <Text style={styles.subtitle}>How can we reach you?</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address <Text style={styles.required}>*</Text></Text>
            <View style={[
              styles.inputContainer,
              formData.email && !isValidEmail(formData.email) && styles.inputError
            ]}>
              <Icon name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text.toLowerCase()})}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {formData.email && isValidEmail(formData.email) && (
                <Icon name="checkmark-circle" size={20} color="#00B14F" />
              )}
            </View>
            {formData.email && !isValidEmail(formData.email) && (
              <Text style={styles.errorText}>Please enter a valid email address</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputContainer}>
              <Icon name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <Text style={styles.phonePrefix}>+63</Text>
              <TextInput
                style={styles.input}
                placeholder="9XX XXX XXXX"
                placeholderTextColor="#9CA3AF"
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
                keyboardType="phone-pad"
                maxLength={12}
              />
            </View>
            <Text style={styles.helperText}>We'll send a verification code to this number</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="shield-checkmark" size={24} color="#00B14F" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Your data is secure</Text>
            <Text style={styles.infoText}>We'll never share your contact information with third parties.</Text>
          </View>
        </View>

        {/* Button Section */}
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>Continue</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B14F',
    borderRadius: 3,
  },
  stepText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00B14F',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  phonePrefix: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#00B14F',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B14F',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default ContactInfoScreen;
