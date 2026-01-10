import {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {collection, query, where, onSnapshot, doc, getDoc} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {useFocusEffect} from '@react-navigation/native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const TABS = [
  {key: 'PENDING', label: 'Pending', icon: 'time-outline', color: '#F59E0B'},
  {key: 'ONGOING', label: 'Active', icon: 'flash-outline', color: '#3B82F6'},
  {key: 'COMPLETED', label: 'Done', icon: 'checkmark-circle-outline', color: '#10B981'},
  {key: 'CANCELLED', label: 'Cancelled', icon: 'close-circle-outline', color: '#EF4444'},
];

const STATUS_MAP = {
  'PENDING': ['pending', 'approved'],
  'ONGOING': ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'],
  'COMPLETED': ['completed'],
  'CANCELLED': ['cancelled', 'rejected', 'declined'],
};

const CATEGORY_ICONS = {
  'electrician': {icon: 'flash', color: '#F59E0B', bg: '#FEF3C7'},
  'plumber': {icon: 'water', color: '#3B82F6', bg: '#DBEAFE'},
  'carpenter': {icon: 'hammer', color: '#D97706', bg: '#FED7AA'},
  'cleaner': {icon: 'sparkles', color: '#10B981', bg: '#D1FAE5'},
  'general': {icon: 'construct', color: '#8B5CF6', bg: '#EDE9FE'},
};

const ClientBookingsScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabCounts, setTabCounts] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // Only refresh if we've been away for a while (not just returning from payment)
      // The onSnapshot listener will handle real-time updates
    }, [])
  );

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      async (snapshot) => {
        if (!isMounted) return;
        
        const counts = {PENDING: 0, ONGOING: 0, COMPLETED: 0, CANCELLED: 0};
        const allBookings = [];
        const providerIds = new Set();

        // First pass: collect all provider IDs and count statuses
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Count for each tab
          Object.entries(STATUS_MAP).forEach(([tab, statuses]) => {
            if (statuses.includes(data.status)) counts[tab]++;
          });

          if (data.providerId) providerIds.add(data.providerId);
        }

        // Batch fetch all providers at once
        const providerMap = new Map();
        if (providerIds.size > 0) {
          const providerPromises = Array.from(providerIds).map(async (pid) => {
            try {
              const providerDoc = await getDoc(doc(db, 'users', pid));
              if (providerDoc.exists()) {
                const pd = providerDoc.data();
                providerMap.set(pid, {
                  name: `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || 'Provider',
                  phone: pd.phone || pd.phoneNumber || '',
                  rating: pd.rating || pd.averageRating || 0,
                  photo: pd.profilePhoto || null,
                });
              }
            } catch (e) {}
          });
          await Promise.all(providerPromises);
        }

        // Second pass: build bookings with provider info
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          // Filter by active tab
          const statuses = STATUS_MAP[activeTab] || ['pending'];
          if (!statuses.includes(data.status)) continue;

          const providerInfo = data.providerId ? providerMap.get(data.providerId) : null;

          let fullLocation = '';
          if (data.houseNumber) fullLocation += data.houseNumber + ', ';
          if (data.streetAddress) fullLocation += data.streetAddress + ', ';
          if (data.barangay) fullLocation += 'Brgy. ' + data.barangay;
          if (!fullLocation) fullLocation = data.location || data.address || 'Maasin City';
          
          allBookings.push({
            id: docSnap.id,
            title: data.title || data.serviceTitle || 'Service Request',
            serviceCategory: data.category || data.serviceCategory || 'General',
            status: data.status?.toLowerCase() || 'pending',
            description: data.description || '',
            amount: data.providerPrice || data.totalAmount || data.amount || data.price || 0,
            scheduledDate: data.scheduledDate || '',
            scheduledTime: data.scheduledTime || '',
            location: fullLocation,
            hasAdditionalPending: data.hasAdditionalPending || false,
            provider: providerInfo,
            providerId: data.providerId || '',
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) || '',
            createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
          });
        }

        // Sort by newest first
        allBookings.sort((a, b) => b.createdAtRaw - a.createdAtRaw);

        if (!isMounted) return;
        setTabCounts(counts);
        setBookings(allBookings);
        setIsLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.log('Error:', error);
        if (isMounted) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, activeTab, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
  };

  const getStatusConfig = (status, job) => {
    const configs = {
      'pending': {label: job?.adminApproved ? 'Pending' : 'In Review', color: '#F59E0B', bg: '#FEF3C7', icon: 'time'},
      'approved': {label: 'Approved', color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle'},
      'accepted': {label: 'Accepted', color: '#3B82F6', bg: '#DBEAFE', icon: 'checkmark'},
      'traveling': {label: 'On The Way', color: '#3B82F6', bg: '#DBEAFE', icon: 'car'},
      'arrived': {label: 'Arrived', color: '#8B5CF6', bg: '#EDE9FE', icon: 'location'},
      'in_progress': {label: job?.hasAdditionalPending ? 'Action Needed' : 'In Progress', color: '#00B14F', bg: '#D1FAE5', icon: 'construct'},
      'pending_completion': {label: 'Confirm Work', color: '#F59E0B', bg: '#FEF3C7', icon: 'checkbox'},
      'pending_payment': {label: 'Pay Now', color: '#3B82F6', bg: '#DBEAFE', icon: 'card'},
      'payment_received': {label: 'Payment Sent', color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-done'},
      'completed': {label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle'},
      'cancelled': {label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle'},
      'rejected': {label: 'Rejected', color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle'},
      'declined': {label: 'Declined', color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle'},
    };
    return configs[status] || {label: status?.replace(/_/g, ' ') || 'Unknown', color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle'};
  };

  const getCategoryConfig = (category) => {
    const key = category?.toLowerCase() || 'general';
    return CATEGORY_ICONS[key] || CATEGORY_ICONS['general'];
  };

  const renderBookingCard = (job, index) => {
    const statusConfig = getStatusConfig(job.status, job);
    const categoryConfig = getCategoryConfig(job.serviceCategory);
    const isUrgent = ['counter_offer', 'pending_completion', 'pending_payment'].includes(job.status) || job.hasAdditionalPending;

    return (
      <TouchableOpacity
        key={job.id}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JobDetails', {jobId: job.id})}
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 20,
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
          elevation: 5,
          overflow: 'hidden',
        }}>
        {/* Status Color Bar */}
        <View style={{height: 4, backgroundColor: statusConfig.color}} />
        
        <View style={{padding: 16}}>
          {/* Header Row */}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
            {/* Category Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: categoryConfig.bg,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}>
              <Icon name={categoryConfig.icon} size={14} color={categoryConfig.color} />
              <Text style={{fontSize: 12, fontWeight: '600', color: categoryConfig.color, marginLeft: 6}}>
                {job.serviceCategory}
              </Text>
            </View>

            {/* Status Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: statusConfig.bg,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}>
              <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={{fontSize: 12, fontWeight: '700', color: statusConfig.color, marginLeft: 4}}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 17,
            fontWeight: '700',
            color: isDark ? theme.colors.text : '#111827',
            marginBottom: 12,
          }} numberOfLines={2}>
            {job.title}
          </Text>

          {/* Alert Banners */}
          {job.status === 'traveling' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Tracking', {jobId: job.id, job})}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#DBEAFE',
                padding: 12,
                borderRadius: 12,
                marginBottom: 12,
              }}>
              <View style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="car" size={18} color="#3B82F6" />
              </View>
              <View style={{flex: 1, marginLeft: 10}}>
                <Text style={{fontSize: 13, fontWeight: '600', color: '#1E40AF'}}>Provider is on the way!</Text>
                <Text style={{fontSize: 12, color: '#3B82F6'}}>Tap to track live location</Text>
              </View>
              <Icon name="navigate" size={18} color="#3B82F6" />
            </TouchableOpacity>
          )}

          {job.status === 'arrived' && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#EDE9FE',
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
            }}>
              <View style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="location" size={18} color="#8B5CF6" />
              </View>
              <View style={{flex: 1, marginLeft: 10}}>
                <Text style={{fontSize: 13, fontWeight: '600', color: '#5B21B6'}}>Provider has arrived!</Text>
                <Text style={{fontSize: 12, color: '#7C3AED'}}>They're at your location</Text>
              </View>
              <Icon name="checkmark-circle" size={18} color="#8B5CF6" />
            </View>
          )}

          {job.hasAdditionalPending && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FEF3C7',
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
            }}>
              <View style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="alert-circle" size={18} color="#F59E0B" />
              </View>
              <View style={{flex: 1, marginLeft: 10}}>
                <Text style={{fontSize: 13, fontWeight: '600', color: '#92400E'}}>Action Required</Text>
                <Text style={{fontSize: 12, color: '#B45309'}}>Additional charge needs approval</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#F59E0B" />
            </View>
          )}

          {/* Provider & Details Row */}
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {/* Provider Photo */}
            <View style={{marginRight: 12}}>
              {job.provider?.photo ? (
                <Image
                  source={{uri: job.provider.photo}}
                  style={{width: 50, height: 50, borderRadius: 14}}
                />
              ) : (
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: isDark ? theme.colors.surface : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name="person" size={24} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
                </View>
              )}
            </View>

            {/* Details */}
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#111827'}}>
                  {job.provider?.name || 'Awaiting provider'}
                </Text>
                {job.provider?.rating > 0 && (
                  <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 8}}>
                    <Icon name="star" size={12} color="#F59E0B" />
                    <Text style={{fontSize: 12, color: '#6B7280', marginLeft: 2}}>{job.provider.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="location-outline" size={14} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
                <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 4, flex: 1}} numberOfLines={1}>
                  {job.location}
                </Text>
              </View>
            </View>

            {/* Price */}
            <View style={{alignItems: 'flex-end'}}>
              <Text style={{fontSize: 20, fontWeight: '800', color: isDark ? theme.colors.text : '#111827'}}>
                ₱{job.amount?.toLocaleString()}
              </Text>
              <Text style={{fontSize: 11, color: isDark ? theme.colors.textSecondary : '#9CA3AF'}}>{job.createdAt}</Text>
            </View>
          </View>

          {/* Quick Actions for Active Jobs */}
          {['traveling', 'arrived', 'in_progress'].includes(job.status) && job.provider?.phone && (
            <View style={{
              flexDirection: 'row',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: isDark ? theme.colors.border : '#F3F4F6',
              gap: 8,
            }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', {
                  recipientId: job.providerId,
                  recipientName: job.provider?.name,
                })}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  backgroundColor: isDark ? theme.colors.surface : '#F9FAFB',
                  borderRadius: 10,
                }}>
                <Icon name="chatbubble-outline" size={16} color={isDark ? theme.colors.text : '#374151'} />
                <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? theme.colors.text : '#374151', marginLeft: 6}}>Message</Text>
              </TouchableOpacity>
              
              {job.status === 'traveling' && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Tracking', {jobId: job.id, job})}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    backgroundColor: '#DBEAFE',
                    borderRadius: 10,
                  }}>
                  <Icon name="navigate" size={16} color="#3B82F6" />
                  <Text style={{fontSize: 13, fontWeight: '600', color: '#3B82F6', marginLeft: 6}}>Track</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: isDark ? theme.colors.background : '#F9FAFB'}} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#00B14F', '#00A347', '#009940']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{paddingBottom: 20}}>
        <View style={{paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8}}>
          <Text style={{fontSize: 28, fontWeight: '800', color: '#FFFFFF'}}>My Bookings</Text>
          <Text style={{fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4}}>Track your service requests</Text>
        </View>

        {/* Tab Stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 16, paddingTop: 12}}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key] || 0;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  width: (SCREEN_WIDTH - 56) / 4,
                  marginRight: 8,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 16,
                  backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: isActive ? `${tab.color}20` : 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}>
                  <Icon name={tab.icon} size={18} color={isActive ? tab.color : '#FFFFFF'} />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: isActive ? '#111827' : '#FFFFFF',
                }}>{count}</Text>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: isActive ? '#6B7280' : 'rgba(255,255,255,0.8)',
                  marginTop: 2,
                }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Bookings List */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{paddingTop: 16, paddingBottom: 100}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} tintColor="#00B14F" />
        }
        onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {useNativeDriver: false})}
        scrollEventThrottle={16}>
        {isLoading ? (
          <View style={{paddingTop: 60, alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#00B14F" />
            <Text style={{marginTop: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Loading bookings...</Text>
          </View>
        ) : bookings.length > 0 ? (
          bookings.map((job, index) => renderBookingCard(job, index))
        ) : (
          <View style={{paddingTop: 60, alignItems: 'center', paddingHorizontal: 40}}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 30,
              backgroundColor: isDark ? theme.colors.surface : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Icon name="calendar-outline" size={48} color={isDark ? theme.colors.border : '#D1D5DB'} />
            </View>
            <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? theme.colors.text : '#111827', marginBottom: 8, textAlign: 'center'}}>
              No {activeTab.toLowerCase()} bookings
            </Text>
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', textAlign: 'center', lineHeight: 20}}>
              Your {activeTab.toLowerCase()} service requests will appear here
            </Text>
            {activeTab === 'PENDING' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ClientMain')}
                style={{
                  marginTop: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  backgroundColor: '#00B14F',
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 15, fontWeight: '700', color: '#FFFFFF'}}>Find a Provider</Text>
                <Icon name="arrow-forward" size={18} color="#FFFFFF" style={{marginLeft: 8}} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClientBookingsScreen;
