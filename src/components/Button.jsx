import React from 'react';
import {TouchableOpacity, Text, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {buttonStyles} from '../css/componentStyles';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    const styles = [buttonStyles.button];
    
    if (variant === 'primary') styles.push(buttonStyles.buttonPrimary);
    if (variant === 'secondary') styles.push(buttonStyles.buttonSecondary);
    if (variant === 'outline') styles.push(buttonStyles.buttonOutline);
    if (variant === 'danger') styles.push(buttonStyles.buttonDanger);
    if (variant === 'ghost') styles.push(buttonStyles.buttonGhost);
    
    if (size === 'small') styles.push(buttonStyles.buttonSmall);
    if (size === 'large') styles.push(buttonStyles.buttonLarge);
    
    if (disabled) styles.push(buttonStyles.buttonDisabled);
    if (fullWidth) styles.push(buttonStyles.buttonFullWidth);
    if (style) styles.push(style);
    
    return styles;
  };

  const getTextStyle = () => {
    const styles = [buttonStyles.buttonText];
    
    if (variant === 'primary') styles.push(buttonStyles.buttonTextPrimary);
    if (variant === 'secondary') styles.push(buttonStyles.buttonTextSecondary);
    if (variant === 'outline') styles.push(buttonStyles.buttonTextOutline);
    if (variant === 'danger') styles.push(buttonStyles.buttonTextDanger);
    if (variant === 'ghost') styles.push(buttonStyles.buttonTextGhost);
    
    if (size === 'small') styles.push(buttonStyles.buttonTextSmall);
    if (size === 'large') styles.push(buttonStyles.buttonTextLarge);
    
    if (textStyle) styles.push(textStyle);
    
    return styles;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#00B14F'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#00B14F'}
              style={buttonStyles.iconLeft}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#00B14F'}
              style={buttonStyles.iconRight}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
