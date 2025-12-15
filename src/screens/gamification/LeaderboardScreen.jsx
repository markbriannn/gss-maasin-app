import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TouchableOpacity, ScrollView, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../context/ThemeContext';
import {useAuth} from '../../context/AuthContext';
import {globalStyles} from '../../css/globalStyles';
import {Leaderboard, TierCard} from '../../components/gamification';
import {
  getProviderLeaderboard,
  getClientLeaderboard,
  getUserTierAndBadges,
} from '../../services/gamificationService';

const LeaderboardScreen = ({navigation}) => {
  const {isDark, theme} = useTheme();
  const {user} = useAuth();
  const [activeTab, setActiveTab] = useState('providers');
  const [providerData, setProviderData] = useState([]);
  const [clientData, setClientData] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [providers, clients, stats] = await Promise.all([
        getProviderLeaderboard(20),
        getClientLeaderboard(20),
        user?.uid ? getUserTierAndBadges(user.uid, user.role) : null,
      ]);
      setProviderData(providers);
      setClientData(clients);
      setMyStats(stats);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isProvider = user?.role?.toUpperCase() === 'PROVIDER';

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? theme.colors.border : '#E5E7EB',
        backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 16}}>
          Leaderboard
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />}
        contentContainerStyle={{paddingBottom: 20}}
      >
        {/* My Stats Card */}
        {myStats && (
          <View style={{padding: 16}}>
            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 8}}>
              Your Progress
            </Text>
            <TierCard points={myStats.points} isProvider={isProvider} />
          </View>
        )}

        {/* Tab Switcher */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 8,
          backgroundColor: isDark ? theme.colors.card : '#F3F4F6',
          borderRadius: 12,
          padding: 4,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === 'providers' ? '#00B14F' : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setActiveTab('providers')}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: activeTab === 'providers' ? '#FFFFFF' : (isDark ? theme.colors.textSecondary : '#6B7280'),
            }}>
              Top Providers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === 'clients' ? '#00B14F' : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setActiveTab('clients')}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: activeTab === 'clients' ? '#FFFFFF' : (isDark ? theme.colors.textSecondary : '#6B7280'),
            }}>
              Top Clients
            </Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard */}
        <Leaderboard
          data={activeTab === 'providers' ? providerData : clientData}
          loading={loading}
          isProvider={activeTab === 'providers'}
          title={activeTab === 'providers' ? 'Top Providers in Maasin' : 'Top Clients in Maasin'}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default LeaderboardScreen;
