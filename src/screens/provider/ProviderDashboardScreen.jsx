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
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {useNotifications} from '../../context/NotificationContext';
import {collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {dashboardStyles} from '../../css/dashboardStyles';
import {useJobNotifications, useUserNotifications, useOfflineSupport} from '../../hooks/useRealtimeService';
import {TierCard} from '../../components/gamification';
import {getUserTierAndBadges} from '../../services/gamificationService';
import {APP_CONFIG} from '../../config/constants';

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
  const [gamificationData, setGamificationData] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  
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
    
    // Update location when provider opens the app (if they're online)
    const updateLocationOnLoad = async () => {
      const userId = user?.uid || user?.id;
      if (!userId) return;
      
      try {
        const providerDoc = await getDoc(doc(db, 'users', userId));
        if (providerDoc.exists() && providerDoc.data().isOnline) {
          // Provider is online, update their location
          const location = await locationService.getCurrentLocation();
          if (location?.latitude && location?.longitude) {
            await updateDoc(doc(db, 'users', userId), {
              latitude: location.latitude,
              longitude: location.longitude,
              locationUpdatedAt: new Date(),
            });
            console.log('[Provider] Location updated on app open');
          }
        }
      } catch (e) {
        console.log('Could not update location on load:', e);
      }
    };
    updateLocationOnLoad();
    
    // Set up real-time listener for provider's jobs
    const userId = user?.uid || user?.id;
    if (!userId) return;
    
    const myJobsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(myJobsQuery, (snapshot) => {
      const myJobs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const completedJobs = myJobs.filter(j => j.status === 'completed');
      const payFirstConfirmedJobs = myJobs.filter(j => 
        j.status === 'payment_received' && j.isPaidUpfront === true
      );
      const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'accepted').length;
      
      let todayEarnings = 0;
      let weekEarnings = 0;
      let jobsToday = 0;

      // Process completed jobs
      completedJobs.forEach(job => {
        const approvedAdditionalCharges = job.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        
        // IMPORTANT: providerPrice is the provider's actual price (before 5% fee added to client)
        // Only divide by 1.05 if we're using totalAmount (which includes the fee)
        let providerEarnings;
        if (job.providerPrice || job.offeredPrice) {
          // Use provider's actual price directly
          providerEarnings = (job.providerPrice || job.offeredPrice) + approvedAdditionalCharges;
        } else if (job.totalAmount) {
          // totalAmount includes 5% fee, so remove it
          providerEarnings = (job.totalAmount / 1.05) + approvedAdditionalCharges;
        } else {
          providerEarnings = (job.price || job.amount || 0) + approvedAdditionalCharges;
        }
        
        const completedDate = job.completedAt?.toDate?.() || new Date(job.completedAt);
        
        if (completedDate >= today) {
          todayEarnings += providerEarnings;
          jobsToday++;
        }
        if (completedDate >= weekAgo) {
          weekEarnings += providerEarnings;
        }
      });
      
      // Process Pay First jobs
      payFirstConfirmedJobs.forEach(job => {
        const approvedAdditionalCharges = job.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        
        // IMPORTANT: providerPrice is the provider's actual price (before 5% fee added to client)
        // Only divide by 1.05 if we're using totalAmount (which includes the fee)
        let providerEarnings;
        if (job.providerPrice || job.offeredPrice) {
          // Use provider's actual price directly
          providerEarnings = (job.providerPrice || job.offeredPrice) + approvedAdditionalCharges;
        } else if (job.totalAmount) {
          // totalAmount includes 5% fee, so remove it
          providerEarnings = (job.totalAmount / 1.05) + approvedAdditionalCharges;
        } else {
          providerEarnings = (job.price || job.amount || 0) + approvedAdditionalCharges;
        }
        
        const confirmedDate = job.clientConfirmedAt?.toDate?.() || job.updatedAt?.toDate?.() || new Date();
        
        if (confirmedDate >= today) {
          todayEarnings += providerEarnings;
          jobsToday++;
        }
        if (confirmedDate >= weekAgo) {
          weekEarnings += providerEarnings;
        }
      });

      setEarnings({today: todayEarnings, week: weekEarnings});
      setStatistics(prev => ({
        ...prev,
        jobsToday,
        activeJobs,
      }));
    });
    
    return () => unsubscribe();
  }, [user]);

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

      // Include completed jobs AND Pay First jobs where client has confirmed (payment_received with isPaidUpfront)
      const completedJobs = myJobs.filter(j => j.status === 'completed');
      const payFirstConfirmedJobs = myJobs.filter(j => 
        j.status === 'payment_received' && j.isPaidUpfront === true
      );
      const activeJobs = myJobs.filter(j => j.status === 'in_progress' || j.status === 'accepted').length;
      
      let todayEarnings = 0;
      let weekEarnings = 0;
      let jobsToday = 0;

      // Process completed jobs
      completedJobs.forEach(job => {
        // Calculate the actual provider earnings including discounts and additional charges
        // IMPORTANT: providerPrice is the provider's actual price (before 5% fee added to client)
        // Only divide by 1.05 if we're using totalAmount (which includes the fee)
        const approvedAdditionalCharges = job.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        
        let providerEarnings;
        if (job.providerPrice || job.offeredPrice) {
          // Use provider's actual price directly
          providerEarnings = (job.providerPrice || job.offeredPrice) + approvedAdditionalCharges;
        } else if (job.totalAmount) {
          // totalAmount includes 5% fee, so remove it
          providerEarnings = (job.totalAmount / 1.05) + approvedAdditionalCharges;
        } else {
          providerEarnings = (job.price || job.amount || 0) + approvedAdditionalCharges;
        }
        
        const completedDate = job.completedAt?.toDate?.() || new Date(job.completedAt);
        
        if (completedDate >= today) {
          todayEarnings += providerEarnings;
          jobsToday++;
        }
        if (completedDate >= weekAgo) {
          weekEarnings += providerEarnings;
        }
      });
      
      // Process Pay First jobs where client confirmed (payment already received)
      payFirstConfirmedJobs.forEach(job => {
        const approvedAdditionalCharges = job.additionalCharges?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        
        // IMPORTANT: providerPrice is the provider's actual price (before 5% fee added to client)
        let providerEarnings;
        if (job.providerPrice || job.offeredPrice) {
          // Use provider's actual price directly
          providerEarnings = (job.providerPrice || job.offeredPrice) + approvedAdditionalCharges;
        } else if (job.totalAmount) {
          // totalAmount includes 5% fee, so remove it
          providerEarnings = (job.totalAmount / 1.05) + approvedAdditionalCharges;
        } else {
          providerEarnings = (job.price || job.amount || 0) + approvedAdditionalCharges;
        }
        
        // Use clientConfirmedAt for Pay First jobs since that's when payment was confirmed
        const confirmedDate = job.clientConfirmedAt?.toDate?.() || job.updatedAt?.toDate?.() || new Date();
        
        if (confirmedDate >= today) {
          todayEarnings += providerEarnings;
          jobsToday++;
        }
        if (confirmedDate >= weekAgo) {
          weekEarnings += providerEarnings;
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

      // Fetch gamification data
      const gamification = await getUserTierAndBadges(userId, 'PROVIDER');
      setGamificationData(gamification);

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
        const updateData = {
          isOnline: value,
          lastOnline: new Date(),
        };
        
        // When going online, also update current location so clients can see provider on map
        if (value) {
          try {
            const locationService = require('../../services/locationService').default;
            const location = await locationService.getCurrentLocation();
            if (location?.latitude && location?.longitude) {
              updateData.latitude = location.latitude;
              updateData.longitude = location.longitude;
              updateData.locationUpdatedAt = new Date();
            }
          } catch (locError) {
            console.log('Could not get location for online status:', locError);
            // Continue without location update - don't block going online
          }
        }
        
        await updateDoc(doc(db, 'users', userId), updateData);
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
    setShowMenuModal(true);
  };

  const menuOptions = [
    {
      id: 'profile',
      icon: 'person-outline',
      label: 'My Profile',
      subtitle: 'View and manage your profile',
      color: '#3B82F6',
      onPress: () => {
        setShowMenuModal(false);
        navigation.navigate('Profile');
      },
    },
    {
      id: 'earnings',
      icon: 'wallet-outline',
      label: 'Earnings',
      subtitle: 'View your earnings history',
      color: '#10B981',
      onPress: () => {
        setShowMenuModal(false);
        navigation.navigate('Earnings');
      },
    },
    {
      id: 'history',
      icon: 'time-outline',
      label: 'Service History',
      subtitle: 'View completed services',
      color: '#8B5CF6',
      onPress: () => {
        setShowMenuModal(false);
        navigation.navigate('ServiceHistory');
      },
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      subtitle: 'App preferences & account',
      color: '#6B7280',
      onPress: () => {
        setShowMenuModal(false);
        navigation.navigate('Settings');
      },
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      subtitle: 'Get help and FAQs',
      color: '#F59E0B',
      onPress: () => {
        setShowMenuModal(false);
        navigation.navigate('Help');
      },
    },
    {
      id: 'logout',
      icon: 'log-out-outline',
      label: 'Logout',
      subtitle: 'Sign out of your account',
      color: '#EF4444',
      onPress: () => {
        setShowMenuModal(false);
        handleLogout();
      },
    },
  ];

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
          {/* Top Row: Menu, Greeting/Name, Notification, Online Toggle */}
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity
              style={{padding: 8, marginRight: 8}}
              onPress={handleMenuPress}>
              <Icon name="menu" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Greeting and Name */}
            <View style={{flex: 1}}>
              <Text style={{fontSize: 13, color: 'rgba(255,255,255,0.8)'}}>
                {getGreeting()},
              </Text>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#FFFFFF'}} numberOfLines={1}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            
            {/* Notification Icon with Badge */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}
              onPress={() => navigation.navigate('Notifications')}>
              <Icon name="notifications" size={22} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: '#00B14F',
                }}>
                  <Text style={{fontSize: 10, fontWeight: '700', color: '#FFFFFF'}}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Online Toggle */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 20,
              paddingLeft: 12,
              paddingRight: 4,
              paddingVertical: 4,
            }}>
              <Text style={{fontSize: 12, color: '#FFFFFF', fontWeight: '500', marginRight: 6}}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{false: '#9CA3AF', true: '#34D399'}}
                thumbColor="#FFFFFF"
                style={{transform: [{scaleX: 0.85}, {scaleY: 0.85}]}}
              />
            </View>
          </View>
        </View>

        <View style={[dashboardStyles.earningsCard, isDark && {backgroundColor: theme.colors.card}]}>
          <Text style={[dashboardStyles.earningsTitle, isDark && {color: theme.colors.textSecondary}]}>Today's Earnings</Text>
          <Text style={[dashboardStyles.earningsAmount, isDark && {color: theme.colors.text}]}>
            ₱{Math.round(earnings.today).toLocaleString()}
          </Text>
          <View style={dashboardStyles.earningsRow}>
            <View style={dashboardStyles.earningsItem}>
              <Text style={[dashboardStyles.earningsItemLabel, isDark && {color: theme.colors.textSecondary}]}>This Week</Text>
              <Text style={[dashboardStyles.earningsItemValue, isDark && {color: theme.colors.text}]}>
                ₱{Math.round(earnings.week).toLocaleString()}
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

        {/* Notification Banner - Shows when there are unread notifications */}
        {unreadCount > 0 && (
          <TouchableOpacity
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: isDark ? '#3B82F6' : '#93C5FD',
            }}
            onPress={() => navigation.navigate('Notifications')}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#3B82F6',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="notifications" size={24} color="#FFFFFF" />
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: isDark ? '#1E3A5F' : '#EFF6FF',
              }}>
                <Text style={{fontSize: 12, fontWeight: '700', color: '#FFFFFF'}}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            </View>
            <View style={{flex: 1, marginLeft: 14, justifyContent: 'center'}}>
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: isDark ? '#FFFFFF' : '#1E40AF',
              }}>
                {unreadCount} New Notification{unreadCount > 1 ? 's' : ''}
              </Text>
              <Text style={{
                fontSize: 13,
                color: isDark ? '#93C5FD' : '#3B82F6',
                marginTop: 3,
              }}>
                Tap to view all
              </Text>
            </View>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="chevron-forward" size={18} color={isDark ? '#93C5FD' : '#3B82F6'} />
            </View>
          </TouchableOpacity>
        )}

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

        {/* Gamification Card */}
        {gamificationData && (
          <View style={{paddingHorizontal: 16, marginBottom: 16}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
              <Text style={[dashboardStyles.sectionTitle, isDark && {color: theme.colors.text}]}>Your Progress</Text>
              <TouchableOpacity 
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={() => navigation.navigate('Leaderboard')}>
                <Icon name="trophy" size={16} color="#F59E0B" />
                <Text style={{fontSize: 13, color: '#F59E0B', fontWeight: '600', marginLeft: 4}}>Leaderboard</Text>
              </TouchableOpacity>
            </View>
            <TierCard points={gamificationData.points} isProvider={true} />
          </View>
        )}

        {/* Quick Actions */}
        <View style={dashboardStyles.sectionHeader}>
          <Text style={[dashboardStyles.sectionTitle, isDark && {color: theme.colors.text}]}>Quick Actions</Text>
        </View>
        <View style={{flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12}}>
          <TouchableOpacity 
            style={{
              flex: 1, 
              flexDirection: 'row',
              alignItems: 'center', 
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF', 
              padding: 14, 
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
              minHeight: 64,
            }}
            onPress={() => navigation.navigate('ServiceHistory')}>
            <View style={{width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#064E3B' : '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0}}>
              <Icon name="receipt-outline" size={18} color="#00B14F" />
            </View>
            <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', flexShrink: 1}} numberOfLines={2}>Service History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{
              flex: 1, 
              flexDirection: 'row',
              alignItems: 'center', 
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF', 
              padding: 14, 
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
              minHeight: 64,
            }}
            onPress={() => navigation.navigate('Notifications')}>
            <View style={{width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#78350F' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0}}>
              <Icon name="notifications-outline" size={18} color="#F59E0B" />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 3,
                }}>
                  <Text style={{fontSize: 9, fontWeight: '700', color: '#FFFFFF'}}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', flexShrink: 1}} numberOfLines={2}>Notifications</Text>
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

      {/* Custom Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => {}}
            style={{
              backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 34,
              maxHeight: '80%',
            }}
          >
            {/* Handle Bar */}
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: isDark ? theme.colors.border : '#E5E7EB',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }} />

            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
            }}>
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#00B14F',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}>
                <Icon name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={{flex: 1}}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: isDark ? theme.colors.text : '#1F2937',
                }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: isDark ? theme.colors.textSecondary : '#6B7280',
                  marginTop: 2,
                }}>
                  {user?.serviceCategory || 'Service Provider'}
                </Text>
              </View>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: isOnline ? '#D1FAE5' : '#FEE2E2',
              }}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: isOnline ? '#059669' : '#DC2626',
                }}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            {/* Menu Options */}
            <ScrollView style={{paddingTop: 8}}>
              {menuOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderBottomWidth: index < menuOptions.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? theme.colors.border : '#F9FAFB',
                  }}
                  onPress={option.onPress}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: isDark ? `${option.color}20` : `${option.color}15`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                  }}>
                    <Icon name={option.icon} size={22} color={option.color} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: option.id === 'logout' ? '#EF4444' : (isDark ? theme.colors.text : '#1F2937'),
                    }}>
                      {option.label}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: isDark ? theme.colors.textSecondary : '#9CA3AF',
                      marginTop: 2,
                    }}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <Icon 
                    name="chevron-forward" 
                    size={20} 
                    color={isDark ? theme.colors.textSecondary : '#D1D5DB'} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cancel Button */}
            <View style={{paddingHorizontal: 20, paddingTop: 12}}>
              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? theme.colors.border : '#F3F4F6',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={() => setShowMenuModal(false)}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? theme.colors.text : '#6B7280',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ProviderDashboardScreen;
