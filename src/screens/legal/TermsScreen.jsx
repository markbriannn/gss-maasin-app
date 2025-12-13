import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useTheme} from '../../context/ThemeContext';

const TermsScreen = ({navigation}) => {
  const {isDark, theme} = useTheme();
  
  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 16}}>
          Terms & Conditions
        </Text>
      </View>

      <ScrollView style={{flex: 1, padding: 16}}>
        <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginBottom: 16}}>
          Last updated: December 2024
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          1. Acceptance of Terms
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 16, lineHeight: 22}}>
          By accessing and using the GSS Maasin application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          2. Service Description
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 16, lineHeight: 22}}>
          GSS Maasin provides a platform that connects clients with local service providers in Maasin City and surrounding areas. We facilitate the booking process but are not responsible for the actual services provided by the service providers.
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          3. User Responsibilities
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 16, lineHeight: 22}}>
          Users are responsible for providing accurate information, maintaining the security of their account credentials, and using the service in compliance with all applicable laws and regulations.
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          4. Service Provider Terms
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 16, lineHeight: 22}}>
          Service providers must maintain valid licenses and insurance as required by law. They agree to provide services professionally and in accordance with the booking terms agreed upon with clients.
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          5. Payment Terms
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 16, lineHeight: 22}}>
          Payments for services are processed through our secure payment system. Refund policies vary depending on the nature of the service and cancellation timing.
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          6. Privacy Policy
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 16, lineHeight: 22}}>
          Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
        </Text>

        <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
          7. Contact Information
        </Text>
        <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 32, lineHeight: 22}}>
          For any questions about these Terms & Conditions, please contact us at support@gssmaasin.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsScreen;
