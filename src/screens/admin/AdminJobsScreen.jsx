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
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import {db} from '../../config/firebase';
import smsEmailService from '../../services/smsEmailService';
import {sendBookingConfirmationEmail, sendJobRejectionEmail} from '../../services/emailService';

const {width} = Dimensions.get('window');
const MEDIA_SIZE = (width - 60) / 3;

const AdminJobsScreen = ({navigation, route}) => {
  const {openJobId} = route?.params || {};
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filters = [
    {id: 'all', label: 'All'},
    {id: 'pending', label: 'Pending'},
    {id: 'pending_negotiation', label: 'Nego'},
    {id: 'counter_offer', label: 'Counter'},
    {id: 'accepted', label: 'Accept'},
    {id: 'in_progress', label: 'Active'},
    {id: 'completed', label: 'Done'},
    {id: 'cancelled', label: 'Cancel'},
    {id: 'disputed', label: 'Dispute'},
  ];

  useEffect(() => {
    fetchJobs();
  }, []);

  // Auto-open job details if openJobId is passed from notification
  useEffect(() => {
    if (openJobId && allJobs.length > 0) {
      const jobToOpen = allJobs.find(j => j.id === openJobId);
      if (jobToOpen) {
        setSelectedJob(jobToOpen);
        setShowDetailModal(true);
        // Clear the param so it doesn't re-open on re-render
        navigation.setParams({ openJobId: undefined });
      }
    }
  }, [openJobId, allJobs]);

  // Filter jobs when filter or search changes
  useEffect(() => {
    filterJobs();
  }, [activeFilter, searchQuery, allJobs]);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      // Query all bookings/jobs from Firebase
      const jobsQuery = query(collection(db, 'bookings'));
      const snapshot = await getDocs(jobsQuery);
      
      const jobsList = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Get client info if we have clientId
          let clientInfo = {
            id: data.clientId || null, 
            name: data.clientName || 'Unknown Client', 
            phone: 'Not provided', 
            role: 'CLIENT'
          };
          if (data.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, 'users', data.clientId));
              if (clientDoc.exists()) {
                const clientData = clientDoc.data();
                const fetchedName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
                clientInfo = {
                  id: data.clientId,
                  name: fetchedName || data.clientName || clientData.email?.split('@')[0] || 'Unknown',
                  phone: clientData.phone || clientData.phoneNumber || 'Not provided',
                  role: 'CLIENT',
                };
              }
            } catch (e) {
              console.log('Error fetching client:', e);
            }
          }
          
          // Get provider info if we have providerId
          let providerInfo = {
            id: data.providerId || null, 
            name: data.providerName || 'Not Assigned', 
            phone: 'N/A', 
            role: 'PROVIDER'
          };
          if (data.providerId) {
            try {
              const providerDoc = await getDoc(doc(db, 'users', data.providerId));
              if (providerDoc.exists()) {
                const providerData = providerDoc.data();
                const fetchedName = `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim();
                providerInfo = {
                  id: data.providerId,
                  name: fetchedName || data.providerName || providerData.email?.split('@')[0] || 'Unknown',
                  phone: providerData.phone || providerData.phoneNumber || 'Not provided',
                  role: 'PROVIDER',
                };
              }
            } catch (e) {
              console.log('Error fetching provider:', e);
            }
          }

          return {
            id: docSnap.id,
            title: data.title || data.serviceTitle || 'Service Request',
            category: data.category || data.serviceCategory || 'General',
            status: data.status || 'pending',
            client: clientInfo, // Always use fetched client info with proper ID
            provider: providerInfo, // Always use fetched provider info with proper ID
            clientId: data.clientId, // Keep original clientId for reference
            providerId: data.providerId, // Keep original providerId for reference
            amount: data.totalAmount || data.amount || data.price || 0,
            providerPrice: data.providerPrice || data.offeredPrice || 0,
            systemFee: data.systemFee || 0,
            scheduledDate: data.scheduledDate || data.date || 'TBD',
            scheduledTime: data.scheduledTime || data.time || 'TBD',
            location: data.location || data.address || 'Not specified',
            description: data.description || data.notes || '',
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
            createdAtRaw: data.createdAt?.toDate?.() || new Date(0),
            completedAt: data.completedAt?.toDate?.()?.toLocaleDateString() || null,
            cancelReason: data.cancelReason || null,
            disputeReason: data.disputeReason || null,
            // Media files from client
            media: data.mediaFiles || data.media || data.photos || [],
            // Negotiation fields
            isNegotiable: data.isNegotiable || false,
            offeredPrice: data.offeredPrice || 0,
            providerFixedPrice: data.providerFixedPrice || 0,
            counterOfferPrice: data.counterOfferPrice || 0,
            priceNote: data.priceNote || '',
            counterOfferNote: data.counterOfferNote || '',
            negotiationHistory: data.negotiationHistory || [],
            // Additional charges
            additionalCharges: data.additionalCharges || [],
            // Admin approval status
            adminApproved: data.adminApproved || false,
            // Keep raw data
            rawData: data,
          };
        })
      );

      // Sort by newest first (descending by created date)
      jobsList.sort((a, b) => b.createdAtRaw - a.createdAtRaw);

      setAllJobs(jobsList);
      setJobs(jobsList);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...allJobs];
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(j => j.status === activeFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(query) ||
        j.id.toLowerCase().includes(query) ||
        j.client?.name?.toLowerCase().includes(query) ||
        j.provider?.name?.toLowerCase().includes(query) ||
        j.category?.toLowerCase().includes(query)
      );
    }
    
    setJobs(filtered);
  };

  const updateJobStatus = async (jobId, newStatus, additionalData = {}) => {
    try {
      const jobRef = doc(db, 'bookings', jobId);
      await updateDoc(jobRef, {
        status: newStatus,
        updatedAt: new Date(),
        ...additionalData,
      });
      
      // Update local state
      setAllJobs(prev => 
        prev.map(j => j.id === jobId ? {...j, status: newStatus, ...additionalData} : j)
      );
      return true;
    } catch (error) {
      console.error('Error updating job status:', error);
      Alert.alert('Error', 'Failed to update job status');
      return false;
    }
  };

  const getStatusStyle = (status, adminApproved = false) => {
    switch (status) {
      case 'pending':
        // Green if admin approved (awaiting provider), yellow if pending approval
        return adminApproved 
          ? {backgroundColor: '#D1FAE5', color: '#059669'}
          : {backgroundColor: '#FEF3C7', color: '#D97706'};
      case 'pending_negotiation':
        return {backgroundColor: '#FEF3C7', color: '#F59E0B'};
      case 'counter_offer':
        return {backgroundColor: '#EDE9FE', color: '#8B5CF6'};
      case 'accepted':
        return {backgroundColor: '#DBEAFE', color: '#2563EB'};
      case 'in_progress':
        return {backgroundColor: '#E0E7FF', color: '#4F46E5'};
      case 'completed':
        return {backgroundColor: '#D1FAE5', color: '#059669'};
      case 'cancelled':
      case 'rejected':
      case 'declined':
        return {backgroundColor: '#F3F4F6', color: '#6B7280'};
      case 'disputed':
        return {backgroundColor: '#FEE2E2', color: '#DC2626'};
      default:
        return {backgroundColor: '#F3F4F6', color: '#6B7280'};
    }
  };

  const getStatusLabel = (status, adminApproved = false) => {
    switch (status) {
      case 'pending': return adminApproved ? 'Awaiting Provider' : 'Pending Approval';
      case 'pending_negotiation': return 'Price Negotiating';
      case 'counter_offer': return 'Counter Offer';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'rejected': return 'Rejected';
      case 'declined': return 'Declined';
      case 'disputed': return 'Disputed';
      default: return status;
    }
  };

  const getStats = () => {
    return {
      pending: allJobs.filter(j => j.status === 'pending').length,
      inProgress: allJobs.filter(j => j.status === 'in_progress').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      disputed: allJobs.filter(j => j.status === 'disputed').length,
    };
  };

  const handleApproveJob = (job) => {
    Alert.alert(
      'Approve Job Request',
      `Approve this job request?\n\nThis will send the job to ${job.provider?.name || 'the provider'} for review. The provider will see the client's photos/videos and can accept or decline.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve & Send to Provider',
          style: 'default',
          onPress: async () => {
            const success = await updateJobStatus(job.id, 'pending', {
              adminApproved: true,
              approvedAt: new Date(),
              approvedBy: 'admin',
              // Keep negotiation status if applicable
              isNegotiable: job.isNegotiable,
            });
            if (success) {
              setShowDetailModal(false);
              Alert.alert(
                'Job Approved', 
                `Job has been approved and sent to ${job.provider?.name || 'the provider'}. They can now view the details and photos.`
              );
              
              // Send SMS/Email notifications
              try {
                const bookingData = {
                  id: job.id,
                  serviceCategory: job.category,
                  scheduledDate: job.scheduledDate,
                  scheduledTime: job.scheduledTime,
                  totalAmount: job.amount,
                  amount: job.amount,
                  location: job.location,
                };
                
                // Notify client that their booking was approved
                const clientData = {
                  firstName: job.client?.name?.split(' ')[0] || 'Client',
                  phone: job.client?.phone,
                  email: job.client?.email,
                };
                await smsEmailService.notifyBookingApproved(bookingData, clientData, job.provider);
                
                // Notify provider about new approved job
                if (job.provider?.id) {
                  const providerData = {
                    firstName: job.provider?.name?.split(' ')[0] || 'Provider',
                    phone: job.provider?.phone,
                    email: job.provider?.email,
                  };
                  await smsEmailService.notifyProviderNewApprovedJob(bookingData, providerData, {name: job.client?.name});
                }
                
                // Send email notification to client via Resend
                if (job.client?.email) {
                  sendBookingConfirmationEmail(job.client.email, {
                    id: job.id,
                    serviceCategory: job.category,
                    title: job.title || job.category,
                    scheduledDate: job.scheduledDate,
                    scheduledTime: job.scheduledTime,
                    providerName: job.provider?.name || 'Provider',
                    totalAmount: job.amount,
                    clientName: job.client?.name || 'Client',
                    status: 'approved',
                  }).catch(err => console.log('Client email notification failed:', err));
                }
                
                console.log('Approval notifications sent');
              } catch (notifError) {
                console.log('Failed to send approval notifications:', notifError);
              }
            }
          },
        },
      ]
    );
  };

  const handleRejectJob = (job) => {
    Alert.alert(
      'Reject Job Request',
      `Are you sure you want to reject this job request?\n\nThe client will be notified.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const success = await updateJobStatus(job.id, 'rejected', {
              rejectedAt: new Date(),
              rejectedBy: 'admin',
              adminRejected: true,
            });
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Done', 'Job request has been rejected. Client will be notified.');
              
              // Send SMS/Email notification to client
              try {
                const bookingData = {
                  id: job.id,
                  serviceCategory: job.category,
                  scheduledDate: job.scheduledDate,
                };
                const clientData = {
                  firstName: job.client?.name?.split(' ')[0] || 'Client',
                  phone: job.client?.phone,
                  email: job.client?.email,
                };
                await smsEmailService.notifyBookingRejected(bookingData, clientData);
                
                // Send email notification to client via Resend
                if (job.client?.email) {
                  sendJobRejectionEmail(job.client.email, {
                    serviceCategory: job.category,
                    scheduledDate: job.scheduledDate,
                  }, 'Your request did not meet our requirements').catch(err => console.log('Rejection email failed:', err));
                }
                
                console.log('Rejection notification sent to client');
              } catch (notifError) {
                console.log('Failed to send rejection notification:', notifError);
              }
            }
          },
        },
      ]
    );
  };

  const handleCancelJob = (job) => {
    Alert.alert(
      'Cancel Job',
      `Are you sure you want to cancel job ${job.id}?`,
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const success = await updateJobStatus(job.id, 'cancelled', {
              cancelledAt: new Date(),
              cancelledBy: 'admin',
            });
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Done', 'Job has been cancelled');
            }
          },
        },
      ]
    );
  };

  const handleResolveDispute = (job, resolution) => {
    Alert.alert(
      'Resolve Dispute',
      `Resolve in favor of ${resolution === 'client' ? 'Client' : 'Provider'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            const success = await updateJobStatus(job.id, 'completed', {
              disputeResolution: resolution,
              resolvedAt: new Date(),
              resolvedBy: 'admin',
            });
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Done', 'Dispute has been resolved');
            }
          },
        },
      ]
    );
  };

  const handleRefund = (job) => {
    Alert.alert(
      'Process Refund',
      `Issue full refund of ₱${(job.amount || 0).toLocaleString()} to ${job.client?.name || 'client'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Process Refund',
          style: 'destructive',
          onPress: async () => {
            const success = await updateJobStatus(job.id, 'cancelled', {
              refunded: true,
              refundedAt: new Date(),
              refundAmount: job.amount,
            });
            if (success) {
              setShowDetailModal(false);
              Alert.alert('Success', 'Refund has been processed');
            }
          },
        },
      ]
    );
  };

  const openJobDetail = (job) => {
    setSelectedJob(job);
    setShowDetailModal(true);
  };

  const renderJobCard = ({item}) => {
    const statusStyle = getStatusStyle(item.status, item.adminApproved);
    
    return (
      <TouchableOpacity 
        style={adminStyles.jobCard}
        onPress={() => openJobDetail(item)}
        activeOpacity={0.7}
      >
        <View style={adminStyles.jobHeader}>
          <View style={{flex: 1}}>
            <Text style={adminStyles.jobId}>{item.id}</Text>
            <Text style={adminStyles.jobTitle}>{item.title}</Text>
            <Text style={adminStyles.jobCategory}>{item.category}</Text>
          </View>
          <View style={[adminStyles.jobStatusBadge, {backgroundColor: statusStyle.backgroundColor}]}>
            <Text style={[adminStyles.jobStatusText, {color: statusStyle.color}]}>
              {getStatusLabel(item.status, item.adminApproved)}
            </Text>
          </View>
        </View>

        <View style={adminStyles.jobParties}>
          <View style={adminStyles.jobParty}>
            <Text style={adminStyles.jobPartyLabel}>Client</Text>
            <Text style={adminStyles.jobPartyName}>{item.client.name}</Text>
          </View>
          <View style={adminStyles.jobPartyDivider} />
          <View style={adminStyles.jobParty}>
            <Text style={adminStyles.jobPartyLabel}>Provider</Text>
            <Text style={adminStyles.jobPartyName}>{item.provider.name}</Text>
          </View>
        </View>

        <View style={adminStyles.jobFooter}>
          <Text style={adminStyles.jobAmount}>₱{item.amount.toLocaleString()}</Text>
          <Text style={adminStyles.jobDate}>
            {item.scheduledDate} • {item.scheduledTime}
          </Text>
        </View>

        {item.status === 'disputed' && (
          <View style={adminStyles.jobActions}>
            <TouchableOpacity 
              style={[adminStyles.actionButton, adminStyles.viewButton]}
              onPress={() => openJobDetail(item)}
            >
              <Icon name="alert-circle" size={18} color="#FFFFFF" />
              <Text style={adminStyles.actionButtonText}>Review Dispute</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedJob) return null;
    const statusStyle = getStatusStyle(selectedJob.status, selectedJob.adminApproved);

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
              <Text style={adminStyles.modalTitle}>Job Details</Text>
              <TouchableOpacity 
                style={adminStyles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={adminStyles.modalBody}>
              <View style={{alignItems: 'center', marginBottom: 20}}>
                <Text style={{fontSize: 14, color: '#9CA3AF'}}>{selectedJob.id}</Text>
                <Text style={{fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 4}}>
                  {selectedJob.title}
                </Text>
                <Text style={{fontSize: 16, color: '#00B14F', marginTop: 4}}>
                  {selectedJob.category}
                </Text>
                <View style={[adminStyles.statusBadge, {backgroundColor: statusStyle.backgroundColor, marginTop: 8}]}>
                  <Text style={[adminStyles.statusBadgeText, {color: statusStyle.color}]}>
                    {getStatusLabel(selectedJob.status, selectedJob.adminApproved)}
                  </Text>
                </View>
              </View>

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Service Amount</Text>
                <Text style={{fontSize: 28, fontWeight: '700', color: '#00B14F'}}>
                  ₱{selectedJob.amount.toLocaleString()}
                </Text>
                {selectedJob.systemFee > 0 && (
                  <Text style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>
                    Provider: ₱{selectedJob.providerPrice?.toLocaleString() || 0} + Fee: ₱{selectedJob.systemFee?.toLocaleString() || 0}
                  </Text>
                )}
              </View>

              {/* Negotiation Info */}
              {(selectedJob.isNegotiable || selectedJob.status === 'pending_negotiation' || selectedJob.status === 'counter_offer') && (
                <View style={[adminStyles.modalSection, {backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12}]}>
                  <Text style={[adminStyles.modalSectionTitle, {color: '#92400E'}]}>Price Negotiation</Text>
                  <View style={{marginTop: 8}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                      <Text style={{color: '#78350F'}}>Provider's Fixed Price:</Text>
                      <Text style={{fontWeight: '600', color: '#78350F'}}>₱{(selectedJob.providerFixedPrice || 0).toLocaleString()}</Text>
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                      <Text style={{color: '#78350F'}}>Client's Offer:</Text>
                      <Text style={{fontWeight: '600', color: '#F59E0B'}}>₱{(selectedJob.offeredPrice || 0).toLocaleString()}</Text>
                    </View>
                    {selectedJob.counterOfferPrice > 0 && (
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                        <Text style={{color: '#78350F'}}>Provider's Counter:</Text>
                        <Text style={{fontWeight: '600', color: '#8B5CF6'}}>₱{selectedJob.counterOfferPrice.toLocaleString()}</Text>
                      </View>
                    )}
                    {selectedJob.priceNote && (
                      <Text style={{fontSize: 13, color: '#92400E', fontStyle: 'italic', marginTop: 8}}>
                        Client: "{selectedJob.priceNote}"
                      </Text>
                    )}
                    {selectedJob.counterOfferNote && (
                      <Text style={{fontSize: 13, color: '#5B21B6', fontStyle: 'italic', marginTop: 4}}>
                        Provider: "{selectedJob.counterOfferNote}"
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Client</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="person" size={20} color="#3B82F6" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.client.name}</Text>
                </View>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="call" size={20} color="#3B82F6" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.client.phone}</Text>
                </View>
                <View style={{flexDirection: 'row', marginTop: 10, gap: 8}}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#3B82F6',
                      paddingVertical: 10,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      if (!selectedJob.client?.id) {
                        Alert.alert('Error', 'Client information not available');
                        return;
                      }
                      setShowDetailModal(false);
                      navigation.navigate('AdminChat', {
                        recipient: selectedJob.client,
                        jobId: selectedJob.id,
                        jobTitle: selectedJob.title,
                      });
                    }}
                  >
                    <Icon name="chatbubble" size={16} color="#FFFFFF" />
                    <Text style={{color: '#FFFFFF', marginLeft: 6, fontWeight: '600'}}>
                      Message Client
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Provider</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="person" size={20} color="#00B14F" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.provider.name}</Text>
                </View>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="call" size={20} color="#00B14F" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.provider.phone}</Text>
                </View>
                <View style={{flexDirection: 'row', marginTop: 10, gap: 8}}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#00B14F',
                      paddingVertical: 10,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      if (!selectedJob.provider?.id) {
                        Alert.alert('Error', 'Provider not assigned to this job yet');
                        return;
                      }
                      setShowDetailModal(false);
                      navigation.navigate('AdminChat', {
                        recipient: selectedJob.provider,
                        jobId: selectedJob.id,
                        jobTitle: selectedJob.title,
                      });
                    }}
                  >
                    <Icon name="chatbubble" size={16} color="#FFFFFF" />
                    <Text style={{color: '#FFFFFF', marginLeft: 6, fontWeight: '600'}}>
                      Ask Provider
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Schedule</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="calendar" size={20} color="#6B7280" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.scheduledDate}</Text>
                </View>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="time" size={20} color="#6B7280" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.scheduledTime}</Text>
                </View>
              </View>

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Location</Text>
                <View style={adminStyles.modalInfoRow}>
                  <Icon name="location" size={20} color="#EF4444" />
                  <Text style={adminStyles.modalInfoText}>{selectedJob.location}</Text>
                </View>
              </View>

              <View style={adminStyles.modalSection}>
                <Text style={adminStyles.modalSectionTitle}>Description</Text>
                <Text style={{fontSize: 15, color: '#4B5563', lineHeight: 22}}>
                  {selectedJob.description}
                </Text>
              </View>

              {/* Media Gallery - Client's Photos/Videos of the Problem */}
              {selectedJob.media && selectedJob.media.length > 0 && (
                <View style={adminStyles.modalSection}>
                  <Text style={adminStyles.modalSectionTitle}>
                    📸 Client's Photos/Videos ({selectedJob.media.length})
                  </Text>
                  <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 8}}>
                    Photos/videos of the problem submitted by client
                  </Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8}}>
                    {selectedJob.media.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedMedia(item);
                          setShowMediaModal(true);
                        }}
                        style={{
                          width: MEDIA_SIZE,
                          height: MEDIA_SIZE,
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: '#F3F4F6',
                          borderWidth: 2,
                          borderColor: '#E5E7EB',
                        }}
                      >
                        {(item.uri || item.thumbnail || (typeof item === 'string' && item)) ? (
                          <Image
                            source={{uri: item.uri || item.thumbnail || item}}
                            style={{width: '100%', height: '100%'}}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                            <Icon name="image-outline" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        {(item.isVideo || item.type === 'video' || item.type?.includes('video')) && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                            }}
                          >
                            <Icon name="play-circle" size={40} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {selectedJob.status === 'disputed' && selectedJob.disputeReason && (
                <View style={[adminStyles.modalSection, {backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12}]}>
                  <Text style={[adminStyles.modalSectionTitle, {color: '#DC2626'}]}>Dispute Reason</Text>
                  <Text style={{fontSize: 15, color: '#991B1B', lineHeight: 22}}>
                    {selectedJob.disputeReason}
                  </Text>
                </View>
              )}

              {selectedJob.status === 'cancelled' && selectedJob.cancelReason && (
                <View style={[adminStyles.modalSection, {backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12}]}>
                  <Text style={adminStyles.modalSectionTitle}>Cancellation Reason</Text>
                  <Text style={{fontSize: 15, color: '#4B5563', lineHeight: 22}}>
                    {selectedJob.cancelReason}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[adminStyles.modalFooter, {flexDirection: 'column'}]}>
              {/* Pending jobs - Admin can approve or reject */}
              {(selectedJob.status === 'pending' || selectedJob.status === 'pending_negotiation' || selectedJob.status === 'counter_offer') && (
                <>
                  {!selectedJob.adminApproved ? (
                    <View style={{width: '100%'}}>
                      <Text style={{fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 10}}>
                        Admin Action: Approve to send to provider, or Reject
                      </Text>
                      <View style={{flexDirection: 'row', width: '100%', gap: 10}}>
                        <TouchableOpacity 
                          style={[adminStyles.actionButton, adminStyles.rejectButton, {flex: 1}]}
                          onPress={() => handleRejectJob(selectedJob)}
                        >
                          <Icon name="close-circle" size={18} color="#FFFFFF" />
                          <Text style={adminStyles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[adminStyles.actionButton, adminStyles.approveButton, {flex: 1}]}
                          onPress={() => handleApproveJob(selectedJob)}
                        >
                          <Icon name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={adminStyles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{width: '100%'}}>
                      <View style={{backgroundColor: '#D1FAE5', padding: 12, borderRadius: 10, marginBottom: 10}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                          <Icon name="checkmark-circle" size={20} color="#059669" />
                          <Text style={{fontSize: 14, fontWeight: '600', color: '#059669', marginLeft: 8}}>
                            Approved - Waiting for Provider
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: '#EF4444',
                          width: '100%',
                        }}
                        onPress={() => handleCancelJob(selectedJob)}
                      >
                        <Icon name="close-circle" size={18} color="#FFFFFF" />
                        <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 6}}>Cancel Job</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
              {/* Accepted jobs - can cancel if needed */}
              {selectedJob.status === 'accepted' && (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#EF4444',
                    width: '100%',
                  }}
                  onPress={() => handleCancelJob(selectedJob)}
                >
                  <Icon name="close-circle" size={18} color="#FFFFFF" />
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 6}}>Cancel Job</Text>
                </TouchableOpacity>
              )}
              {selectedJob.status === 'disputed' && (
                <>
                  <View style={{flexDirection: 'row', width: '100%', gap: 10, marginBottom: 10}}>
                    <TouchableOpacity 
                      style={[adminStyles.actionButton, adminStyles.viewButton, {flex: 1}]}
                      onPress={() => handleResolveDispute(selectedJob, 'client')}
                    >
                      <Icon name="person" size={18} color="#FFFFFF" />
                      <Text style={adminStyles.actionButtonText}>Favor Client</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[adminStyles.actionButton, adminStyles.approveButton, {flex: 1}]}
                      onPress={() => handleResolveDispute(selectedJob, 'provider')}
                    >
                      <Icon name="construct" size={18} color="#FFFFFF" />
                      <Text style={adminStyles.actionButtonText}>Favor Provider</Text>
                    </TouchableOpacity>
                  </View>
                  {!selectedJob.refunded && (
                    <TouchableOpacity 
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F59E0B',
                        paddingVertical: 12,
                        borderRadius: 10,
                        width: '100%',
                      }}
                      onPress={() => handleRefund(selectedJob)}
                    >
                      <Icon name="card" size={18} color="#FFFFFF" />
                      <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 6}}>
                        Process Refund
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {selectedJob.status === 'cancelled' && !selectedJob.refunded && (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F59E0B',
                    paddingVertical: 12,
                    borderRadius: 10,
                    width: '100%',
                  }}
                  onPress={() => handleRefund(selectedJob)}
                >
                  <Icon name="card" size={18} color="#FFFFFF" />
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginLeft: 6}}>
                    Process Refund
                  </Text>
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
        <Text style={adminStyles.headerTitle}>Jobs</Text>
        <Text style={adminStyles.headerSubtitle}>Monitor and manage all jobs</Text>
      </View>

      {/* Search Bar */}
      <View style={adminStyles.searchContainer}>
        <Icon name="search-outline" size={20} color="#9CA3AF" style={adminStyles.searchIcon} />
        <TextInput
          style={adminStyles.searchInput}
          placeholder="Search jobs, clients, providers..."
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
          <Text style={adminStyles.statNumber}>{stats.inProgress}</Text>
          <Text style={adminStyles.statLabel}>Active</Text>
        </View>
        <View style={adminStyles.statDivider} />
        <View style={adminStyles.statItem}>
          <Text style={adminStyles.statNumber}>{stats.completed}</Text>
          <Text style={adminStyles.statLabel}>Done</Text>
        </View>
        <View style={adminStyles.statDivider} />
        <View style={adminStyles.statItem}>
          <Text style={[adminStyles.statNumber, {color: '#DC2626'}]}>{stats.disputed}</Text>
          <Text style={adminStyles.statLabel}>Disputed</Text>
        </View>
      </View>

      {/* Jobs List */}
      {isLoading ? (
        <View style={adminStyles.emptyContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      ) : jobs.length === 0 ? (
        <View style={adminStyles.emptyContainer}>
          <View style={adminStyles.emptyIcon}>
            <Icon name="briefcase-outline" size={40} color="#9CA3AF" />
          </View>
          <Text style={adminStyles.emptyText}>No jobs found</Text>
          <Text style={adminStyles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'No jobs match the selected filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={adminStyles.listContent}
          style={adminStyles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderDetailModal()}

      {/* Media Preview Modal */}
      <Modal
        visible={showMediaModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 10,
              padding: 10,
            }}
            onPress={() => setShowMediaModal(false)}
          >
            <Icon name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          
          {selectedMedia && (
            selectedMedia.type === 'video' ? (
              <View style={{alignItems: 'center'}}>
                {selectedMedia.thumbnail ? (
                  <Image
                    source={{uri: selectedMedia.thumbnail}}
                    style={{width: width - 40, height: width - 40, borderRadius: 12}}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{width: width - 40, height: width - 40, borderRadius: 12, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center'}}>
                    <Icon name="videocam" size={60} color="#9CA3AF" />
                  </View>
                )}
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(0,177,79,0.9)',
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => Alert.alert('Video Player', 'Video playback would open here')}
                  >
                    <Icon name="play" size={40} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={{color: '#FFFFFF', marginTop: 16, fontSize: 16}}>
                  Tap to play video
                </Text>
              </View>
            ) : (
              (selectedMedia.uri || (typeof selectedMedia === 'string' && selectedMedia)) ? (
                <Image
                  source={{uri: selectedMedia.uri || selectedMedia}}
                  style={{width: width - 40, height: width - 40, borderRadius: 12}}
                  resizeMode="contain"
                />
              ) : (
                <View style={{width: width - 40, height: width - 40, borderRadius: 12, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center'}}>
                  <Icon name="image-outline" size={60} color="#9CA3AF" />
                </View>
              )
            )
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminJobsScreen;
