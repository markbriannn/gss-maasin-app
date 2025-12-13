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

            {/* Content */}
            <ScrollView style={{padding: 20, maxHeight: 400}}>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                Welcome to GSS Maasin Service App. By registering and using our platform, you agree to the following terms:
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                1. Account Registration
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • You must provide accurate and complete information during registration.{'\n'}
                • You are responsible for maintaining the security of your account.{'\n'}
                • You must be at least 18 years old to register.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                2. Service Usage
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • Clients agree to pay for services rendered as agreed with providers.{'\n'}
                • Providers agree to deliver services professionally and on time.{'\n'}
                • All users must treat each other with respect and professionalism.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                3. Payments & Fees
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • A 5% service fee is charged on all completed transactions.{'\n'}
                • Payments can be made via GCash, Maya, or Cash.{'\n'}
                • Refunds are subject to our refund policy and admin approval.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                4. Provider Requirements
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • Providers must submit valid government ID and other required documents.{'\n'}
                • Provider accounts require admin approval before activation.{'\n'}
                • Providers must maintain professional conduct at all times.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                5. Privacy & Data
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • We collect and process your data as described in our Privacy Policy.{'\n'}
                • Your personal information is protected and not shared without consent.{'\n'}
                • Location data is used to connect you with nearby services.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                6. Prohibited Activities
              </Text>
              <Text style={{fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16}}>
                • Fraudulent activities or misrepresentation.{'\n'}
                • Harassment or abusive behavior towards other users.{'\n'}
                • Circumventing the platform for direct transactions.
              </Text>

              <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
                7. Account Termination
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
