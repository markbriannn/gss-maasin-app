import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {doc, updateDoc, serverTimestamp} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {submitReview, isJobEligibleForReview} from '../../services/reviewService';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadImage} from '../../services/imageUploadService';
import {attemptReview} from '../../utils/rateLimiter';

const ReviewScreen = ({navigation, route}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const {jobId, providerId, providerName} = route.params || {};
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState('');
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (jobId && user?.uid) {
      checkEligibility();
    } else {
      setIsLoading(false);
    }
  }, [jobId, user?.uid]);

  const checkEligibility = async () => {
    try {
      const result = await isJobEligibleForReview(jobId, user.uid);
      setEligible(result.eligible);
      if (!result.eligible) {
        setIneligibleReason(result.reason);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddImage = () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 images.');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        selectionLimit: 5 - images.length,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick image');
          return;
        }
        if (response.assets) {
          const newImages = response.assets.map(asset => ({
            uri: asset.uri,
            uploaded: false,
          }));
          setImages(prev => [...prev, ...newImages].slice(0, 5));
        }
      }
    );
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!review.trim()) {
      Alert.alert('Comment Required', 'Please add a comment to your review.');
      return;
    }

    // Check rate limit before submitting
    const rateLimitCheck = await attemptReview(user?.uid);
    if (!rateLimitCheck.allowed) {
      Alert.alert('Please Wait', rateLimitCheck.message);
      return;
    }

    setSubmitting(true);
    try {
      // Upload images first if any
      let uploadedImageUrls = [];
      if (images.length > 0) {
        setUploadingImage(true);
        for (const img of images) {
          try {
            const url = await uploadImage(img.uri, `reviews/${jobId}`);
            uploadedImageUrls.push(url);
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
          }
        }
        setUploadingImage(false);
      }

      // Use reviewService for anti-fraud validation
      const result = await submitReview(
        jobId,
        providerId,
        user.uid,
        rating,
        review.trim(),
        uploadedImageUrls
      );

      if (result.success) {
        // Mark the booking as reviewed
        try {
          await updateDoc(doc(db, 'bookings', jobId), {
            reviewed: true,
            reviewRating: rating,
            reviewedAt: serverTimestamp(),
          });
        } catch (e) {
          console.log('Could not update booking reviewed status:', e);
        }

        Alert.alert(
          'Thank You!', 
          'Your review has been submitted successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Cannot Submit Review', result.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!eligible && jobId) {
    return (
      <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
        <View style={[globalStyles.centerContainer, { padding: 20 }]}>
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text style={[globalStyles.heading2, { marginTop: 16, textAlign: 'center' }, isDark && {color: theme.colors.text}]}>
            Cannot Submit Review
          </Text>
          <Text style={[globalStyles.bodyMedium, { marginTop: 12, textAlign: 'center', color: isDark ? theme.colors.textSecondary : '#6B7280' }]}>
            {ineligibleReason}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: '#00B14F',
              borderRadius: 8,
            }}
            onPress={() => navigation.goBack()}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[globalStyles.heading3, {marginLeft: 16}, isDark && {color: theme.colors.text}]}>
          Leave a Review
        </Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={{alignItems: 'center', marginBottom: 32}}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? theme.colors.surface : '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
            <Icon name="person" size={40} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          </View>
          <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937'}}>
            {providerName || 'Provider'}
          </Text>
        </View>

        <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 16, textAlign: 'center'}}>
          How was your experience?
        </Text>

        <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 32}}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={{marginHorizontal: 4}}>
              <Icon
                name={star <= rating ? 'star' : 'star-outline'}
                size={40}
                color={star <= rating ? '#F59E0B' : '#D1D5DB'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={{
            backgroundColor: isDark ? theme.colors.surface : '#F9FAFB',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? theme.colors.border : '#E5E7EB',
            padding: 16,
            fontSize: 14,
            color: isDark ? theme.colors.text : '#1F2937',
            height: 120,
            textAlignVertical: 'top',
            marginBottom: 16,
          }}
          placeholder="Share details of your experience..."
          placeholderTextColor={isDark ? theme.colors.textTertiary : '#9CA3AF'}
          multiline
          numberOfLines={6}
          value={review}
          onChangeText={setReview}
        />

        {/* Image Upload Section */}
        <View style={{marginBottom: 24}}>
          <Text style={{fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#374151', marginBottom: 12}}>
            Add Photos (Optional)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((img, index) => (
              <View key={index} style={{marginRight: 12, position: 'relative'}}>
                <Image
                  source={{uri: img.uri}}
                  style={{width: 80, height: 80, borderRadius: 8}}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    backgroundColor: '#EF4444',
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => handleRemoveImage(index)}>
                  <Icon name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: isDark ? theme.colors.border : '#E5E7EB',
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? theme.colors.surface : '#F9FAFB',
                }}
                onPress={handleAddImage}>
                <Icon name="camera" size={24} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
                <Text style={{fontSize: 10, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 4}}>
                  {images.length}/5
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={{fontSize: 12, color: isDark ? theme.colors.textTertiary : '#9CA3AF', marginTop: 8}}>
            Add up to 5 photos of the completed work
          </Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: rating === 0 || submitting ? '#9CA3AF' : '#00B14F',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}>
          {submitting && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{marginRight: 8}} />
          )}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#FFFFFF'}}>
            {uploadingImage ? 'Uploading images...' : submitting ? 'Submitting...' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReviewScreen;
