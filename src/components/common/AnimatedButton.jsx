import React, {useRef} from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Try to import haptic feedback, fallback gracefully if not available
let ReactNativeHapticFeedback;
try {
  ReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
} catch (e) {
  ReactNativeHapticFeedback = null;
}

const triggerHaptic = (type = 'impactLight') => {
  if (ReactNativeHapticFeedback && Platform.OS === 'ios') {
    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };
    ReactNativeHapticFeedback.trigger(type, options);
  }
};

const AnimatedButton = ({
  onPress,
  title,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary', // primary, secondary, outline, danger, success
  size = 'medium', // small, medium, large
  haptic = true,
  animationType = 'scale', // scale, bounce, none
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    if (animationType === 'scale') {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    } else if (animationType === 'bounce') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 12,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    if (animationType !== 'none') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic) triggerHaptic('impactLight');
    onPress?.();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: styles.secondaryButton,
          text: styles.secondaryText,
        };
      case 'outline':
        return {
          button: styles.outlineButton,
          text: styles.outlineText,
        };
      case 'danger':
        return {
          button: styles.dangerButton,
          text: styles.dangerText,
        };
      case 'success':
        return {
          button: styles.successButton,
          text: styles.successText,
        };
      default:
        return {
          button: styles.primaryButton,
          text: styles.primaryText,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: styles.smallButton,
          text: styles.smallText,
          icon: 16,
        };
      case 'large':
        return {
          button: styles.largeButton,
          text: styles.largeText,
          icon: 24,
        };
      default:
        return {
          button: styles.mediumButton,
          text: styles.mediumText,
          icon: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Animated.View style={{transform: [{scale: scaleAnim}]}}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[
          styles.button,
          variantStyles.button,
          sizeStyles.button,
          disabled && styles.disabledButton,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'outline' ? '#00B14F' : '#FFFFFF'}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Icon
                name={icon}
                size={sizeStyles.icon}
                color={variant === 'outline' ? '#00B14F' : '#FFFFFF'}
                style={styles.iconLeft}
              />
            )}
            <Text
              style={[
                styles.text,
                variantStyles.text,
                sizeStyles.text,
                disabled && styles.disabledText,
                textStyle,
              ]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Icon
                name={icon}
                size={sizeStyles.icon}
                color={variant === 'outline' ? '#00B14F' : '#FFFFFF'}
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Icon-only animated button
export const AnimatedIconButton = ({
  onPress,
  icon,
  size = 44,
  iconSize = 24,
  color = '#1F2937',
  backgroundColor = 'transparent',
  haptic = true,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) triggerHaptic('impactLight');
    onPress?.();
  };

  return (
    <Animated.View style={{transform: [{scale: scaleAnim}]}}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        }}>
        <Icon name={icon} size={iconSize} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  text: {
    fontWeight: '600',
  },
  // Variants
  primaryButton: {
    backgroundColor: '#00B14F',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    color: '#1F2937',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00B14F',
  },
  outlineText: {
    color: '#00B14F',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  successText: {
    color: '#FFFFFF',
  },
  // Sizes
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallText: {
    fontSize: 13,
  },
  mediumButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  mediumText: {
    fontSize: 15,
  },
  largeButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  largeText: {
    fontSize: 17,
  },
  // States
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  // Icons
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default AnimatedButton;
