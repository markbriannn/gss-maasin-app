import React from 'react';
import {View, Text} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../context/ThemeContext';
import {formatPoints, getTierProgress, getNextTier} from '../../utils/gamification';

// Compact tier badge (for cards, headers)
export const TierBadge = ({tier, size = 'medium'}) => {
  if (!tier) return null;
  
  const sizes = {
    small: {padding: 4, paddingH: 8, fontSize: 10, icon: 12},
    medium: {padding: 6, paddingH: 10, fontSize: 12, icon: 14},
    large: {padding: 8, paddingH: 14, fontSize: 14, icon: 18},
  };
  
  const s = sizes[size] || sizes.medium;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tier.color + '20',
      paddingVertical: s.padding,
      paddingHorizontal: s.paddingH,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: tier.color,
    }}>
      <Icon name={tier.icon} size={s.icon} color={tier.color} />
      <Text style={{
        fontSize: s.fontSize,
        fontWeight: '600',
        color: tier.color,
        marginLeft: 4,
      }}>
        {tier.name}
      </Text>
    </View>
  );
};

// Full tier card with progress
export const TierCard = ({points = 0, isProvider = false, showProgress = true}) => {
  const {isDark, theme} = useTheme();
  const progress = getTierProgress(points, isProvider);
  const nextTierInfo = getNextTier(points, isProvider);
  
  const currentTier = isProvider 
    ? require('../../utils/gamification').getProviderTier(points)
    : require('../../utils/gamification').getClientTier(points);

  return (
    <View style={{
      backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.border : '#E5E7EB',
    }}>
      {/* Header */}
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: currentTier.color + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Icon name={currentTier.icon} size={24} color={currentTier.color} />
          </View>
          <View>
            <Text style={{fontSize: 16, fontWeight: '700', color: currentTier.color}}>
              {currentTier.name}
            </Text>
            <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
              Current Tier
            </Text>
          </View>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937'}}>
            {formatPoints(points)}
          </Text>
          <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
            points
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      {showProgress && !nextTierInfo.isMaxTier && (
        <View>
          <View style={{
            height: 8,
            backgroundColor: isDark ? theme.colors.border : '#E5E7EB',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: currentTier.color,
              borderRadius: 4,
            }} />
          </View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 6}}>
            <Text style={{fontSize: 11, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
              {progress}% to {nextTierInfo.tier?.name}
            </Text>
            <Text style={{fontSize: 11, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>
              {formatPoints(nextTierInfo.pointsNeeded)} pts needed
            </Text>
          </View>
        </View>
      )}

      {nextTierInfo.isMaxTier && (
        <View style={{
          backgroundColor: currentTier.color + '15',
          padding: 10,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Icon name="trophy" size={18} color={currentTier.color} />
          <Text style={{fontSize: 12, color: currentTier.color, marginLeft: 8, fontWeight: '500'}}>
            You've reached the highest tier!
          </Text>
        </View>
      )}

      {/* Benefits */}
      {currentTier.benefits && currentTier.benefits.length > 0 && (
        <View style={{marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? theme.colors.border : '#E5E7EB'}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#6B7280', marginBottom: 8}}>
            Your Benefits
          </Text>
          {currentTier.benefits.map((benefit, index) => (
            <View key={index} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
              <Icon name="checkmark-circle" size={14} color="#10B981" />
              <Text style={{fontSize: 12, color: isDark ? theme.colors.text : '#374151', marginLeft: 6}}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default TierBadge;
