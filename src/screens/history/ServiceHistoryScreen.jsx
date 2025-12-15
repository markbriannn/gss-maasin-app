import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { globalStyles } from '../../css/globalStyles';
import { historyStyles as styles } from '../../css/historyStyles';
import { SERVICE_CATEGORIES } from '../../config/constants';

const ServiceHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isDark, theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalJobs: 0,
    totalSpent: 0,
    totalEarned: 0,
  });

  const userRole = user?.role?.toUpperCase() || 'CLIENT';
  const isProvider = userRole === 'PROVIDER';

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const periods = [
    { key: 'all', label: 'All Time' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  const sortOptions = [
    { key: 'date_desc', label: 'Newest First', icon: 'arrow-down' },
    { key: 'date_asc', label: 'Oldest First', icon: 'arrow-up' },
    { key: 'amount_desc', label: 'Highest Amount', icon: 'trending-up' },
    { key: 'amount_asc', label: 'Lowest Amount', icon: 'trending-down' },
  ];

  const [sortBy, setSortBy] = useState('date_desc');
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [activeFilter, selectedPeriod, sortBy]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const userId = user?.uid || user?.id;
      if (!userId) return;

      // Build status filter - include payment_received as completed
      let statuses = [];
      if (activeFilter === 'all') {
        statuses = ['completed', 'payment_received', 'cancelled', 'rejected'];
      } else if (activeFilter === 'completed') {
        statuses = ['completed', 'payment_received'];
      } else if (activeFilter === 'cancelled') {
        statuses = ['cancelled', 'rejected'];
      }

      // Query based on user role
      const fieldName = isProvider ? 'providerId' : 'clientId';
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where(fieldName, '==', userId)
      );

      const snapshot = await getDocs(bookingsQuery);
      const historyList = [];
      let totalAmount = 0;
      let jobCount = 0;

      // Calculate period date range
      const now = new Date();
      let periodStart = null;
      if (selectedPeriod === 'week') {
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (selectedPeriod === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (selectedPeriod === 'year') {
        periodStart = new Date(now.getFullYear(), 0, 1);
      }

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Filter by status
        if (!statuses.includes(data.status)) continue;

        // Filter by period
        const completedDate = data.completedAt?.toDate?.() || data.updatedAt?.toDate?.() || new Date();
        if (periodStart && completedDate < periodStart) continue;

        // Get other party info
        let otherParty = { name: 'Unknown', phone: 'N/A' };
        const otherPartyId = isProvider ? data.clientId : data.providerId;
        
        if (otherPartyId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherPartyId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherParty = {
                id: userDoc.id,
                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User',
                phone: userData.phone,
                photo: userData.profilePhoto,
                rating: userData.rating || 0,
              };
            }
          } catch (err) {
            console.log('Error fetching user:', err);
          }
        }

        // Get category info
        const categoryKey = data.serviceCategory?.toLowerCase().replace(/\s+/g, '_');
        const categoryInfo = SERVICE_CATEGORIES.find(
          cat => cat.id === categoryKey || cat.name === data.serviceCategory
        ) || { icon: 'construct', color: '#00B14F' };

        // Calculate amounts
        const baseAmount = data.providerPrice || data.offeredPrice || data.totalAmount || data.price || 0;
        const systemFee = data.systemFee || 0;
        const additionalCharges = data.additionalCharges?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        const finalAmount = baseAmount + additionalCharges;

        if (data.status === 'completed') {
          totalAmount += finalAmount;
          jobCount++;
        }

        historyList.push({
          id: docSnap.id,
          service: data.serviceCategory || 'Service',
          description: data.description || '',
          status: data.status,
          date: completedDate,
          dateString: completedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          timeString: completedDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          otherParty,
          location: data.streetAddress 
            ? `${data.streetAddress}, ${data.barangay || ''}` 
            : data.location || 'N/A',
          amount: finalAmount,
          baseAmount,
          systemFee,
          additionalCharges,
          categoryIcon: categoryInfo.icon,
          categoryColor: categoryInfo.color,
          // Cancellation info
          cancellationReason: data.cancellationReason || data.declineReason || null,
          cancelledBy: data.cancelledBy || data.declinedBy || null,
          // Review info
          reviewed: data.reviewed || false,
          reviewRating: data.reviewRating || null,
          // Full data for receipt
          fullData: {
            ...data,
            id: docSnap.id,
            otherParty,
          },
        });
      }

      // Sort based on selected option
      switch (sortBy) {
        case 'date_asc':
          historyList.sort((a, b) => a.date - b.date);
          break;
        case 'amount_desc':
          historyList.sort((a, b) => b.amount - a.amount);
          break;
        case 'amount_asc':
          historyList.sort((a, b) => a.amount - b.amount);
          break;
        default: // date_desc
          historyList.sort((a, b) => b.date - a.date);
      }

      // Apply search filter
      let filteredList = historyList;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredList = historyList.filter(item =>
          item.service.toLowerCase().includes(query) ||
          item.otherParty.name.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
        );
      }

      setHistory(filteredList);
      setSummary({
        totalJobs: jobCount,
        totalSpent: isProvider ? 0 : totalAmount,
        totalEarned: isProvider ? totalAmount : 0,
      });
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [activeFilter, selectedPeriod]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'cancelled':
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const handleViewReceipt = (item) => {
    navigation.navigate('ServiceReceipt', { 
      booking: item.fullData,
      isProvider 
    });
  };

  // Group history by month
  const groupedHistory = history.reduce((groups, item) => {
    const monthYear = item.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(item);
    return groups;
  }, {});

  const renderHistoryCard = (item) => (
    <TouchableOpacity 
      key={item.id} 
      style={[styles.historyCard, isDark && {backgroundColor: theme.colors.card}]}
      onPress={() => handleViewReceipt(item)}
      activeOpacity={0.7}
    >
      <View style={styles.historyCardHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: item.categoryColor + '20' }]}>
          <Icon name={item.categoryIcon} size={24} color={item.categoryColor} />
        </View>
        <View style={styles.historyCardInfo}>
          <Text style={[styles.serviceName, isDark && {color: theme.colors.text}]}>{item.service}</Text>
          <Text style={[styles.serviceDate, isDark && {color: theme.colors.textSecondary}]}>{item.dateString} at {item.timeString}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.historyCardBody}>
        <View style={styles.personRow}>
          <View style={styles.personAvatar}>
            {item.otherParty.photo ? (
              <Image source={{ uri: item.otherParty.photo }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text style={styles.personAvatarText}>
                {item.otherParty.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.personName, isDark && {color: theme.colors.text}]}>{item.otherParty.name}</Text>
          <Text style={[styles.personRole, isDark && {color: theme.colors.textSecondary}]}>({isProvider ? 'Client' : 'Provider'})</Text>
        </View>

        <View style={styles.locationRow}>
          <Icon name="location-outline" size={16} color={isDark ? theme.colors.textSecondary : '#6B7280'} />
          <Text style={[styles.locationText, isDark && {color: theme.colors.textSecondary}]} numberOfLines={2}>{item.location}</Text>
        </View>

        {/* Cancellation Reason */}
        {(item.status === 'cancelled' || item.status === 'rejected') && item.cancellationReason && (
          <View style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}>
            <Icon name="information-circle" size={16} color="#DC2626" />
            <View style={{marginLeft: 8, flex: 1}}>
              <Text style={{fontSize: 11, color: '#DC2626', fontWeight: '600'}}>
                Cancelled by {item.cancelledBy === 'client' ? 'Client' : 'Provider'}
              </Text>
              <Text style={{fontSize: 12, color: '#991B1B', marginTop: 2}}>
                {item.cancellationReason}
              </Text>
            </View>
          </View>
        )}

        {/* Review Badge */}
        {item.status === 'completed' && item.reviewed && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
          }}>
            <Icon name="star" size={14} color="#F59E0B" />
            <Text style={{fontSize: 12, color: '#92400E', marginLeft: 4}}>
              Rated {item.reviewRating}/5
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.historyCardFooter, isDark && {borderTopColor: theme.colors.border}]}>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountLabel, isDark && {color: theme.colors.textSecondary}]}>{isProvider ? 'Earned:' : 'Paid:'}</Text>
          <Text style={[styles.amountValue, isDark && {color: theme.colors.text}]}>₱{item.amount.toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewReceiptButton}
          onPress={() => handleViewReceipt(item)}
        >
          <Text style={styles.viewReceiptText}>Receipt</Text>
          <Icon name="receipt-outline" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isDark && {backgroundColor: theme.colors.card}]}>
        <Text style={[styles.headerTitle, isDark && {color: theme.colors.text}]}>Service History</Text>
        
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                activeFilter === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === filter.key && styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search Bar with Sort Button */}
      <View style={{flexDirection: 'row', paddingHorizontal: 16, gap: 8}}>
        <View style={[styles.searchContainer, {flex: 1, marginHorizontal: 0}, isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
          <Icon name="search" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
          <TextInput
            style={[styles.searchInput, isDark && {color: theme.colors.text}]}
            placeholder="Search by service, name, or location..."
            placeholderTextColor={isDark ? theme.colors.textSecondary : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadHistory}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadHistory(); }}>
              <Icon name="close-circle" size={20} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
            borderRadius: 12,
            padding: 12,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? theme.colors.border : '#E5E7EB',
          }}
          onPress={() => setShowSortModal(true)}>
          <Icon name="swap-vertical" size={22} color="#00B14F" />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.periodSelector}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary Card */}
      <View style={[styles.summaryCard, isDark && {backgroundColor: theme.colors.card}]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, isDark && {color: theme.colors.text}]}>{summary.totalJobs}</Text>
          <Text style={[styles.summaryLabel, isDark && {color: theme.colors.textSecondary}]}>Total Jobs</Text>
        </View>
        <View style={[styles.summaryDivider, isDark && {backgroundColor: theme.colors.border}]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, isDark && {color: theme.colors.text}]}>
            ₱{(isProvider ? summary.totalEarned : summary.totalSpent).toLocaleString()}
          </Text>
          <Text style={[styles.summaryLabel, isDark && {color: theme.colors.textSecondary}]}>{isProvider ? 'Total Earned' : 'Total Spent'}</Text>
        </View>
      </View>

      {/* History List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B14F" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />
          }
          showsVerticalScrollIndicator={false}
        >
          {history.length > 0 ? (
            Object.entries(groupedHistory).map(([monthYear, items]) => (
              <View key={monthYear}>
                <Text style={[styles.sectionHeader, isDark && {color: theme.colors.textSecondary}]}>{monthYear}</Text>
                {items.map(renderHistoryCard)}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, isDark && {backgroundColor: theme.colors.border}]}>
                <Icon name="time-outline" size={40} color={isDark ? theme.colors.textSecondary : '#9CA3AF'} />
              </View>
              <Text style={[styles.emptyText, isDark && {color: theme.colors.text}]}>No History Found</Text>
              <Text style={[styles.emptySubtext, isDark && {color: theme.colors.textSecondary}]}>
                {searchQuery 
                  ? 'Try a different search term'
                  : `Your ${activeFilter === 'all' ? '' : activeFilter} service history will appear here`
                }
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}>
          <View style={{
            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
          }}>
            <View style={{alignItems: 'center', marginBottom: 16}}>
              <View style={{width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2}} />
            </View>
            <Text style={{fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 16}}>
              Sort By
            </Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? theme.colors.border : '#F3F4F6',
                }}
                onPress={() => {
                  setSortBy(option.key);
                  setShowSortModal(false);
                }}>
                <Icon
                  name={option.icon}
                  size={20}
                  color={sortBy === option.key ? '#00B14F' : (isDark ? theme.colors.textSecondary : '#6B7280')}
                />
                <Text style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 15,
                  color: sortBy === option.key ? '#00B14F' : (isDark ? theme.colors.text : '#1F2937'),
                  fontWeight: sortBy === option.key ? '600' : '400',
                }}>
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Icon name="checkmark-circle" size={22} color="#00B14F" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={() => setShowSortModal(false)}>
              <Text style={{fontSize: 15, fontWeight: '600', color: '#6B7280'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ServiceHistoryScreen;
