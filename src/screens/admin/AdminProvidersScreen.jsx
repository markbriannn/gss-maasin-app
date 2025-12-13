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
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {db} from '../../config/firebase';
import smsEmailService from '../../services/smsEmailService';

const {width: screenWidth} = Dimensions.get('window');

const AdminProvidersScreen = ({navigation, route}) => {
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

  const filters = [
    {id: 'all', label: 'All'},
    {id: 'pending', label: 'Pending'},
    {id: 'approved', label: 'Approved'},
    {id: 'suspended', label: 'Suspended'},
  ];

  // Fetch providers from Firebase
  useEffect(() => {
    fetchProviders();
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

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      // Query users with role = 'PROVIDER'
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER')
      );
      
      const snapshot = await getDocs(providersQuery);
      const providersList = snapshot.docs.map(docSnap => {
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
        
        return {
          id: docSnap.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email?.split('@')[0] || 'Unknown',
          email: data.email || '',
          phone: data.phone || data.phoneNumber || 'Not provided',
          service: data.serviceCategory || data.service || 'General Services',
          status: data.status || 'pending', // Default to pending if not set
          rating: data.rating || 0,
          completedJobs: data.completedJobs || 0,
          registeredDate: data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
          registeredDateRaw: data.createdAt?.toDate?.() || new Date(0),
          location: fullAddress,
          // New location fields
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
            clearance: {
              submitted: !!data.documents?.clearance || !!data.documents?.clearanceUrl,
              url: data.documents?.clearanceUrl || null,
            },
            certificate: {
              submitted: !!data.documents?.certificates?.length || !!data.documents?.certificateUrls?.length,
              urls: data.documents?.certificateUrls || [],
            },
          },
          // Keep raw data for reference
          rawData: data,
        };
      });

      // Sort by newest first (descending by registration date)
      providersList.sort((a, b) => b.registeredDateRaw - a.registeredDateRaw);

      setAllProviders(providersList);
      setProviders(providersList);
    } catch (error) {
      console.error('Error fetching providers:', error);
      Alert.alert('Error', 'Failed to load providers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
      await updateDoc(providerRef, {
        status: newStatus,
        providerStatus: newStatus,
        updatedAt: new Date(),
      });
      
      // Update local state
      setAllProviders(prev => 
        prev.map(p => p.id === providerId ? {...p, status: newStatus} : p)
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
    Alert.alert(
      'Suspend Provider',
      `Are you sure you want to suspend ${provider.name}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            const success = await updateProviderStatus(provider.id, 'suspended');
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Done', 'Provider has been suspended');
            }
          },
        },
      ]
    );
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
        style={adminStyles.providerCard}
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
            <Text style={adminStyles.providerName}>{item.name}</Text>
            <Text style={adminStyles.providerService}>{item.service}</Text>
            {item.status === 'approved' && item.rating > 0 && (
              <View style={adminStyles.providerRating}>
                <Icon name="star" size={14} color="#F59E0B" />
                <Text style={adminStyles.providerRatingText}>
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

        <View style={adminStyles.providerDetails}>
          <View style={adminStyles.providerDetailRow}>
            <Icon name="mail-outline" size={16} color="#9CA3AF" />
            <Text style={adminStyles.providerDetailText}>{item.email}</Text>
          </View>
          <View style={adminStyles.providerDetailRow}>
            <Icon name="call-outline" size={16} color="#9CA3AF" />
            <Text style={adminStyles.providerDetailText}>{item.phone}</Text>
          </View>
          <View style={adminStyles.providerDetailRow}>
            <Icon name="calendar-outline" size={16} color="#9CA3AF" />
            <Text style={adminStyles.providerDetailText}>Registered: {item.registeredDate}</Text>
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
          <View style={adminStyles.modalContent}>
            <View style={adminStyles.modalHandle} />
            
            <View style={adminStyles.modalHeader}>
              <Text style={adminStyles.modalTitle}>Provider Details</Text>
              <TouchableOpacity 
                style={adminStyles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={adminStyles.modalBody}>
              <View style={{alignItems: 'center', marginBottom: 20}}>
                <View style={[adminStyles.providerAvatar, {width: 80, height: 80, borderRadius: 40}]}>
                  <Text style={[adminStyles.providerAvatarText, {fontSize: 28}]}>
                    {selectedProvider.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <Text style={[adminStyles.providerName, {fontSize: 20, marginTop: 12}]}>
                  {selectedProvider.name}
                </Text>
                <Text style={adminStyles.providerService}>{selectedProvider.service}</Text>
                <View style={[adminStyles.statusBadge, {backgroundColor: statusStyle.backgroundColor, marginTop: 8}]}>
                  <Text style={[adminStyles.statusBadgeText, {color: statusStyle.color}]}>
                    {selectedProvider.status.charAt(0).toUpperCase() + selectedProvider.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Contact Information</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="mail" size={20} color="#00B14F" />
                  <Text style={adminStyles.modalInfoText}>{selectedProvider.email}</Text>
                </View>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="call" size={20} color="#00B14F" />
                  <Text style={adminStyles.modalInfoText}>{selectedProvider.phone}</Text>
                </View>
              </View>
              
              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Address</Text>
                {selectedProvider.houseNumber ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="home" size={20} color="#00B14F" />
                    <Text style={adminStyles.modalInfoText}>House/Bldg: {selectedProvider.houseNumber}</Text>
                  </View>
                ) : null}
                {selectedProvider.streetAddress ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="navigate" size={20} color="#00B14F" />
                    <Text style={adminStyles.modalInfoText}>Street: {selectedProvider.streetAddress}</Text>
                  </View>
                ) : null}
                {selectedProvider.barangay ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="business" size={20} color="#00B14F" />
                    <Text style={adminStyles.modalInfoText}>Barangay: {selectedProvider.barangay}</Text>
                  </View>
                ) : null}
                {selectedProvider.landmark ? (
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="flag" size={20} color="#00B14F" />
                    <Text style={adminStyles.modalInfoText}>Landmark: {selectedProvider.landmark}</Text>
                  </View>
                ) : null}
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="location" size={20} color="#00B14F" />
                  <Text style={adminStyles.modalInfoText}>{selectedProvider.location}</Text>
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
                <View style={adminStyles.modalSection}>
                  <Text style={adminStyles.modalSectionTitle}>Performance</Text>
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="star" size={20} color="#F59E0B" />
                    <Text style={adminStyles.modalInfoText}>
                      Rating: {selectedProvider.rating.toFixed(1)} / 5.0
                    </Text>
                  </View>
                  <View style={adminStyles.modalInfoRow}>
                    <Icon name="checkmark-done" size={20} color="#00B14F" />
                    <Text style={adminStyles.modalInfoText}>
                      Completed Jobs: {selectedProvider.completedJobs}
                    </Text>
                  </View>
                </View>
              )}

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Submitted Documents</Text>
                <Text style={{fontSize: 13, color: '#6B7280', marginBottom: 12}}>
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

                  {/* NBI/Police Clearance */}
                  <TouchableOpacity
                    style={{
                      width: (screenWidth - 80) / 3,
                      aspectRatio: 1,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#F3F4F6',
                      borderWidth: 2,
                      borderColor: selectedProvider.documents.clearance?.submitted && selectedProvider.documents.clearance?.url ? '#00B14F' : '#EF4444',
                    }}
                    disabled={!selectedProvider.documents.clearance?.submitted || !selectedProvider.documents.clearance?.url}
                    onPress={() => {
                      if (selectedProvider.documents.clearance?.url) {
                        setSelectedImage(selectedProvider.documents.clearance.url);
                        setSelectedImageTitle('NBI/Police Clearance');
                        setShowImageModal(true);
                      }
                    }}
                  >
                    {selectedProvider.documents.clearance?.submitted && selectedProvider.documents.clearance?.url ? (
                      <Image
                        source={{uri: selectedProvider.documents.clearance.url}}
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
                      <Text style={{color: '#FFF', fontSize: 10, textAlign: 'center'}}>Clearance</Text>
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

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Account Info</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="calendar" size={20} color="#6B7280" />
                  <Text style={adminStyles.modalInfoText}>
                    Registered: {selectedProvider.registeredDate}
                  </Text>
                </View>
              </View>
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
    <SafeAreaView style={adminStyles.container} edges={['top']}>
      <View style={adminStyles.header}>
        <Text style={adminStyles.headerTitle}>Providers</Text>
        <Text style={adminStyles.headerSubtitle}>Manage service providers</Text>
      </View>

      {/* Search Bar */}
      <View style={adminStyles.searchContainer}>
        <Icon name="search-outline" size={20} color="#9CA3AF" style={adminStyles.searchIcon} />
        <TextInput
          style={adminStyles.searchInput}
          placeholder="Search providers..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#9CA3AF" />
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
      <View style={adminStyles.statsBar}>
        <View style={adminStyles.statItem}>
          <Text style={adminStyles.statNumber}>{stats.pending}</Text>
          <Text style={adminStyles.statLabel}>Pending</Text>
        </View>
        <View style={adminStyles.statDivider} />
        <View style={adminStyles.statItem}>
          <Text style={adminStyles.statNumber}>{stats.approved}</Text>
          <Text style={adminStyles.statLabel}>Approved</Text>
        </View>
        <View style={adminStyles.statDivider} />
        <View style={adminStyles.statItem}>
          <Text style={adminStyles.statNumber}>{stats.suspended}</Text>
          <Text style={adminStyles.statLabel}>Suspended</Text>
        </View>
      </View>

      {/* Provider List */}
      {isLoading ? (
        <View style={adminStyles.emptyContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      ) : providers.length === 0 ? (
        <View style={adminStyles.emptyContainer}>
          <View style={adminStyles.emptyIcon}>
            <Icon name="people-outline" size={40} color="#9CA3AF" />
          </View>
          <Text style={adminStyles.emptyText}>No providers found</Text>
          <Text style={adminStyles.emptySubtext}>
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
        />
      )}

      {renderDetailModal()}

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
