import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {collection, query, where, getDocs, onSnapshot} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {useNotifications} from '../../context/NotificationContext';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

const AdminDashboardScreen = ({navigation}) => {
  const {logout, user} = useAuth();
  const {isDark, theme} = useTheme();
  const {unreadCount: notificationCount} = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  const [statistics, setStatistics] = useState({
    pendingProviders: 0,
    pendingJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    totalRevenue: 0,
    totalProviders: 0,
    totalClients: 0,
    // System fee earnings
    todaySystemFees: 0,
    weekSystemFees: 0,
    totalSystemFees: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  const quickActions = [
    {id: 1, icon: 'people', title: 'Providers', subtitle: 'Manage', color: '#00B14F', screen: 'Providers'},
    {id: 2, icon: 'briefcase', title: 'Jobs', subtitle: 'Review', color: '#3B82F6', screen: 'Jobs'},
    {id: 3, icon: 'map', title: 'Live Map', subtitle: 'Track', color: '#F59E0B', screen: 'Map'},
    {id: 4, icon: 'bar-chart', title: 'Analytics', subtitle: 'Reports', color: '#8B5CF6', screen: 'AdminAnalytics'},
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch providers stats
      const providersQuery = query(collection(db, 'users'), where('role', '==', 'PROVIDER'));
      const providersSnapshot = await getDocs(providersQuery);
      const allProviders = providersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      
      const pendingProviders = allProviders.filter(p => p.status === 'pending' || !p.status).length;
      const totalProviders = allProviders.length;

      // Fetch clients stats
      const clientsQuery = query(collection(db, 'users'), where('role', '==', 'CLIENT'));
      const clientsSnapshot = await getDocs(clientsQuery);
      const totalClients = clientsSnapshot.docs.length;

      // Fetch jobs stats
      const jobsQuery = query(collection(db, 'bookings'));
      const jobsSnapshot = await getDocs(jobsQuery);
      const allJobs = jobsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      
      const pendingJobs = allJobs.filter(j => j.status === 'pending').length;
      const activeJobs = allJobs.filter(j => j.status === 'in_progress').length;
      const completedJobs = allJobs.filter(j => j.status === 'completed').length;

      // Calculate revenue (from completed jobs)
      const completedJobsList = allJobs.filter(j => j.status === 'completed');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      let todayRevenue = 0;
      let weekRevenue = 0;
      let totalRevenue = 0;
      let todaySystemFees = 0;
      let weekSystemFees = 0;
      let totalSystemFees = 0;
      
      completedJobsList.forEach(job => {
        const amount = job.totalAmount || job.amount || job.price || 0;
        const systemFee = job.systemFee || (amount * 0.05 / 1.05); // Calculate 5% fee if not stored
        
        totalRevenue += amount;
        totalSystemFees += systemFee;
        
        let completedDate = null;
        if (job.completedAt?.toDate) {
          completedDate = job.completedAt.toDate();
        } else if (job.completedAt) {
          completedDate = new Date(job.completedAt);
        } else if (job.updatedAt?.toDate) {
          completedDate = job.updatedAt.toDate();
        }
        
        if (completedDate) {
          if (completedDate >= todayStart) {
            todayRevenue += amount;
            todaySystemFees += systemFee;
          }
          if (completedDate >= weekStart) {
            weekRevenue += amount;
            weekSystemFees += systemFee;
          }
        }
      });

      setStatistics({
        pendingProviders,
        pendingJobs,
        activeJobs,
        completedJobs,
        todayRevenue,
        weekRevenue,
        totalRevenue,
        totalProviders,
        totalClients,
        todaySystemFees,
        weekSystemFees,
        totalSystemFees,
      });

      // Create recent activity from latest data
      const activities = [];
      
      // Recent providers (pending)
      const recentProviders = allProviders
        .filter(p => p.status === 'pending' || !p.status)
        .slice(0, 2);
      recentProviders.forEach(p => {
        activities.push({
          id: `provider_${p.id}`,
          icon: 'person-add',
          color: '#00B14F',
          message: `New provider: ${p.firstName || ''} ${p.lastName || p.email?.split('@')[0] || 'Unknown'}`,
          time: 'Pending approval',
        });
      });

      // Recent completed jobs
      const recentCompleted = allJobs
        .filter(j => j.status === 'completed')
        .slice(0, 2);
      recentCompleted.forEach(j => {
        activities.push({
          id: `job_${j.id}`,
          icon: 'checkmark-circle',
          color: '#3B82F6',
          message: `Job ${j.title || j.id} completed`,
          time: j.completedAt?.toDate?.()?.toLocaleDateString() || 'Recently',
        });
      });

      // Recent pending jobs
      const recentPending = allJobs
        .filter(j => j.status === 'pending')
        .slice(0, 2);
      recentPending.forEach(j => {
        activities.push({
          id: `pending_${j.id}`,
          icon: 'time',
          color: '#F59E0B',
          message: `New job request: ${j.title || j.category || 'Service'}`,
          time: 'Needs review',
        });
      });

      setRecentActivity(activities.slice(0, 4));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: isDark ? theme.colors.background : '#F3F4F6'}} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
        }
      >
        {/* Header */}
        <View style={{
          backgroundColor: '#00B14F',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 60,
        }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View>
              <Text style={{fontSize: 16, color: 'rgba(255,255,255,0.8)'}}>Welcome back,</Text>
              <Text style={{fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 4}}>
                Admin
              </Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="notifications" size={22} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{fontSize: 10, fontWeight: '700', color: '#FFFFFF'}}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleLogout}
              >
                <Icon name="log-out-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Revenue Card */}
        <View style={{
          marginHorizontal: 20,
          marginTop: -40,
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={{fontSize: 14, color: '#6B7280'}}>Today's Revenue</Text>
            <View style={{
              backgroundColor: statistics.todayRevenue > 0 ? '#D1FAE5' : '#FEE2E2',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{fontSize: 12, fontWeight: '600', color: statistics.todayRevenue > 0 ? '#059669' : '#DC2626'}}>
                {statistics.todayRevenue > 0 ? 'Active' : 'No sales yet'}
              </Text>
            </View>
          </View>
          <Text style={{fontSize: 36, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 20}}>
            ₱{statistics.todayRevenue.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </Text>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 12, color: '#9CA3AF', marginBottom: 4}}>This Week</Text>
              <Text style={{fontSize: 16, fontWeight: '600', color: '#374151'}}>
                ₱{statistics.weekRevenue.toLocaleString('en-PH', {minimumFractionDigits: 2})}
              </Text>
            </View>
            <View style={{width: 1, backgroundColor: isDark ? theme.colors.border : '#E5E7EB', marginHorizontal: 12}} />
            <View style={{flex: 1}}>
              <Text style={{fontSize: 12, color: '#9CA3AF', marginBottom: 4}}>Total Revenue</Text>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#374151'}}>
                ₱{statistics.totalRevenue.toLocaleString('en-PH', {minimumFractionDigits: 2})}
              </Text>
            </View>
            <View style={{width: 1, backgroundColor: isDark ? theme.colors.border : '#E5E7EB', marginHorizontal: 12}} />
            <View style={{flex: 1}}>
              <Text style={{fontSize: 12, color: '#9CA3AF', marginBottom: 4}}>Completed</Text>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#374151'}}>
                {statistics.completedJobs} jobs
              </Text>
            </View>
          </View>
        </View>

        {/* System Earnings Card (5% Fee) */}
        <TouchableOpacity 
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            backgroundColor: '#FEF3C7',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: '#FCD34D',
          }}
          onPress={() => navigation.navigate('AdminEarnings')}
          activeOpacity={0.8}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
            <Icon name="cash" size={24} color="#F59E0B" />
            <Text style={{fontSize: 16, fontWeight: '700', color: '#92400E', marginLeft: 10}}>
              System Earnings (5% Fee)
            </Text>
            <Icon name="chevron-forward" size={20} color="#F59E0B" style={{marginLeft: 'auto'}} />
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 11, color: '#92400E', marginBottom: 4}}>Today</Text>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#92400E'}}>
                ₱{statistics.todaySystemFees.toLocaleString('en-PH', {minimumFractionDigits: 2})}
              </Text>
            </View>
            <View style={{width: 1, backgroundColor: '#FCD34D', marginHorizontal: 8}} />
            <View style={{flex: 1}}>
              <Text style={{fontSize: 11, color: '#92400E', marginBottom: 4}}>This Week</Text>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#92400E'}}>
                ₱{statistics.weekSystemFees.toLocaleString('en-PH', {minimumFractionDigits: 2})}
              </Text>
            </View>
            <View style={{width: 1, backgroundColor: '#FCD34D', marginHorizontal: 8}} />
            <View style={{flex: 1}}>
              <Text style={{fontSize: 11, color: '#92400E', marginBottom: 4}}>All Time</Text>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#92400E'}}>
                ₱{statistics.totalSystemFees.toLocaleString('en-PH', {minimumFractionDigits: 2})}
              </Text>
            </View>
          </View>
          <View style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#FCD34D',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="wallet" size={16} color="#D97706" />
            <Text style={{fontSize: 13, fontWeight: '600', color: '#D97706', marginLeft: 6}}>
              Tap to withdraw earnings
            </Text>
          </View>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 16,
          marginTop: 20,
          gap: 12,
        }}>
          <View style={{
            width: CARD_WIDTH,
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Icon name="time" size={20} color="#EF4444" />
            </View>
            <Text style={{fontSize: 24, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>{statistics.pendingProviders}</Text>
            <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 4}}>Pending Providers</Text>
          </View>
          
          <View style={{
            width: CARD_WIDTH,
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FEF3C7',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Icon name="document-text" size={20} color="#F59E0B" />
            </View>
            <Text style={{fontSize: 24, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>{statistics.pendingJobs}</Text>
            <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 4}}>Pending Jobs</Text>
          </View>
          
          <View style={{
            width: CARD_WIDTH,
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#DBEAFE',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Icon name="flash" size={20} color="#3B82F6" />
            </View>
            <Text style={{fontSize: 24, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>{statistics.activeJobs}</Text>
            <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 4}}>Active Jobs</Text>
          </View>
          
          <View style={{
            width: CARD_WIDTH,
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#D1FAE5',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Icon name="people" size={20} color="#059669" />
            </View>
            <Text style={{fontSize: 24, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>{statistics.totalProviders}</Text>
            <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 4}}>Total Providers</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{paddingHorizontal: 20, marginTop: 24}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 16}}>
            Quick Actions
          </Text>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={{
                  alignItems: 'center',
                  width: (width - 60) / 4,
                }}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: action.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                  shadowColor: action.color,
                  shadowOffset: {width: 0, height: 4},
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}>
                  <Icon name={action.icon} size={26} color="#FFFFFF" />
                </View>
                <Text style={{fontSize: 12, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', textAlign: 'center'}}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Reviews */}
        <View style={{paddingHorizontal: 20, marginTop: 24}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 16}}>
            Needs Attention
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={() => navigation.navigate('Providers')}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: '#FEF3C7',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}>
              <Icon name="person-add" size={24} color="#F59E0B" />
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                Pending Provider Approvals
              </Text>
              <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 2}}>
                {statistics.pendingProviders} providers waiting for review
              </Text>
            </View>
            <View style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}>
              <Text style={{fontSize: 14, fontWeight: '700', color: '#FFFFFF'}}>
                {statistics.pendingProviders}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('Jobs')}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: '#DBEAFE',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}>
              <Icon name="clipboard" size={24} color="#3B82F6" />
            </View>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                Pending Job Requests
              </Text>
              <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 2}}>
                {statistics.pendingJobs} jobs awaiting approval
              </Text>
            </View>
            <View style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
            }}>
              <Text style={{fontSize: 14, fontWeight: '700', color: '#FFFFFF'}}>
                {statistics.pendingJobs}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={{paddingHorizontal: 20, marginTop: 24, marginBottom: 100}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 16}}>
            Recent Activity
          </Text>
          <View style={{
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {recentActivity.map((activity, index) => (
              <View
                key={activity.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: index < recentActivity.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${activity.color}15`,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Icon name={activity.icon} size={20} color={activity.color} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.text : '#1F2937', fontWeight: '500'}}>
                    {activity.message}
                  </Text>
                  <Text style={{fontSize: 12, color: '#9CA3AF', marginTop: 2}}>
                    {activity.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboardScreen;
