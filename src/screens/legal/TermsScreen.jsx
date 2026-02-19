import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { globalStyles } from '../../css/globalStyles';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const TermsScreen = ({ navigation }) => {
  const { isDark, theme } = useTheme();
  const { user, userRole } = useAuth();
  const role = userRole || user?.role || 'CLIENT';

  const titleColor = isDark ? theme.colors.text : '#1F2937';
  const bodyColor = isDark ? theme.colors.textSecondary : '#4B5563';

  return (
    <SafeAreaView style={[globalStyles.container, isDark && { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF' }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={titleColor} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: titleColor, marginLeft: 16 }}>
          Terms & Conditions
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginBottom: 16 }}>
          Last updated: February 2025
        </Text>

        <Text style={{ fontSize: 14, color: bodyColor, lineHeight: 22, marginBottom: 16 }}>
          Welcome to GSS Maasin Service App. By using this platform as a {role === 'PROVIDER' ? 'Service Provider' : 'Client'}, you agree to the following terms:
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
          1. Account Registration
        </Text>
        <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
          • You must provide accurate and complete information during registration.{'\n'}
          • You are responsible for maintaining the security of your account.{'\n'}
          • You must be at least 18 years old to register.
        </Text>

        {role === 'PROVIDER' ? (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              2. Provider Requirements
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • Submit valid government ID and required documents for verification.{'\n'}
              • Your account requires admin approval before activation.{'\n'}
              • Maintain professional conduct and quality service at all times.{'\n'}
              • Keep your availability status updated accurately.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              3. Service Delivery
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • Arrive on time for scheduled appointments.{'\n'}
              • Bring all necessary tools and equipment for the job.{'\n'}
              • Complete work as described in the booking agreement.{'\n'}
              • Communicate promptly with clients about any issues.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              4. Earnings & Payouts
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • A 5% service fee is deducted from your earnings.{'\n'}
              • Minimum payout amount is ₱100.{'\n'}
              • Payouts are processed to your registered GCash/Maya account.{'\n'}
              • You are responsible for your own tax obligations.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              5. Quality Standards
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • Maintain a minimum rating to remain active on the platform.{'\n'}
              • Respond to job requests within a reasonable time.{'\n'}
              • Handle customer complaints professionally.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              6. Privacy & Data Protection
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.{'\n'}
              • Your personal information (name, contact details, location) is encrypted and securely stored.{'\n'}
              • Your verification documents (ID, clearances) are accessible only to administrators and never shared with clients.{'\n'}
              • Location data is collected only during active service delivery for safety and coordination.{'\n'}
              • Payment information is processed by PayMongo (PCI-DSS compliant) - we never store your card details.{'\n'}
              • You have the right to access, correct, or delete your personal data at any time.{'\n'}
              • We do not sell your personal information to third parties.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              7. Prohibited Activities
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • Fraudulent activities or misrepresentation.{'\n'}
              • Harassment or abusive behavior towards other users.{'\n'}
              • Circumventing the platform for direct transactions.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              8. Account Termination
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 32, lineHeight: 22 }}>
              • We reserve the right to suspend or terminate accounts that violate these terms.{'\n'}
              • Users may request account deletion at any time.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              2. Client Responsibilities
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • You agree to pay for services rendered as agreed with providers.{'\n'}
              • Provide accurate job descriptions and requirements.{'\n'}
              • Treat service providers with respect and professionalism.{'\n'}
              • Be available at the scheduled service time and location.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              3. Booking & Payments
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • A 5% service fee is added to all bookings.{'\n'}
              • Payments can be made via GCash, Maya, or Cash.{'\n'}
              • Cancellations must be made at least 2 hours before scheduled time.{'\n'}
              • Refunds are subject to our refund policy and admin approval.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              4. Reviews & Ratings
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • You may leave honest reviews for completed services.{'\n'}
              • Reviews must be truthful and not contain offensive content.{'\n'}
              • Fake or malicious reviews may result in account suspension.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              5. Privacy & Data Protection
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • We collect and process your data in accordance with the Philippine Data Privacy Act of 2012.{'\n'}
              • Your personal information (name, contact details, location) is encrypted and securely stored.{'\n'}
              • Location data is collected only during active service delivery for safety and coordination.{'\n'}
              • Payment information is processed by PayMongo (PCI-DSS compliant) - we never store your card details.{'\n'}
              • You have the right to access, correct, or delete your personal data at any time.{'\n'}
              • We do not sell your personal information to third parties.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              6. Prohibited Activities
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 16, lineHeight: 22 }}>
              • Fraudulent activities or misrepresentation.{'\n'}
              • Harassment or abusive behavior towards other users.{'\n'}
              • Circumventing the platform for direct transactions.
            </Text>

            <Text style={{ fontSize: 16, fontWeight: '700', color: titleColor, marginBottom: 8 }}>
              7. Account Termination
            </Text>
            <Text style={{ fontSize: 14, color: bodyColor, marginBottom: 32, lineHeight: 22 }}>
              • We reserve the right to suspend or terminate accounts that violate these terms.{'\n'}
              • Users may request account deletion at any time.
            </Text>
          </>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: isDark ? theme.colors.border : '#E5E7EB', paddingTop: 16, marginBottom: 32 }}>
          <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF', textAlign: 'center' }}>
            For questions about these Terms & Conditions, please contact us at support@gssmaasin.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsScreen;
