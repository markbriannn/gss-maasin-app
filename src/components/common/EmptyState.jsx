import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../context/ThemeContext';

// Predefined empty state configurations
const EMPTY_STATES = {
  bookings: {
    icon: 'calendar-outline',
    title: 'No Bookings Yet',
    message: 'Your bookings will appear here once you book a service.',
    actionText: 'Browse Services',
    color: '#3B82F6',
  },
  messages: {
    icon: 'chatbubbles-outline',
    title: 'No Messages',
    message: 'Start a conversation with a provider or client.',
    actionText: 'Find Providers',
    color: '#10B981',
  },
  notifications: {
    icon: 'notifications-outline',
    title: 'All Caught Up!',
    message: "You don't have any notifications right now.",
    color: '#F59E0B',
  },
  favorites: {
    icon: 'heart-outline',
    title: 'No Favorites Yet',
    message: 'Save your favorite providers for quick access.',
    actionText: 'Explore Providers',
    color: '#EF4444',
  },
  history: {
    icon: 'time-outline',
    title: 'No Service History',
    message: 'Your completed services will appear here.',
    actionText: 'Book a Service',
    color: '#8B5CF6',
  },
  search: {
    icon: 'search-outline',
    title: 'No Results Found',
    message: 'Try adjusting your search or filters.',
    color: '#6B7280',
  },
  providers: {
    icon: 'people-outline',
    title: 'No Providers Found',
    message: 'No providers match your criteria.',
    color: '#00B14F',
  },
  jobs: {
    icon: 'briefcase-outline',
    title: 'No Jobs Found',
    message: 'Jobs will appear here when available.',
    color: '#00B14F',
  },
  reviews: {
    icon: 'star-outline',
    title: 'No Reviews Yet',
    message: 'Reviews from clients will appear here.',
    color: '#F59E0B',
  },
  payments: {
    icon: 'wallet-outline',
    title: 'No Payment Methods',
    message: 'Add a payment method to get started.',
    actionText: 'Add Payment',
    color: '#3B82F6',
  },
  error: {
    icon: 'alert-circle-outline',
    title: 'Something Went Wrong',
    message: 'Please try again later.',
    actionText: 'Retry',
    color: '#EF4444',
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: 'No Internet Connection',
    message: 'Please check your connection and try again.',
    actionText: 'Retry',
    color: '#6B7280',
  },
};

const EmptyState = ({
  type,
  icon,
  title,
  message,
  actionText,
  onAction,
  color,
  compact = false,
}) => {
  const {isDark, theme} = useTheme();
  
  // Use predefined config or custom props
  const config = EMPTY_STATES[type] || {};
  const finalIcon = icon || config.icon || 'help-circle-outline';
  const finalTitle = title || config.title || 'Nothing Here';
  const finalMessage = message || config.message || '';
  const finalActionText = actionText || config.actionText;
  const finalColor = color || config.color || '#6B7280';

  return (
    <View style={[
      styles.container,
      compact && styles.containerCompact,
    ]}>
      {/* Decorative circles */}
      {!compact && (
        <View style={styles.decorativeContainer}>
          <View style={[styles.decorativeCircle, styles.circle1, {backgroundColor: `${finalColor}10`}]} />
          <View style={[styles.decorativeCircle, styles.circle2, {backgroundColor: `${finalColor}08`}]} />
        </View>
      )}
      
      {/* Icon */}
      <View style={[
        styles.iconContainer,
        compact && styles.iconContainerCompact,
        {backgroundColor: `${finalColor}15`},
      ]}>
        <Icon name={finalIcon} size={compact ? 32 : 48} color={finalColor} />
      </View>

      {/* Title */}
      <Text style={[
        styles.title,
        compact && styles.titleCompact,
        isDark && {color: theme.colors.text},
      ]}>
        {finalTitle}
      </Text>

      {/* Message */}
      {finalMessage && (
        <Text style={[
          styles.message,
          compact && styles.messageCompact,
          isDark && {color: theme.colors.textSecondary},
        ]}>
          {finalMessage}
        </Text>
      )}

      {/* Action Button */}
      {finalActionText && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: finalColor}]}
          onPress={onAction}
          activeOpacity={0.8}>
          <Text style={styles.actionButtonText}>{finalActionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  containerCompact: {
    paddingVertical: 24,
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 200,
    height: 200,
  },
  circle2: {
    width: 280,
    height: 280,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainerCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  messageCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EmptyState;
