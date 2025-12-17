import {db} from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

export const providerService = {
  // Get Nearby Providers
  getNearbyProviders: async (latitude, longitude, radius = 10, category = null) => {
    try {
      let providersQuery;
      if (category) {
        providersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'PROVIDER'),
          where('providerStatus', '==', 'approved'),
          where('serviceCategory', '==', category)
        );
      } else {
        providersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'PROVIDER'),
          where('providerStatus', '==', 'approved')
        );
      }
      
      const querySnapshot = await getDocs(providersQuery);
      const providers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Calculate distance (simplified - use actual geolocation library for production)
        const providerLat = data.latitude || latitude;
        const providerLng = data.longitude || longitude;
        const distance = Math.sqrt(
          Math.pow(providerLat - latitude, 2) + 
          Math.pow(providerLng - longitude, 2)
        ) * 111; // Rough km conversion
        
        if (distance <= radius) {
          providers.push({
            id: doc.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
            latitude: data.latitude || latitude,
            longitude: data.longitude || longitude,
            rating: data.rating || null,
            reviewCount: data.reviewCount || 0,
            distance: distance.toFixed(1),
            service: data.serviceCategory,
            serviceCategory: data.serviceCategory,
            hourlyRate: data.hourlyRate,
            isOnline: data.isOnline || false,
            ...data,
          });
        }
      });
      
      // Sort by distance
      providers.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      
      return {providers};
    } catch (error) {
      console.error('Error getting nearby providers:', error);
      throw error;
    }
  },

  // Get Provider by ID
  getProviderById: async (providerId) => {
    try {
      const providerDoc = await getDoc(doc(db, 'users', providerId));
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        return {
          id: providerDoc.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Provider',
          ...data,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting provider:', error);
      throw error;
    }
  },

  // Get Provider Reviews (reviews are stored in bookings)
  getProviderReviews: async (providerId) => {
    try {
      const reviewsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', providerId),
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(reviewsQuery);
      const reviews = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.review) {
          reviews.push({
            id: doc.id,
            ...data.review,
            createdAt: data.reviewedAt,
          });
        }
      });
      
      return {reviews};
    } catch (error) {
      console.error('Error getting provider reviews:', error);
      throw error;
    }
  },

  // Get Available Jobs (for provider)
  getAvailableJobs: async (providerId, serviceCategory) => {
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter jobs that don't have a provider assigned or match provider's category
        if (!data.providerId || data.providerId === providerId) {
          jobs.push({id: doc.id, ...data});
        }
      });
      
      return {jobs};
    } catch (error) {
      console.error('Error getting available jobs:', error);
      throw error;
    }
  },

  // Get Provider Active Jobs
  getProviderActiveJobs: async (providerId) => {
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', providerId),
        where('status', 'in', ['accepted', 'in_progress', 'traveling', 'arrived'])
      );
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      
      querySnapshot.forEach((doc) => {
        jobs.push({id: doc.id, ...doc.data()});
      });
      
      return {jobs};
    } catch (error) {
      console.error('Error getting active jobs:', error);
      throw error;
    }
  },

  // Get Provider Completed Jobs
  getProviderCompletedJobs: async (providerId) => {
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', providerId),
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      
      querySnapshot.forEach((doc) => {
        jobs.push({id: doc.id, ...doc.data()});
      });
      
      return {jobs};
    } catch (error) {
      console.error('Error getting completed jobs:', error);
      throw error;
    }
  },

  // Update Provider Profile
  updateProviderProfile: async (providerId, profileData) => {
    try {
      await updateDoc(doc(db, 'users', providerId), {
        ...profileData,
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Update Provider Location
  updateProviderLocation: async (providerId, latitude, longitude) => {
    try {
      await updateDoc(doc(db, 'users', providerId), {
        latitude,
        longitude,
        locationUpdatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  // Toggle Provider Online Status
  toggleOnlineStatus: async (providerId, isOnline) => {
    try {
      await updateDoc(doc(db, 'users', providerId), {
        isOnline,
        statusUpdatedAt: serverTimestamp(),
      });
      return {success: true, isOnline};
    } catch (error) {
      console.error('Error toggling status:', error);
      throw error;
    }
  },

  // Get Provider Earnings
  getProviderEarnings: async (providerId, period = 'today') => {
    try {
      // Query all provider jobs (we'll filter for completed and Pay First confirmed)
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', providerId)
      );
      
      const querySnapshot = await getDocs(jobsQuery);
      let total = 0;
      let periodTotal = 0;
      const now = new Date();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if this is a completed job OR a Pay First job where client confirmed
        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;
        
        if (!isCompleted && !isPayFirstConfirmed) return;
        
        // Use finalAmount if available, otherwise calculate
        let amount = data.finalAmount;
        if (!amount) {
          const baseAmount = data.providerPrice || data.totalAmount || data.price || 0;
          const approvedAdditionalCharges = (data.additionalCharges || [])
            .filter(c => c.status === 'approved')
            .reduce((sum, c) => sum + (c.amount || 0), 0);
          amount = baseAmount + approvedAdditionalCharges;
        }
        total += amount;
        
        // For Pay First, use clientConfirmedAt; for completed, use completedAt
        const earningDate = isPayFirstConfirmed
          ? (data.clientConfirmedAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date())
          : (data.completedAt?.toDate?.() || new Date());
        
        if (period === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (earningDate >= todayStart) {
            periodTotal += amount;
          }
        } else if (period === 'week') {
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (earningDate >= weekStart) {
            periodTotal += amount;
          }
        } else if (period === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (earningDate >= monthStart) {
            periodTotal += amount;
          }
        }
      });
      
      return {total, periodTotal};
    } catch (error) {
      console.error('Error getting earnings:', error);
      throw error;
    }
  },

  // Get Provider Statistics
  getProviderStatistics: async (providerId) => {
    try {
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('providerId', '==', providerId)
      );
      
      const querySnapshot = await getDocs(jobsQuery);
      let totalJobs = 0;
      let completedJobs = 0;
      let totalEarnings = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalJobs++;
        
        // Include completed jobs AND Pay First jobs where client confirmed
        const isCompleted = data.status === 'completed';
        const isPayFirstConfirmed = data.status === 'payment_received' && data.isPaidUpfront === true;
        
        if (isCompleted || isPayFirstConfirmed) {
          completedJobs++;
          // Use finalAmount if available, otherwise calculate
          let amount = data.finalAmount;
          if (!amount) {
            const baseAmount = data.providerPrice || data.totalAmount || data.price || 0;
            const approvedAdditionalCharges = (data.additionalCharges || [])
              .filter(c => c.status === 'approved')
              .reduce((sum, c) => sum + (c.amount || 0), 0);
            amount = baseAmount + approvedAdditionalCharges;
          }
          totalEarnings += amount;
        }
      });
      
      return {
        totalJobs,
        completedJobs,
        totalEarnings,
        completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  },
};
