import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {useNotifications} from '../../context/NotificationContext';
import {collection, query, where, getDocs, doc, updateDoc, getDoc} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {dashboardStyles} from '../../css/dashboardStyles';
import {useJobNotifications, useUserNotifications, useOfflineSupport} from '../../hooks/useRealtimeService';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const ProviderDashboardScreen = ({navigation}) => {
  const {user, logout} = useAuth();
  const {isDark, theme} = useTheme();
  const {unreadCount} = useNotifications();
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState({today: 0, week: 0});
  const [statistics, setStatistics] = useState({jobsToday: 0, activeJobs: 0, rating: 0});
  const [availableJobs, setAvailableJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [providerStatus, setProviderStatus] = useState('pending');
  
  // Real-time hooks
  const {online, queueOperation} = useOfflineSupport();
  const {jobs: realtimeJobs, loading: jobsLoading} = useJobNotifications(user?.uid, user?.serviceCategory);
  const {notifications, loading: notifLoading} = useUserNotifications(user?.uid);

  const normalizeRatingValue = (value) => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Listen for real-time job notifications
  useEffect(() => {
    if (realtimeJobs && realtimeJobs.length > 0) {
      // Show alert for new jobs
      Alert.alert(
        '🎉 New Jobs Available!',
        `You have ${realtimeJobs.length} new job${realtimeJobs.length > 1 ? 's' : ''} matching your service`,
        [
          { text: 'View Jobs', onPress: () => navigation.navigate('Jobs') },
          { text: 'Later', onPress: () => {} },
        ]
      );
    }
  }, [realtimeJobs]);

  // Show notification alerts
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length > 0) {
        // Optional: add badge or notification indicator
        console.log('Unread notifications:', unreadNotifications.length);
      }
    }
  }, [notifications]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const userStartingRating =
      normalizeRatingValue(user?.averageRating ?? user?.rating) ?? 0;
    let providerRating = userStartingRating;
    try {
      const userId = user?.uid || user?.id;
      
      // Get provider profile to check status
      if (userId) {
        const providerDoc = await getDoc(doc(db, 'users', userId));
        if (providerDoc.exists()) {
          const providerData = providerDoc.data();
          setProviderStatus(providerData.status || 'pending');
          setIsOnline(providerData.isOnline || false);
          const averageRating = normalizeRatingValue(providerData.averageRating);
          const legacyRating = normalizeRatingValue(providerData.rating);
          providerRating = averageRating ?? legacyRating ?? providerRating;
        }
      }

      // Fetch provider's jobs
      const myJobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', userId)
      );
      const myJobsSnapshot = await getDocs(myJobsQuery);
      const myJobs = myJobsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const completedJobs = myJobs.filter(j => j.status === 'completed');
      const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'accepted').length;
      
      let todayEarnings = 0;
      let weekEarnings = 0;
      let jobsToday = 0;

      completedJobs.forEach(job => {
        const amount = job.amount || job.price || 0;
        const completedDate = job.completedAt?.toDate?.() || new Date(job.completedAt);
        
        if (completedDate >= today) {
          todayEarnings += amount;
          jobsToday++;
        }
        if (completedDate >= weekAgo) {
          weekEarnings += amount;
        }
      });

      setEarnings({today: todayEarnings, week: weekEarnings});
      setStatistics({
        jobsToday,
        activeJobs,
        rating: Number.isFinite(providerRating) ? providerRating : 0,
      });

      // Fetch available jobs (pending/approved, not assigned)
      const availableQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'approved'])
      );
      const availableSnapshot = await getDocs(availableQuery);
      const available = [];
      
      for (const docSnap of availableSnapshot.docs) {
        const data = docSnap.data();
        if (!data.providerId) {
          // Get client info
          let clientInfo = {name: 'Unknown'};
          if (data.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) {
                const clientData = clientDoc.data();
                clientInfo.name = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Client';
              }
            } catch (e) {}
          }
          
          // Build full address from new location fields
          let fullLocation = '';
          if (data.houseNumber) fullLocation += data.houseNumber + ', ';
          if (data.streetAddress) fullLocation += data.streetAddress + ', ';
          if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
          fullLocation += 'Maasin City';
          
          // Fallback to old address format
          if (!data.streetAddress && !data.barangay) {
            fullLocation = data.location || data.address || 'Maasin City';
          }
          
          available.push({
            id: docSnap.id,
            title: data.title || data.serviceTitle || 'Service Request',
            category: data.category || data.serviceCategory || 'General',
            location: fullLocation,
            amount: data.amount || data.price || 0,
            client: clientInfo,
          });
        }
      }
      
      setAvailableJobs(available.slice(0, 5));

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleOnline = async (value) => {
    setIsOnline(value);
    try {
      const userId = user?.uid || user?.id;
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          isOnline: value,
          lastOnline: new Date(),
        });
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setIsOnline(!value);
    }
  };

  const handleJobPress = (jobId) => {
    navigation.navigate('ProviderJobDetails', {jobId});
  };

  const handleMenuPress = () => {
    // Show a menu with options: Profile, Settings, Logout
    Alert.alert('Menu', 'Choose an option', [
      {
        text: 'Profile',
        onPress: () => navigation.navigate('Profile'),
      },
      {
        text: 'Settings',
        onPress: () => navigation.navigate('Settings'),
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: handleLogout,
      },
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
    ]);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const ratingDisplay = Number.isFinite(statistics.rating)
    ? statistics.rating.toFixed(1).replace(/\.0$/, '')
    : '0';

  return (
    <SafeAreaView style={[dashboardStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      {/* Offline Indicator */}
      {!online && (
        <View style={{
          backgroundColor: '#FEF3C7',
          paddingVertical: 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <Icon name="wifi-off" size={16} color="#92400E" />
          <Text style={{fontSize: 12, color: '#92400E', fontWeight: '500'}}>
            You're offline. Your changes will sync when you're back online.
          </Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={dashboardStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
        }>
        
        <View style={dashboardStyles.header}>
          <View style={dashboardStyles.headerTop}>
            <TouchableOpacity
              style={dashboardStyles.menuButton}
              onPress={handleMenuPress}>
              <Icon name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={dashboardStyles.headerProfile}>
              <View style={dashboardStyles.headerProfilePhoto}>
                <Icon name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={dashboardStyles.headerProfileInfo}>
                <Text style={dashboardStyles.headerGreeting}>{getGreeting()}</Text>
                <Text style={dashboardStyles.headerName}>
                  {user?.firstName} {user?.lastName}
                </Text>
              </View>
            </View>
            <View style={dashboardStyles.onlineToggle}>
              <Text style={dashboardStyles.onlineToggleText}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{false: '#9CA3AF', true: '#34D399'}}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={[dashboardStyles.earningsCard, isDark && {backgroundColor: theme.colors.card}]}>
          <Text style={[dashboardStyles.earningsTitle, isDark && {color: theme.colors.textSecondary}]}>Today's Earnings</Text>
          <Text style={[dashboardStyles.earningsAmount, isDark && {color: theme.colors.text}]}>
            ₱{earnings.today.toLocaleString()}
          </Text>
          <View style={dashboardStyles.earningsRow}>
            <View style={dashboardStyles.earningsItem}>
              <Text style={[dashboardStyles.earningsItemLabel, isDark && {color: theme.colors.textSecondary}]}>This Week</Text>
              <Text style={[dashboardStyles.earningsItemValue, isDark && {color: theme.colors.text}]}>
                ₱{earnings.week.toLocaleString()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={dashboardStyles.withdrawButton}
            onPress={() => navigation.navigate('Earnings')}>
            <Text style={dashboardStyles.withdrawButtonText}>
              View Earnings
            </Text>
          </TouchableOpacity>
        </View>

        <View style={dashboardStyles.statsContainer}>
          <TouchableOpacity 
            style={[dashboardStyles.statCard, isDark && {backgroundColor: theme.colors.card}]}
            onPress={() => navigation.navigate('ServiceHistory')}>
            <View style={[dashboardStyles.statIconContainer, isDark && {backgroundColor: '#064E3B'}]}>
              <Icon name="briefcase" size={24} color="#00B14F" />
            </View>
            <Text style={[dashboardStyles.statValue, isDark && {color: theme.colors.text}]}>{statistics.jobsToday}</Text>
            <Text style={[dashboardStyles.statLabel, isDark && {color: theme.colors.textSecondary}]}>Jobs Today</Text>
          </TouchableOpacity>
          <View style={[dashboardStyles.statCard, isDark && {backgroundColor: theme.colors.card}]}>
            <View style={[dashboardStyles.statIconContainer, isDark && {backgroundColor: '#78350F'}]}>
              <Icon name="time" size={24} color="#F59E0B" />
            </View>
            <Text style={[dashboardStyles.statValue, isDark && {color: theme.colors.text}]}>{statistics.activeJobs}</Text>
            <Text style={[dashboardStyles.statLabel, isDark && {color: theme.colors.textSecondary}]}>Active Jobs</Text>
          </View>
          <View style={[dashboardStyles.statCard, isDark && {backgroundColor: theme.colors.card}]}>
            <View style={[dashboardStyles.statIconContainer, isDark && {backgroundColor: '#1E3A8A'}]}>
              <Icon name="star" size={24} color="#3B82F6" />
            </View>
            <Text style={[dashboardStyles.statValue, isDark && {color: theme.colors.text}]}>{ratingDisplay}</Text>
            <Text style={[dashboardStyles.statLabel, isDark && {color: theme.colors.textSecondary}]}>Rating</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={dashboardStyles.sectionHeader}>
          <Text style={[dashboardStyles.sectionTitle, isDark && {color: theme.colors.text}]}>Quick Actions</Text>
        </View>
        <View style={{flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16}}>
          <TouchableOpacity 
            style={{
              flex: 1, 
              flexDirection: 'row',
              alignItems: 'center', 
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF', 
              padding: 16, 
              borderRadius: 12,
              marginRight: 8,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => navigation.navigate('ServiceHistory')}>
            <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#064E3B' : '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
              <Icon name="receipt-outline" size={20} color="#00B14F" />
            </View>
            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>Service History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{
              flex: 1, 
              flexDirection: 'row',
              alignItems: 'center', 
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF', 
              padding: 16, 
              borderRadius: 12,
              marginLeft: 8,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => navigation.navigate('Notifications')}>
            <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#78350F' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
              <Icon name="notifications-outline" size={20} color="#F59E0B" />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{fontSize: 10, fontWeight: '700', color: '#FFFFFF'}}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>Notifications</Text>
          </TouchableOpacity>
        </View>

        <View style={dashboardStyles.sectionHeader}>
          <Text style={[dashboardStyles.sectionTitle, isDark && {color: theme.colors.text}]}>Available Jobs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={dashboardStyles.sectionAction}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={dashboardStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B14F" />
          </View>
        ) : availableJobs.length > 0 ? (
          availableJobs.slice(0, 3).map((job) => (
            <TouchableOpacity
              key={job.id}
              style={[dashboardStyles.jobCard, isDark && {backgroundColor: theme.colors.card}]}
              onPress={() => handleJobPress(job.id)}>
              <View style={dashboardStyles.jobCardHeader}>
                <View style={dashboardStyles.jobCategoryBadge}>
                  <Icon
                    name="construct"
                    size={12}
                    color="#D97706"
                    style={dashboardStyles.jobCategoryIcon}
                  />
                  <Text style={dashboardStyles.jobCategoryText}>
                    {job.serviceCategory}
                  </Text>
                </View>
              </View>
              <Text style={[dashboardStyles.jobTitle, isDark && {color: theme.colors.text}]}>{job.title}</Text>
              <View style={dashboardStyles.jobClient}>
                <Icon name="person-outline" size={16} color="#6B7280" />
                <Text style={dashboardStyles.jobClientText}>
                  {job.clientName}
                </Text>
              </View>
              <View style={dashboardStyles.jobLocation}>
                <Icon name="location-outline" size={16} color="#6B7280" />
                <Text style={dashboardStyles.jobLocationText}>
                  {job.distance ? `${job.distance} km away` : 'Nearby'}
                </Text>
              </View>
              <Text style={dashboardStyles.jobDescription} numberOfLines={2}>
                {job.description}
              </Text>
              <View style={dashboardStyles.jobFooter}>
                <Text style={dashboardStyles.jobTime}>
                  Posted {job.timeAgo}
                </Text>
                <View style={dashboardStyles.jobActions}>
                  <TouchableOpacity
                    style={[
                      dashboardStyles.jobActionButton,
                      dashboardStyles.jobActionButtonPrimary,
                    ]}
                    onPress={() => handleJobPress(job.id)}>
                    <Text
                      style={[
                        dashboardStyles.jobActionButtonText,
                        dashboardStyles.jobActionButtonTextPrimary,
                      ]}>
                      Accept
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={dashboardStyles.emptyState}>
            <Icon name="briefcase-outline" size={80} color={isDark ? theme.colors.border : '#E5E7EB'} />
            <Text style={[dashboardStyles.emptyStateTitle, isDark && {color: theme.colors.text}]}>
              No available jobs right now
            </Text>
            <Text style={[dashboardStyles.emptyStateText, isDark && {color: theme.colors.textSecondary}]}>
              New jobs will appear here when clients post them
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProviderDashboardScreen;
