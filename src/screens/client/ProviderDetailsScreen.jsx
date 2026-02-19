import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const TIER_CONFIG = {
  bronze: { label: 'Bronze', color: '#CD7F32', icon: '🥉' },
  silver: { label: 'Silver', color: '#C0C0C0', icon: '🥈' },
  gold: { label: 'Gold', color: '#FFD700', icon: '🥇' },
  platinum: { label: 'Platinum', color: '#E5E4E2', icon: '💠' },
};

const ProviderDetailsScreen = ({ navigation, route }) => {
  const { isDark, theme } = useTheme();
  const { user } = useAuth();
  const { providerId, provider: passedProvider } = route.params || {};
  const colors = theme.colors;

  const [provider, setProvider] = useState(passedProvider || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!passedProvider);
  const [serviceCategoryBasePrice, setServiceCategoryBasePrice] = useState(
    passedProvider?.serviceCategoryBasePrice || 0
  );
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      // Fetch provider data and category prices in parallel
      const [providerDoc, catSnap] = await Promise.all([
        getDoc(doc(db, 'users', providerId)),
        getDocs(collection(db, 'serviceCategories')),
      ]);

      // Build price map
      const priceMap = {};
      catSnap.forEach((d) => {
        const catData = d.data();
        if (catData.name && catData.basePrice) {
          priceMap[catData.name.toLowerCase()] = catData.basePrice;
        }
      });

      if (providerDoc.exists()) {
        const data = providerDoc.data();
        const catKey = (data.serviceCategory || '').toLowerCase();
        const basePrice = priceMap[catKey] || 0;
        setServiceCategoryBasePrice(basePrice);

        setProvider({
          id: providerDoc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          serviceCategory: data.serviceCategory || '',
          rating: data.rating || data.averageRating || 0,
          reviewCount: data.reviewCount || 0,
          profilePhoto: data.profilePhoto,
          phone: data.phone || data.phoneNumber,
          email: data.email,
          bio: data.bio || '',
          about: data.about || '',
          experience: data.experience || data.yearsExperience || '',
          completedJobs: data.completedJobs || data.jobsCompleted || 0,
          barangay: data.barangay || '',
          fixedPrice: data.fixedPrice || 0,
          serviceCategoryBasePrice: basePrice,
          hourlyRate: data.hourlyRate || 0,
          priceType: data.priceType || 'per_job',
          isOnline: data.isOnline || false,
          tier: data.tier || 'bronze',
          avgJobDurationMinutes: data.avgJobDurationMinutes || null,
          specialties: data.specialties || [],
          languages: data.languages || ['Filipino', 'English'],
          latitude: data.latitude,
          longitude: data.longitude,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      }

      // Fetch reviews
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', providerId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsList = [];
        reviewsSnap.forEach((d) => {
          const rData = d.data();
          reviewsList.push({
            id: d.id,
            clientName: rData.clientName || 'Client',
            clientPhoto: rData.clientPhoto,
            rating: rData.rating || 5,
            comment: rData.comment || rData.review || '',
            createdAt: rData.createdAt?.toDate?.() || new Date(),
            serviceCategory: rData.serviceCategory || '',
            images: rData.images || [],
          });
        });
        setReviews(reviewsList);
      } catch (reviewError) {
        console.log('Reviews fetch error:', reviewError);
      }
    } catch (error) {
      console.error('Error fetching provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstimatedTime = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getExperienceDisplay = () => {
    const exp = provider?.experience;
    if (!exp) return 'New';
    const num = parseInt(exp);
    if (!isNaN(num)) return num === 1 ? '1 year' : `${num}+ yrs`;
    return exp;
  };

  const getPrice = () => {
    return serviceCategoryBasePrice || provider?.fixedPrice || provider?.hourlyRate || 0;
  };

  const handleContactUs = () => {
    navigation.navigate('HireProvider', {
      providerId: provider?.id || providerId,
      providerName: `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim(),
      provider: {
        ...provider,
        serviceCategoryBasePrice,
      },
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color="#F59E0B"
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Loading provider...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Icon name="person-outline" size={48} color={isDark ? '#475569' : '#CBD5E1'} />
          <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Provider not found
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const price = getPrice();
  const tierConfig = TIER_CONFIG[provider.tier] || TIER_CONFIG.bronze;
  const estimatedTime = getEstimatedTime(provider.avgJobDurationMinutes);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrow-back" size={22} color={isDark ? '#F1F5F9' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Provider Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.profileTop}>
            {provider.profilePhoto ? (
              <Image source={{ uri: provider.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Icon name="person" size={40} color={isDark ? '#64748B' : '#94A3B8'} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.providerName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                  {provider.firstName} {provider.lastName}
                </Text>
                {provider.isOnline && (
                  <View style={styles.onlineDot} />
                )}
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{provider.serviceCategory}</Text>
              </View>
              <View style={styles.ratingRow}>
                <View style={styles.starsRow}>{renderStars(provider.rating)}</View>
                <Text style={[styles.ratingText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>
                  {provider.rating > 0 ? provider.rating.toFixed(1) : 'New'} ({provider.reviewCount})
                </Text>
              </View>
              {/* Tier badge */}
              <View style={[styles.tierBadge, { backgroundColor: tierConfig.color + '22' }]}>
                <Text style={styles.tierIcon}>{tierConfig.icon}</Text>
                <Text style={[styles.tierText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.statItem}>
            <Icon name="briefcase-outline" size={20} color="#00B14F" />
            <Text style={[styles.statValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
              {provider.completedJobs}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Jobs Done</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

          <View style={styles.statItem}>
            <Icon name="star-outline" size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
              {provider.rating > 0 ? provider.rating.toFixed(1) : 'New'}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Rating</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

          <View style={styles.statItem}>
            <Icon name="time-outline" size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
              {estimatedTime || 'N/A'}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Est. Time</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

          <View style={styles.statItem}>
            <Icon name="ribbon-outline" size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
              {getExperienceDisplay()}
            </Text>
            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Experience</Text>
          </View>
        </View>

        {/* Price Card */}
        <View style={[styles.priceCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.priceHeader}>
            <Icon name="pricetag-outline" size={20} color="#00B14F" />
            <Text style={[styles.priceLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Service Price</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, { color: '#00B14F' }]}>
              ₱{price.toLocaleString()}
            </Text>
            <Text style={[styles.priceUnit, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              /{provider.priceType === 'per_hire' ? 'hire' : 'job'}
            </Text>
          </View>
          {estimatedTime && (
            <Text style={[styles.priceNote, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              Estimated completion: {estimatedTime}
            </Text>
          )}
        </View>

        {/* About Section */}
        {(provider.bio || provider.about) && (
          <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>About</Text>
            <Text style={[styles.sectionBody, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              {provider.bio || provider.about}
            </Text>
          </View>
        )}

        {/* Location */}
        {provider.barangay && (
          <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Location</Text>
            <View style={styles.locationRow}>
              <Icon name="location-outline" size={18} color="#00B14F" />
              <Text style={[styles.locationText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                {provider.barangay}, Maasin City
              </Text>
            </View>
          </View>
        )}

        {/* Languages */}
        {provider.languages && provider.languages.length > 0 && (
          <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Languages</Text>
            <View style={styles.tagsRow}>
              {provider.languages.map((lang, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <Text style={[styles.tagText, { color: isDark ? '#CBD5E1' : '#475569' }]}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
              Reviews ({provider.reviewCount})
            </Text>
          </View>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={[styles.reviewCard, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <View style={styles.reviewHeader}>
                  {review.clientPhoto ? (
                    <Image source={{ uri: review.clientPhoto }} style={styles.reviewAvatar} />
                  ) : (
                    <View style={[styles.reviewAvatar, { backgroundColor: isDark ? '#334155' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                      <Icon name="person" size={14} color={isDark ? '#64748B' : '#94A3B8'} />
                    </View>
                  )}
                  <View style={styles.reviewInfo}>
                    <Text style={[styles.reviewName, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                      {review.clientName}
                    </Text>
                    <View style={styles.reviewStars}>{renderStars(review.rating)}</View>
                  </View>
                  <Text style={[styles.reviewDate, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    {review.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                {review.comment ? (
                  <Text style={[styles.reviewComment, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                    {review.comment}
                  </Text>
                ) : null}
                {review.images && review.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesRow}>
                    {review.images.map((img, idx) => {
                      const uri = typeof img === 'string' ? img : img.url;
                      return (
                        <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => setSelectedImage(uri)}>
                          <Image
                            source={{ uri }}
                            style={styles.reviewImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ))
          ) : (
            <Text style={[styles.noReviews, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              No reviews yet
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Image Viewer */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.imageModalOverlay}
          onPress={() => setSelectedImage(null)}
        >
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setSelectedImage(null)}>
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderTopColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <TouchableOpacity style={styles.hireBtn} onPress={handleContactUs}>
          <Icon name="chatbubble-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.hireBtnText}>Contact Us</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#00B14F',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  // Profile Card
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerName: {
    fontSize: 20,
    fontWeight: '800',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  categoryBadge: {
    backgroundColor: '#00B14F15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  categoryText: {
    color: '#00B14F',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    gap: 4,
  },
  tierIcon: {
    fontSize: 12,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },

  // Price Card
  priceCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceNote: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Reviews
  reviewCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reviewName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewStars: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 1,
  },
  reviewDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginLeft: 42,
  },
  reviewImagesRow: {
    marginTop: 10,
    marginLeft: 42,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
  },
  noReviews: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Image Modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: {
    width: width - 32,
    height: width - 32,
    borderRadius: 12,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    gap: 12,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00B14F',
  },
  chatBtnText: {
    color: '#00B14F',
    fontSize: 14,
    fontWeight: '700',
  },
  hireBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#00B14F',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hireBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default ProviderDetailsScreen;
