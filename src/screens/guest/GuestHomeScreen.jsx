import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { SERVICE_CATEGORIES } from '../../config/constants';
import locationService from '../../services/locationService';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { guestHomeStyles as styles } from '../../css/profileStyles';

const { width } = Dimensions.get('window');

// ─── Premium Header with Gradient ───────────────────────────────────────
const HeroHeader = ({ onSignUp, providerCount }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#00C853', '#00B14F', '#009D45']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerBanner}>
      {/* Decorative blur circles */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -20,
          left: -40,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />

      {/* Top Bar */}
      <View style={styles.headerTopRow}>
        <View style={styles.headerLogo}>
          <View style={styles.headerLogoCircle}>
            <Icon name="construct" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerLogoText}>GSS Maasin</Text>
            <Text style={styles.headerLogoSub}>General Service System</Text>
          </View>
        </View>
      </View>

      {/* Hero Content */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
        <Text style={styles.headerTitle}>
          Find Trusted{'\n'}Services Near You
        </Text>
        <Text style={styles.headerSubtitle}>
          Connect with verified electricians, plumbers, carpenters & cleaners in
          Maasin City.
        </Text>

        <TouchableOpacity
          style={styles.headerCTA}
          onPress={onSignUp}
          activeOpacity={0.85}>
          <Text style={styles.headerCTAText}>Get Started Free</Text>
          <Icon name="arrow-forward-circle" size={20} color="#00B14F" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Text style={styles.statValue}>{providerCount}+</Text>
          <Text style={styles.statLabel}>Providers</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statValue}>100%</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statValue}>4.8</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

// ─── Category Tile ──────────────────────────────────────────────────────
const CategoryTile = ({ category, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}>
      <Animated.View
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive,
          { transform: [{ scale: scaleAnim }] },
        ]}>
        <View
          style={[
            styles.categoryIconContainer,
            {
              backgroundColor: isSelected
                ? 'rgba(255,255,255,0.25)'
                : category.color + '18',
            },
          ]}>
          <Icon
            name={category.icon}
            size={24}
            color={isSelected ? '#FFFFFF' : category.color}
          />
        </View>
        <Text
          style={[
            styles.categoryName,
            isSelected && styles.categoryNameActive,
          ]}>
          {category.name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Provider Card ──────────────────────────────────────────────────────
const ProviderCard = ({
  provider,
  index,
  onPress,
  onHire,
  getCategoryIcon,
  getCategoryColor,
  getCategoryName,
}) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scaleAnim, {
          toValue: 0.96,
          useNativeDriver: true,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start()
      }
      activeOpacity={1}>
      <Animated.View
        style={[
          styles.providerCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}>
        {/* Avatar + Online */}
        <View style={styles.providerCardHeader}>
          <View
            style={[
              styles.providerAvatar,
              {
                backgroundColor:
                  getCategoryColor(provider.serviceCategory) + '18',
              },
            ]}>
            <Icon
              name={getCategoryIcon(provider.serviceCategory)}
              size={26}
              color={getCategoryColor(provider.serviceCategory)}
            />
          </View>
          {provider.isOnline && (
            <View style={styles.onlineIndicator}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#10B981',
                }}
              />
            </View>
          )}
        </View>

        {/* Name + Verified */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.providerName, { flex: 1 }]} numberOfLines={1}>
            {provider.name}
          </Text>
          {(provider.status === 'approved' ||
            provider.providerStatus === 'approved') && (
              <View
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 6,
                  padding: 2,
                  marginLeft: 4,
                }}>
                <Icon name="checkmark-circle" size={10} color="#FFFFFF" />
              </View>
            )}
        </View>

        {/* Category */}
        <Text style={styles.providerCategory}>
          {getCategoryName(provider.serviceCategory)}
        </Text>

        {/* Rating */}
        <View style={styles.providerRating}>
          <Icon
            name="star"
            size={13}
            color={provider.rating ? '#F59E0B' : '#D1D5DB'}
          />
          <Text style={styles.ratingText}>
            {provider.rating ? provider.rating.toFixed(1) : 'New'}
          </Text>
          {provider.rating ? (
            <Text style={styles.reviewCount}>
              ({provider.reviewCount || 0})
            </Text>
          ) : null}
        </View>

        {/* Price */}
        <Text style={styles.providerRate}>
          <Text>₱{provider.fixedPrice || provider.hourlyRate || 0}</Text>
          <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '400' }}>
            {provider.priceType === 'per_hire' ? '/hire' : '/job'}
          </Text>
        </Text>

        {/* Location */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="location-outline" size={12} color="#9CA3AF" />
          <Text style={styles.providerDistance}>
            {provider.barangay
              ? `Brgy. ${provider.barangay}`
              : provider.distance && parseFloat(provider.distance) > 0
                ? `${provider.distance} km away`
                : 'Nearby'}
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={onHire}
          activeOpacity={0.85}
          style={styles.hireButton}>
          <Text style={styles.hireButtonText}>Contact Us</Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Feature Card ───────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, color, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.featureItem, { transform: [{ scale: scaleAnim }] }]}>
      <View
        style={[
          styles.featureIconContainer,
          { backgroundColor: color + '15' },
        ]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </Animated.View>
  );
};

// ─── Bottom Auth Bar ────────────────────────────────────────────────────
const BottomAuthBar = ({ onSignUp, onLogin }) => {
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bottomAuthContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={onSignUp}
        activeOpacity={0.7}>
        <View style={styles.signUpButton}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={onLogin}
        activeOpacity={0.7}>
        <View style={styles.logInButton}>
          <Text style={styles.logInButtonText}>Log In</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══ MAIN COMPONENT ═════════════════════════════════════════════════════
const GuestHomeScreen = ({ navigation }) => {
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();

    getCurrentLocation();
  }, []);

  useEffect(() => {
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER'),
    );

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      providersQuery,
      querySnapshot => {
        const providersList = [];

        querySnapshot.forEach(docSnapshot => {
          try {
            const data = docSnapshot.data();

            const isApproved =
              data.providerStatus === 'approved' || data.status === 'approved';
            if (!isApproved) return;

            if (selectedCategory && data.serviceCategory !== selectedCategory)
              return;

            let distance = 0;
            if (userLocation && data.latitude && data.longitude) {
              distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                data.latitude,
                data.longitude,
              );
            }

            providersList.push({
              id: docSnapshot.id,
              name:
                `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                'Provider',
              serviceCategory: data.serviceCategory || '',
              rating: data.rating || null,
              reviewCount: data.reviewCount || 0,
              distance: distance.toFixed(1),
              priceType: data.priceType || 'per_job',
              fixedPrice: data.fixedPrice || 0,
              hourlyRate: data.hourlyRate || data.fixedPrice || 200,
              isOnline: data.isOnline || false,
              ...data,
            });
          } catch (docError) {
            console.error('Error processing provider doc:', docError);
          }
        });

        providersList.sort(
          (a, b) => parseFloat(a.distance) - parseFloat(b.distance),
        );
        setProviders(providersList);
        setIsLoading(false);
      },
      error => {
        console.error('Error loading providers:', error);
        setProviders([]);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [selectedCategory, userLocation]);

  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleCategorySelect = category => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleProviderPress = provider => {
    navigation.navigate('Login', {
      returnTo: 'ProviderProfile',
      returnParams: { providerId: provider.id, provider },
    });
  };

  const handleHirePress = provider => {
    navigation.navigate('Login', {
      returnTo: 'HireProvider',
      returnParams: { providerId: provider.id, provider },
    });
  };

  const getCategoryIcon = categoryId => {
    if (!categoryId) return 'construct';
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.icon : 'construct';
  };

  const getCategoryColor = categoryId => {
    if (!categoryId) return '#6B7280';
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.color : '#6B7280';
  };

  const getCategoryName = categoryId => {
    if (!categoryId) return 'Service Provider';
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  const filteredProviders = providers.filter(provider => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      provider.name.toLowerCase().includes(q) ||
      (provider.serviceCategory &&
        provider.serviceCategory.toLowerCase().includes(q))
    );
  });

  const features = [
    {
      icon: 'shield-checkmark',
      title: 'Verified Providers',
      desc: 'All service providers are vetted and approved',
      color: '#10B981',
    },
    {
      icon: 'location',
      title: 'Local Services',
      desc: 'Find skilled workers in Maasin City',
      color: '#3B82F6',
    },
    {
      icon: 'time',
      title: 'Fast Booking',
      desc: 'Book services quickly and easily',
      color: '#8B5CF6',
    },
    {
      icon: 'cash',
      title: 'Fair Pricing',
      desc: 'Transparent rates with no hidden fees',
      color: '#F59E0B',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        style={[
          styles.scrollView,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <HeroHeader
          onSignUp={() => navigation.navigate('RoleSelection')}
          providerCount={providers.length}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for services or providers..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}>
            {SERVICE_CATEGORIES.map(category => (
              <CategoryTile
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onPress={() => handleCategorySelect(category.id)}
              />
            ))}
            <CategoryTile
              category={{
                id: 'all',
                name: 'All',
                icon: 'grid',
                color: '#00B14F',
              }}
              isSelected={!selectedCategory}
              onPress={() => setSelectedCategory(null)}
            />
          </ScrollView>
        </View>

        {/* Providers Section */}
        <View style={styles.providersSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}>
            <View>
              <Text style={styles.sectionTitle}>Service Providers</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredProviders.length} available nearby
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color="#00B14F" />
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B14F" />
            </View>
          ) : filteredProviders.length > 0 ? (
            <View style={styles.providersGrid}>
              {filteredProviders.map((provider, index) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  index={index}
                  onPress={() => handleProviderPress(provider)}
                  onHire={() => handleHirePress(provider)}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryColor={getCategoryColor}
                  getCategoryName={getCategoryName}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="search" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No providers found</Text>
              <Text style={styles.emptySubText}>
                Try a different category or search term
              </Text>
            </View>
          )}
        </View>

        {/* Why Choose GSS */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>Why Choose GSS Maasin?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                desc={feature.desc}
                color={feature.color}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Spacer */}
        <View style={{ height: 130 }} />
      </Animated.ScrollView>

      {/* Bottom Auth Bar */}
      <BottomAuthBar
        onSignUp={() => navigation.navigate('RoleSelection')}
        onLogin={() => navigation.navigate('Login')}
      />

      {/* Help Link */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>Need help? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Help')}>
          <Text style={styles.helpLink}>Visit our Help Centre.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default GuestHomeScreen;
