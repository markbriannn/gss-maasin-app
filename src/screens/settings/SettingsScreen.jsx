import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Switch} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';

const SettingsScreen = ({navigation}) => {
  const {userRole} = useAuth();
  const {isDark, toggleTheme, theme} = useTheme();
  const role = (userRole || '').toUpperCase();

  const commonOptions = [
    {id: 'notifications', icon: 'notifications-outline', title: 'Notifications', screen: 'Notifications'},
    {id: 'help', icon: 'help-circle-outline', title: 'Help & Support', screen: 'Help'},
    {id: 'terms', icon: 'document-text-outline', title: 'Terms & Conditions', screen: 'Terms'},
    {id: 'about', icon: 'information-circle-outline', title: 'About', screen: 'About'},
  ];

  const clientOptions = [
    {id: 'payments', icon: 'card-outline', title: 'Payment Methods', screen: 'PaymentMethods'},
  ];

  const providerOptions = [
    {id: 'wallet', icon: 'wallet-outline', title: 'Wallet & Payouts', screen: 'Wallet'},
    {id: 'payout-setup', icon: 'swap-vertical-outline', title: 'Payout Setup', screen: 'PayoutSetup'},
    {id: 'transactions', icon: 'receipt-outline', title: 'Transaction History', screen: 'TransactionHistory'},
    {id: 'payments', icon: 'card-outline', title: 'Payment Methods', screen: 'PaymentMethods'},
  ];

  const settingsOptions =
    role === 'PROVIDER'
      ? [...providerOptions, ...commonOptions]
      : [...clientOptions, ...commonOptions];

  const colors = theme.colors;

  return (
    <SafeAreaView style={[globalStyles.container, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={[globalStyles.heading2, {marginBottom: 20, color: colors.text}]}>Settings</Text>
        
        {/* Dark Mode Toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? '#374151' : '#F0FDF4',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
            }}>
            <Icon name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#F59E0B' : '#00B14F'} />
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 16, fontWeight: '600', color: colors.text}}>
              Dark Mode
            </Text>
            <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>
              {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{false: '#E5E7EB', true: '#00B14F'}}
            thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>

        {/* Divider */}
        <View style={{height: 1, backgroundColor: colors.border, marginVertical: 8}} />
        
        {settingsOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.card,
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => navigation.navigate(option.screen)}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? '#374151' : '#F0FDF4',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
              <Icon name={option.icon} size={22} color="#00B14F" />
            </View>
            <Text style={{flex: 1, fontSize: 16, fontWeight: '600', color: colors.text}}>
              {option.title}
            </Text>
            <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
        
        <View style={{height: 20}} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
