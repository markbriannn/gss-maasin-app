import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {mapStyles} from '../../css/mapStyles';
import {useTheme} from '../../context/ThemeContext';
import {db} from '../../config/firebase';
import {collection, query, where, onSnapshot} from 'firebase/firestore';

const AdminMapScreen = ({navigation}) => {
  const {isDark, theme} = useTheme();
  const mapRef = useRef(null);
  const [region] = useState({
    latitude: 10.1335,
    longitude: 124.8513,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    // Real-time listener for providers
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER')
    );
    
    const unsubscribe = onSnapshot(
      providersQuery,
      (querySnapshot) => {
        const providersList = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Check both status and providerStatus fields for 'approved'
          const isApproved = data.status === 'approved' || data.providerStatus === 'approved';
          const isPending = data.status === 'pending' || data.providerStatus === 'pending' || (!data.status && !data.providerStatus);
          const isSuspended = data.status === 'suspended' || data.providerStatus === 'suspended';
          
          // Skip suspended providers from the map
          if (isSuspended) return;
          
          // Determine provider's current activity status
          let activityStatus = 'offline';
          if (!isApproved) {
            activityStatus = 'pending';
          } else if (data.currentJobId && data.jobStatus === 'in_progress') {
            activityStatus = 'working';
          } else if (data.currentJobId && data.jobStatus === 'traveling') {
            activityStatus = 'traveling';
          } else if (data.currentJobId && data.jobStatus === 'arrived') {
            activityStatus = 'arrived';
          } else if (data.isOnline) {
            activityStatus = 'available';
          }
          
          providersList.push({
            id: docSnap.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
            latitude: data.latitude || 10.1335 + (Math.random() - 0.5) * 0.02,
            longitude: data.longitude || 124.8513 + (Math.random() - 0.5) * 0.02,
            status: activityStatus,
            isApproved: isApproved,
            isPending: isPending,
            isTraveling: activityStatus === 'traveling',
            isWorking: activityStatus === 'working',
            isArrived: activityStatus === 'arrived',
            service: data.serviceCategory || 'Service Provider',
            currentJob: data.currentJobId || null,
            jobStatus: data.jobStatus || null,
            phone: data.phone,
            email: data.email,
          });
        });
        
        setProviders(providersList);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading providers:', error);
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, []);

  const handleProviderPress = (provider) => {
    setSelectedProvider(provider);
    // Animate to provider location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: provider.latitude,
        longitude: provider.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const getMarkerColor = (status) => {
    switch (status) {
      case 'available':
        return '#10B981'; // Green - online approved
      case 'offline':
        return '#6B7280'; // Gray - offline approved
      case 'traveling':
        return '#3B82F6'; // Blue - on the way
      case 'arrived':
        return '#8B5CF6'; // Purple - arrived at location
      case 'working':
        return '#F59E0B'; // Yellow/Orange - working
      case 'pending':
        return '#EF4444'; // Red - pending approval
      default:
        return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={mapStyles.container} edges={['top']}>
      <MapView
        ref={mapRef}
        style={mapStyles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}>
        
        {providers.map((provider) => (
          <Marker
            key={provider.id}
            coordinate={{
              latitude: provider.latitude,
              longitude: provider.longitude,
            }}
            tracksViewChanges={false}
            onPress={() => handleProviderPress(provider)}>
            <View style={{alignItems: 'center'}}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: getMarkerColor(provider.status),
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}>
                <Icon name="person" size={20} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={{position: 'absolute', top: 16, left: 16, right: 16}}>
        <View
          style={{
            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}>
          <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 12}}>
            Active Providers Map
          </Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 4}} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Available</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginRight: 4}} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Traveling</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B5CF6', marginRight: 4}} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Arrived</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B', marginRight: 4}} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Working</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B7280', marginRight: 4}} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Offline</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginRight: 4}} />
              <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Pending</Text>
            </View>
          </View>
          <Text style={{fontSize: 11, color: isDark ? theme.colors.textTertiary : '#9CA3AF', marginTop: 6}}>
            {providers.filter(p => p.isApproved).length} approved • {providers.filter(p => p.isTraveling).length} traveling • {providers.filter(p => p.isArrived).length} arrived • {providers.filter(p => p.isWorking).length} working
          </Text>
        </View>
      </View>

      {selectedProvider && (
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}>
          <TouchableOpacity
            style={{position: 'absolute', top: 12, right: 12}}
            onPress={() => setSelectedProvider(null)}>
            <Icon name="close-circle" size={24} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
            {selectedProvider.name}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
            <Icon name="construct" size={16} color={isDark ? theme.colors.textSecondary : '#6B7280'} style={{marginRight: 8}} />
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
              {selectedProvider.service}
            </Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: `${getMarkerColor(selectedProvider.status)}20`,
              }}>
              <Text style={{fontSize: 12, fontWeight: '600', color: getMarkerColor(selectedProvider.status)}}>
                {(selectedProvider.status || 'offline').toUpperCase()}
              </Text>
            </View>
          </View>
          {selectedProvider.currentJob && (
            <Text style={{fontSize: 14, color: isDark ? theme.colors.text : '#374151', marginBottom: 12}}>
              Current Job: {selectedProvider.currentJob}
            </Text>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: '#00B14F',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={() => setShowDetailModal(true)}>
            <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
          }}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      )}

      {/* Provider Detail Modal */}
      <Modal
        visible={showDetailModal && selectedProvider !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View style={{
            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? theme.colors.border : '#E5E7EB',
            }}>
              <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>
                Provider Details
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={24} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{padding: 20}}>
              {selectedProvider && (
                <>
                  {/* Provider Info */}
                  <View style={{alignItems: 'center', marginBottom: 20}}>
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: getMarkerColor(selectedProvider.status),
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}>
                      <Icon name="person" size={40} color="#FFFFFF" />
                    </View>
                    <Text style={{fontSize: 22, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>
                      {selectedProvider.name}
                    </Text>
                    <View style={{
                      backgroundColor: `${getMarkerColor(selectedProvider.status)}20`,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 20,
                      marginTop: 8,
                    }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: getMarkerColor(selectedProvider.status),
                      }}>
                        {(selectedProvider.status || 'offline').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={{backgroundColor: isDark ? theme.colors.background : '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                      <Icon name="construct" size={20} color="#00B14F" />
                      <Text style={{fontSize: 15, color: isDark ? theme.colors.text : '#374151', marginLeft: 12}}>
                        {selectedProvider.service}
                      </Text>
                    </View>
                    {selectedProvider.phone && (
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                        <Icon name="call" size={20} color="#00B14F" />
                        <Text style={{fontSize: 15, color: isDark ? theme.colors.text : '#374151', marginLeft: 12}}>
                          {selectedProvider.phone}
                        </Text>
                      </View>
                    )}
                    {selectedProvider.email && (
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                        <Icon name="mail" size={20} color="#00B14F" />
                        <Text style={{fontSize: 15, color: isDark ? theme.colors.text : '#374151', marginLeft: 12}}>
                          {selectedProvider.email}
                        </Text>
                      </View>
                    )}
                    {selectedProvider.currentJob && (
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Icon name="briefcase" size={20} color="#F59E0B" />
                        <Text style={{fontSize: 15, color: isDark ? theme.colors.text : '#374151', marginLeft: 12}}>
                          Current Job: {selectedProvider.currentJob}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={{flexDirection: 'row', gap: 12, marginBottom: 20}}>
                    {selectedProvider.phone && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: '#10B981',
                          paddingVertical: 14,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => Linking.openURL(`tel:${selectedProvider.phone}`)}>
                        <Icon name="call" size={20} color="#FFFFFF" />
                        <Text style={{color: '#FFFFFF', fontWeight: '600', marginLeft: 8}}>Call</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#3B82F6',
                        paddingVertical: 14,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        setShowDetailModal(false);
                        navigation.navigate('AdminChat', {
                          recipient: {
                            id: selectedProvider.id,
                            name: selectedProvider.name,
                            role: 'PROVIDER',
                          },
                        });
                      }}>
                      <Icon name="chatbubble" size={20} color="#FFFFFF" />
                      <Text style={{color: '#FFFFFF', fontWeight: '600', marginLeft: 8}}>Message</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Go to Providers */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: isDark ? theme.colors.background : '#F3F4F6',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      marginBottom: 20,
                    }}
                    onPress={() => {
                      const providerId = selectedProvider.id;
                      setShowDetailModal(false);
                      setSelectedProvider(null);
                      navigation.navigate('Providers', {openProviderId: providerId});
                    }}>
                    <Text style={{color: isDark ? theme.colors.text : '#374151', fontWeight: '600'}}>View in Providers List</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminMapScreen;
