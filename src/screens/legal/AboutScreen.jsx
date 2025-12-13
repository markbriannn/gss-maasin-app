import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useTheme} from '../../context/ThemeContext';

const AboutScreen = ({navigation}) => {
  const {isDark, theme} = useTheme();
  
  const handleOpenLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 16}}>
          About Us
        </Text>
      </View>

      <ScrollView style={{flex: 1}}>
        <View style={{alignItems: 'center', paddingVertical: 32, backgroundColor: '#00B14F'}}>
          <View style={{width: 100, height: 100, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
            <Icon name="construct" size={50} color="#00B14F" />
          </View>
          <Text style={{fontSize: 24, fontWeight: '700', color: '#FFFFFF'}}>
            GSS Maasin
          </Text>
          <Text style={{fontSize: 14, color: '#FFFFFF', opacity: 0.9, marginTop: 4}}>
            Your Local Service Solution
          </Text>
          <Text style={{fontSize: 12, color: '#FFFFFF', opacity: 0.7, marginTop: 8}}>
            Version 1.0.0
          </Text>
        </View>

        <View style={{padding: 16, backgroundColor: isDark ? theme.colors.background : '#FFFFFF'}}>
          <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
            Our Mission
          </Text>
          <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginBottom: 24, lineHeight: 22}}>
            GSS Maasin is dedicated to connecting the people of Maasin City with reliable and skilled service providers. We aim to make finding and booking local services as easy as a few taps on your phone.
          </Text>

          <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
            What We Offer
          </Text>
          <View style={{marginBottom: 24}}>
            {[
              'Verified local service providers',
              'Secure booking and payment',
              'Real-time tracking',
              'Customer reviews and ratings',
              '24/7 customer support',
            ].map((item, index) => (
              <View key={index} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Icon name="checkmark-circle" size={20} color="#00B14F" />
                <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginLeft: 8}}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={{fontSize: 16, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
            Contact Us
          </Text>
          <TouchableOpacity
            style={{flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isDark ? theme.colors.card : '#F3F4F6', borderRadius: 8, marginBottom: 8}}
            onPress={() => handleOpenLink('mailto:support@gssmaasin.com')}>
            <Icon name="mail-outline" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginLeft: 12}}>support@gssmaasin.com</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isDark ? theme.colors.card : '#F3F4F6', borderRadius: 8, marginBottom: 8}}
            onPress={() => handleOpenLink('tel:+639123456789')}>
            <Icon name="call-outline" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginLeft: 12}}>+63 912 345 6789</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isDark ? theme.colors.card : '#F3F4F6', borderRadius: 8, marginBottom: 24}}
            onPress={() => handleOpenLink('https://www.gssmaasin.com')}>
            <Icon name="globe-outline" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#4B5563', marginLeft: 12}}>www.gssmaasin.com</Text>
          </TouchableOpacity>

          <View style={{alignItems: 'center', paddingVertical: 16}}>
            <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF'}}>
              © 2024 GSS Maasin. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutScreen;
