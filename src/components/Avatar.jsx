import React from 'react';
import {View, Image, Text} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {avatarStyles} from '../css/componentStyles';

const Avatar = ({
  source,
  name,
  size = 'medium',
  variant = 'circle',
  showBadge = false,
  badgeColor = '#10B981',
  style,
}) => {
  const getAvatarStyle = () => {
    const styles = [avatarStyles.avatar];
    
    if (size === 'small') styles.push(avatarStyles.avatarSmall);
    if (size === 'large') styles.push(avatarStyles.avatarLarge);
    if (size === 'xlarge') styles.push(avatarStyles.avatarXLarge);
    
    if (variant === 'rounded') styles.push(avatarStyles.avatarRounded);
    if (variant === 'square') styles.push(avatarStyles.avatarSquare);
    
    if (style) styles.push(style);
    
    return styles;
  };

  const getInitials = () => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 24;
      case 'xlarge': return 32;
      default: return 16;
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small': return 10;
      case 'large': return 16;
      case 'xlarge': return 20;
      default: return 12;
    }
  };

  return (
    <View style={getAvatarStyle()}>
      {source ? (
        <Image source={source} style={avatarStyles.avatarImage} />
      ) : name ? (
        <Text style={[avatarStyles.avatarText, {fontSize: getTextSize()}]}>
          {getInitials()}
        </Text>
      ) : (
        <Icon
          name="person"
          size={getTextSize()}
          color="#FFFFFF"
        />
      )}
      
      {showBadge && (
        <View
          style={[
            avatarStyles.badge,
            {
              width: getBadgeSize(),
              height: getBadgeSize(),
              borderRadius: getBadgeSize() / 2,
              backgroundColor: badgeColor,
            },
          ]}
        />
      )}
    </View>
  );
};

export default Avatar;
