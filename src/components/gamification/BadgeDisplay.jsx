import React from 'react';
import {View, Text, TouchableOpacity, Modal, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../context/ThemeContext';

// Single badge component
export const Badge = ({badge, size = 'medium', showName = true, onPress}) => {
  const {isDark, theme} = useTheme();
  
  const sizes = {
    small: {icon: 16, container: 28, fontSize: 10},
    medium: {icon: 20, container: 36, fontSize: 12},
    large: {icon: 28, container: 48, fontSize: 14},
  };
  
  const s = sizes[size] || sizes.medium;

  const content = (
    <View style={{alignItems: 'center', marginHorizontal: 4}}>
      <View style={{
        width: s.container,
        height: s.container,
        borderRadius: s.container / 2,
        backgroundColor: badge.color + '20',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: badge.color,
      }}>
        <Icon name={badge.icon} size={s.icon} color={badge.color} />
      </View>
      {showName && (
        <Text style={{
          fontSize: s.fontSize,
          color: isDark ? theme.colors.textSecondary : '#6B7280',
          marginTop: 4,
          textAlign: 'center',
          maxWidth: 60,
        }} numberOfLines={2}>
          {badge.name}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
};

// Horizontal badge list
export const BadgeList = ({badges = [], maxDisplay = 4, size = 'small', onViewAll}) => {
  const {isDark, theme} = useTheme();
  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  if (badges.length === 0) return null;

  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      {displayBadges.map((badge, index) => (
        <Badge key={badge.id || index} badge={badge} size={size} showName={false} />
      ))}
      {remaining > 0 && (
        <TouchableOpacity 
          onPress={onViewAll}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isDark ? theme.colors.border : '#E5E7EB',
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 4,
          }}>
          <Text style={{fontSize: 10, color: isDark ? theme.colors.text : '#374151', fontWeight: '600'}}>
            +{remaining}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Badge detail modal
export const BadgeModal = ({visible, badge, onClose}) => {
  const {isDark, theme} = useTheme();

  if (!badge) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}
        activeOpacity={1}
        onPress={onClose}>
        <View style={{
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          width: '80%',
          alignItems: 'center',
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: badge.color + '20',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: badge.color,
            marginBottom: 16,
          }}>
            <Icon name={badge.icon} size={40} color={badge.color} />
          </View>
          <Text style={{fontSize: 20, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8}}>
            {badge.name}
          </Text>
          <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', textAlign: 'center'}}>
            {badge.description}
          </Text>
          <TouchableOpacity
            style={{marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: badge.color, borderRadius: 8}}
            onPress={onClose}>
            <Text style={{color: '#FFFFFF', fontWeight: '600'}}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default Badge;
