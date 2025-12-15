import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {roleSelectionStyles as styles} from '../../css/authStyles';

const RoleSelectionScreen = ({navigation}) => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowTermsModal(true);
  };

  const handleAcceptTerms = () => {
    if (!acceptedTerms) {
      Alert.alert('Required', 'Please accept the Terms and Conditions to continue');
      return;
    }
    setShowTermsModal(false);
    if (selectedRole === 'CLIENT') {
      navigation.navigate('ClientRegistration');
    } else if (selectedRole === 'PROVIDER') {
      navigation.navigate('ProviderRegistration');
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>GSS</Text>
            </View>
          </View>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Are you looking for services or offering them?
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect('CLIENT')}
            activeOpacity={0.8}>
            <View style={[styles.iconContainer, {backgroundColor: '#E6F7EF'}]}>
              <Icon name="person-outline" size={48} color="#00B14F" />
            </View>
            <Text style={styles.roleName}>I'm a Client</Text>
            <Text style={styles.roleDescription}>
              Looking for trusted service providers in my area
            </Text>
            <View style={styles.roleFeatures}>
              <View style={styles.feature}>
                <Icon name="checkmark-circle" size={20} color="#00B14F" />
                <Text style={styles.featureText}>Browse providers</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="checkmark-circle" size={20} color="#00B14F" />
                <Text style={styles.featureText}>Real-time tracking</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="checkmark-circle" size={20} color="#00B14F" />
                <Text style={styles.featureText}>Secure payment</Text>
              </View>
            </View>
            <View style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Select</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect('PROVIDER')}
            activeOpacity={0.8}>
            <View style={[styles.iconContainer, {backgroundColor: '#DBEAFE'}]}>
              <Icon name="construct-outline" size={48} color="#3B82F6" />
            </View>
            <Text style={styles.roleName}>I'm a Provider</Text>
            <Text style={styles.roleDescription}>
              Offering professional services to clients
            </Text>
            <View style={styles.roleFeatures}>
              <View style={styles.feature}>
                <Icon name="checkmark-circle" size={20} color="#3B82F6" />
                <Text style={styles.featureText}>Accept jobs</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="checkmark-circle" size={20} color="#3B82F6" />
                <Text style={styles.featureText}>Manage earnings</Text>
              </View>
              <View style={styles.feature}>
                <Icon name="checkmark-circle" size={20} color="#3B82F6" />
                <Text style={styles.featureText}>Build reputation</Text>
              </View>
            </View>
            <View style={[styles.selectButton, {backgroundColor: '#3B82F6'}]}>
              <Text style={styles.selectButtonText}>Select</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginLink} onPress={handleLogin}>
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}>
              <Text style={{fontSize: 20, fontWeight: '700', color: '#1F2937'}}>
                Terms & Conditions
              </Text>
              <TouchableOpacity onPress={() => {
                setShowTermsModal(false);
                setAcceptedTerms(false);
              }}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Content - Role-specific terms */}
            <ScrollView style={{padding: 20, maxHeight: 400}}>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                Welcome to GSS Maasin Service App. By registering as a {selectedRole === 'CLIENT' ? 'Client' : 'Service Provider'}, you agree to the following terms:
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                1. Account Registration
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • You must provide accurate and complete information during registration.{'\n'}
                • You are responsible for maintaining the security of your account.{'\n'}
                • You must be at least 18 years old to register.
              </Text>

              {selectedRole === 'CLIENT' ? (
                <>
                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    2. Client Responsibilities
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • You agree to pay for services rendered as agreed with providers.{'\n'}
                    • Provide accurate job descriptions and requirements.{'\n'}
                    • Treat service providers with respect and professionalism.{'\n'}
                    • Be available at the scheduled service time and location.
                  </Text>

                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    3. Booking & Payments
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • A 5% service fee is added to all bookings.{'\n'}
                    • Payments can be made via GCash, Maya, or Cash.{'\n'}
                    • Cancellations must be made at least 2 hours before scheduled time.{'\n'}
                    • Refunds are subject to our refund policy and admin approval.
                  </Text>

                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    4. Reviews & Ratings
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • You may leave honest reviews for completed services.{'\n'}
                    • Reviews must be truthful and not contain offensive content.{'\n'}
                    • Fake or malicious reviews may result in account suspension.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    2. Provider Requirements
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • Submit valid government ID and required documents for verification.{'\n'}
                    • Your account requires admin approval before activation.{'\n'}
                    • Maintain professional conduct and quality service at all times.{'\n'}
                    • Keep your availability status updated accurately.
                  </Text>

                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    3. Service Delivery
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • Arrive on time for scheduled appointments.{'\n'}
                    • Bring all necessary tools and equipment for the job.{'\n'}
                    • Complete work as described in the booking agreement.{'\n'}
                    • Communicate promptly with clients about any issues.
                  </Text>

                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    4. Earnings & Payouts
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • A 5% service fee is deducted from your earnings.{'\n'}
                    • Minimum payout amount is ₱100.{'\n'}
                    • Payouts are processed to your registered GCash/Maya account.{'\n'}
                    • You are responsible for your own tax obligations.
                  </Text>

                  <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                    5. Quality Standards
                  </Text>
                  <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                    • Maintain a minimum rating to remain active on the platform.{'\n'}
                    • Respond to job requests within a reasonable time.{'\n'}
                    • Handle customer complaints professionally.
                  </Text>
                </>
              )}

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                {selectedRole === 'CLIENT' ? '5' : '6'}. Privacy & Data
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • We collect and process your data as described in our Privacy Policy.{'\n'}
                • Your personal information is protected and not shared without consent.{'\n'}
                • Location data is used to connect you with nearby {selectedRole === 'CLIENT' ? 'providers' : 'clients'}.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                {selectedRole === 'CLIENT' ? '6' : '7'}. Prohibited Activities
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • Fraudulent activities or misrepresentation.{'\n'}
                • Harassment or abusive behavior towards other users.{'\n'}
                • Circumventing the platform for direct transactions.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                {selectedRole === 'CLIENT' ? '7' : '8'}. Account Termination
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 24}}>
                • We reserve the right to suspend or terminate accounts that violate these terms.{'\n'}
                • Users may request account deletion at any time.
              </Text>
            </ScrollView>

            {/* Accept Checkbox */}
            <View style={{padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}
                onPress={() => setAcceptedTerms(!acceptedTerms)}>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: acceptedTerms ? '#00B14F' : '#D1D5DB',
                  backgroundColor: acceptedTerms ? '#00B14F' : '#FFFFFF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  {acceptedTerms && <Icon name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={{flex: 1, fontSize: 14, color: '#4B5563'}}>
                  I have read and agree to the Terms and Conditions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: acceptedTerms ? '#00B14F' : '#D1D5DB',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={handleAcceptTerms}
                disabled={!acceptedTerms}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>
                  Continue as {selectedRole === 'CLIENT' ? 'Client' : 'Provider'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;
