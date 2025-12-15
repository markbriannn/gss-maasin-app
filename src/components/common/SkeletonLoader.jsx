import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet} from 'react-native';
import {useTheme} from '../../context/ThemeContext';

// Base skeleton component with shimmer animation
const SkeletonBase = ({width, height, borderRadius = 4, style}) => {
  const {isDark, theme} = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? theme.colors.surface : '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
};

// Job/Booking card skeleton
export const JobCardSkeleton = () => {
  const {isDark, theme} = useTheme();
  return (
    <View style={[styles.card, isDark && {backgroundColor: theme.colors.surface}]}>
      <View style={styles.cardHeader}>
        <SkeletonBase width={60} height={60} borderRadius={30} />
        <View style={styles.cardHeaderText}>
          <SkeletonBase width={150} height={18} />
          <SkeletonBase width={100} height={14} style={{marginTop: 8}} />
        </View>
        <SkeletonBase width={70} height={24} borderRadius={12} />
      </View>
      <View style={styles.cardBody}>
        <SkeletonBase width="100%" height={14} />
        <SkeletonBase width="80%" height={14} style={{marginTop: 8}} />
      </View>
      <View style={styles.cardFooter}>
        <SkeletonBase width={80} height={20} />
        <SkeletonBase width={100} height={14} />
      </View>
    </View>
  );
};

// Provider card skeleton
export const ProviderCardSkeleton = () => {
  const {isDark, theme} = useTheme();
  return (
    <View style={[styles.card, isDark && {backgroundColor: theme.colors.surface}]}>
      <View style={styles.cardHeader}>
        <SkeletonBase width={50} height={50} borderRadius={25} />
        <View style={styles.cardHeaderText}>
          <SkeletonBase width={120} height={16} />
          <SkeletonBase width={80} height={12} style={{marginTop: 6}} />
          <SkeletonBase width={60} height={12} style={{marginTop: 6}} />
        </View>
        <SkeletonBase width={70} height={24} borderRadius={12} />
      </View>
      <View style={{marginTop: 12}}>
        <SkeletonBase width="100%" height={12} />
        <SkeletonBase width="90%" height={12} style={{marginTop: 6}} />
        <SkeletonBase width="70%" height={12} style={{marginTop: 6}} />
      </View>
    </View>
  );
};

// Message/Conversation skeleton
export const MessageSkeleton = () => {
  const {isDark, theme} = useTheme();
  return (
    <View style={[styles.messageRow, isDark && {borderBottomColor: theme.colors.border}]}>
      <SkeletonBase width={56} height={56} borderRadius={28} />
      <View style={{flex: 1, marginLeft: 12}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <SkeletonBase width={120} height={16} />
          <SkeletonBase width={50} height={12} />
        </View>
        <SkeletonBase width="90%" height={14} style={{marginTop: 8}} />
      </View>
    </View>
  );
};

// Notification skeleton
export const NotificationSkeleton = () => {
  const {isDark, theme} = useTheme();
  return (
    <View style={[styles.notificationRow, isDark && {borderBottomColor: theme.colors.border}]}>
      <SkeletonBase width={44} height={44} borderRadius={22} />
      <View style={{flex: 1, marginLeft: 12}}>
        <SkeletonBase width={180} height={14} />
        <SkeletonBase width="100%" height={12} style={{marginTop: 6}} />
        <SkeletonBase width={80} height={10} style={{marginTop: 6}} />
      </View>
    </View>
  );
};

// Service history skeleton
export const HistoryCardSkeleton = () => {
  const {isDark, theme} = useTheme();
  return (
    <View style={[styles.card, isDark && {backgroundColor: theme.colors.surface}]}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12}}>
        <SkeletonBase width={100} height={14} />
        <SkeletonBase width={70} height={22} borderRadius={11} />
      </View>
      <SkeletonBase width={180} height={18} />
      <SkeletonBase width={120} height={14} style={{marginTop: 8}} />
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 12}}>
        <SkeletonBase width={80} height={20} />
        <SkeletonBase width={100} height={14} />
      </View>
    </View>
  );
};

// Stats card skeleton
export const StatsCardSkeleton = () => {
  const {isDark, theme} = useTheme();
  return (
    <View style={[styles.statsCard, isDark && {backgroundColor: theme.colors.surface}]}>
      <SkeletonBase width={40} height={40} borderRadius={20} />
      <SkeletonBase width={60} height={28} style={{marginTop: 8}} />
      <SkeletonBase width={80} height={12} style={{marginTop: 4}} />
    </View>
  );
};

// List skeleton wrapper
export const ListSkeleton = ({count = 5, ItemComponent = JobCardSkeleton}) => {
  return (
    <View style={{padding: 16}}>
      {Array.from({length: count}).map((_, index) => (
        <ItemComponent key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
});

export default SkeletonBase;
