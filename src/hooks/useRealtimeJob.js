import {useState, useEffect} from 'react';
import {db} from '../config/firebase';
import {doc, onSnapshot, collection, query, where} from 'firebase/firestore';

/**
 * Hook for real-time job updates
 * @param {string} jobId - The job ID to listen to
 * @returns {object} - { job, loading, error }
 */
export const useRealtimeJob = (jobId) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'bookings', jobId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setJob({id: docSnapshot.id, ...docSnapshot.data()});
        } else {
          setJob(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to job:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  return {job, loading, error};
};

/**
 * Hook for real-time jobs list
 * @param {object} options - Query options { userId, role, status, limit }
 * @returns {object} - { jobs, loading, error }
 */
export const useRealtimeJobs = (options = {}) => {
  const {userId, role, status, serviceCategory} = options;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId && !status) {
      setLoading(false);
      return;
    }

    let constraints = [];

    // Filter by user role
    if (userId && role === 'client') {
      constraints.push(where('clientId', '==', userId));
    } else if (userId && role === 'provider') {
      constraints.push(where('providerId', '==', userId));
    }

    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        constraints.push(where('status', 'in', status));
      } else {
        constraints.push(where('status', '==', status));
      }
    }

    // Filter by service category (for providers viewing available jobs)
    if (serviceCategory) {
      constraints.push(where('serviceCategory', '==', serviceCategory));
    }

    const jobsQuery = query(collection(db, 'bookings'), ...constraints);

    const unsubscribe = onSnapshot(
      jobsQuery,
      (querySnapshot) => {
        const jobsList = [];
        querySnapshot.forEach((doc) => {
          jobsList.push({id: doc.id, ...doc.data()});
        });
        // Sort by createdAt descending
        jobsList.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setJobs(jobsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to jobs:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, role, status, serviceCategory]);

  return {jobs, loading, error};
};

/**
 * Hook for real-time provider earnings
 * @param {string} providerId - Provider's user ID
 * @returns {object} - { earnings, transactions, loading, error }
 */
export const useRealtimeEarnings = (providerId) => {
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    pending: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    const jobsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', providerId)
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (querySnapshot) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayEarnings = 0;
        let weekEarnings = 0;
        let monthEarnings = 0;
        let totalEarnings = 0;
        let pendingEarnings = 0;
        const txList = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const providerPrice = data.providerPrice || data.price || 0;
          const additionalApproved = (data.additionalCharges || [])
            .filter(c => c.status === 'approved')
            .reduce((sum, c) => sum + (c.amount || 0), 0);
          const amount = providerPrice + additionalApproved;
          
          const completedAt = data.completedAt?.toDate?.() || data.updatedAt?.toDate?.();

          if (data.status === 'completed') {
            totalEarnings += amount;

            if (completedAt) {
              if (completedAt >= todayStart) todayEarnings += amount;
              if (completedAt >= weekStart) weekEarnings += amount;
              if (completedAt >= monthStart) monthEarnings += amount;
            }

            txList.push({
              id: doc.id,
              type: 'earning',
              service: data.serviceCategory || 'Service',
              clientName: data.clientName || 'Client',
              amount: amount,
              date: completedAt || new Date(),
              status: 'completed',
            });
          } else if (data.status === 'in_progress' || data.status === 'accepted') {
            pendingEarnings += amount;
            txList.push({
              id: doc.id,
              type: 'pending',
              service: data.serviceCategory || 'Service',
              clientName: data.clientName || 'Client',
              amount: amount,
              date: data.createdAt?.toDate?.() || new Date(),
              status: data.status,
            });
          }
        });

        // Sort by date descending
        txList.sort((a, b) => b.date - a.date);

        setEarnings({
          today: todayEarnings,
          thisWeek: weekEarnings,
          thisMonth: monthEarnings,
          total: totalEarnings,
          pending: pendingEarnings,
        });
        setTransactions(txList);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to earnings:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [providerId]);

  return {earnings, transactions, loading, error};
};

/**
 * Hook for real-time admin analytics
 * @returns {object} - { analytics, loading, error }
 */
export const useRealtimeAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalProviders: 0,
    activeProviders: 0,
    pendingProviders: 0,
    totalClients: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    inProgressJobs: 0,
    cancelledJobs: 0,
    totalRevenue: 0,
    totalSystemFee: 0,
    providerEarnings: 0,
    avgJobValue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen to users collection
    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (usersSnapshot) => {
        let totalProviders = 0;
        let activeProviders = 0;
        let pendingProviders = 0;
        let totalClients = 0;

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'PROVIDER') {
            totalProviders++;
            if (data.providerStatus === 'approved') activeProviders++;
            else if (data.providerStatus === 'pending') pendingProviders++;
          } else if (data.role === 'CLIENT') {
            totalClients++;
          }
        });

        setAnalytics(prev => ({
          ...prev,
          totalUsers: totalProviders + totalClients,
          totalProviders,
          activeProviders,
          pendingProviders,
          totalClients,
        }));
      },
      (err) => {
        console.error('Error listening to users:', err);
        setError(err);
      }
    );

    // Listen to bookings collection
    const bookingsUnsubscribe = onSnapshot(
      collection(db, 'bookings'),
      (jobsSnapshot) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let totalJobs = 0;
        let completedJobs = 0;
        let pendingJobs = 0;
        let inProgressJobs = 0;
        let cancelledJobs = 0;
        let totalRevenue = 0;
        let totalSystemFee = 0;
        let providerEarnings = 0;
        let todayRevenue = 0;
        let weekRevenue = 0;
        let monthRevenue = 0;

        jobsSnapshot.forEach((doc) => {
          const data = doc.data();
          totalJobs++;

          const status = data.status;
          if (status === 'completed') {
            completedJobs++;
            const amount = data.totalAmount || data.price || 0;
            const systemFee = data.systemFee || (amount * 0.05);
            const earnings = data.providerPrice || (amount - systemFee);

            totalRevenue += amount;
            totalSystemFee += systemFee;
            providerEarnings += earnings;

            const completedAt = data.completedAt?.toDate?.();
            if (completedAt) {
              if (completedAt >= todayStart) todayRevenue += amount;
              if (completedAt >= weekStart) weekRevenue += amount;
              if (completedAt >= monthStart) monthRevenue += amount;
            }
          } else if (status === 'pending' || status === 'pending_negotiation') {
            pendingJobs++;
          } else if (status === 'in_progress' || status === 'accepted') {
            inProgressJobs++;
          } else if (status === 'cancelled' || status === 'rejected') {
            cancelledJobs++;
          }
        });

        const avgJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

        setAnalytics(prev => ({
          ...prev,
          totalJobs,
          completedJobs,
          pendingJobs,
          inProgressJobs,
          cancelledJobs,
          totalRevenue,
          totalSystemFee,
          providerEarnings,
          avgJobValue,
          todayRevenue,
          weekRevenue,
          monthRevenue,
        }));
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to bookings:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      usersUnsubscribe();
      bookingsUnsubscribe();
    };
  }, []);

  return {analytics, loading, error};
};

export default {
  useRealtimeJob,
  useRealtimeJobs,
  useRealtimeEarnings,
  useRealtimeAnalytics,
};
