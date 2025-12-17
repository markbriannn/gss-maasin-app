import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { onReviewSubmitted } from './gamificationService';

/**
 * Submit a review for a completed job
 * Validates: job is completed, user hasn't reviewed yet, only 30 days after completion
 * @param {string} jobId - The booking/job ID
 * @param {string} providerId - The provider's user ID
 * @param {string} clientId - The client's user ID (reviewer)
 * @param {number} rating - Rating 1-5
 * @param {string} comment - Review comment
 * @param {string[]} images - Array of image URLs (optional)
 */
export const submitReview = async (jobId, providerId, clientId, rating, comment, images = []) => {
  try {
    // 1. Verify job exists and is completed
    const jobRef = doc(db, 'bookings', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return { success: false, error: 'Job not found' };
    }

    const job = jobSnap.data();
    if (job.status !== 'completed') {
      return { success: false, error: 'Only completed jobs can be reviewed' };
    }

    // 2. Verify review hasn't been submitted by this user for this job
    const existingReviewQuery = query(
      collection(db, 'reviews'),
      where('jobId', '==', jobId),
      where('reviewerId', '==', clientId)
    );
    const existingReviews = await getDocs(existingReviewQuery);

    if (existingReviews.size > 0) {
      return { success: false, error: 'You have already reviewed this job' };
    }

    // 3. Verify review is submitted within 30 days of completion
    const completedAt = job.completedAt?.toDate?.() || new Date(job.completedAt);
    const daysSinceCompletion = (new Date() - completedAt) / (1000 * 60 * 60 * 24);

    if (daysSinceCompletion > 30) {
      return { success: false, error: 'Reviews can only be submitted within 30 days of job completion' };
    }

    // 4. Create review document with images
    const reviewRef = await addDoc(collection(db, 'reviews'), {
      jobId,
      providerId,
      reviewerId: clientId,
      rating: Math.min(5, Math.max(1, parseInt(rating))), // Clamp 1-5
      comment: comment?.trim() || '',
      images: images || [], // Store image URLs
      createdAt: new Date(),
      status: 'active',
    });

    // 5. Update provider's average rating
    await updateProviderRating(providerId);
    
    // 6. Award gamification points for review
    if (clientId && providerId) {
      onReviewSubmitted(clientId, providerId, rating)
        .catch(err => console.log('Gamification review error:', err));
    }

    return { success: true, reviewId: reviewRef.id };
  } catch (error) {
    console.error('Error submitting review:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update provider's average rating based on all reviews
 */
export const updateProviderRating = async (providerId) => {
  try {
    // Use simple query without compound where to avoid index requirement
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId)
    );
    const reviewsSnap = await getDocs(reviewsQuery);

    // Filter active reviews in memory
    const activeReviews = reviewsSnap.docs.filter(d => {
      const status = d.data().status;
      return status === 'active' || !status;
    });

    if (activeReviews.length === 0) {
      // No reviews, reset to null
      await updateDoc(doc(db, 'users', providerId), {
        rating: null,
        averageRating: null,
        reviewCount: 0,
      });
      return;
    }

    let totalRating = 0;
    activeReviews.forEach(d => {
      totalRating += d.data().rating || 0;
    });

    const averageRating = totalRating / activeReviews.length;
    const ratingValue = parseFloat(averageRating.toFixed(2));

    // Update provider's profile - set both 'rating' and 'averageRating' for compatibility
    const updateData = {
      rating: ratingValue,
      averageRating: ratingValue,
      reviewCount: activeReviews.length,
    };
    console.log(`[Reviews] Updating provider ${providerId} with:`, updateData);
    
    await updateDoc(doc(db, 'users', providerId), updateData);

    console.log(`[Reviews] Successfully updated provider ${providerId} rating: ${ratingValue} (${activeReviews.length} reviews)`);
    return { averageRating: ratingValue, count: activeReviews.length };
  } catch (error) {
    console.error('Error updating provider rating:', error);
    return null;
  }
};

/**
 * Get all reviews for a provider
 */
export const getProviderReviews = async (providerId) => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
    }));
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    return [];
  }
};

/**
 * Check if a job is eligible for review
 */
export const isJobEligibleForReview = async (jobId, userId) => {
  try {
    const jobRef = doc(db, 'bookings', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return { eligible: false, reason: 'Job not found' };
    }

    const job = jobSnap.data();

    // Must be completed
    if (job.status !== 'completed') {
      return { eligible: false, reason: 'Job must be completed' };
    }

    // Check if user already reviewed
    const existingReviewQuery = query(
      collection(db, 'reviews'),
      where('jobId', '==', jobId),
      where('reviewerId', '==', userId)
    );
    const existingReviews = await getDocs(existingReviewQuery);

    if (existingReviews.size > 0) {
      return { eligible: false, reason: 'Already reviewed' };
    }

    // Within 30 days
    const completedAt = job.completedAt?.toDate?.() || new Date(job.completedAt);
    const daysSinceCompletion = (new Date() - completedAt) / (1000 * 60 * 60 * 24);

    if (daysSinceCompletion > 30) {
      return { eligible: false, reason: 'Review window expired (30 days)' };
    }

    return { eligible: true };
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return { eligible: false, reason: error.message };
  }
};

/**
 * Flag a review as inappropriate (admin only)
 */
export const flagReview = async (reviewId, reason) => {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), {
      flagged: true,
      flagReason: reason,
      flaggedAt: new Date(),
      status: 'under_review',
    });
    return true;
  } catch (error) {
    console.error('Error flagging review:', error);
    return false;
  }
};

/**
 * Delete/hide a review (admin only)
 */
export const deleteReview = async (reviewId) => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);

    if (reviewSnap.exists()) {
      const review = reviewSnap.data();
      
      // Mark as deleted
      await updateDoc(reviewRef, { status: 'deleted' });

      // Recalculate provider rating
      await updateProviderRating(review.providerId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting review:', error);
    return false;
  }
};
