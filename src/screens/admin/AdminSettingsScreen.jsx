import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Switch, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';

const AdminSettingsScreen = ({navigation}) => {
  const {logout} = useAuth();
  const {isDark, toggleTheme, theme} = useTheme();
  const colors = theme.colors;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {id: 'notifications', icon: 'notifications-outline', title: 'Notifications', screen: 'Notifications'},
    {id: 'messages', icon: 'chatbubbles-outline', title: 'Messages', screen: 'AdminMessages'},
    {id: 'help', icon: 'help-circle-outline', title: 'Help & Support', screen: 'Help'},
    {id: 'about', icon: 'information-circle-outline', title: 'About', screen: 'About'},
  ];

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.background}}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{padding: 8, marginRight: 8}}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{fontSize: 20, fontWeight: '700', color: colors.text}}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
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
            thumbColor="#FFFFFF"
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

        {/* Logout Button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FEE2E2',
            padding: 16,
            borderRadius: 12,
            marginTop: 20,
          }}
          onPress={handleLogout}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FECACA',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16,
            }}>
            <Icon name="log-out-outline" size={22} color="#DC2626" />
          </View>
          <Text style={{flex: 1, fontSize: 16, fontWeight: '600', color: '#DC2626'}}>
            Logout
          </Text>
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminSettingsScreen;
