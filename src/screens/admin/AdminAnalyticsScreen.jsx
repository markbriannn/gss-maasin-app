import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {analyticsStyles as styles} from '../../css/adminStyles';
import {db} from '../../config/firebase';
import {collection, onSnapshot} from 'firebase/firestore';

const AdminAnalyticsScreen = ({navigation}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [analytics, setAnalytics] = useState({
    totalProviders: 0,
    activeProviders: 0,
    pendingProviders: 0,
    suspendedProviders: 0,
    totalClients: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingJobs: 0,
    inProgressJobs: 0,
    cancelledJobs: 0,
    awaitingApproval: 0,
    totalRevenue: 0,
    totalSystemFee: 0,
    providerEarnings: 0,
    avgJobValue: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayJobs: 0,
    weekJobs: 0,
    monthJobs: 0,
    completionRate: 0,
    avgRating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    // Real-time listener for users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let totalProviders = 0;
      let activeProviders = 0;
      let pendingProviders = 0;
      let suspendedProviders = 0;
      let totalClients = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'PROVIDER') {
          totalProviders++;
          if (data.providerStatus === 'approved') activeProviders++;
          else if (data.providerStatus === 'pending') pendingProviders++;
          else if (data.providerStatus === 'suspended') suspendedProviders++;
        } else if (data.role === 'CLIENT') {
          totalClients++;
        }
      });
      
      setAnalytics(prev => ({
        ...prev,
        totalProviders,
        activeProviders,
        pendingProviders,
        suspendedProviders,
        totalClients,
      }));
    });

    // Real-time listener for jobs/bookings
    const unsubscribeJobs = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setMonth(monthStart.getMonth() - 1);
      
      let totalJobs = 0;
      let completedJobs = 0;
      let pendingJobs = 0;
      let inProgressJobs = 0;
      let cancelledJobs = 0;
      let awaitingApproval = 0;
      let totalRevenue = 0;
      let totalSystemFee = 0;
      let providerEarnings = 0;
      let todayRevenue = 0;
      let weekRevenue = 0;
      let monthRevenue = 0;
      let todayJobs = 0;
      let weekJobs = 0;
      let monthJobs = 0;
      let totalRating = 0;
      let totalReviews = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        totalJobs++;
        
        // Count awaiting admin approval
        if (!data.adminApproved && data.status !== 'cancelled') {
          awaitingApproval++;
        }
        
        if (data.status === 'completed') {
          completedJobs++;
          const amount = data.totalAmount || data.fixedPrice || data.price || 0;
          totalRevenue += amount;
          
          // Calculate system fee (5%)
          const systemFee = data.systemFee || (amount * 0.05);
          totalSystemFee += systemFee;
          
          // Calculate provider earnings
          const earnings = data.providerEarnings || (amount - systemFee);
          providerEarnings += earnings;
          
          // Time-based revenue calculations
          const completedAt = data.completedAt?.toDate?.() || new Date(data.completedAt);
          if (completedAt >= todayStart) {
            todayRevenue += amount;
            todayJobs++;
          }
          if (completedAt >= weekStart) {
            weekRevenue += amount;
            weekJobs++;
          }
          if (completedAt >= monthStart) {
            monthRevenue += amount;
            monthJobs++;
          }
          
          // Ratings
          if (data.rating) {
            totalRating += data.rating;
            totalReviews++;
          }
        } else if (data.status === 'pending' || data.status === 'pending_negotiation' || data.status === 'counter_offer') {
          pendingJobs++;
        } else if (data.status === 'in_progress' || data.status === 'accepted') {
          inProgressJobs++;
        } else if (data.status === 'cancelled' || data.status === 'rejected') {
          cancelledJobs++;
        }
      });
      
      // Calculate metrics
      const finishedJobs = completedJobs + cancelledJobs;
      const completionRate = finishedJobs > 0 ? (completedJobs / finishedJobs) * 100 : 0;
      const avgJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;
      const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;
      
      setAnalytics(prev => ({
        ...prev,
        totalJobs,
        completedJobs,
        pendingJobs,
        inProgressJobs,
        cancelledJobs,
        awaitingApproval,
        totalRevenue,
        totalSystemFee,
        providerEarnings,
        avgJobValue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayJobs,
        weekJobs,
        monthJobs,
        completionRate,
        avgRating,
        totalReviews,
      }));
      
      setIsLoading(false);
      setRefreshing(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeJobs();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Real-time listeners will update automatically
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getPeriodRevenue = () => {
    switch (selectedPeriod) {
      case 'today':
        return {revenue: analytics.todayRevenue, jobs: analytics.todayJobs, label: 'Today'};
      case 'week':
        return {revenue: analytics.weekRevenue, jobs: analytics.weekJobs, label: 'This Week'};
      case 'month':
        return {revenue: analytics.monthRevenue, jobs: analytics.monthJobs, label: 'This Month'};
      default:
        return {revenue: analytics.totalRevenue, jobs: analytics.completedJobs, label: 'All Time'};
    }
  };

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
  };

  const periodData = getPeriodRevenue();

  if (isLoading) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
          <Text style={[globalStyles.bodyMedium, {marginTop: 12}]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* Period Filter */}
        <View style={styles.filterContainer}>
          {['all', 'today', 'week', 'month'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterButton,
                selectedPeriod === period && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}>
              <Text
                style={[
                  styles.filterButtonText,
                  selectedPeriod === period && styles.filterButtonTextActive,
                ]}>
                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>{periodData.label} Revenue</Text>
          <Text style={styles.revenueAmount}>{formatCurrency(periodData.revenue)}</Text>
          <Text style={styles.revenueSubtext}>From {periodData.jobs} completed jobs</Text>
        </View>

        {/* Awaiting Approval Alert */}
        {analytics.awaitingApproval > 0 && (
          <TouchableOpacity 
            style={styles.approvalAlert}
            onPress={() => navigation?.navigate('AdminApproval')}>
            <Icon name="alert-circle" size={24} color="#F59E0B" />
            <View style={styles.approvalAlertContent}>
              <Text style={styles.approvalAlertTitle}>{analytics.awaitingApproval} Jobs Awaiting Approval</Text>
              <Text style={styles.approvalAlertSubtext}>Tap to review</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* System Fee Earnings Card */}
        <TouchableOpacity 
          style={styles.systemFeeCard}
          onPress={() => navigation?.navigate('AdminEarnings')}
          activeOpacity={0.8}>
          <View style={styles.systemFeeHeader}>
            <Icon name="cash" size={24} color="#F59E0B" />
            <Text style={styles.systemFeeTitle}>System Fee Earnings (5%)</Text>
            <Icon name="chevron-forward" size={20} color="#F59E0B" style={{marginLeft: 'auto'}} />
          </View>
          <View style={styles.systemFeeContent}>
            <View style={styles.systemFeeItem}>
              <Text style={styles.systemFeeLabel}>Total System Fee</Text>
              <Text style={styles.systemFeeValue}>{formatCurrency(analytics.totalSystemFee)}</Text>
            </View>
            <View style={styles.systemFeeDivider} />
            <View style={styles.systemFeeItem}>
              <Text style={styles.systemFeeLabel}>Provider Earnings</Text>
              <Text style={styles.providerEarningsValue}>{formatCurrency(analytics.providerEarnings)}</Text>
            </View>
          </View>
          <View style={styles.avgJobContainer}>
            <Icon name="wallet" size={16} color="#F59E0B" />
            <Text style={[styles.avgJobText, {color: '#D97706'}]}>Tap to withdraw your earnings</Text>
          </View>
        </TouchableOpacity>

        {/* Users Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users Overview</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.gridCard, {borderLeftColor: '#00B14F'}]}>
              <Icon name="people" size={24} color="#00B14F" />
              <Text style={styles.gridValue}>{analytics.totalProviders}</Text>
              <Text style={styles.gridLabel}>Total Providers</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#3B82F6'}]}>
              <Icon name="checkmark-circle" size={24} color="#3B82F6" />
              <Text style={styles.gridValue}>{analytics.activeProviders}</Text>
              <Text style={styles.gridLabel}>Active Providers</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#F59E0B'}]}>
              <Icon name="time" size={24} color="#F59E0B" />
              <Text style={styles.gridValue}>{analytics.pendingProviders}</Text>
              <Text style={styles.gridLabel}>Pending Approval</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#EF4444'}]}>
              <Icon name="ban" size={24} color="#EF4444" />
              <Text style={styles.gridValue}>{analytics.suspendedProviders}</Text>
              <Text style={styles.gridLabel}>Suspended</Text>
            </View>
          </View>
          
          <View style={styles.clientCard}>
            <Icon name="person" size={24} color="#8B5CF6" />
            <View style={styles.clientInfo}>
              <Text style={styles.clientValue}>{analytics.totalClients}</Text>
              <Text style={styles.clientLabel}>Registered Clients</Text>
            </View>
          </View>
        </View>

        {/* Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jobs Overview</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.gridCard, {borderLeftColor: '#6B7280'}]}>
              <Icon name="briefcase" size={24} color="#6B7280" />
              <Text style={styles.gridValue}>{analytics.totalJobs}</Text>
              <Text style={styles.gridLabel}>Total Jobs</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#10B981'}]}>
              <Icon name="checkmark-done-circle" size={24} color="#10B981" />
              <Text style={styles.gridValue}>{analytics.completedJobs}</Text>
              <Text style={styles.gridLabel}>Completed</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#3B82F6'}]}>
              <Icon name="play-circle" size={24} color="#3B82F6" />
              <Text style={styles.gridValue}>{analytics.inProgressJobs}</Text>
              <Text style={styles.gridLabel}>In Progress</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#F59E0B'}]}>
              <Icon name="hourglass" size={24} color="#F59E0B" />
              <Text style={styles.gridValue}>{analytics.pendingJobs}</Text>
              <Text style={styles.gridLabel}>Pending</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#EF4444'}]}>
              <Icon name="close-circle" size={24} color="#EF4444" />
              <Text style={styles.gridValue}>{analytics.cancelledJobs}</Text>
              <Text style={styles.gridLabel}>Cancelled</Text>
            </View>
            <View style={[styles.gridCard, {borderLeftColor: '#8B5CF6'}]}>
              <Icon name="trending-up" size={24} color="#8B5CF6" />
              <Text style={styles.gridValue}>{analytics.completionRate.toFixed(1)}%</Text>
              <Text style={styles.gridLabel}>Completion Rate</Text>
            </View>
          </View>
        </View>

        {/* Ratings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Ratings</Text>
          <View style={styles.ratingsCard}>
            <View style={styles.ratingMain}>
              <Icon name="star" size={32} color="#F59E0B" />
              <Text style={styles.ratingValue}>{analytics.avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>Average Rating</Text>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingSecondary}>
              <Text style={styles.reviewCount}>{analytics.totalReviews}</Text>
              <Text style={styles.reviewLabel}>Total Reviews</Text>
            </View>
          </View>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminAnalyticsScreen;
