import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {SERVICE_CATEGORIES} from '../../config/constants';
import locationService from '../../services/locationService';
import {db} from '../../config/firebase';
import {collection, query, where, getDocs} from 'firebase/firestore';
import {guestHomeStyles as styles} from '../../css/profileStyles';

const {width} = Dimensions.get('window');

const GuestHomeScreen = ({navigation}) => {
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    getCurrentLocation();
    loadNearbyProviders();
  }, [selectedCategory]);

  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadNearbyProviders = async () => {
    setIsLoading(true);
    try {
      // Fetch all providers, then filter by status in JavaScript
      const providersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'PROVIDER')
      );
      
      const querySnapshot = await getDocs(providersQuery);
      const providersList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if provider is approved (check both status fields)
        const isApproved = data.providerStatus === 'approved' || data.status === 'approved';
        if (!isApproved) {
          return;
        }
        
        if (selectedCategory && data.serviceCategory !== selectedCategory) {
          return;
        }
        
        let distance = 0;
        if (userLocation && data.latitude && data.longitude) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            data.latitude,
            data.longitude
          );
        }
        
        providersList.push({
          id: doc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
          serviceCategory: data.serviceCategory,
          rating: data.rating || null,
          reviewCount: data.reviewCount || 0,
          distance: distance.toFixed(1),
          // New pricing fields
          priceType: data.priceType || 'per_job',
          fixedPrice: data.fixedPrice || 0,
          // Legacy support
          hourlyRate: data.hourlyRate || data.fixedPrice || 200,
          isOnline: data.isOnline || false,
          ...data,
        });
      });
      
      providersList.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setProviders(providersList);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleProviderPress = (provider) => {
    navigation.navigate('Login', {
      returnTo: 'ProviderProfile',
      returnParams: {providerId: provider.id, provider}
    });
  };

  const handleHirePress = (provider) => {
    navigation.navigate('Login', {
      returnTo: 'HireProvider',
      returnParams: {providerId: provider.id, provider}
    });
  };

  const getCategoryIcon = (categoryId) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : 'construct';
  };

  const getCategoryColor = (categoryId) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.color : '#6B7280';
  };

  const getCategoryName = (categoryId) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Filter providers by search
  const filteredProviders = providers.filter(provider => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      provider.name.toLowerCase().includes(query) ||
      (provider.serviceCategory && provider.serviceCategory.toLowerCase().includes(query))
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Here for the first time?</Text>
            <TouchableOpacity 
              style={styles.signUpPrompt}
              onPress={() => navigation.navigate('RoleSelection')}>
              <Text style={styles.signUpPromptText}>Sign up to get started with GSS!</Text>
              <Icon name="arrow-forward-circle" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerImageContainer}>
            <Icon name="construct" size={80} color="rgba(255,255,255,0.3)" />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for services or providers"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}>
            {SERVICE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id && styles.categoryItemActive,
                ]}
                onPress={() => handleCategorySelect(category.id)}>
                <View style={[styles.categoryIconContainer, {backgroundColor: category.color + '20'}]}>
                  <Icon name={category.icon} size={28} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.categoryItem,
                !selectedCategory && styles.categoryItemActive,
              ]}
              onPress={() => setSelectedCategory(null)}>
              <View style={[styles.categoryIconContainer, {backgroundColor: '#00B14F20'}]}>
                <Icon name="grid" size={28} color="#00B14F" />
              </View>
              <Text style={styles.categoryName}>All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Providers Section */}
        <View style={styles.providersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Providers</Text>
            <Icon name="arrow-forward" size={20} color="#00B14F" />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B14F" />
            </View>
          ) : filteredProviders.length > 0 ? (
            <View style={styles.providersGrid}>
              {filteredProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={styles.providerCard}
                  onPress={() => handleProviderPress(provider)}>
                  <View style={styles.providerCardHeader}>
                    <View style={[styles.providerAvatar, {backgroundColor: getCategoryColor(provider.serviceCategory) + '20'}]}>
                      <Icon name={getCategoryIcon(provider.serviceCategory)} size={24} color={getCategoryColor(provider.serviceCategory)} />
                    </View>
                    {provider.isOnline && <View style={styles.onlineIndicator} />}
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={[styles.providerName, {flex: 1}]} numberOfLines={1}>{provider.name}</Text>
                    {(provider.status === 'approved' || provider.providerStatus === 'approved') && (
                      <View style={{
                        backgroundColor: '#3B82F6',
                        borderRadius: 6,
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        marginLeft: 4,
                      }}>
                        <Icon name="checkmark-circle" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.providerCategory}>{getCategoryName(provider.serviceCategory)}</Text>
                  <View style={styles.providerRating}>
                    <Icon name="star" size={14} color={provider.rating ? "#F59E0B" : "#D1D5DB"} />
                    <Text style={styles.ratingText}>{provider.rating ? provider.rating.toFixed(1) : 'New'}</Text>
                    {provider.rating && <Text style={styles.reviewCount}>({provider.reviewCount})</Text>}
                  </View>
                  <Text style={styles.providerRate}>
                    ₱{provider.fixedPrice || provider.hourlyRate}
                    <Text style={{fontSize: 11, color: '#6B7280'}}>
                      {provider.priceType === 'per_hire' ? '/hire' : '/job'}
                    </Text>
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Icon name="location-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.providerDistance}>
                      {provider.barangay 
                        ? `Brgy. ${provider.barangay}`
                        : provider.distance && parseFloat(provider.distance) > 0
                          ? `${provider.distance} km away`
                          : 'Nearby'
                      }
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.hireButton}
                    onPress={() => handleHirePress(provider)}>
                    <Text style={styles.hireButtonText}>Hire Now</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="search" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No providers found</Text>
              <Text style={styles.emptySubText}>Try a different category or search term</Text>
            </View>
          )}
        </View>

        {/* Why Choose GSS Section */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>Why Choose GSS Maasin?</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <Icon name="shield-checkmark" size={32} color="#00B14F" />
              <Text style={styles.featureTitle}>Verified Providers</Text>
              <Text style={styles.featureDesc}>All service providers are vetted and approved</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="location" size={32} color="#00B14F" />
              <Text style={styles.featureTitle}>Local Services</Text>
              <Text style={styles.featureDesc}>Find skilled workers in Maasin City</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="time" size={32} color="#00B14F" />
              <Text style={styles.featureTitle}>Fast Booking</Text>
              <Text style={styles.featureDesc}>Book services quickly and easily</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="cash" size={32} color="#00B14F" />
              <Text style={styles.featureTitle}>Fair Pricing</Text>
              <Text style={styles.featureDesc}>Transparent rates with no hidden fees</Text>
            </View>
          </View>
        </View>

        {/* Spacer for bottom buttons */}
        <View style={{height: 120}} />
      </ScrollView>

      {/* Bottom Auth Buttons */}
      <View style={styles.bottomAuthContainer}>
        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={() => navigation.navigate('RoleSelection')}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.logInButton}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.logInButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>

      {/* Help Link */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>Need help? </Text>
        <TouchableOpacity>
          <Text style={styles.helpLink}>Visit our Help Centre.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default GuestHomeScreen;
