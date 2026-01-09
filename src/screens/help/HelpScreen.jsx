import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {APP_CONFIG} from '../../config/constants';
import {db} from '../../config/firebase';
import {collection, query, where, getDocs} from 'firebase/firestore';

const HelpScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const isProvider = user?.role === 'PROVIDER';
  const isAdmin = user?.role === 'ADMIN';
  const [loadingChat, setLoadingChat] = useState(false);

  // Navigate to chat with admin/support
  const handleChatWithSupport = async () => {
    if (isAdmin) return; // Admin doesn't need to chat with themselves
    
    setLoadingChat(true);
    try {
      // Find an admin user
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'ADMIN')
      );
      const adminsSnapshot = await getDocs(adminsQuery);
      
      if (!adminsSnapshot.empty) {
        const adminDoc = adminsSnapshot.docs[0];
        const adminData = adminDoc.data();
        
        navigation.navigate('Chat', {
          recipient: {
            id: adminDoc.id,
            name: 'GSS Support',
            role: 'ADMIN',
            profilePhoto: adminData.profilePhoto || null,
          },
        });
      } else {
        console.log('No admin users found');
      }
    } catch (error) {
      console.error('Error finding admin:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  // Client FAQs
  const clientFaqItems = [
    {
      id: 1,
      question: 'How do I book a service?',
      answer: 'Browse providers on the map or home screen, select one, view their profile, and tap "Contact Us" to create a booking.',
    },
    {
      id: 2,
      question: 'How does payment work?',
      answer: `You can pay via GCash, Maya, or Cash. A ${APP_CONFIG.SERVICE_FEE_PERCENTAGE}% service fee is added to the provider's price. Payment is processed after service completion.`,
    },
    {
      id: 3,
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel before the provider starts the job. Go to your bookings and tap "Cancel". Note: Repeated cancellations may affect your account.',
    },
    {
      id: 4,
      question: 'How do I track my service provider?',
      answer: 'Once your booking is accepted, you can see the provider\'s status in your booking details. You\'ll receive notifications when they\'re on the way.',
    },
    {
      id: 5,
      question: 'How do I leave a review?',
      answer: 'After the job is completed, you\'ll be prompted to rate and review the provider. You can also do this from your booking history.',
    },
    {
      id: 6,
      question: 'What if I have a problem with the service?',
      answer: 'You can report an issue through the booking details or contact our support team. We\'ll help resolve any disputes.',
    },
  ];

  // Provider FAQs
  const providerFaqItems = [
    {
      id: 1,
      question: 'How do I receive job requests?',
      answer: 'Job requests will appear in your Jobs tab under "Available". You\'ll also receive notifications for new jobs matching your service category.',
    },
    {
      id: 2,
      question: 'How do I get paid?',
      answer: `After completing a job, earnings are added to your wallet. You can request a payout to your GCash or Maya account anytime (minimum ${APP_CONFIG.CURRENCY_SYMBOL}${APP_CONFIG.MINIMUM_PAYOUT_AMOUNT}).`,
    },
    {
      id: 3,
      question: 'What is the service fee?',
      answer: `${APP_CONFIG.APP_NAME} charges a ${APP_CONFIG.SERVICE_FEE_PERCENTAGE}% service fee on each completed job. This is deducted from your earnings automatically.`,
    },
    {
      id: 4,
      question: 'How do I set my prices?',
      answer: 'Go to your Profile > Edit Profile to set your service price. You can choose "Per Job" or "Per Hire" pricing.',
    },
    {
      id: 5,
      question: 'Can I decline a job request?',
      answer: 'Yes, you can decline jobs that don\'t fit your schedule. However, maintaining a good acceptance rate helps you get more clients.',
    },
    {
      id: 6,
      question: 'How do I improve my rating?',
      answer: 'Provide quality service, arrive on time, communicate clearly with clients, and complete jobs professionally. Good reviews boost your visibility.',
    },
    {
      id: 7,
      question: 'How long does payout take?',
      answer: 'Payouts to GCash or Maya are processed within 24 hours. Make sure your account details are correct in your Wallet settings.',
    },
    {
      id: 8,
      question: 'What if a client cancels?',
      answer: 'If a client cancels before you start, the job is removed from your list. Repeated client cancellations are tracked by our system.',
    },
  ];

  const faqItems = isProvider ? providerFaqItems : clientFaqItems;

  const contactOptions = [
    {id: 1, icon: 'call', title: 'Call Us', value: '+63 917 123 4567', action: () => Linking.openURL('tel:+639171234567')},
    {id: 2, icon: 'mail', title: 'Email Us', value: 'support@gssmaasin.com', action: () => Linking.openURL('mailto:support@gssmaasin.com')},
    {id: 3, icon: 'logo-facebook', title: 'Facebook', value: 'GSS Maasin', action: () => Linking.openURL('https://facebook.com/gssmaasin')},
  ];

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? theme.colors.border : '#E5E7EB',
        backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[globalStyles.heading3, {marginLeft: 16}, isDark && {color: theme.colors.text}]}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        {/* Role indicator */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isProvider ? '#F0FDF4' : '#EFF6FF',
          padding: 12,
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <Icon 
            name={isProvider ? 'construct' : 'person'} 
            size={20} 
            color={isProvider ? '#00B14F' : '#3B82F6'} 
          />
          <Text style={{
            marginLeft: 10,
            fontSize: 14,
            color: isProvider ? '#166534' : '#1E40AF',
            fontWeight: '500',
          }}>
            {isProvider ? 'Provider Help Center' : 'Client Help Center'}
          </Text>
        </View>

        <Text style={[globalStyles.heading4, {marginBottom: 16}, isDark && {color: theme.colors.text}]}>
          Frequently Asked Questions
        </Text>

        {faqItems.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
            <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#00B14F',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
                marginTop: 2,
              }}>
                <Text style={{color: '#FFFFFF', fontSize: 12, fontWeight: '700'}}>Q</Text>
              </View>
              <Text style={{fontSize: 15, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', flex: 1}}>
                {item.question}
              </Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginTop: 12}}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isDark ? theme.colors.border : '#E5E7EB',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
                marginTop: 2,
              }}>
                <Text style={{color: isDark ? theme.colors.textSecondary : '#6B7280', fontSize: 12, fontWeight: '700'}}>A</Text>
              </View>
              <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', lineHeight: 22, flex: 1}}>
                {item.answer}
              </Text>
            </View>
          </View>
        ))}

        <Text style={[globalStyles.heading4, {marginTop: 24, marginBottom: 16}, isDark && {color: theme.colors.text}]}>
          Contact Us
        </Text>

        {/* Chat with Support - Primary option */}
        {!isAdmin && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#00B14F',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#00B14F',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleChatWithSupport}
            disabled={loadingChat}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
              {loadingChat ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="chatbubbles" size={22} color="#FFFFFF" />
              )}
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 2}}>
                Live Chat
              </Text>
              <Text style={{fontSize: 15, fontWeight: '600', color: '#FFFFFF'}}>
                Chat with GSS Support
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {contactOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={option.action}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
              <Icon name={option.icon} size={22} color="#00B14F" />
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 2}}>
                {option.title}
              </Text>
              <Text style={{fontSize: 15, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                {option.value}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          </TouchableOpacity>
        ))}

        {/* Emergency Contact for Providers */}
        {isProvider && (
          <View style={{
            backgroundColor: '#FEF2F2',
            padding: 16,
            borderRadius: 12,
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#FECACA',
          }}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon name="warning" size={20} color="#DC2626" />
              <Text style={{fontSize: 14, fontWeight: '600', color: '#991B1B', marginLeft: 8}}>
                Emergency Support
              </Text>
            </View>
            <Text style={{fontSize: 13, color: '#7F1D1D', marginTop: 8, lineHeight: 20}}>
              For urgent issues during a job (safety concerns, disputes), call our emergency hotline immediately.
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#DC2626',
                paddingVertical: 10,
                borderRadius: 8,
                marginTop: 12,
                alignItems: 'center',
              }}
              onPress={() => Linking.openURL('tel:+639171234567')}>
              <Text style={{color: '#FFFFFF', fontWeight: '600'}}>Call Emergency Line</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpScreen;
