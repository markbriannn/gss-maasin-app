import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {globalStyles} from '../../css/globalStyles';
import {TierBadge, BadgeList} from '../../components/gamification';
import {getUserTierAndBadges} from '../../services/gamificationService';

const ClientProfileScreen = ({navigation}) => {
  const {user, logout} = useAuth();
  const {isDark, theme, toggleTheme} = useTheme();
  const [gamificationData, setGamificationData] = useState(null);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    const userId = user?.uid || user?.id;
    if (userId) {
      const data = await getUserTierAndBadges(userId, 'CLIENT');
      setGamificationData(data);
    }
  };

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
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    {id: 1, icon: 'person-outline', title: 'Edit Profile', screen: 'EditProfile'},
    {id: 2, icon: 'trophy-outline', title: 'Leaderboard', screen: 'Leaderboard'},
    {id: 3, icon: 'time-outline', title: 'Service History', screen: 'ServiceHistory'},
    {id: 4, icon: 'card-outline', title: 'Payment Methods', screen: 'PaymentMethods'},
    {id: 5, icon: 'heart-outline', title: 'Favorite Providers', screen: 'Favorites'},
    {id: 6, icon: 'notifications-outline', title: 'Notifications', screen: 'Notifications'},
    {id: 7, icon: 'help-circle-outline', title: 'Help Center', screen: 'Help'},
    {id: 8, icon: 'document-text-outline', title: 'Terms & Conditions', screen: 'Terms'},
    {id: 9, icon: 'information-circle-outline', title: 'About Us', screen: 'About'},
  ];

  return (
    <SafeAreaView style={[globalStyles.container, {backgroundColor: isDark ? theme.colors.background : '#FFFFFF'}]} edges={['top']}>
      <ScrollView>
        <View style={{backgroundColor: '#00B14F', padding: 24, alignItems: 'center'}}>
          <View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden'}}>
            {user?.profilePhoto || user?.photo ? (
              <Image 
                source={{uri: user.profilePhoto || user.photo}} 
                style={{width: 100, height: 100, borderRadius: 50}} 
                resizeMode="cover"
              />
            ) : (
              <Icon name="person" size={50} color="#00B14F" />
            )}
          </View>
          <Text style={{fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4}}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={{fontSize: 14, color: '#FFFFFF', opacity: 0.9}}>
            {user?.email}
          </Text>
          
          {/* Gamification Tier & Badges */}
          {gamificationData && (
            <View style={{alignItems: 'center', marginTop: 12}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <TierBadge tier={gamificationData.tier} size="medium" />
                <View style={{marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12}}>
                  <Text style={{fontSize: 14, fontWeight: '700', color: '#FFFFFF'}}>
                    {gamificationData.points?.toLocaleString() || 0} pts
                  </Text>
                </View>
              </View>
              {gamificationData.badges && gamificationData.badges.length > 0 && (
                <BadgeList badges={gamificationData.badges} maxDisplay={4} size="small" />
              )}
            </View>
          )}
          
          {/* Display User Location */}
          {(user?.barangay || user?.streetAddress) && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
              <Icon name="location" size={16} color="#FFFFFF" />
              <Text style={{fontSize: 13, color: '#FFFFFF', opacity: 0.9, marginLeft: 4}}>
                {user?.barangay 
                  ? `Brgy. ${user.barangay}, Maasin City`
                  : `${user.streetAddress}, Maasin City`
                }
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={{marginTop: 16, paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)'}}
            onPress={() => navigation.navigate('EditProfile')}>
            <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF'}}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{backgroundColor: isDark ? theme.colors.background : '#F9FAFB', paddingTop: 8}}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
                marginBottom: 1,
              }}
              onPress={() => navigation.navigate(item.screen)}>
              <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? theme.colors.border : '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
                <Icon name={item.icon} size={22} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              </View>
              <Text style={{flex: 1, fontSize: 16, color: isDark ? theme.colors.text : '#1F2937'}}>
                {item.title}
              </Text>
              <Icon name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          {/* Dark Mode Toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              marginTop: 8,
            }}>
            <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
              <Icon name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#93C5FD' : '#3B82F6'} />
            </View>
            <Text style={{flex: 1, fontSize: 16, color: isDark ? theme.colors.text : '#1F2937'}}>
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{false: '#D1D5DB', true: '#00B14F'}}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              marginTop: 8,
            }}
            onPress={handleLogout}>
            <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 16}}>
              <Icon name="log-out-outline" size={22} color="#EF4444" />
            </View>
            <Text style={{flex: 1, fontSize: 16, color: '#EF4444', fontWeight: '600'}}>
              Logout
            </Text>
          </TouchableOpacity>

          <View style={{padding: 24, alignItems: 'center'}}>
            <Text style={{fontSize: 12, color: '#9CA3AF'}}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClientProfileScreen;
