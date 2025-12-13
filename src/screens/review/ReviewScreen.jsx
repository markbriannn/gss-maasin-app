import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, getDocs} from 'firebase/firestore';
import {db} from '../../config/firebase';
import {submitReview, isJobEligibleForReview} from '../../services/reviewService';

const ReviewScreen = ({navigation, route}) => {
  const {user} = useAuth();
  const {jobId, providerId, providerName} = route.params || {};
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState('');

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

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!review.trim()) {
      Alert.alert('Comment Required', 'Please add a comment to your review.');
      return;
    }

    setSubmitting(true);
    try {
      // Use reviewService for anti-fraud validation
      const result = await submitReview(
        jobId,
        providerId,
        user.uid,
        rating,
        review.trim()
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
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!eligible && jobId) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={[globalStyles.centerContainer, { padding: 20 }]}>
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text style={[globalStyles.heading2, { marginTop: 16, textAlign: 'center' }]}>
            Cannot Submit Review
          </Text>
          <Text style={[globalStyles.bodyMedium, { marginTop: 12, textAlign: 'center', color: '#6B7280' }]}>
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
    <SafeAreaView style={globalStyles.container}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={[globalStyles.heading3, {marginLeft: 16}]}>
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
              backgroundColor: '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
            <Icon name="person" size={40} color="#9CA3AF" />
          </View>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#1F2937'}}>
            {providerName || 'Provider'}
          </Text>
        </View>

        <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16, textAlign: 'center'}}>
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
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: 16,
            fontSize: 14,
            color: '#1F2937',
            height: 150,
            textAlignVertical: 'top',
            marginBottom: 24,
          }}
          placeholder="Share details of your experience (optional)"
          multiline
          numberOfLines={8}
          value={review}
          onChangeText={setReview}
        />

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
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReviewScreen;
