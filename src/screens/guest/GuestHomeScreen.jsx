import {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {SERVICE_CATEGORIES} from '../../config/constants';
import locationService from '../../services/locationService';
import {db} from '../../config/firebase';
import {collection, query, where, onSnapshot} from 'firebase/firestore';
import {guestHomeStyles as styles} from '../../css/profileStyles';

// Animated Header Banner with floating icons
const AnimatedHeaderBanner = ({onSignUp}) => {
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating animations for icons
    const createFloatAnimation = (anim, duration, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -15,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    createFloatAnimation(floatAnim1, 2000, 0).start();
    createFloatAnimation(floatAnim2, 2500, 300).start();
    createFloatAnimation(floatAnim3, 1800, 600).start();

    // Pulse animation for CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.headerBanner}>
      {/* Floating service icons */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 15,
          right: 20,
          transform: [{translateY: floatAnim1}],
          opacity: 0.6,
        }}>
        <Icon name="construct" size={30} color="rgba(255,255,255,0.5)" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 50,
          right: 60,
          transform: [{translateY: floatAnim2}],
          opacity: 0.5,
        }}>
        <Icon name="flash" size={24} color="rgba(255,255,255,0.4)" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          transform: [{translateY: floatAnim3}],
          opacity: 0.4,
        }}>
        <Icon name="water" size={28} color="rgba(255,255,255,0.4)" />
      </Animated.View>

      {/* Sparkle effect */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 25,
          right: 100,
          opacity: sparkleAnim,
        }}>
        <Icon name="sparkles" size={16} color="rgba(255,255,255,0.7)" />
      </Animated.View>

      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Here for the first time?</Text>
        <Animated.View style={{transform: [{scale: pulseAnim}]}}>
          <TouchableOpacity style={styles.signUpPrompt} onPress={onSignUp}>
            <Text style={styles.signUpPromptText}>
              Sign up to get started with GSS!
            </Text>
            <Icon name="arrow-forward-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
      <View style={styles.headerImageContainer}>
        <Icon name="construct" size={80} color="rgba(255,255,255,0.3)" />
      </View>
    </View>
  );
};

// Animated Category Item
const AnimatedCategoryItem = ({category, isSelected, onPress, index}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    scaleAnim.setValue(0);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{marginRight: 12}}>
      <Animated.View
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive,
          {
            transform: [{scale: scaleAnim}],
          },
        ]}>
        <View
          style={[
            styles.categoryIconContainer,
            {backgroundColor: category.color + '20'},
          ]}>
          <Icon name={category.icon} size={28} color={category.color} />
        </View>
        <Text style={styles.categoryName}>{category.name}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Simple Category Item (non-animated fallback)
const SimpleCategoryItem = ({category, isSelected, onPress}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{marginRight: 12}}>
      <View
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive,
        ]}>
        <View
          style={[
            styles.categoryIconContainer,
            {backgroundColor: category.color + '20'},
          ]}>
          <Icon name={category.icon} size={28} color={category.color} />
        </View>
        <Text style={styles.categoryName}>{category.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Animated Provider Card
const AnimatedProviderCard = ({
  provider,
  index,
  onPress,
  onHire,
  getCategoryIcon,
  getCategoryColor,
  getCategoryName,
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
          styles.providerCard,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}, {scale: scaleAnim}],
          },
        ]}>
        <View style={styles.providerCardHeader}>
          <View
            style={[
              styles.providerAvatar,
              {backgroundColor: getCategoryColor(provider.serviceCategory) + '20'},
            ]}>
            <Icon
              name={getCategoryIcon(provider.serviceCategory)}
              size={24}
              color={getCategoryColor(provider.serviceCategory)}
            />
          </View>
          {provider.isOnline && <PulsingOnlineIndicator />}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={[styles.providerName, {flex: 1}]} numberOfLines={1}>
            {provider.name}
          </Text>
          {(provider.status === 'approved' ||
            provider.providerStatus === 'approved') && (
            <View
              style={{
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
        <Text style={styles.providerCategory}>
          {getCategoryName(provider.serviceCategory)}
        </Text>
        <View style={styles.providerRating}>
          <Icon
            name="star"
            size={14}
            color={provider.rating ? '#F59E0B' : '#D1D5DB'}
          />
          <Text style={styles.ratingText}>
            {provider.rating ? provider.rating.toFixed(1) : 'New'}
          </Text>
          {provider.rating ? (
            <Text style={styles.reviewCount}>({provider.reviewCount || 0})</Text>
          ) : null}
        </View>
        <Text style={styles.providerRate}>
          <Text>₱{provider.fixedPrice || provider.hourlyRate || 0}</Text><Text style={{fontSize: 11, color: '#6B7280'}}>{provider.priceType === 'per_hire' ? '/hire' : '/job'}</Text>
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Icon name="location-outline" size={12} color="#9CA3AF" />
          <Text style={styles.providerDistance}>
            {provider.barangay
              ? `Brgy. ${provider.barangay}`
              : provider.distance && parseFloat(provider.distance) > 0
                ? `${provider.distance} km away`
                : 'Nearby'}
          </Text>
        </View>
        <AnimatedHireButton onPress={onHire} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// Pulsing Online Indicator
const PulsingOnlineIndicator = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.onlineIndicator}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#10B981',
          opacity: opacityAnim,
          transform: [{scale: pulseAnim}],
        }}
      />
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: '#10B981',
        }}
      />
    </View>
  );
};

// Animated Hire Button
const AnimatedHireButton = ({onPress}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
        style={[styles.hireButton, {transform: [{scale: scaleAnim}]}]}>
        <Text style={styles.hireButtonText}>Contact Us</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Animated Feature Item
const AnimatedFeatureItem = ({icon, title, desc, index}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          transform: [{scale: scaleAnim}, {rotate}],
        },
      ]}>
      <Icon name={icon} size={32} color="#00B14F" />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </Animated.View>
  );
};

// Animated Bottom Buttons
const AnimatedBottomButtons = ({onSignUp, onLogin}) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const signUpScale = useRef(new Animated.Value(1)).current;
  const loginScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bottomAuthContainer,
        {transform: [{translateY: slideAnim}]},
      ]}>
      <TouchableOpacity
        style={{flex: 1}}
        onPress={onSignUp}
        onPressIn={() =>
          Animated.spring(signUpScale, {
            toValue: 0.95,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(signUpScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
        activeOpacity={1}>
        <Animated.View
          style={[styles.signUpButton, {transform: [{scale: signUpScale}]}]}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity
        style={{flex: 1}}
        onPress={onLogin}
        onPressIn={() =>
          Animated.spring(loginScale, {
            toValue: 0.95,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(loginScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
        activeOpacity={1}>
        <Animated.View
          style={[styles.logInButton, {transform: [{scale: loginScale}]}]}>
          <Text style={styles.logInButtonText}>Log In</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};


const GuestHomeScreen = ({navigation}) => {
  const [providers, setProviders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Main entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animation
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
    // Set up real-time listener for providers
    const providersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'PROVIDER'),
    );

    setIsLoading(true);
    const unsubscribe = onSnapshot(providersQuery, (querySnapshot) => {
      const providersList = [];

      querySnapshot.forEach(docSnapshot => {
        try {
          const data = docSnapshot.data();

          const isApproved =
            data.providerStatus === 'approved' || data.status === 'approved';
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
    }, (error) => {
      console.error('Error loading providers:', error);
      setProviders([]);
      setIsLoading(false);
    });

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
      returnParams: {providerId: provider.id, provider},
    });
  };

  const handleHirePress = provider => {
    navigation.navigate('Login', {
      returnTo: 'HireProvider',
      returnParams: {providerId: provider.id, provider},
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
    },
    {
      icon: 'location',
      title: 'Local Services',
      desc: 'Find skilled workers in Maasin City',
    },
    {
      icon: 'time',
      title: 'Fast Booking',
      desc: 'Book services quickly and easily',
    },
    {
      icon: 'cash',
      title: 'Fair Pricing',
      desc: 'Transparent rates with no hidden fees',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        style={[
          styles.scrollView,
          {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Animated Header Banner */}
        <AnimatedHeaderBanner
          onSignUp={() => navigation.navigate('RoleSelection')}
        />

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

        {/* Animated Service Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}>
            {SERVICE_CATEGORIES.map((category) => (
              <SimpleCategoryItem
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onPress={() => handleCategorySelect(category.id)}
              />
            ))}
            <SimpleCategoryItem
              category={{id: 'all', name: 'All', icon: 'grid', color: '#00B14F'}}
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
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Service Providers</Text>
            <Icon name="arrow-forward" size={20} color="#00B14F" />
          </TouchableOpacity>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B14F" />
            </View>
          ) : filteredProviders.length > 0 ? (
            <View style={styles.providersGrid}>
              {filteredProviders.map((provider, index) => (
                <AnimatedProviderCard
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

        {/* Why Choose GSS Section with Animated Features */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>Why Choose GSS Maasin?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <AnimatedFeatureItem
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                desc={feature.desc}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Spacer for bottom buttons */}
        <View style={{height: 120}} />
      </Animated.ScrollView>

      {/* Animated Bottom Auth Buttons */}
      <AnimatedBottomButtons
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
