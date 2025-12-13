import React from 'react';
import {View, TouchableOpacity} from 'react-native';
import {cardStyles} from '../css/componentStyles';

const Card = ({
  children,
  onPress,
  variant = 'default',
  elevation = 'medium',
  padding = true,
  style,
}) => {
  const getCardStyle = () => {
    const styles = [cardStyles.card];
    
    if (variant === 'outlined') styles.push(cardStyles.cardOutlined);
    if (variant === 'elevated') styles.push(cardStyles.cardElevated);
    
    if (elevation === 'none') styles.push(cardStyles.cardElevationNone);
    if (elevation === 'low') styles.push(cardStyles.cardElevationLow);
    if (elevation === 'high') styles.push(cardStyles.cardElevationHigh);
    
    if (!padding) styles.push(cardStyles.cardNoPadding);
    if (style) styles.push(style);
    
    return styles;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={getCardStyle()}
        onPress={onPress}
        activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={getCardStyle()}>{children}</View>;
};

export default Card;
