import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {collection, query, where, onSnapshot, doc, updateDoc, getDoc} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {globalStyles} from '../../css/globalStyles';
import {dashboardStyles} from '../../css/dashboardStyles';

// Helper function to format date and time
const formatDateTime = (date) => {
  if (!date) return 'Unknown';
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString('en-US', options);
};
import {TierBadge, BadgeList} from '../../components/gamification';
import {getGamificationData} from '../../services/gamificationService';
import {getClientTier, getClientBadges} from '../../utils/gamification';

const ProviderJobsScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [activeTab, setActiveTab] = useState('available');
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tabCounts, setTabCounts] = useState({ available: 0, my_jobs: 0, completed: 0 });

  const tabs = [
    {key: 'available', label: 'Available'},
    {key: 'my_jobs', label: 'My Jobs'},
    {key: 'completed', label: 'Completed'},
  ];

  // Fetch counts for all tabs
  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) return;

    // Available jobs listener
    const availableQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', userId),
      where('status', 'in', ['pending', 'pending_negotiation'])
    );
    const unsubAvailable = onSnapshot(availableQuery, (snap) => {
      const count = snap.docs.filter(d => !d.data().adminRejected).length;
      setTabCounts(prev => ({ ...prev, available: count }));
    });

    // My Jobs listener
    const myJobsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', userId),
      where('status', 'in', ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'])
    );
    const unsubMyJobs = onSnapshot(myJobsQuery, (snap) => {
      setTabCounts(prev => ({ ...prev, my_jobs: snap.size }));
    });

    // Completed jobs listener
    const completedQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', userId),
      where('status', '==', 'completed')
    );
    const unsubCompleted = onSnapshot(completedQuery, (snap) => {
      setTabCounts(prev => ({ ...prev, completed: snap.size }));
    });

    return () => {
      unsubAvailable();
      unsubMyJobs();
      unsubCompleted();
    };
  }, [user?.uid, user?.id]);

  useEffect(() => {
    if (!user?.uid && !user?.id) return;
    
    const userId = user?.uid || user?.id;
    setIsLoading(true);
    
    let statusFilter;
    if (activeTab === 'available') {
      statusFilter = ['pending', 'pending_negotiation'];
    } else if (activeTab === 'my_jobs') {
      statusFilter = ['accepted', 'traveling', 'arrived', 'in_progress', 'pending_completion', 'pending_payment', 'payment_received'];
    } else {
      statusFilter = ['completed'];
    }
    
    const jobsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', userId),
      where('status', 'in', statusFilter)
    );
    
    const unsubscribe = onSnapshot(jobsQuery, async (snapshot) => {
      const jobsList = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Skip rejected jobs for available tab
        if (activeTab === 'available' && data.adminRejected) continue;
        
        // Get client info
        let clientInfo = {name: 'Unknown Client', phone: 'N/A', tier: null, badges: []};
        if (data.clientId) {
          try {
            const clientDoc = await getDoc(doc(db, 'users', data.clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              clientInfo = {
                name: `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Client',
                phone: clientData.phone || 'N/A',
              };
            }
            // Get client gamification data for available tab
            if (activeTab === 'available') {
              const gamificationData = await getGamificationData(data.clientId, 'CLIENT');
              if (gamificationData) {
                clientInfo.tier = getClientTier(gamificationData.points || 0);
                clientInfo.badges = getClientBadges(gamificationData.stats || {});
              }
            }
          } catch (e) {}
        }
        
        // Build full address
        let fullLocation = '';
        if (data.houseNumber) fullLocation += data.houseNumber + ', ';
        if (data.streetAddress) fullLocation += data.streetAddress + ', ';
        if (data.barangay) fullLocation += 'Brgy. ' + data.barangay + ', ';
        fullLocation += 'Maasin City';
        if (!data.streetAddress && !data.barangay) {
          fullLocation = data.location || data.address || 'Not specified';
        }
        
        const jobItem = {
          id: docSnap.id,
          title: data.title || data.serviceTitle || 'Service Request',
          category: data.category || data.serviceCategory || 'General',
          status: data.status,
          client: clientInfo,
          amount: data.totalAmount || data.providerPrice || data.amount || data.price || 0,
          providerPrice: data.providerPrice || data.offeredPrice || 0,
          scheduledDate: data.scheduledDate?.toDate?.() ? data.scheduledDate.toDate().toLocaleDateString() : (data.scheduledDate || 'TBD'),
          scheduledTime: data.scheduledTime?.toDate?.() ? data.scheduledTime.toDate().toLocaleTimeString() : (data.scheduledTime || 'TBD'),
          location: fullLocation,
          description: data.description || '',
          createdAt: data.createdAt?.toDate?.() ? formatDateTime(data.createdAt.toDate()) : 'Unknown',
          createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
          completedAt: data.completedAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
          completedAtRaw: data.completedAt?.toDate?.() || new Date(0),
          // Media files
          mediaFiles: data.mediaFiles || [],
          hasMedia: (data.mediaFiles && data.mediaFiles.length > 0),
          // Negotiation info
          isNegotiable: data.isNegotiable || false,
          offeredPrice: data.offeredPrice || 0,
          providerFixedPrice: data.providerFixedPrice || 0,
          priceNote: data.priceNote || '',
          // Admin approval
          adminApproved: data.adminApproved || false,
          adminRejected: data.adminRejected || false,
          // Payment
          paymentPreference: 'pay_first',
          paymentMethod: data.paymentMethod || 'gcash',
          isPaidUpfront: data.isPaidUpfront || false,
        };
        
        jobsList.push(jobItem);
      }
      
      // Sort by date
      if (activeTab === 'completed') {
        jobsList.sort((a, b) => b.completedAtRaw - a.completedAtRaw);
      } else {
        jobsList.sort((a, b) => b.createdAtRaw - a.createdAtRaw);
      }
      
      setJobs(jobsList);
      setIsLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error listening to jobs:', error);
      setIsLoading(false);
      setRefreshing(false);
    });
    
    return () => unsubscribe();
  }, [activeTab, user]);

  // Keep fetchJobs for manual refresh
  const fetchJobs = async () => {
    // The real-time listener handles updates automatically
    // This is just for pull-to-refresh visual feedback
    setRefreshing(true);
    // The listener will update and set refreshing to false
  };

  const handleAcceptJob = async (job) => {
    const userId = user?.uid || user?.id;
    Alert.alert(
      'Accept Job',
      `Accept "${job.title}" for ₱${job.amount?.toLocaleString() || 0}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bookings', job.id), {
                providerId: userId,
                status: 'in_progress',
                acceptedAt: new Date(),
              });
              Alert.alert('Success', 'Job accepted! You can now start working.');
              fetchJobs();
            } catch (error) {
              console.error('Error accepting job:', error);
              Alert.alert('Error', 'Failed to accept job');
            }
          },
        },
      ]
    );
  };

  const handleCompleteJob = async (job) => {
    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bookings', job.id), {
                status: 'completed',
                completedAt: new Date(),
              });
              Alert.alert('Success', 'Job completed! Payment will be processed.');
              fetchJobs();
            } catch (error) {
              console.error('Error completing job:', error);
              Alert.alert('Error', 'Failed to complete job');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'pending_negotiation': return '#F59E0B';
      case 'counter_offer': return '#8B5CF6';
      case 'approved': return '#3B82F6';
      case 'accepted': return '#3B82F6';
      case 'traveling': return '#3B82F6';
      case 'arrived': return '#8B5CF6';
      case 'in_progress': return '#00B14F';
      case 'pending_completion': return '#F59E0B';
      case 'pending_payment': return '#3B82F6';
      case 'payment_received': return '#10B981';
      case 'completed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status, adminApproved) => {
    // If not admin approved yet, show as pending admin review
    if (!adminApproved && (status === 'pending' || status === 'pending_negotiation')) {
      return 'PENDING REVIEW';
    }
    switch (status) {
      case 'pending': return 'PENDING';
      case 'pending_negotiation': return 'OFFER RECEIVED';
      case 'counter_offer': return 'COUNTER SENT';
      case 'accepted': return 'ACCEPTED';
      case 'traveling': return 'TRAVELING';
      case 'arrived': return 'ARRIVED';
      case 'in_progress': return 'IN PROGRESS';
      case 'pending_completion': return 'AWAITING CLIENT';
      case 'pending_payment': return 'CLIENT PAYING';
      case 'payment_received': return 'CONFIRM PAYMENT';
      case 'completed': return 'COMPLETED';
      default: return status?.replace(/_/g, ' ').toUpperCase();
    }
  };

  const renderJobCard = (job) => (
    <TouchableOpacity
      key={job.id}
      style={{
        backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        // Slightly dim if waiting for admin
        opacity: job.adminApproved ? 1 : 0.85,
      }}
      onPress={() => navigation.navigate('ProviderJobDetails', {jobId: job.id, job})}
    >
      {/* Admin Approval Banner - Show if not yet approved */}
      {!job.adminApproved && (job.status === 'pending' || job.status === 'pending_negotiation') && (
        <View style={{
          backgroundColor: '#FEF3C7',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Icon name="time" size={16} color="#F59E0B" />
          <Text style={{fontSize: 12, color: '#92400E', marginLeft: 8, flex: 1}}>
            ⏳ Waiting for Admin Approval - You can view but cannot accept yet
          </Text>
        </View>
      )}

      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
        <View style={{
          backgroundColor: '#FEF3C7',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        }}>
          <Text style={{fontSize: 12, fontWeight: '600', color: '#D97706'}}>{job.category}</Text>
        </View>
        <View style={{
          backgroundColor: `${getStatusColor(job.status)}20`,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
        }}>
          <Text style={{fontSize: 12, fontWeight: '600', color: getStatusColor(job.status)}}>
            {getStatusLabel(job.status, job.adminApproved)}
          </Text>
        </View>
      </View>

      <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
        {job.title}
      </Text>

      {/* Show if client made an offer */}
      {job.isNegotiable && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FEF3C7',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          marginBottom: 8,
        }}>
          <Icon name="pricetag" size={14} color="#F59E0B" />
          <Text style={{fontSize: 12, color: '#92400E', marginLeft: 6}}>
            Client offers ₱{job.offeredPrice?.toLocaleString()} (Your price: ₱{job.providerFixedPrice?.toLocaleString()})
          </Text>
        </View>
      )}

      {/* Show media indicator */}
      {job.hasMedia && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#EFF6FF',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          marginBottom: 8,
        }}>
          <Icon name="images" size={14} color="#3B82F6" />
          <Text style={{fontSize: 12, color: '#1E40AF', marginLeft: 6}}>
            {job.mediaFiles?.length} problem photo/video - tap to view
          </Text>
        </View>
      )}

      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap'}}>
        <Icon name="person" size={14} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
        <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 6}}>{job.client?.name}</Text>
        {job.client?.tier && job.client.tier.name !== 'Regular' && (
          <View style={{marginLeft: 8}}>
            <TierBadge tier={job.client.tier} size="small" />
          </View>
        )}
        {job.client?.badges && job.client.badges.length > 0 && (
          <View style={{marginLeft: 6}}>
            <BadgeList badges={job.client.badges} maxDisplay={2} size="small" />
          </View>
        )}
      </View>

      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
        <Icon name="location" size={14} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
        <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 6}} numberOfLines={1}>{job.location}</Text>
      </View>

      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
        <Icon name="calendar" size={14} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
        <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginLeft: 6}}>
          {job.scheduledDate} {job.scheduledTime && `at ${job.scheduledTime}`}
        </Text>
      </View>

      {/* Submitted Date/Time */}
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
        <Icon name="time-outline" size={14} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
        <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginLeft: 6}}>
          Submitted: {job.createdAt}
        </Text>
      </View>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: isDark ? theme.colors.border : '#F3F4F6',
        paddingTop: 12,
      }}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: '#00B14F'}}>
            ₱{job.amount?.toLocaleString() || 0}
          </Text>
          {/* Payment Method Badge - Always GCash/Maya */}
          <View style={{
            backgroundColor: '#D1FAE5',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}>
            <Text style={{
              fontSize: 9,
              fontWeight: '600',
              color: '#059669',
            }}>
              {job.paymentMethod === 'maya' ? 'MAYA' : 'GCASH'}
            </Text>
          </View>
          {job.isPaidUpfront && (
            <View style={{backgroundColor: '#10B981', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4}}>
              <Text style={{fontSize: 8, fontWeight: '600', color: '#FFFFFF'}}>PAID</Text>
            </View>
          )}
        </View>
        
        {activeTab === 'available' && job.adminApproved && (
          <TouchableOpacity
            style={{
              backgroundColor: '#00B14F',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={() => handleAcceptJob(job)}
          >
            <Text style={{color: '#FFFFFF', fontWeight: '600'}}>Accept</Text>
          </TouchableOpacity>
        )}
        
        {activeTab === 'available' && !job.adminApproved && (
          <View style={{
            backgroundColor: '#FEF3C7',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 8,
          }}>
            <Text style={{color: '#92400E', fontWeight: '500', fontSize: 12}}>Awaiting Approval</Text>
          </View>
        )}
        
        {activeTab === 'my_jobs' && job.status === 'in_progress' && (
          <TouchableOpacity
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={() => handleCompleteJob(job)}
          >
            <Text style={{color: '#FFFFFF', fontWeight: '600'}}>Complete</Text>
          </TouchableOpacity>
        )}
        
        {activeTab === 'my_jobs' && job.status !== 'in_progress' && (
          <TouchableOpacity
            style={{
              backgroundColor: '#E5E7EB',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('ProviderJobDetails', {jobId: job.id, job})}
          >
            <Text style={{color: '#6B7280', fontWeight: '600'}}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: isDark ? theme.colors.background : '#F3F4F6'}} edges={['top']}>
      <View style={{
        backgroundColor: '#00B14F',
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}>
        <Text style={{fontSize: 24, fontWeight: '700', color: '#FFFFFF'}}>Jobs</Text>
      </View>

      <View style={{flexDirection: 'row', backgroundColor: isDark ? theme.colors.card : '#FFFFFF', paddingHorizontal: 8}}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              borderBottomWidth: 3,
              borderBottomColor: activeTab === tab.key ? '#00B14F' : 'transparent',
            }}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? '#00B14F' : (isDark ? theme.colors.textSecondary : '#6B7280'),
            }}>
              {tab.label}
            </Text>
            {tabCounts[tab.key] > 0 && (
              <View style={{
                minWidth: 20,
                height: 20,
                paddingHorizontal: 6,
                borderRadius: 10,
                backgroundColor: activeTab === tab.key ? '#00B14F' : '#E5E7EB',
                marginLeft: 6,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: activeTab === tab.key ? '#FFFFFF' : '#6B7280',
                }}>
                  {tabCounts[tab.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{padding: 16}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
        }
      >
        {isLoading ? (
          <View style={{paddingVertical: 40, alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#00B14F" />
          </View>
        ) : jobs.length > 0 ? (
          jobs.map(renderJobCard)
        ) : (
          <View style={{paddingVertical: 60, alignItems: 'center'}}>
            <Icon name="briefcase-outline" size={64} color={isDark ? '#4B5563' : '#D1D5DB'} />
            <Text style={{fontSize: 16, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 16}}>
              {activeTab === 'available' ? 'No available jobs' : 
               activeTab === 'my_jobs' ? 'No active jobs' : 'No completed jobs yet'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProviderJobsScreen;
