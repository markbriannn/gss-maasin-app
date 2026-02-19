import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function ProviderAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const { isDark, theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyEarnings: 0,
    monthlyGoal: 15000,
    jobsCompleted: 0,
    averageRating: 0,
    responseTime: 0,
    completionRate: 0,
    repeatClients: 0,
  });
  const [earningsData, setEarningsData] = useState([]);
  const [peakHours, setPeakHours] = useState({
    weekdays: 0,
    weekends: 0,
    bestTime: '',
    slowestTime: '',
  });

  useEffect(() => {
    if (!user?.uid) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Listen to bookings for analytics
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      let monthlyEarnings = 0;
      let totalJobs = 0;
      let totalRating = 0;
      let ratedJobs = 0;
      let completedJobs = 0;
      let totalJobs30Days = 0;
      const clientSet = new Set();
      const repeatClientSet = new Set();
      const earningsByDay = {};
      const hourCounts = Array(24).fill(0);
      const weekdayCount = { weekday: 0, weekend: 0 };

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const completedDate = data.completedAt?.toDate?.() || data.updatedAt?.toDate?.();

        // Monthly earnings (current month)
        if (
          (data.status === 'completed' || data.status === 'payment_received') &&
          completedDate >= startOfMonth
        ) {
          const amount = data.providerPrice || data.totalAmount || data.price || 0;
          const additionalCharges = (data.additionalCharges || [])
            .filter((c) => c.status === 'approved')
            .reduce((sum, c) => sum + (c.total || c.amount || 0), 0);
          monthlyEarnings += amount + additionalCharges - (data.discount || 0);
        }

        // Total completed jobs
        if (data.status === 'completed' || data.status === 'payment_received') {
          completedJobs++;
          totalJobs++;

          // Track clients for repeat analysis
          if (data.clientId) {
            if (clientSet.has(data.clientId)) {
              repeatClientSet.add(data.clientId);
            }
            clientSet.add(data.clientId);
          }

          // Earnings trend (last 30 days)
          if (completedDate >= thirtyDaysAgo) {
            totalJobs30Days++;
            const dayKey = completedDate.toLocaleDateString();
            const amount = data.providerPrice || data.totalAmount || data.price || 0;
            earningsByDay[dayKey] = (earningsByDay[dayKey] || 0) + amount;

            // Peak hours analysis
            const hour = completedDate.getHours();
            hourCounts[hour]++;
            const dayOfWeek = completedDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              weekdayCount.weekend++;
            } else {
              weekdayCount.weekday++;
            }
          }
        }

        // All jobs for completion rate
        if (
          ['completed', 'payment_received', 'cancelled', 'rejected'].includes(data.status)
        ) {
          totalJobs++;
        }

        // Average rating
        if (data.reviewRating || data.rating) {
          totalRating += data.reviewRating || data.rating;
          ratedJobs++;
        }
      });

      // Calculate stats
      const avgRating = ratedJobs > 0 ? totalRating / ratedJobs : 0;
      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const repeatClients = repeatClientSet.size;

      // Find peak hours
      const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
      const minHour = hourCounts.indexOf(Math.min(...hourCounts.filter((c) => c > 0)));
      const formatHour = (h) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12} ${period}`;
      };

      // Prepare earnings chart data (last 7 days)
      const last7Days = [];
      const earningsLast7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayKey = date.toLocaleDateString();
        last7Days.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          amount: earningsByDay[dayKey] || 0,
        });
        earningsLast7Days.push(earningsByDay[dayKey] || 0);
      }

      setStats({
        monthlyEarnings,
        monthlyGoal: 15000,
        jobsCompleted: completedJobs,
        averageRating: avgRating,
        responseTime: 12, // Placeholder - would need to calculate from message timestamps
        completionRate,
        repeatClients,
      });

      setEarningsData(last7Days);

      setPeakHours({
        weekdays: weekdayCount.weekday,
        weekends: weekdayCount.weekend,
        bestTime: maxHour >= 0 ? `${formatHour(maxHour)}-${formatHour(maxHour + 1)}` : 'N/A',
        slowestTime: minHour >= 0 ? `${formatHour(minHour)}-${formatHour(minHour + 1)}` : 'N/A',
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      </SafeAreaView>
    );
  }

  const goalProgress = (stats.monthlyEarnings / stats.monthlyGoal) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Monthly Earnings Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <Icon name="wallet" size={24} color="#00B14F" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your Earnings This Month</Text>
          </View>
          <Text style={styles.earningsAmount}>₱{stats.monthlyEarnings.toLocaleString()}</Text>
          <Text style={styles.earningsChange}>
            🎯 Goal: ₱{stats.monthlyGoal.toLocaleString()} ({Math.round(goalProgress)}% reached)
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(goalProgress, 100)}%` }]} />
          </View>
        </View>

        {/* Performance Stats */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <Icon name="stats-chart" size={24} color="#00B14F" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Your Stats</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Jobs Completed</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.jobsCompleted}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Average Rating</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {stats.averageRating.toFixed(1)} ⭐
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Response Time</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.responseTime} min</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completion Rate</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {stats.completionRate.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Repeat Clients</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {stats.repeatClients}
              </Text>
            </View>
          </View>
        </View>

        {/* Earnings Trend */}
        {earningsData.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.cardHeader}>
              <Icon name="trending-up" size={24} color="#00B14F" />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Earnings Trend (Last 7 Days)</Text>
            </View>
            <View style={styles.barChartContainer}>
              {earningsData.map((item, index) => {
                const maxAmount = Math.max(...earningsData.map(d => d.amount), 1);
                const heightPercent = (item.amount / maxAmount) * 100;
                return (
                  <View key={index} style={styles.barChartItem}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: '#00B14F',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                      {item.day}
                    </Text>
                    <Text style={[styles.barValue, { color: theme.colors.text }]}>
                      ₱{item.amount > 0 ? item.amount.toLocaleString() : '0'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Peak Hours */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <Icon name="time" size={24} color="#00B14F" />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>When You Get Most Bookings</Text>
          </View>
          <View style={styles.peakHoursGrid}>
            <View style={styles.peakHourItem}>
              <Text style={[styles.peakHourLabel, { color: theme.colors.textSecondary }]}>Monday-Friday</Text>
              <Text style={[styles.peakHourValue, { color: theme.colors.text }]}>{peakHours.weekdays} jobs</Text>
            </View>
            <View style={styles.peakHourItem}>
              <Text style={[styles.peakHourLabel, { color: theme.colors.textSecondary }]}>Weekends</Text>
              <Text style={[styles.peakHourValue, { color: theme.colors.text }]}>{peakHours.weekends} jobs</Text>
            </View>
            <View style={styles.peakHourItem}>
              <Text style={[styles.peakHourLabel, { color: theme.colors.textSecondary }]}>Best Time</Text>
              <Text style={[styles.peakHourValue, { color: theme.colors.text }]}>{peakHours.bestTime}</Text>
            </View>
            <View style={styles.peakHourItem}>
              <Text style={[styles.peakHourLabel, { color: theme.colors.textSecondary }]}>Slowest Time</Text>
              <Text style={[styles.peakHourValue, { color: theme.colors.text }]}>{peakHours.slowestTime}</Text>
            </View>
          </View>
          <View style={styles.tipBox}>
            <Icon name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.tipText}>
              Stay online on weekends afternoon for more bookings!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00B14F',
    marginBottom: 8,
  },
  earningsChange: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B14F',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  barChartItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  peakHoursGrid: {
    marginBottom: 16,
  },
  peakHourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  peakHourLabel: {
    fontSize: 14,
  },
  peakHourValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
});
