import {db} from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import notificationService from './notificationService';

// System fee percentage (5%)
const SYSTEM_FEE_PERCENTAGE = 0.05;

export const jobService = {
  // Create Job Request with system fee calculation
  createJobRequest: async (jobData) => {
    try {
      // Check if this is a negotiation job (client made custom offer)
      const isNegotiation = jobData.isNegotiable || jobData.status === 'pending_negotiation';
      
      // For negotiation, use offered price; otherwise use provider's price
      const priceToUse = isNegotiation 
        ? (jobData.offeredPrice || jobData.providerPrice || jobData.price || 0)
        : (jobData.providerPrice || jobData.price || 0);
      
      // Calculate system fee and total amount
      const systemFee = priceToUse * SYSTEM_FEE_PERCENTAGE;
      const totalAmount = priceToUse + systemFee;
      const providerEarnings = priceToUse; // Provider gets their full price (minus nothing, system fee is client's)
      
      const finalJobData = {
        ...jobData,
        // Keep offered price and provider fixed price separate for negotiation
        offeredPrice: jobData.offeredPrice || priceToUse,
        providerFixedPrice: jobData.providerFixedPrice || jobData.providerPrice || priceToUse,
        // Final agreed price (null if still negotiating)
        providerPrice: isNegotiation ? null : priceToUse,
        systemFee,
        totalAmount,
        providerEarnings: isNegotiation ? null : providerEarnings,
        // Status - 'pending_negotiation' if client made custom offer, otherwise 'pending'
        status: jobData.status || 'pending',
        // Admin approval - must be approved by admin before provider can act
        adminApproved: false,
        // Track if negotiable
        isNegotiable: isNegotiation,
        // Initialize additional charges array
        additionalCharges: [],
        hasAdditionalPending: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const jobRef = await addDoc(collection(db, 'bookings'), finalJobData);
      const createdJob = {id: jobRef.id, ...finalJobData};
      
      // Send push notification to admins about new job request
      notificationService.pushNewJobToAdmins(createdJob, jobData.clientName).catch(() => {});
      
      return createdJob;
    } catch (error) {
      console.error('Error creating job request:', error);
      throw error;
    }
  },

  // Get Job by ID
  getJobById: async (jobId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (jobDoc.exists()) {
        return {id: jobDoc.id, ...jobDoc.data()};
      }
      return null;
    } catch (error) {
      console.error('Error getting job:', error);
      throw error;
    }
  },

  // Get Client Jobs
  getClientJobs: async (clientId, status = null) => {
    try {
      let jobsQuery;
      if (status) {
        jobsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', clientId),
          where('status', '==', status.toLowerCase())
        );
      } else {
        jobsQuery = query(
          collection(db, 'bookings'),
          where('clientId', '==', clientId)
        );
      }
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({id: doc.id, ...doc.data()});
      });
      return {jobs};
    } catch (error) {
      console.error('Error getting client jobs:', error);
      throw error;
    }
  },

  // Get Provider Jobs
  getProviderJobs: async (providerId, status = null) => {
    try {
      let jobsQuery;
      if (status) {
        jobsQuery = query(
          collection(db, 'bookings'),
          where('providerId', '==', providerId),
          where('status', '==', status.toLowerCase())
        );
      } else {
        jobsQuery = query(
          collection(db, 'bookings'),
          where('providerId', '==', providerId)
        );
      }
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({id: doc.id, ...doc.data()});
      });
      return {jobs};
    } catch (error) {
      console.error('Error getting provider jobs:', error);
      throw error;
    }
  },

  // Accept Job (Provider)
  acceptJob: async (jobId, providerId, providerName = 'Provider') => {
    try {
      // Get job data first for notification
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      await updateDoc(doc(db, 'bookings', jobId), {
        providerId,
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Send push notification to client
      if (jobData.clientId) {
        notificationService.pushJobAccepted(jobData.clientId, {id: jobId, ...jobData}, providerName).catch(() => {});
      }
      
      return {success: true};
    } catch (error) {
      console.error('Error accepting job:', error);
      throw error;
    }
  },

  // Decline Job (Provider)
  declineJob: async (jobId, providerId, reason) => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'declined',
        declinedBy: providerId,
        declineReason: reason,
        declinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error declining job:', error);
      throw error;
    }
  },

  // Update Job Status
  updateJobStatus: async (jobId, status, additionalData = {}) => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        status,
        ...additionalData,
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  },

  // Start Traveling
  startTraveling: async (jobId, providerId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'traveling',
        travelStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Notify client
      if (jobData.clientId) {
        notificationService.pushJobStatusUpdate(jobData.clientId, {id: jobId, ...jobData}, 'traveling').catch(() => {});
      }
      
      return {success: true};
    } catch (error) {
      console.error('Error starting travel:', error);
      throw error;
    }
  },

  // Mark as Arrived
  markAsArrived: async (jobId, providerId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'arrived',
        arrivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Notify client
      if (jobData.clientId) {
        notificationService.pushJobStatusUpdate(jobData.clientId, {id: jobId, ...jobData}, 'arrived').catch(() => {});
      }
      
      return {success: true};
    } catch (error) {
      console.error('Error marking arrived:', error);
      throw error;
    }
  },

  // Start Work
  startWork: async (jobId, providerId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'in_progress',
        workStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Notify client
      if (jobData.clientId) {
        notificationService.pushJobStatusUpdate(jobData.clientId, {id: jobId, ...jobData}, 'in_progress').catch(() => {});
      }
      
      return {success: true};
    } catch (error) {
      console.error('Error starting work:', error);
      throw error;
    }
  },

  // Complete Work
  completeWork: async (jobId, providerId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Notify client
      if (jobData.clientId) {
        notificationService.pushJobStatusUpdate(jobData.clientId, {id: jobId, ...jobData}, 'completed').catch(() => {});
      }
      
      return {success: true};
    } catch (error) {
      console.error('Error completing work:', error);
      throw error;
    }
  },

  // Cancel Job
  cancelJob: async (jobId, cancelledBy, reason) => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'cancelled',
        cancelledBy,
        cancelReason: reason,
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  },

  // Submit Review
  submitReview: async (jobId, reviewData) => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        review: reviewData,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  },

  // ========== ADMIN FUNCTIONS ==========

  // Admin Approve Job - Allows provider to act on the job
  adminApproveJob: async (jobId, adminId, notes = '') => {
    try {
      // Get job data first for notification
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      await updateDoc(doc(db, 'bookings', jobId), {
        adminApproved: true,
        approvedAt: serverTimestamp(),
        approvedBy: adminId,
        adminNotes: notes,
        updatedAt: serverTimestamp(),
      });
      
      // Send push notification to client
      if (jobData.clientId) {
        notificationService.pushAdminApproved(jobData.clientId, {id: jobId, ...jobData}).catch(() => {});
      }
      
      // Notify providers about new available job (via topic)
      notificationService.sendPushToTopic('new_jobs', '📋 New Job Available!', 
        `New ${jobData.serviceCategory || 'service'} job is available. Tap to view.`,
        {type: 'new_job', jobId}
      ).catch(() => {});
      
      return {success: true};
    } catch (error) {
      console.error('Error approving job:', error);
      throw error;
    }
  },

  // Admin Reject Job
  adminRejectJob: async (jobId, adminId, reason) => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'rejected',
        adminApproved: false,
        rejectedAt: serverTimestamp(),
        rejectedBy: adminId,
        rejectReason: reason,
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error rejecting job:', error);
      throw error;
    }
  },

  // Get all jobs for admin (with optional filters)
  getAdminJobs: async (filters = {}) => {
    try {
      let jobsQuery = collection(db, 'bookings');
      
      // Apply filters if provided
      if (filters.status) {
        jobsQuery = query(jobsQuery, where('status', '==', filters.status));
      }
      if (filters.adminApproved !== undefined) {
        jobsQuery = query(jobsQuery, where('adminApproved', '==', filters.adminApproved));
      }
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      querySnapshot.forEach((doc) => {
        jobs.push({id: doc.id, ...doc.data()});
      });
      return {jobs};
    } catch (error) {
      console.error('Error getting admin jobs:', error);
      throw error;
    }
  },

  // ========== NEGOTIATION FUNCTIONS ==========

  // Provider sends counter offer
  sendCounterOffer: async (jobId, providerId, counterPrice, counterNote = '') => {
    try {
      // Get job data first for notification
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      const jobData = jobDoc.exists() ? jobDoc.data() : {};
      
      const systemFee = counterPrice * SYSTEM_FEE_PERCENTAGE;
      const totalAmount = counterPrice + systemFee;
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'counter_offer',
        hasCounterOffer: true,
        counterOfferPrice: counterPrice,
        counterOfferNote: counterNote,
        counterOfferSystemFee: systemFee,
        counterOfferTotal: totalAmount,
        counterOfferBy: providerId,
        counterOfferAt: serverTimestamp(),
        negotiationHistory: [],
        updatedAt: serverTimestamp(),
      });
      
      // Send push notification to client about counter offer
      if (jobData.clientId) {
        notificationService.pushCounterOffer(jobData.clientId, {
          id: jobId,
          ...jobData,
          counterOfferPrice,
        }).catch(() => {});
      }
      
      return {success: true, counterPrice, systemFee, totalAmount};
    } catch (error) {
      console.error('Error sending counter offer:', error);
      throw error;
    }
  },

  // Client accepts counter offer
  acceptCounterOffer: async (jobId, clientId) => {
    try {
      // First get the job to get counter offer details
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const agreedPrice = jobData.counterOfferPrice;
      const systemFee = agreedPrice * SYSTEM_FEE_PERCENTAGE;
      const totalAmount = agreedPrice + systemFee;
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'accepted',
        providerPrice: agreedPrice,
        systemFee: systemFee,
        totalAmount: totalAmount,
        providerEarnings: agreedPrice,
        counterOfferAccepted: true,
        counterOfferAcceptedAt: serverTimestamp(),
        counterOfferAcceptedBy: clientId,
        updatedAt: serverTimestamp(),
      });
      
      // Send push notification to provider
      if (jobData.counterOfferBy || jobData.providerId) {
        notificationService.pushCounterOfferAccepted(
          jobData.counterOfferBy || jobData.providerId,
          {id: jobId, ...jobData, counterOfferPrice: agreedPrice}
        ).catch(() => {});
      }
      
      return {success: true, agreedPrice, systemFee, totalAmount};
    } catch (error) {
      console.error('Error accepting counter offer:', error);
      throw error;
    }
  },

  // Client declines counter offer
  declineCounterOffer: async (jobId, clientId, reason = '') => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'cancelled',
        counterOfferDeclined: true,
        counterOfferDeclinedAt: serverTimestamp(),
        counterOfferDeclinedBy: clientId,
        counterOfferDeclineReason: reason,
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error declining counter offer:', error);
      throw error;
    }
  },

  // Provider accepts client's original offer (for negotiation jobs)
  acceptClientOffer: async (jobId, providerId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const offeredPrice = jobData.offeredPrice || jobData.providerFixedPrice;
      const systemFee = offeredPrice * SYSTEM_FEE_PERCENTAGE;
      const totalAmount = offeredPrice + systemFee;
      
      await updateDoc(doc(db, 'bookings', jobId), {
        status: 'accepted',
        providerId: providerId,
        providerPrice: offeredPrice,
        systemFee: systemFee,
        totalAmount: totalAmount,
        providerEarnings: offeredPrice,
        offerAccepted: true,
        offerAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {success: true, offeredPrice, systemFee, totalAmount};
    } catch (error) {
      console.error('Error accepting client offer:', error);
      throw error;
    }
  },

  // ========== ADDITIONAL CHARGES FUNCTIONS ==========

  // Provider requests additional charge during job
  requestAdditionalCharge: async (jobId, providerId, amount, reason) => {
    try {
      const systemFee = amount * SYSTEM_FEE_PERCENTAGE;
      const totalWithFee = amount + systemFee;
      
      const additionalCharge = {
        id: Date.now().toString(),
        amount: amount,
        systemFee: systemFee,
        total: totalWithFee,
        reason: reason,
        status: 'pending',
        requestedBy: providerId,
        requestedAt: new Date().toISOString(),
      };
      
      // Get current job to append to additionalCharges array
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const currentCharges = jobDoc.data().additionalCharges || [];
      
      await updateDoc(doc(db, 'bookings', jobId), {
        additionalCharges: [...currentCharges, additionalCharge],
        pendingAdditionalCharge: additionalCharge,
        hasAdditionalPending: true,
        updatedAt: serverTimestamp(),
      });
      return {success: true, additionalCharge};
    } catch (error) {
      console.error('Error requesting additional charge:', error);
      throw error;
    }
  },

  // Client approves additional charge
  approveAdditionalCharge: async (jobId, chargeId, clientId) => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const charges = jobData.additionalCharges || [];
      
      // Update the specific charge status
      const updatedCharges = charges.map(charge => {
        if (charge.id === chargeId) {
          return {
            ...charge,
            status: 'approved',
            approvedBy: clientId,
            approvedAt: new Date().toISOString(),
          };
        }
        return charge;
      });
      
      // Calculate new totals
      const approvedCharges = updatedCharges.filter(c => c.status === 'approved');
      const additionalTotal = approvedCharges.reduce((sum, c) => sum + c.total, 0);
      const newTotalAmount = (jobData.totalAmount || 0) + additionalTotal;
      
      await updateDoc(doc(db, 'bookings', jobId), {
        additionalCharges: updatedCharges,
        pendingAdditionalCharge: null,
        hasAdditionalPending: false,
        additionalChargesTotal: additionalTotal,
        grandTotal: newTotalAmount,
        updatedAt: serverTimestamp(),
      });
      return {success: true, newTotalAmount};
    } catch (error) {
      console.error('Error approving additional charge:', error);
      throw error;
    }
  },

  // Client rejects additional charge
  rejectAdditionalCharge: async (jobId, chargeId, clientId, reason = '') => {
    try {
      const jobDoc = await getDoc(doc(db, 'bookings', jobId));
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      const charges = jobData.additionalCharges || [];
      
      // Update the specific charge status
      const updatedCharges = charges.map(charge => {
        if (charge.id === chargeId) {
          return {
            ...charge,
            status: 'rejected',
            rejectedBy: clientId,
            rejectedAt: new Date().toISOString(),
            rejectReason: reason,
          };
        }
        return charge;
      });
      
      await updateDoc(doc(db, 'bookings', jobId), {
        additionalCharges: updatedCharges,
        pendingAdditionalCharge: null,
        hasAdditionalPending: false,
        updatedAt: serverTimestamp(),
      });
      return {success: true};
    } catch (error) {
      console.error('Error rejecting additional charge:', error);
      throw error;
    }
  },

  // ========== UTILITY FUNCTIONS ==========

  // Calculate pricing with system fee
  calculatePricing: (basePrice) => {
    const systemFee = basePrice * SYSTEM_FEE_PERCENTAGE;
    const totalAmount = basePrice + systemFee;
    return {
      basePrice,
      systemFee,
      totalAmount,
      providerEarnings: basePrice,
      systemFeePercentage: SYSTEM_FEE_PERCENTAGE * 100,
    };
  },

  // Get pending jobs for provider (with admin approval status)
  getPendingJobsForProvider: async (providerId, serviceCategory) => {
    try {
      // Get jobs that match provider's service category
      const jobsQuery = query(
        collection(db, 'bookings'),
        where('status', 'in', ['pending', 'pending_negotiation']),
        where('serviceCategory', '==', serviceCategory)
      );
      
      const querySnapshot = await getDocs(jobsQuery);
      const jobs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        jobs.push({
          id: doc.id,
          ...data,
          canAccept: data.adminApproved === true, // Provider can only act if admin approved
        });
      });
      return {jobs};
    } catch (error) {
      console.error('Error getting pending jobs:', error);
      throw error;
    }
  },
};
