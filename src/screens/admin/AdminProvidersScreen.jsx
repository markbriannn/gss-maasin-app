import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {adminStyles} from '../../css/adminStyles';
import {useTheme} from '../../context/ThemeContext';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import {db} from '../../config/firebase';
import smsEmailService from '../../services/smsEmailService';
import {sendProviderApprovalEmail, sendNotificationEmail} from '../../services/emailService';
import notificationService from '../../services/notificationService';

const {width: screenWidth} = Dimensions.get('window');

// Professional suspension reasons
const SUSPENSION_REASONS = [
  {id: 'policy_violation', label: 'Policy Violation', description: 'Violation of GSS Maasin terms of service or community guidelines.'},
  {id: 'fraudulent_activity', label: 'Fraudulent Activity', description: 'Suspected fraudulent behavior or misrepresentation of services.'},
  {id: 'customer_complaints', label: 'Multiple Customer Complaints', description: 'Repeated complaints from customers regarding service quality or conduct.'},
  {id: 'incomplete_documentation', label: 'Incomplete Documentation', description: 'Required documents are missing, expired, or invalid.'},
  {id: 'unprofessional_conduct', label: 'Unprofessional Conduct', description: 'Behavior that does not meet professional standards expected of service providers.'},
  {id: 'safety_concerns', label: 'Safety Concerns', description: 'Actions or behavior that pose safety risks to customers or the community.'},
  {id: 'other', label: 'Other', description: 'Please specify the reason below.'},
];

const AdminProvidersScreen = ({navigation, route}) => {
  const {isDark, theme} = useTheme();
  const {openProviderId} = route.params || {};
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageTitle, setSelectedImageTitle] = useState('');
  
  // Suspension modal state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendingProvider, setSuspendingProvider] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const filters = [
    {id: 'all', label: 'All'},
    {id: 'pending', label: 'Pending'},
    {id: 'approved', label: 'Approved'},
    {id: 'suspended', label: 'Suspended'},
  ];

  // Real-time listener for providers
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    // Query users with role = 'PROVIDER'
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER')
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(providersQuery, async (snapshot) => {
      // Check if component is still mounted before processing
      if (!isMounted) return;
      
      try {
        const providersList = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Build full address from new fields
          let fullAddress = '';
          if (data.houseNumber) fullAddress += data.houseNumber + ', ';
          if (data.streetAddress) fullAddress += data.streetAddress + ', ';
          if (data.barangay) fullAddress += 'Brgy. ' + data.barangay + ', ';
          fullAddress += 'Maasin City';
          
          // Fallback to old address format
          if (!data.streetAddress && !data.barangay) {
            fullAddress = data.address || data.location || 'Maasin City';
          }
          
          // Fetch actual completed jobs count from bookings
          let completedJobsCount = data.completedJobs || 0;
          try {
            const bookingsQuery = query(
              collection(db, 'bookings'),
              where('providerId', '==', docSnap.id),
              where('status', '==', 'completed')
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            completedJobsCount = bookingsSnap.size;
          } catch (e) {
            console.log('Error fetching completed jobs:', e);
          }
          
          return {
            id: docSnap.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email?.split('@')[0] || 'Unknown',
            email: data.email || '',
            phone: data.phone || data.phoneNumber || 'Not provided',
            service: data.serviceCategory || data.service || 'General Services',
            status: data.status || 'pending',
            rating: data.rating || data.averageRating || 0,
            completedJobs: completedJobsCount,
            registeredDate: data.createdAt?.toDate?.() 
              ? `${data.createdAt.toDate().toLocaleDateString()} at ${data.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`
              : 'Unknown',
            registeredDateRaw: data.createdAt?.toDate?.() || new Date(0),
            location: fullAddress,
            streetAddress: data.streetAddress || '',
            houseNumber: data.houseNumber || '',
            barangay: data.barangay || '',
            landmark: data.landmark || '',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            documents: {
              governmentId: {
                submitted: !!data.documents?.governmentId || !!data.documents?.governmentIdUrl,
                url: data.documents?.governmentIdUrl || null,
              },
              selfie: {
                submitted: !!data.documents?.selfie || !!data.documents?.selfieUrl,
                url: data.documents?.selfieUrl || null,
              },
              barangayClearance: {
                submitted: !!data.documents?.barangayClearance || !!data.documents?.barangayClearanceUrl,
                url: data.documents?.barangayClearanceUrl || null,
              },
              policeClearance: {
                submitted: !!data.documents?.policeClearance || !!data.documents?.policeClearanceUrl,
                url: data.documents?.policeClearanceUrl || null,
              },
              clearance: {
                submitted: !!data.documents?.clearance || !!data.documents?.clearanceUrl,
                url: data.documents?.clearanceUrl || null,
              },
              certificate: {
                submitted: !!data.documents?.certificates?.length || !!data.documents?.certificateUrls?.length,
                urls: data.documents?.certificateUrls || [],
              },
            },
            suspensionReason: data.suspensionReason || null,
            suspensionReasonLabel: data.suspensionReasonLabel || null,
            suspendedAt: data.suspendedAt?.toDate?.() 
              ? `${data.suspendedAt.toDate().toLocaleDateString()} at ${data.suspendedAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`
              : null,
            rawData: data,
          };
        }));

        // Check again after async operation
        if (!isMounted) return;

        // Sort by newest first
        providersList.sort((a, b) => b.registeredDateRaw - a.registeredDateRaw);

        setAllProviders(providersList);
        setProviders(providersList);
        setIsLoading(false);
      } catch (error) {
        console.log('Error processing providers:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, (error) => {
      console.error('Error listening to providers:', error);
      if (isMounted) {
        setIsLoading(false);
      }
    });

    // Cleanup listener on unmount
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Filter providers when filter or search changes
  useEffect(() => {
    filterProviders();
  }, [activeFilter, searchQuery, allProviders]);

  // Auto-open provider detail if openProviderId is passed
  useEffect(() => {
    if (openProviderId && allProviders.length > 0) {
      const provider = allProviders.find(p => p.id === openProviderId);
      if (provider) {
        setSelectedProvider(provider);
        setShowDetailModal(true);
      }
    }
  }, [openProviderId, allProviders]);



  const filterProviders = () => {
    let filtered = [...allProviders];
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.status === activeFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.service.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query)
      );
    }
    
    setProviders(filtered);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return {backgroundColor: '#FEF3C7', color: '#D97706'};
      case 'approved':
        return {backgroundColor: '#D1FAE5', color: '#059669'};
      case 'suspended':
        return {backgroundColor: '#FEE2E2', color: '#DC2626'};
      default:
        return {backgroundColor: '#F3F4F6', color: '#6B7280'};
    }
  };

  const getStats = () => {
    const all = allProviders.length;
    const pending = allProviders.filter(p => p.status === 'pending').length;
    const approved = allProviders.filter(p => p.status === 'approved').length;
    const suspended = allProviders.filter(p => p.status === 'suspended').length;
    return {all, pending, approved, suspended};
  };

  const updateProviderStatus = async (providerId, newStatus) => {
    try {
      const providerRef = doc(db, 'users', providerId);
      const updateData = {
        status: newStatus,
        providerStatus: newStatus,
        updatedAt: new Date(),
      };
      
      // If reactivating from suspended, clear suspension fields and set online
      if (newStatus === 'approved') {
        updateData.suspensionReason = null;
        updateData.suspensionReasonLabel = null;
        updateData.suspendedAt = null;
        updateData.isOnline = true; // Set back online when reactivated
      }
      
      await updateDoc(providerRef, updateData);
      
      // Update local state
      setAllProviders(prev => 
        prev.map(p => p.id === providerId ? {
          ...p, 
          status: newStatus,
          suspensionReason: newStatus === 'approved' ? null : p.suspensionReason,
          suspensionReasonLabel: newStatus === 'approved' ? null : p.suspensionReasonLabel,
          suspendedAt: newStatus === 'approved' ? null : p.suspendedAt,
        } : p)
      );
      return true;
    } catch (error) {
      console.error('Error updating provider status:', error);
      Alert.alert('Error', 'Failed to update provider status');
      return false;
    }
  };

  const handleApprove = (provider) => {
    Alert.alert(
      'Approve Provider',
      `Are you sure you want to approve ${provider.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            const success = await updateProviderStatus(provider.id, 'approved');
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Success', 'Provider approved successfully');
              
              // Send SMS/Email notification to provider
              try {
                const providerData = {
                  firstName: provider.name?.split(' ')[0] || 'Provider',
                  phone: provider.phone,
                  email: provider.email,
                };
                await smsEmailService.notifyProviderApproved(providerData);
                console.log('Approval notification sent to provider');
                
                // Send email notification via Resend
                if (provider.email) {
                  sendProviderApprovalEmail(provider.email, provider.name || 'Provider', true)
                    .catch(err => console.log('Email notification failed:', err));
                }
                
                // Send push notification (works even when app is closed!)
                notificationService.pushProviderApproved(provider.id)
                  .catch(err => console.log('Push notification failed:', err));
              } catch (notifError) {
                console.log('Failed to send approval notification:', notifError);
              }
            }
          },
        },
      ]
    );
  };

  const handleReject = (provider) => {
    Alert.alert(
      'Reject Provider',
      `Are you sure you want to reject ${provider.name}? This will mark them as rejected.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const success = await updateProviderStatus(provider.id, 'rejected');
            if (success) {
              // Remove from local list (rejected providers won't show)
              setAllProviders(prev => prev.filter(p => p.id !== provider.id));
              setShowDetailModal(false);
              Alert.alert('Done', 'Provider has been rejected');
              
              // Send SMS/Email notification to provider
              try {
                const providerData = {
                  firstName: provider.name?.split(' ')[0] || 'Provider',
                  phone: provider.phone,
                  email: provider.email,
                };
                await smsEmailService.notifyProviderRejected(providerData);
                console.log('Rejection notification sent to provider');
                
                // Send email notification via Resend
                if (provider.email) {
                  sendProviderApprovalEmail(provider.email, provider.name || 'Provider', false)
                    .catch(err => console.log('Email notification failed:', err));
                }
              } catch (notifError) {
                console.log('Failed to send rejection notification:', notifError);
              }
            }
          },
        },
      ]
    );
  };

  const handleSuspend = (provider) => {
    // Open suspension modal instead of simple alert
    setSuspendingProvider(provider);
    setSelectedReason(null);
    setCustomReason('');
    setShowSuspendModal(true);
  };

  const confirmSuspension = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a suspension reason.');
      return;
    }
    if (selectedReason.id === 'other' && !customReason.trim()) {
      Alert.alert('Required', 'Please provide a custom reason.');
      return;
    }

    setIsSuspending(true);
    try {
      const reasonText = selectedReason.id === 'other' 
        ? customReason.trim() 
        : selectedReason.description;
      const reasonLabel = selectedReason.id === 'other'
        ? 'Other: ' + customReason.trim()
        : selectedReason.label;

      // Update Firestore with suspension details
      const providerRef = doc(db, 'users', suspendingProvider.id);
      await updateDoc(providerRef, {
        status: 'suspended',
        providerStatus: 'suspended',
        isOnline: false,
        suspensionReason: reasonText,
        suspensionReasonLabel: reasonLabel,
        suspendedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update local state
      setAllProviders(prev =>
        prev.map(p =>
          p.id === suspendingProvider.id
            ? {...p, status: 'suspended', suspensionReason: reasonText}
            : p
        )
      );

      // Send email notification to provider
      if (suspendingProvider.email) {
        const emailDetails = `
Reason: ${reasonLabel}

${reasonText}

If you believe this is a mistake or would like to appeal this decision, please contact our support team.

GSS Maasin Support
        `.trim();

        sendNotificationEmail(
          suspendingProvider.email,
          suspendingProvider.name || 'Provider',
          'Account Suspended',
          'Your GSS Maasin provider account has been suspended. Please review the details below.',
          emailDetails
        ).catch(err => console.log('Failed to send suspension email:', err));
      }

      // Send push notification
      notificationService.sendPushToUser(
        suspendingProvider.id,
        'Account Suspended',
        `Your account has been suspended. Reason: ${reasonLabel}`,
        {type: 'account_suspended', providerId: suspendingProvider.id, reason: reasonLabel}
      ).catch(err => console.log('Push notification failed:', err));

      setShowSuspendModal(false);
      setShowDetailModal(false);
      Alert.alert(
        'Provider Suspended',
        `${suspendingProvider.name} has been suspended and notified via email.`
      );
    } catch (error) {
      console.error('Error suspending provider:', error);
      Alert.alert('Error', 'Failed to suspend provider. Please try again.');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivate = (provider) => {
    Alert.alert(
      'Reactivate Provider',
      `Reactivate ${provider.name}'s account?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reactivate',
          onPress: async () => {
            const success = await updateProviderStatus(provider.id, 'approved');
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Success', 'Provider reactivated');
            }
          },
        },
      ]
    );
  };

  const openProviderDetail = (provider) => {
    setSelectedProvider(provider);
    setShowDetailModal(true);
  };

  const renderProviderCard = ({item}) => {
    const statusStyle = getStatusStyle(item.status);
    
    return (
      <TouchableOpacity 
        style={[adminStyles.providerCard, isDark && {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}
        onPress={() => openProviderDetail(item)}
        activeOpacity={0.7}
      >
        <View style={adminStyles.providerHeader}>
          <View style={adminStyles.providerAvatar}>
            <Text style={adminStyles.providerAvatarText}>
              {item.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={adminStyles.providerInfo}>
            <Text style={[adminStyles.providerName, isDark && {color: theme.colors.text}]}>{item.name}</Text>
            <Text style={adminStyles.providerService}>{item.service}</Text>
            {item.status === 'approved' && item.rating > 0 && (
              <View style={adminStyles.providerRating}>
                <Icon name="star" size={14} color="#F59E0B" />
                <Text style={[adminStyles.providerRatingText, isDark && {color: theme.colors.textSecondary}]}>
                  {item.rating.toFixed(1)} ({item.completedJobs} jobs)
                </Text>
              </View>
            )}
          </View>
          <View style={[adminStyles.statusBadge, {backgroundColor: statusStyle.backgroundColor}]}>
            <Text style={[adminStyles.statusBadgeText, {color: statusStyle.color}]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={[adminStyles.providerDetails, isDark && {backgroundColor: theme.colors.background}]}>
          <View style={adminStyles.providerDetailRow}>
            <Icon name="mail-outline" size={16} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
            <Text style={[adminStyles.providerDetailText, isDark && {color: theme.colors.textSecondary}]}>{item.email}</Text>
          </View>
          <View style={adminStyles.providerDetailRow}>
            <Icon name="call-outline" size={16} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
            <Text style={[adminStyles.providerDetailText, isDark && {color: theme.colors.textSecondary}]}>{item.phone}</Text>
          </View>
          <View style={adminStyles.providerDetailRow}>
            <Icon name="calendar-outline" size={16} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
            <Text style={[adminStyles.providerDetailText, isDark && {color: theme.colors.textSecondary}]}>Registered at: {item.registeredDate}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={adminStyles.providerActions}>
            <TouchableOpacity 
              style={[adminStyles.actionButton, adminStyles.approveButton]}
              onPress={() => handleApprove(item)}
            >
              <Icon name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={adminStyles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[adminStyles.actionButton, adminStyles.rejectButton]}
              onPress={() => handleReject(item)}
            >
              <Icon name="close-circle" size={18} color="#FFFFFF" />
              <Text style={adminStyles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'approved' && (
          <View style={adminStyles.providerActions}>
            <TouchableOpacity 
              style={[adminStyles.actionButton, adminStyles.viewButton]}
              onPress={() => openProviderDetail(item)}
            >
              <Icon name="eye" size={18} color="#FFFFFF" />
              <Text style={adminStyles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[adminStyles.actionButton, adminStyles.suspendButton]}
              onPress={() => handleSuspend(item)}
            >
              <Icon name="pause-circle" size={18} color="#FFFFFF" />
              <Text style={adminStyles.actionButtonText}>Suspend</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'suspended' && (
          <View style={adminStyles.providerActions}>
            <TouchableOpacity 
              style={[adminStyles.actionButton, adminStyles.approveButton]}
              onPress={() => handleReactivate(item)}
            >
              <Icon name="play-circle" size={18} color="#FFFFFF" />
              <Text style={adminStyles.actionButtonText}>Reactivate</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedProvider) return null;
    const statusStyle = getStatusStyle(selectedProvider.status);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={adminStyles.modalOverlay}>
          <View style={[adminStyles.modalContent, isDark && {backgroundColor: theme.colors.surface}]}>
            <View style={adminStyles.modalHandle} />
            
            <View style={[adminStyles.modalHeader, isDark && {borderBottomColor: theme.colors.border}]}>
              <Text style={[adminStyles.modalTitle, isDark && {color: theme.colors.text}]}>Provider Details</Text>
              <TouchableOpacity 
                style={adminStyles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Icon name="close" size={24} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={adminStyles.modalBody}>
              <View style={{alignItems: 'center', marginBottom: 20}}>
                <View style={[adminStyles.providerAvatar, {width: 80, height: 80, borderRadius: 40}]}>
                  <Text style={[adminStyles.providerAvatarText, {fontSize: 28}]}>
                    {selectedProvider.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <Text style={[adminStyles.providerName, {fontSize: 20, marginTop: 12}, isDark && {color: theme.colors.text}]}>
                  {selectedProvider.name}
                </Text>
                <Text style={adminStyles.providerService}>{selectedProvider.service}</Text>
                <View style={[adminStyles.statusBadge, {backgroundColor: statusStyle.backgroundColor, marginTop: 8}]}>
                  <Text style={[adminStyles.statusBadgeText, {color: statusStyle.color}]}>
                    {selectedProvider.status.charAt(0).toUpperCase() + selectedProvider.status.slice(1)}
                  </Text>
                </View>
                {/* View Full Profile Button - Available for all statuses */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#3B82F6',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    marginTop: 12,
                  }}
                  onPress={() => {
                    setShowDetailModal(false);
                    navigation.navigate('ProviderProfile', {
                      providerId: selectedProvider.id,
                    });
                  }}
                >
                  <Icon name="person" size={16} color="#FFFFFF" />
                  <Text style={{color: '#FFFFFF', marginLeft: 6, fontWeight: '600', fontSize: 13}}>
                    View Full Profile
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[adminStyles.modalSection, isDark && {borderBottomColor: theme.colors.border}]}>
                <Text style={[adminStyles.modalSectionTitle, isDark && {color: theme.colors.textSecondary}]}>Contact Information</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="mail" size={20} color="#00B14F" />
                  <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>{selectedProvider.email}</Text>
                </View>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="call" size={20} color="#00B14F" />
                  <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>{selectedProvider.phone}</Text>
                </View>
              </View>
              
              <View style={adminStyles.modalSection}>
                <Text style={[adminStyles.modalSectionTitle, isDark && {color: theme.colors.text}]}>Address</Text>
                {selectedProvider.houseNumber ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="home" size={20} color="#00B14F" />
                    <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>House/Bldg: {selectedProvider.houseNumber}</Text>
                  </View>
                ) : null}
                {selectedProvider.streetAddress ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="navigate" size={20} color="#00B14F" />
                    <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>Street: {selectedProvider.streetAddress}</Text>
                  </View>
                ) : null}
                {selectedProvider.barangay ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="business" size={20} color="#00B14F" />
                    <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>Barangay: {selectedProvider.barangay}</Text>
                  </View>
                ) : null}
                {selectedProvider.landmark ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="flag" size={20} color="#00B14F" />
                    <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>Landmark: {selectedProvider.landmark}</Text>
                  </View>
                ) : null}
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="location" size={20} color="#00B14F" />
                  <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>{selectedProvider.location}</Text>
                </View>
                {/* Contact Provider Button - Only show for approved providers */}
                {selectedProvider.status === 'approved' && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#00B14F',
                      paddingVertical: 12,
                      borderRadius: 10,
                      marginTop: 12,
                    }}
                    onPress={() => {
                      setShowDetailModal(false);
                      navigation.navigate('AdminChat', {
                        recipient: {
                          id: selectedProvider.id,
                          name: selectedProvider.name,
                          phone: selectedProvider.phone,
                          role: 'PROVIDER',
                        },
                        jobTitle: `${selectedProvider.service} Services`,
                      });
                    }}
                  >
                    <Icon name="chatbubble" size={18} color="#FFFFFF" />
                    <Text style={{color: '#FFFFFF', marginLeft: 8, fontWeight: '600', fontSize: 15}}>
                      Message Provider
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedProvider.status === 'approved' && (
                <View style={[adminStyles.modalSection, isDark && {borderBottomColor: theme.colors.border}]}>
                  <Text style={[adminStyles.modalSectionTitle, isDark && {color: theme.colors.textSecondary}]}>Performance</Text>
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="star" size={20} color="#F59E0B" />
                    <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>
                      Rating: {selectedProvider.rating.toFixed(1)} / 5.0
                    </Text>
                  </View>
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="checkmark-done" size={20} color="#00B14F" />
                    <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>
                      Completed Jobs: {selectedProvider.completedJobs}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[adminStyles.modalSection, isDark && {borderBottomColor: theme.colors.border}]}>
                <Text style={[adminStyles.modalSectionTitle, isDark && {color: theme.colors.textSecondary}]}>Submitted Documents</Text>
                <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 12}}>
                  Tap to view full document
                </Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                  {/* Government ID */}
                  <TouchableOpacity
                    style={{
                      width: (screenWidth - 80) / 3,
                      aspectRatio: 1,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: selectedProvider.documents.governmentId?.submitted && selectedProvider.documents.governmentId?.url ? '#00B14F' : '#EF4444',
                    }}
                    disabled={!selectedProvider.documents.governmentId?.submitted || !selectedProvider.documents.governmentId?.url}
                    onPress={() => {
                      if (selectedProvider.documents.governmentId?.url) {
                        setSelectedImage(selectedProvider.documents.governmentId.url);
                        setSelectedImageTitle('Government ID');
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {selectedProvider.documents.governmentId?.submitted && selectedProvider.documents.governmentId?.url ? (
                      <Image
                        source={{uri: selectedProvider.documents.governmentId.url}}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Icon name="close-circle" size={32} color="#EF4444" />
                      </View>
                    )}
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: 4,
                    }}>
                      <Text style={{color: '#FFF', fontSize: 10, textAlign: 'center'}}>Gov't ID</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Selfie with ID */}
                  <TouchableOpacity
                    style={{
                      width: (screenWidth - 80) / 3,
                      aspectRatio: 1,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: selectedProvider.documents.selfie?.submitted && selectedProvider.documents.selfie?.url ? '#00B14F' : '#EF4444',
                    }}
                    disabled={!selectedProvider.documents.selfie?.submitted || !selectedProvider.documents.selfie?.url}
                    onPress={() => {
                      if (selectedProvider.documents.selfie?.url) {
                        setSelectedImage(selectedProvider.documents.selfie.url);
                        setSelectedImageTitle('Selfie with ID');
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {selectedProvider.documents.selfie?.submitted && selectedProvider.documents.selfie?.url ? (
                      <Image
                        source={{uri: selectedProvider.documents.selfie.url}}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Icon name="close-circle" size={32} color="#EF4444" />
                      </View>
                    )}
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: 4,
                    }}>
                      <Text style={{color: '#FFF', fontSize: 10, textAlign: 'center'}}>Selfie</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Barangay Clearance */}
                  <TouchableOpacity
                    style={{
                      width: (screenWidth - 80) / 3,
                      aspectRatio: 1,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: selectedProvider.documents.barangayClearance?.submitted && selectedProvider.documents.barangayClearance?.url ? '#00B14F' : '#EF4444',
                    }}
                    disabled={!selectedProvider.documents.barangayClearance?.submitted || !selectedProvider.documents.barangayClearance?.url}
                    onPress={() => {
                      if (selectedProvider.documents.barangayClearance?.url) {
                        setSelectedImage(selectedProvider.documents.barangayClearance.url);
                        setSelectedImageTitle('Barangay Clearance');
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {selectedProvider.documents.barangayClearance?.submitted && selectedProvider.documents.barangayClearance?.url ? (
                      <Image
                        source={{uri: selectedProvider.documents.barangayClearance.url}}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Icon name="close-circle" size={32} color="#EF4444" />
                      </View>
                    )}
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: 4,
                    }}>
                      <Text style={{color: '#FFF', fontSize: 10, textAlign: 'center'}}>Brgy Clearance</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Second row of documents */}
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 12}}>
                  {/* Police Clearance */}
                  <TouchableOpacity
                    style={{
                      width: (screenWidth - 80) / 3,
                      aspectRatio: 1,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: selectedProvider.documents.policeClearance?.submitted && selectedProvider.documents.policeClearance?.url ? '#00B14F' : '#EF4444',
                    }}
                    disabled={!selectedProvider.documents.policeClearance?.submitted || !selectedProvider.documents.policeClearance?.url}
                    onPress={() => {
                      if (selectedProvider.documents.policeClearance?.url) {
                        setSelectedImage(selectedProvider.documents.policeClearance.url);
                        setSelectedImageTitle('Police Clearance');
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {selectedProvider.documents.policeClearance?.submitted && selectedProvider.documents.policeClearance?.url ? (
                      <Image
                        source={{uri: selectedProvider.documents.policeClearance.url}}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Icon name="close-circle" size={32} color="#EF4444" />
                      </View>
                    )}
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: 4,
                    }}>
                      <Text style={{color: '#FFF', fontSize: 10, textAlign: 'center'}}>Police Clearance</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Certificate (TESDA/Skills) */}
                  <TouchableOpacity
                    style={{
                      width: (screenWidth - 80) / 3,
                      aspectRatio: 1,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: selectedProvider.documents.certificate?.submitted && selectedProvider.documents.certificate?.url ? '#00B14F' : '#EF4444',
                    }}
                    disabled={!selectedProvider.documents.certificate?.submitted || !selectedProvider.documents.certificate?.url}
                    onPress={() => {
                      if (selectedProvider.documents.certificate?.url) {
                        setSelectedImage(selectedProvider.documents.certificate.url);
                        setSelectedImageTitle('Skills/TESDA Certificate');
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {selectedProvider.documents.certificate?.submitted && selectedProvider.documents.certificate?.url ? (
                      <Image
                        source={{uri: selectedProvider.documents.certificate.url}}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Icon name="close-circle" size={32} color="#EF4444" />
                      </View>
                    )}
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      padding: 4,
                    }}>
                      <Text style={{color: '#FFF', fontSize: 10, textAlign: 'center'}}>Certificate</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[adminStyles.modalSection, isDark && {borderBottomColor: theme.colors.border}]}>
                <Text style={[adminStyles.modalSectionTitle, isDark && {color: theme.colors.textSecondary}]}>Account Info</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="calendar" size={20} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
                  <Text style={[adminStyles.modalInfoText, isDark && {color: theme.colors.text}]}>
                    Registered at: {selectedProvider.registeredDate}
                  </Text>
                </View>
              </View>

              {/* Suspension Details - Only show for suspended providers */}
              {selectedProvider.status === 'suspended' && selectedProvider.suspensionReason && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(220, 38, 38, 0.1)' : '#FEE2E2',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: '#DC2626',
                }}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                    <Icon name="ban" size={20} color="#DC2626" />
                    <Text style={{fontSize: 16, fontWeight: '600', color: '#DC2626', marginLeft: 8}}>
                      Suspension Details
                    </Text>
                  </View>
                  {selectedProvider.suspensionReasonLabel && (
                    <View style={{
                      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : '#FECACA',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      alignSelf: 'flex-start',
                      marginBottom: 10,
                    }}>
                      <Text style={{fontSize: 13, fontWeight: '600', color: '#991B1B'}}>
                        {selectedProvider.suspensionReasonLabel}
                      </Text>
                    </View>
                  )}
                  <Text style={{fontSize: 14, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 20}}>
                    {selectedProvider.suspensionReason}
                  </Text>
                  {selectedProvider.suspendedAt && (
                    <Text style={{fontSize: 12, color: isDark ? '#F87171' : '#B91C1C', marginTop: 10}}>
                      Suspended at: {selectedProvider.suspendedAt}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={adminStyles.modalFooter}>
              {selectedProvider.status === 'pending' && (
                <>
                  <TouchableOpacity 
                    style={[adminStyles.actionButton, adminStyles.rejectButton, {flex: 1}]}
                    onPress={() => handleReject(selectedProvider)}
                  >
                    <Icon name="close-circle" size={18} color="#FFFFFF" />
                    <Text style={adminStyles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[adminStyles.actionButton, adminStyles.approveButton, {flex: 1}]}
                    onPress={() => handleApprove(selectedProvider)}
                  >
                    <Icon name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={adminStyles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                </>
              )}
              {selectedProvider.status === 'approved' && (
                <TouchableOpacity 
                  style={[adminStyles.actionButton, adminStyles.suspendButton, {flex: 1}]}
                  onPress={() => handleSuspend(selectedProvider)}
                >
                  <Icon name="pause-circle" size={18} color="#FFFFFF" />
                  <Text style={adminStyles.actionButtonText}>Suspend Provider</Text>
                </TouchableOpacity>
              )}
              {selectedProvider.status === 'suspended' && (
                <TouchableOpacity 
                  style={[adminStyles.actionButton, adminStyles.approveButton, {flex: 1}]}
                  onPress={() => handleReactivate(selectedProvider)}
                >
                  <Icon name="play-circle" size={18} color="#FFFFFF" />
                  <Text style={adminStyles.actionButtonText}>Reactivate Provider</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const stats = getStats();

  return (
    <SafeAreaView style={[adminStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={[adminStyles.header, isDark && {backgroundColor: theme.colors.surface}]}>
        <Text style={[adminStyles.headerTitle, isDark && {color: theme.colors.text}]}>Providers</Text>
        <Text style={[adminStyles.headerSubtitle, isDark && {color: theme.colors.textSecondary}]}>Manage service providers</Text>
      </View>

      {/* Search Bar */}
      <View style={[adminStyles.searchContainer, isDark && {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
        <Icon name="search-outline" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} style={adminStyles.searchIcon} />
        <TextInput
          style={[adminStyles.searchInput, isDark && {color: theme.colors.text}]}
          placeholder="Search providers..."
          placeholderTextColor={isDark ? theme.colors.textTertiary : '#9CA3AF'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={adminStyles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{alignItems: 'center', paddingRight: 16}}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                adminStyles.filterTab,
                activeFilter === filter.id && adminStyles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text
                style={[
                  adminStyles.filterTabText,
                  activeFilter === filter.id && adminStyles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Bar */}
      <View style={[adminStyles.statsBar, isDark && {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
        <View style={adminStyles.statItem}>
          <Text style={[adminStyles.statNumber, isDark && {color: theme.colors.text}]}>{stats.pending}</Text>
          <Text style={[adminStyles.statLabel, isDark && {color: theme.colors.textSecondary}]}>Pending</Text>
        </View>
        <View style={[adminStyles.statDivider, isDark && {backgroundColor: theme.colors.border}]} />
        <View style={adminStyles.statItem}>
          <Text style={[adminStyles.statNumber, isDark && {color: theme.colors.text}]}>{stats.approved}</Text>
          <Text style={[adminStyles.statLabel, isDark && {color: theme.colors.textSecondary}]}>Approved</Text>
        </View>
        <View style={[adminStyles.statDivider, isDark && {backgroundColor: theme.colors.border}]} />
        <View style={adminStyles.statItem}>
          <Text style={[adminStyles.statNumber, isDark && {color: theme.colors.text}]}>{stats.suspended}</Text>
          <Text style={[adminStyles.statLabel, isDark && {color: theme.colors.textSecondary}]}>Suspended</Text>
        </View>
      </View>

      {/* Provider List */}
      {isLoading ? (
        <View style={adminStyles.emptyContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      ) : providers.length === 0 ? (
        <View style={adminStyles.emptyContainer}>
          <View style={[adminStyles.emptyIcon, isDark && {backgroundColor: theme.colors.surface}]}>
            <Icon name="people-outline" size={40} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          </View>
          <Text style={[adminStyles.emptyText, isDark && {color: theme.colors.text}]}>No providers found</Text>
          <Text style={[adminStyles.emptySubtext, isDark && {color: theme.colors.textSecondary}]}>
            {searchQuery ? 'Try a different search term' : 'No providers match the selected filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          renderItem={renderProviderCard}
          contentContainerStyle={adminStyles.listContent}
          style={adminStyles.listContainer}
          showsVerticalScrollIndicator={false}
          getItemLayout={(data, index) => ({
            length: 200, // Approximate height of provider card
            offset: 200 * index,
            index,
          })}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {renderDetailModal()}

      {/* Suspension Reason Modal */}
      <Modal
        visible={showSuspendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSuspending && setShowSuspendModal(false)}
      >
        <View style={adminStyles.modalOverlay}>
          <View style={[adminStyles.modalContent, isDark && {backgroundColor: theme.colors.surface}, {maxHeight: '85%'}]}>
            <View style={adminStyles.modalHandle} />
            
            <View style={[adminStyles.modalHeader, isDark && {borderBottomColor: theme.colors.border}]}>
              <Text style={[adminStyles.modalTitle, isDark && {color: theme.colors.text}]}>Suspend Provider</Text>
              <TouchableOpacity 
                style={adminStyles.modalCloseButton}
                onPress={() => !isSuspending && setShowSuspendModal(false)}
                disabled={isSuspending}
              >
                <Icon name="close" size={24} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={adminStyles.modalBody}>
              {suspendingProvider && (
                <View style={{alignItems: 'center', marginBottom: 20}}>
                  <View style={[adminStyles.providerAvatar, {width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2'}]}>
                    <Icon name="warning" size={28} color="#DC2626" />
                  </View>
                  <Text style={[adminStyles.providerName, {fontSize: 18, marginTop: 12}, isDark && {color: theme.colors.text}]}>
                    {suspendingProvider.name}
                  </Text>
                  <Text style={{color: isDark ? theme.colors.textSecondary : '#6B7280', fontSize: 14, marginTop: 4}}>
                    {suspendingProvider.email}
                  </Text>
                </View>
              )}

              <Text style={[adminStyles.modalSectionTitle, isDark && {color: theme.colors.textSecondary}, {marginBottom: 12}]}>
                Select Suspension Reason
              </Text>

              {SUSPENSION_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 12,
                    marginBottom: 10,
                    backgroundColor: selectedReason?.id === reason.id 
                      ? (isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2')
                      : (isDark ? theme.colors.background : '#F9FAFB'),
                    borderWidth: 2,
                    borderColor: selectedReason?.id === reason.id ? '#DC2626' : 'transparent',
                  }}
                  onPress={() => setSelectedReason(reason)}
                  disabled={isSuspending}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selectedReason?.id === reason.id ? '#DC2626' : (isDark ? theme.colors.border : '#D1D5DB'),
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    {selectedReason?.id === reason.id && (
                      <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#DC2626'}} />
                    )}
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={{fontSize: 15, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
                      {reason.label}
                    </Text>
                    {reason.id !== 'other' && (
                      <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 2}}>
                        {reason.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {selectedReason?.id === 'other' && (
                <View style={{marginTop: 8}}>
                  <Text style={{fontSize: 14, fontWeight: '500', color: isDark ? theme.colors.text : '#374151', marginBottom: 8}}>
                    Custom Reason *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: isDark ? theme.colors.border : '#D1D5DB',
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 15,
                      color: isDark ? theme.colors.text : '#1F2937',
                      backgroundColor: isDark ? theme.colors.background : '#FFFFFF',
                      minHeight: 100,
                      textAlignVertical: 'top',
                    }}
                    placeholder="Please describe the reason for suspension..."
                    placeholderTextColor={isDark ? theme.colors.textTertiary : '#9CA3AF'}
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    editable={!isSuspending}
                  />
                </View>
              )}

              <View style={{
                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : '#FFFBEB',
                padding: 14,
                borderRadius: 10,
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: 20,
              }}>
                <Icon name="information-circle" size={20} color="#F59E0B" style={{marginRight: 10, marginTop: 2}} />
                <Text style={{flex: 1, fontSize: 13, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 18}}>
                  The provider will be notified via email about this suspension and the reason. They will see this message when they try to log in.
                </Text>
              </View>
            </ScrollView>

            <View style={[adminStyles.modalFooter, {gap: 12, paddingTop: 16, paddingBottom: 20, borderTopWidth: 1, borderTopColor: isDark ? theme.colors.border : '#E5E7EB'}]}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: isDark ? theme.colors.background : '#F3F4F6',
                  alignItems: 'center',
                }}
                onPress={() => setShowSuspendModal(false)}
                disabled={isSuspending}
              >
                <Text style={{fontSize: 15, fontWeight: '600', color: isDark ? theme.colors.text : '#374151'}}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: '#DC2626',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  opacity: isSuspending ? 0.7 : 1,
                }}
                onPress={confirmSuspension}
                disabled={isSuspending}
              >
                {isSuspending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="pause-circle" size={18} color="#FFFFFF" />
                    <Text style={{fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginLeft: 6}}>
                      Suspend
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Header */}
          <View style={{
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            zIndex: 10,
          }}>
            <Text style={{color: '#FFFFFF', fontSize: 18, fontWeight: '600'}}>
              {selectedImageTitle}
            </Text>
            <TouchableOpacity
              onPress={() => setShowImageModal(false)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Image */}
          {selectedImage ? (
            <Image
              source={{uri: selectedImage}}
              style={{
                width: screenWidth - 40,
                height: screenWidth * 1.2,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
          ) : (
            <View style={{
              width: screenWidth - 40,
              height: screenWidth * 1.2,
              borderRadius: 12,
              backgroundColor: '#374151',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="image-outline" size={60} color="#9CA3AF" />
              <Text style={{color: '#9CA3AF', marginTop: 12}}>Image not available</Text>
            </View>
          )}

          {/* Footer hint */}
          <View style={{
            position: 'absolute',
            bottom: 50,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}>
            <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 14}}>
              Tap X or back to close
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminProvidersScreen;
