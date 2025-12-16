import React, {useState, useEffect, useRef} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {providerProfileStyles as styles} from '../../css/providerStyles';
import {db} from '../../config/firebase';
import {doc, getDoc, collection, query, where, getDocs, onSnapshot} from 'firebase/firestore';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {APP_CONFIG} from '../../config/constants';
import {TierBadge, BadgeList} from '../../components/gamification';
import {getUserTierAndBadges} from '../../services/gamificationService';

const mapProviderData = (data = {}, id) => {
  const normalizedRating = (() => {
    if (typeof data.rating === 'number') return data.rating;
    if (typeof data.averageRating === 'number') return data.averageRating;
    const parsedRating = Number(data.rating ?? data.averageRating);
    return Number.isFinite(parsedRating) ? parsedRating : null;
  })();

  const normalizedReviewCount = (() => {
    if (typeof data.reviewCount === 'number') return data.reviewCount;
    const parsedCount = Number(data.reviewCount);
    return Number.isFinite(parsedCount) ? parsedCount : null;
  })();

  return {
    id,
    name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
    email: data.email,
    phone: data.phoneNumber || data.phone,
    service: data.serviceCategory,
    serviceCategory: data.serviceCategory,
    rating: normalizedRating,
    reviewCount: normalizedReviewCount,
    priceType: data.priceType || 'per_job',
    fixedPrice: data.fixedPrice || 0,
    hourlyRate: data.hourlyRate || data.fixedPrice || 200,
    experience: data.experience || '3+ years',
    jobsCompleted: data.jobsCompleted || 0,
    responseTime: data.responseTime || 'Within 1 hour',
    about: data.bio || data.about || '',
    services: data.services || (data.serviceCategory ? [data.serviceCategory] : []),
    photo: data.profilePhoto || data.photo,
    isOnline: data.isOnline || false,
    barangay: data.barangay,
    streetAddress: data.streetAddress,
    houseNumber: data.houseNumber,
    landmark: data.landmark,
    distance: data.distance,
    ...data,
  };
};

const ProviderProfileScreen = ({navigation, route}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const {provider: passedProvider, providerId} = route.params || {};
  const initialProvider = passedProvider || (user ? mapProviderData(user, user.uid) : null);
  const [provider, setProvider] = useState(initialProvider);
  const [stats, setStats] = useState({
    rating: initialProvider?.rating ?? null,
    reviewCount: initialProvider?.reviewCount ?? null,
    jobsCompleted: initialProvider?.jobsCompleted ?? null,
    responseTime: initialProvider?.responseTime ?? null,
  });
  const [isLoading, setIsLoading] = useState(!initialProvider);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [gamificationData, setGamificationData] = useState(null);
  // Use providerId from params, or passedProvider.id, or fallback to current user (for provider viewing own profile)
  const fallbackProviderId = providerId || passedProvider?.id || user?.uid;
  const viewingSelf = provider?.id && user?.uid && provider.id === user.uid;
  const lastFetchedProviderId = useRef(null);

  // Real-time listener for provider data
  useEffect(() => {
    if (!fallbackProviderId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'users', fallbackProviderId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          lastFetchedProviderId.current = docSnap.id;
          setProvider(mapProviderData(data, docSnap.id));
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to provider:', error);
        setIsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [fallbackProviderId]);

  // Load reviews and stats when provider data is available (works for passed provider or fetched one)
  useEffect(() => {
    // Use fallbackProviderId which is more reliable than provider.id
    const targetProviderId = provider?.id || fallbackProviderId;
    if (!targetProviderId) {
      console.log('[ProviderProfile] No provider ID available yet');
      return;
    }
    console.log('[ProviderProfile] Fetching reviews for provider:', targetProviderId);
    fetchReviews(targetProviderId);
    fetchProviderStats(targetProviderId);
    fetchGamificationData(targetProviderId);
  }, [provider?.id, fallbackProviderId]);

  const fetchGamificationData = async (pid) => {
    if (!pid) return;
    const data = await getUserTierAndBadges(pid, 'PROVIDER');
    setGamificationData(data);
  };
  
  const fetchReviews = async (providerIdParam) => {
    const pid = providerIdParam || provider?.id;
    if (!pid) {
      console.log('[Reviews] No provider ID provided');
      return;
    }
    setReviewsLoading(true);
    try {
      console.log(`[Reviews] Querying reviews for providerId: ${pid}`);
      // Use simple query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, 'reviews'),
        where('providerId', '==', pid)
      );
      const snap = await getDocs(q);
      console.log(`[Reviews] Found ${snap.docs.length} total reviews for provider ${pid}`);
      
      // Log all reviews for debugging
      snap.docs.forEach((d, i) => {
        const data = d.data();
        console.log(`[Reviews] Review ${i + 1}:`, { id: d.id, status: data.status, rating: data.rating, providerId: data.providerId });
      });
      
      // Filter active reviews and fetch reviewer names - be lenient with status
      const filteredDocs = snap.docs.filter(d => {
        const status = d.data().status;
        // Include all reviews except explicitly deleted/hidden ones
        const excluded = ['deleted', 'hidden', 'removed'];
        return !excluded.includes(status);
      });
      console.log(`[Reviews] After filtering: ${filteredDocs.length} active reviews`);
      
      const items = await Promise.all(
        filteredDocs.map(async (d) => {
          const data = d.data();
          let reviewerName = 'Anonymous';
          
          // Fetch reviewer name if reviewerId exists
          if (data.reviewerId) {
            try {
              const reviewerDoc = await getDoc(doc(db, 'users', data.reviewerId));
              if (reviewerDoc.exists()) {
                const reviewer = reviewerDoc.data();
                reviewerName = `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || 'Client';
              }
            } catch (e) {
              console.log('Could not fetch reviewer name');
            }
          }
          
          return {
            id: d.id,
            ...data,
            reviewerName,
          };
        })
      );
      
      // Sort in memory by createdAt descending
      items.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
        return dateB - dateA;
      });
      
      console.log('[Reviews] Final reviews:', items.map(r => ({ id: r.id, rating: r.rating, reviewer: r.reviewerName })));
      setReviews(items);
      updateRatingStats(items);
    } catch (e) {
      console.warn('reviews query failed', e);
      setReviews([]);
      updateRatingStats([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const updateRatingStats = (items) => {
    const ratings = items
      .map(r => {
        const value = r.rating ?? r.stars;
        const num = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(num) ? num : null;
      })
      .filter(v => v !== null);
    if (ratings.length > 0) {
      const avg = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
      setStats(prev => ({
        ...prev,
        rating: Number(avg.toFixed(1)),
        reviewCount: ratings.length,
      }));
    } else {
      setStats(prev => ({
        ...prev,
        rating: prev.rating ?? null,
        reviewCount: prev.reviewCount ?? null,
      }));
    }
  };

  const fetchProviderStats = async (pid) => {
    if (!pid) return;
    try {
      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('providerId', '==', pid))
      );

      let completed = 0;
      const responseDurations = [];

      bookingsSnap.forEach(docSnap => {
        const data = docSnap.data();
        const status = (data.status || '').toLowerCase();
        if (status === 'completed') {
          completed += 1;
        }

        const createdAt =
          data.createdAt?.toDate?.() ||
          (data.createdAt instanceof Date ? data.createdAt : data.createdAt ? new Date(data.createdAt) : null);
        const acceptedAt =
          data.acceptedAt?.toDate?.() ||
          (data.acceptedAt instanceof Date ? data.acceptedAt : data.acceptedAt ? new Date(data.acceptedAt) : null);

        if (createdAt && acceptedAt) {
          const diffMs = acceptedAt - createdAt;
          if (Number.isFinite(diffMs) && diffMs >= 0) {
            responseDurations.push(diffMs / 60000); // minutes
          }
        }
      });

      const avgResponseMinutes =
        responseDurations.length > 0
          ? responseDurations.reduce((sum, val) => sum + val, 0) / responseDurations.length
          : null;

      const formattedResponse =
        avgResponseMinutes !== null
          ? avgResponseMinutes >= 60
            ? `${Math.round(avgResponseMinutes / 60)} hr${Math.round(avgResponseMinutes / 60) !== 1 ? 's' : ''}`
            : `${Math.max(1, Math.round(avgResponseMinutes))} min`
          : null;

      setStats(prev => ({
        ...prev,
        jobsCompleted: completed || prev.jobsCompleted,
        responseTime: formattedResponse || prev.responseTime,
      }));
    } catch (error) {
      console.warn('Failed to fetch provider stats:', error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={[globalStyles.bodyMedium, {marginTop: 12}, isDark && {color: theme.colors.text}]}>Loading provider...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If no provider data
  if (!provider) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={globalStyles.centerContainer}>
          <Icon name="person-outline" size={48} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          <Text style={[globalStyles.bodyMedium, {marginTop: 12}, isDark && {color: theme.colors.text}]}>Provider not found</Text>
          <TouchableOpacity 
            style={{marginTop: 16, padding: 12, backgroundColor: '#00B14F', borderRadius: 8}}
            onPress={() => navigation.goBack()}>
            <Text style={{color: '#FFFFFF', fontWeight: '600'}}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 100}}>
        {/* Header with back button */}
        <View style={[styles.header, isDark && {backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border}]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && {color: theme.colors.text}]}>Provider Profile</Text>
          <View style={{width: 40}} />
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, isDark && {backgroundColor: theme.colors.card}]}>
          <View style={styles.avatarContainer}>
            {provider.photo ? (
              <Image source={{uri: provider.photo}} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, isDark && {backgroundColor: theme.colors.border}]}>
                <Icon name="person" size={60} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
              </View>
            )}
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Text style={[styles.name, isDark && {color: theme.colors.text}]}>{provider.name}</Text>
            {(provider.status === 'approved' || provider.providerStatus === 'approved') && (
              <View style={{
                backgroundColor: '#3B82F6',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginLeft: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={{color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginLeft: 4}}>Verified</Text>
              </View>
            )}
            {provider.isSuspended && (
              <View style={{
                backgroundColor: '#EF4444',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginLeft: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Icon name="ban" size={14} color="#FFFFFF" />
                <Text style={{color: '#FFFFFF', fontSize: 11, fontWeight: '600', marginLeft: 4}}>Suspended</Text>
              </View>
            )}
          </View>
          {provider.service && (
            <Text style={[styles.service, isDark && {color: theme.colors.textSecondary}]}>{provider.service}</Text>
          )}
          
          {/* Suspension Notice */}
          {provider.isSuspended && (
            <View style={{
              backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}>
              <Icon name="warning" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
              <View style={{flex: 1, marginLeft: 10}}>
                <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? '#FCA5A5' : '#DC2626', marginBottom: 4}}>
                  This provider is currently suspended
                </Text>
                <Text style={{fontSize: 12, color: isDark ? '#FECACA' : '#991B1B'}}>
                  This provider is not available for booking at this time.
                </Text>
              </View>
            </View>
          )}
          
          {/* Gamification Tier & Badges */}
          {gamificationData && (
            <View style={{alignItems: 'center', marginTop: 8, marginBottom: 8}}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <TierBadge tier={gamificationData.tier} size="medium" />
                <View style={{marginLeft: 10, backgroundColor: isDark ? theme.colors.border : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12}}>
                  <Text style={{fontSize: 13, fontWeight: '600', color: isDark ? theme.colors.text : '#374151'}}>
                    {gamificationData.points?.toLocaleString() || 0} pts
                  </Text>
                </View>
              </View>
              {gamificationData.badges && gamificationData.badges.length > 0 && (
                <BadgeList badges={gamificationData.badges} maxDisplay={4} size="small" />
              )}
            </View>
          )}

          {/* Rating */}
          { (stats.rating ?? provider.rating) !== null && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={20} color="#F59E0B" />
              <Text style={[styles.rating, isDark && {color: theme.colors.text}]}>{(stats.rating ?? provider.rating)?.toFixed?.(1) ?? stats.rating ?? provider.rating}</Text>
              {(stats.reviewCount ?? provider.reviewCount) !== null && (
                <Text style={[styles.reviewCount, isDark && {color: theme.colors.textSecondary}]}>({stats.reviewCount ?? provider.reviewCount} reviews)</Text>
              )}
            </View>
          )}

          {/* Location Info */}
          <View style={styles.locationContainer}>
            <Icon name="location" size={18} color="#00B14F" />
            <View style={{marginLeft: 4, alignItems: 'flex-start'}}>
              {provider.barangay ? (
                <Text style={[styles.locationText, isDark && {color: theme.colors.text}]}>Brgy. {provider.barangay}, Maasin City</Text>
              ) : provider.streetAddress ? (
                <Text style={[styles.locationText, isDark && {color: theme.colors.text}]}>{provider.streetAddress}, Maasin City</Text>
              ) : (
                <Text style={[styles.locationText, isDark && {color: theme.colors.text}]}>Maasin City</Text>
              )}
              {provider.distance && (
                <Text style={[styles.distance, isDark && {color: theme.colors.textSecondary}]}>{provider.distance} km away</Text>
              )}
            </View>
          </View>
        </View>

        {/* Address Details Section */}
        {(provider.streetAddress || provider.barangay || provider.houseNumber) && (
          <View style={[styles.addressSection, isDark && {backgroundColor: theme.colors.card}]}>
            <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>Service Location</Text>
            {provider.houseNumber && (
              <View style={styles.addressRow}>
                <Icon name="home-outline" size={18} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
                <Text style={[styles.addressText, isDark && {color: theme.colors.text}]}>House/Bldg: {provider.houseNumber}</Text>
              </View>
            )}
            {provider.streetAddress && (
              <View style={styles.addressRow}>
                <Icon name="navigate-outline" size={18} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
                <Text style={[styles.addressText, isDark && {color: theme.colors.text}]}>{provider.streetAddress}</Text>
              </View>
            )}
            {provider.barangay && (
              <View style={styles.addressRow}>
                <Icon name="business-outline" size={18} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
                <Text style={[styles.addressText, isDark && {color: theme.colors.text}]}>Barangay {provider.barangay}</Text>
              </View>
            )}
            {provider.landmark && (
              <View style={styles.addressRow}>
                <Icon name="flag-outline" size={18} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
                <Text style={[styles.addressText, isDark && {color: theme.colors.text}]}>Near {provider.landmark}</Text>
              </View>
            )}
          </View>
        )}

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <View style={[styles.pricingCard, isDark && {backgroundColor: theme.colors.card}]}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon name="pricetag" size={24} color="#00B14F" />
              <View style={{marginLeft: 12}}>
                <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Service Price</Text>
                <Text style={{fontSize: 24, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>
                  ₱{provider.fixedPrice || provider.hourlyRate || 0}
                </Text>
                <Text style={{fontSize: 13, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
                  {provider.priceType === 'per_hire' ? 'Per Hire' : 'Per Job'}
                </Text>
              </View>
            </View>
            <View style={{
              backgroundColor: isDark ? '#78350F' : '#FEF3C7',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginTop: 12,
            }}>
              <Text style={{fontSize: 11, color: isDark ? '#FCD34D' : '#92400E'}}>
                + {APP_CONFIG.SERVICE_FEE_PERCENTAGE}% service fee applies at checkout
              </Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={[styles.infoCard, isDark && {backgroundColor: theme.colors.card}]}>
            <Icon name="briefcase-outline" size={24} color="#00B14F" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, isDark && {color: theme.colors.textSecondary}]}>Experience</Text>
              <Text style={[styles.infoValue, isDark && {color: theme.colors.text}]}>{provider.experience || '3+ years'}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, isDark && {backgroundColor: theme.colors.card}]}>
            <Icon name="checkmark-circle-outline" size={24} color="#00B14F" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, isDark && {color: theme.colors.textSecondary}]}>Jobs Completed</Text>
              <Text style={[styles.infoValue, isDark && {color: theme.colors.text}]}>
                {stats.jobsCompleted ??
                  provider.jobsCompleted ??
                  '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoCard, isDark && {backgroundColor: theme.colors.card}]}>
            <Icon name="time-outline" size={24} color="#00B14F" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, isDark && {color: theme.colors.textSecondary}]}>Response Time</Text>
              <Text style={[styles.infoValue, isDark && {color: theme.colors.text}]}>
                {stats.responseTime ??
                  provider.responseTime ??
                  'Not enough data'}
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.aboutSection, isDark && {backgroundColor: theme.colors.card}]}>
          <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>About</Text>
          <Text style={[styles.aboutText, isDark && {color: theme.colors.textSecondary}]}>
            {provider.about || `Experienced ${provider.service?.toLowerCase() || 'service provider'} serving the Maasin City area. Committed to quality work and customer satisfaction.`}
          </Text>
        </View>

        {/* Services */}
        <View style={[styles.servicesSection, isDark && {backgroundColor: theme.colors.card}]}>
          <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>Services Offered</Text>
          <View style={styles.servicesList}>
            {((provider.services && provider.services.length > 0) ? provider.services : (provider.service ? [provider.service] : [])).length > 0 ? (
              ((provider.services && provider.services.length > 0) ? provider.services : [provider.service]).map((service, index) => (
                <View key={index} style={[styles.serviceTag, isDark && {backgroundColor: '#064E3B'}]}>
                  <Text style={[styles.serviceTagText, isDark && {color: '#34D399'}]}>{service}</Text>
                </View>
              ))
            ) : (
              <Text style={{color: isDark ? theme.colors.textSecondary : '#6B7280', fontSize: 14}}>No services listed</Text>
            )}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={[styles.aboutSection, isDark && {backgroundColor: theme.colors.card}]}>
          <Text style={[styles.sectionTitle, isDark && {color: theme.colors.text}]}>Reviews</Text>
          {reviewsLoading ? (
            <ActivityIndicator size="small" color="#00B14F" />
          ) : reviews.length === 0 ? (
            <Text style={{color: isDark ? theme.colors.textSecondary : '#6B7280', fontSize: 14}}>No reviews yet</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={{paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#F3F4F6'}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Icon name="star" size={16} color="#F59E0B" />
                  <Text style={{marginLeft: 6, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>{(r.rating || r.stars) ?? '—'}</Text>
                  <Text style={{marginLeft: 8, color: isDark ? theme.colors.textSecondary : '#6B7280', flex: 1}}>
                    {r.authorName || r.reviewerName || 'Anonymous'}
                  </Text>
                  {r.createdAt && (
                    <Text style={{fontSize: 11, color: isDark ? theme.colors.textSecondary : '#9CA3AF'}}>
                      {r.createdAt?.toDate?.()?.toLocaleDateString?.() || new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                {(r.comment || r.text) ? (
                  <Text style={{color: isDark ? theme.colors.textSecondary : '#4B5563', marginTop: 6, lineHeight: 20}}>{r.comment || r.text}</Text>
                ) : null}
                {/* Review Images */}
                {r.images && r.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                    {r.images.map((imgUrl, idx) => (
                      <Image
                        key={idx}
                        source={{uri: imgUrl}}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          marginRight: 8,
                          backgroundColor: isDark ? theme.colors.border : '#F3F4F6',
                        }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

        {/* Bottom Action Button - Compact */}
        {/* Hide for admin users - they don't need to hire providers */}
        {user?.role?.toUpperCase() === 'ADMIN' ? null : viewingSelf ? (
          <View style={[styles.bottomAction, {padding: 10, flexDirection: 'row'}, isDark && {backgroundColor: theme.colors.card, borderTopColor: theme.colors.border}]}>
            <TouchableOpacity 
              style={[styles.hireButton, {backgroundColor: '#F59E0B', flex: 0.4, marginRight: 8, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center'}]}
              onPress={() => navigation.navigate('Leaderboard')}>
              <Icon name="trophy" size={16} color="#FFFFFF" style={{marginRight: 4}} />
              <Text style={[styles.hireButtonText, {fontSize: 14}]}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.hireButton, {backgroundColor: '#3B82F6', flex: 0.6, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center'}]}
              onPress={() => navigation.navigate('EditProfile')}>
              <Icon name="create-outline" size={16} color="#FFFFFF" style={{marginRight: 4}} />
              <Text style={[styles.hireButtonText, {fontSize: 14}]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.bottomAction, isDark && {backgroundColor: theme.colors.card, borderTopColor: theme.colors.border}]}>
            {provider.isSuspended ? (
              <View 
                style={[styles.hireButton, {backgroundColor: '#9CA3AF', flexDirection: 'row', justifyContent: 'center'}]}>
                <Icon name="ban" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                <Text style={styles.hireButtonText}>Provider Suspended</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.hireButton}
                onPress={() => navigation.navigate('HireProvider', {
                  providerId: provider.id,
                  provider: provider
                })}>
                <Text style={styles.hireButtonText}>Contact Us</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
    </SafeAreaView>
  );
};

export default ProviderProfileScreen;
