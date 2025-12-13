import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {collection, query, where, onSnapshot, doc, getDoc} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {globalStyles} from '../../css/globalStyles';
import {dashboardStyles} from '../../css/dashboardStyles';

const ClientBookingsScreen = ({navigation}) => {
  const {user} = useAuth();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time listener for bookings
  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Query all bookings for this client
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clientId', '==', userId)
    );

    // Real-time listener
    const unsubscribe = onSnapshot(
      bookingsQuery,
      async (snapshot) => {
        // Map tabs to statuses
        const statusMap = {
          'PENDING': ['pending', 'pending_negotiation', 'counter_offer', 'approved'],
          'ONGOING': ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'],
          'COMPLETED': ['completed'],
          'CANCELLED': ['cancelled', 'rejected', 'declined'],
        };

        const statuses = statusMap[activeTab] || ['pending'];
        const bookingsList = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Filter by status
          if (!statuses.includes(data.status)) continue;

          // Get provider info if assigned
          let providerInfo = null;
          if (data.providerId) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const providerData = providerDoc.data();
                providerInfo = {
                  name: `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim() || 'Provider',
                  phone: providerData.phone || 'N/A',
                  rating: providerData.rating || 0,
                };
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
          
          bookingsList.push({
            id: docSnap.id,
            title: data.title || data.serviceTitle || 'Service Request',
            serviceCategory: data.category || data.serviceCategory || 'General',
            status: data.status?.toUpperCase() || 'PENDING',
            description: data.description || '',
            amount: data.amount || data.price || 0,
            scheduledDate: data.scheduledDate || 'TBD',
            scheduledTime: data.scheduledTime || '',
            location: fullLocation,
            // New negotiation fields
            isNegotiable: data.isNegotiable || false,
            offeredPrice: data.offeredPrice || 0,
            counterOfferPrice: data.counterOfferPrice || 0,
            hasCounterOffer: data.hasCounterOffer || false,
            adminApproved: data.adminApproved || false,
            hasAdditionalPending: data.hasAdditionalPending || false,
            provider: providerInfo,
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
            createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
          });
        }

        // Sort by newest first (descending)
        bookingsList.sort((a, b) => b.createdAtRaw - a.createdAtRaw);

        setBookings(bookingsList);
        setIsLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.log('Error listening to bookings:', error);
        setIsLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleJobPress = (jobId) => {
    navigation.navigate('JobDetails', {jobId});
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'APPROVED':
        return '#F59E0B';
      case 'PENDING_NEGOTIATION':
        return '#8B5CF6';
      case 'COUNTER_OFFER':
        return '#EC4899';
      case 'ACCEPTED':
        return '#3B82F6';
      case 'TRAVELING':
        return '#3B82F6';
      case 'ARRIVED':
        return '#8B5CF6';
      case 'IN_PROGRESS':
        return '#00B14F';
      case 'PENDING_COMPLETION':
        return '#F59E0B';
      case 'PENDING_PAYMENT':
        return '#3B82F6';
      case 'PAYMENT_RECEIVED':
        return '#10B981';
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
      case 'REJECTED':
      case 'DECLINED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status, job) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return job.adminApproved ? 'PENDING' : 'AWAITING REVIEW';
      case 'PENDING_NEGOTIATION':
        return 'YOUR OFFER SENT';
      case 'COUNTER_OFFER':
        return 'COUNTER OFFER';
      case 'APPROVED':
        return 'APPROVED';
      case 'ACCEPTED':
        return 'ACCEPTED';
      case 'TRAVELING':
        return 'PROVIDER ON THE WAY';
      case 'ARRIVED':
        return 'PROVIDER ARRIVED';
      case 'IN_PROGRESS':
        return job.hasAdditionalPending ? 'ACTION NEEDED' : 'IN PROGRESS';
      case 'PENDING_COMPLETION':
        return 'CONFIRM WORK';
      case 'PENDING_PAYMENT':
        return 'PAY NOW';
      case 'PAYMENT_RECEIVED':
        return 'PAYMENT SENT';
      case 'COMPLETED':
        return 'COMPLETED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'REJECTED':
        return 'REJECTED';
      case 'DECLINED':
        return 'DECLINED';
      default:
        return status?.replace(/_/g, ' ') || 'UNKNOWN';
    }
  };

  const tabs = [
    {key: 'PENDING', label: 'Pending'},
    {key: 'ONGOING', label: 'Ongoing'},
    {key: 'COMPLETED', label: 'Completed'},
    {key: 'CANCELLED', label: 'Cancelled'},
  ];

  return (
    <SafeAreaView style={dashboardStyles.container} edges={['top']}>
      <View style={dashboardStyles.header}>
        <Text style={dashboardStyles.headerName}>My Bookings</Text>
      </View>

      <View style={{flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF'}}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? '#00B14F' : 'transparent',
            }}
            onPress={() => setActiveTab(tab.key)}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === tab.key ? '600' : '400',
                color: activeTab === tab.key ? '#00B14F' : '#6B7280',
              }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={dashboardStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
        }>
        {isLoading ? (
          <View style={dashboardStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B14F" />
          </View>
        ) : bookings.length > 0 ? (
          bookings.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={dashboardStyles.jobCard}
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
                <View
                  style={[
                    globalStyles.badge,
                    {backgroundColor: `${getStatusColor(job.status)}20`},
                  ]}>
                  <Text style={{fontSize: 12, fontWeight: '600', color: getStatusColor(job.status)}}>
                    {getStatusLabel(job.status, job)}
                  </Text>
                </View>
              </View>

              <Text style={dashboardStyles.jobTitle}>{job.title}</Text>

              {/* Counter Offer Alert */}
              {job.status === 'COUNTER_OFFER' && (
                <View style={{
                  backgroundColor: '#FCE7F3',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Icon name="pricetag" size={14} color="#EC4899" />
                  <Text style={{fontSize: 12, color: '#9D174D', marginLeft: 6, flex: 1}}>
                    Provider offered ₱{job.counterOfferPrice?.toLocaleString()} - Tap to respond
                  </Text>
                </View>
              )}

              {/* Provider Traveling Alert */}
              {(job.status === 'TRAVELING' || job.status === 'traveling') && (
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#DBEAFE',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => navigation.navigate('Tracking', {jobId: job.id, job})}>
                  <Icon name="car" size={16} color="#3B82F6" />
                  <Text style={{fontSize: 12, color: '#1E40AF', marginLeft: 6, flex: 1, fontWeight: '600'}}>
                    Provider is on the way! Tap to track location
                  </Text>
                  <Icon name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>
              )}

              {/* Provider Arrived Alert */}
              {(job.status === 'ARRIVED' || job.status === 'arrived') && (
                <View style={{
                  backgroundColor: '#D1FAE5',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Icon name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={{fontSize: 12, color: '#065F46', marginLeft: 6, flex: 1, fontWeight: '600'}}>
                    Provider has arrived at your location!
                  </Text>
                </View>
              )}

              {/* Additional Charge Alert */}
              {job.hasAdditionalPending && (
                <View style={{
                  backgroundColor: '#FEF3C7',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Icon name="alert-circle" size={14} color="#F59E0B" />
                  <Text style={{fontSize: 12, color: '#92400E', marginLeft: 6, flex: 1}}>
                    Provider requested additional charge - Approval needed
                  </Text>
                </View>
              )}

              <View style={dashboardStyles.jobClient}>
                <Icon name="person-outline" size={16} color="#6B7280" />
                <Text style={dashboardStyles.jobClientText}>
                  Provider: {job.provider?.name || 'Not assigned'}
                </Text>
              </View>

              <View style={dashboardStyles.jobLocation}>
                <Icon name="location-outline" size={16} color="#6B7280" />
                <Text style={dashboardStyles.jobLocationText}>
                  {job.location}
                </Text>
              </View>

              <View style={dashboardStyles.jobFooter}>
                <Text style={dashboardStyles.jobTime}>
                  {job.createdAt}
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
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={dashboardStyles.emptyState}>
            <Icon name="calendar-outline" size={80} color="#E5E7EB" />
            <Text style={dashboardStyles.emptyStateTitle}>
              No {activeTab.toLowerCase()} bookings
            </Text>
            <Text style={dashboardStyles.emptyStateText}>
              Your {activeTab.toLowerCase()} jobs will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClientBookingsScreen;
