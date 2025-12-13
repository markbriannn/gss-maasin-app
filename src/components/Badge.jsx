import React from 'react';
import {View, Text} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {badgeStyles} from '../css/componentStyles';

const Badge = ({
  text,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
}) => {
  const getBadgeStyle = () => {
    const styles = [badgeStyles.badge];
    
    if (variant === 'primary') styles.push(badgeStyles.badgePrimary);
    if (variant === 'success') styles.push(badgeStyles.badgeSuccess);
    if (variant === 'warning') styles.push(badgeStyles.badgeWarning);
    if (variant === 'danger') styles.push(badgeStyles.badgeDanger);
    if (variant === 'info') styles.push(badgeStyles.badgeInfo);
    if (variant === 'gray') styles.push(badgeStyles.badgeGray);
    
    if (size === 'small') styles.push(badgeStyles.badgeSmall);
    if (size === 'large') styles.push(badgeStyles.badgeLarge);
    
    if (style) styles.push(style);
    
    return styles;
  };

  const getTextStyle = () => {
    const styles = [badgeStyles.badgeText];
    
    if (size === 'small') styles.push(badgeStyles.badgeTextSmall);
    if (size === 'large') styles.push(badgeStyles.badgeTextLarge);
    
    return styles;
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary': return '#00B14F';
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'danger': return '#EF4444';
      case 'info': return '#3B82F6';
      case 'gray': return '#6B7280';
      default: return '#00B14F';
    }
  };

  return (
    <View style={getBadgeStyle()}>
      {icon && (
        <Icon
          name={icon}
          size={size === 'small' ? 10 : size === 'large' ? 14 : 12}
          color={getIconColor()}
          style={badgeStyles.badgeIcon}
        />
      )}
      <Text style={getTextStyle()}>{text}</Text>
    </View>
  );
};

export default Badge;
