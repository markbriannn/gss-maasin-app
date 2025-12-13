import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import paymentService from '../../services/paymentService';
import { globalStyles } from '../../css/globalStyles';
import { paymentStyles } from '../../styles/paymentStyles';

/**
 * TransactionHistoryScreen - View all transactions and payments
 */
export const TransactionHistoryScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { type = 'all' } = route.params || {}; // 'charge', 'payout', 'refund', or 'all'

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(type);

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const result = await paymentService.getTransactionHistory(user?.id, 50);

      if (result.success) {
        let filtered = result.transactions || [];

        // Apply filter
        if (filter !== 'all') {
          filtered = filtered.filter(t => t.type === filter);
        }

        setTransactions(filtered);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'charge':
        return { name: 'arrow-up-right', color: '#E74C3C' };
      case 'payout':
        return { name: 'arrow-down-left', color: '#27AE60' };
      case 'refund':
        return { name: 'rotate-ccw', color: '#F39C12' };
      default:
        return { name: 'arrow-right', color: '#95A5A6' };
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'charge':
        return 'Payment Received';
      case 'payout':
        return 'Payout Sent';
      case 'refund':
        return 'Refund';
      default:
        return 'Transaction';
    }
  };

  const getTransactionAmount = (transaction) => {
    if (transaction.type === 'charge') {
      return `+₱${transaction.amount.toFixed(2)}`;
    } else if (transaction.type === 'payout') {
      return `-₱${transaction.amount.toFixed(2)}`;
    } else {
      return `±₱${transaction.amount.toFixed(2)}`;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderTransaction = ({ item }) => {
    const icon = getTransactionIcon(item.type);
    const label = getTransactionLabel(item.type);
    const amount = getTransactionAmount(item);
    const amountColor = item.type === 'charge' ? '#27AE60' : '#E74C3C';

    return (
      <TouchableOpacity style={paymentStyles.transactionItem}>
        <View style={paymentStyles.transactionIconContainer}>
          <FeatherIcon
            name={icon.name}
            size={20}
            color={icon.color}
          />
        </View>

        <View style={paymentStyles.transactionDetails}>
          <Text style={paymentStyles.transactionLabel}>{label}</Text>
          <Text style={paymentStyles.transactionDate}>{formatDate(item.createdAt)}</Text>
          {item.description && (
            <Text style={paymentStyles.transactionDescription}>{item.description}</Text>
          )}
        </View>

        <View style={paymentStyles.transactionAmount}>
          <Text style={[paymentStyles.transactionAmountText, { color: amountColor }]}>
            {amount}
          </Text>
          <FeatherIcon
            name={item.status === 'completed' ? 'check' : 'clock'}
            size={16}
            color={item.status === 'completed' ? '#27AE60' : '#F39C12'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.centerContainer]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {/* Header */}
      <View style={paymentStyles.header}>
        <Text style={paymentStyles.headerTitle}>Transaction History</Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={paymentStyles.filterScroll}
      >
        {['all', 'charge', 'payout', 'refund'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              paymentStyles.filterButton,
              filter === filterType && paymentStyles.filterButtonActive,
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text
              style={[
                paymentStyles.filterButtonText,
                filter === filterType && paymentStyles.filterButtonTextActive,
              ]}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transactions List */}
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={paymentStyles.transactionsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <View style={paymentStyles.emptyState}>
          <FeatherIcon name="inbox" size={48} color="#BDC3C7" />
          <Text style={paymentStyles.emptyStateText}>No transactions found</Text>
          <Text style={paymentStyles.emptyStateSubtext}>
            Your transactions will appear here
          </Text>
        </View>
      )}

      {/* Summary Footer */}
      {transactions.length > 0 && (
        <View style={paymentStyles.summaryFooter}>
          <View style={paymentStyles.summaryItem}>
            <Text style={paymentStyles.summaryLabel}>Total Amount</Text>
            <Text style={paymentStyles.summaryAmount}>
              ₱{transactions
                .reduce((sum, t) => sum + (t.amount || 0), 0)
                .toFixed(2)}
            </Text>
          </View>
          <View style={paymentStyles.summaryDivider} />
          <View style={paymentStyles.summaryItem}>
            <Text style={paymentStyles.summaryLabel}>Transactions</Text>
            <Text style={paymentStyles.summaryAmount}>{transactions.length}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default TransactionHistoryScreen;
