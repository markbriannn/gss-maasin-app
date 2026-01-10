/**
 * Clean iOS-Style Alert Modal
 * Minimal, professional design
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Variant configurations
const VARIANTS = {
  success: {
    icon: 'checkmark-circle',
    color: '#34C759',
    bgColor: '#F0FDF4',
  },
  error: {
    icon: 'close-circle',
    color: '#FF3B30',
    bgColor: '#FEF2F2',
  },
  warning: {
    icon: 'warning',
    color: '#FF9500',
    bgColor: '#FFFBEB',
  },
  info: {
    icon: 'information-circle',
    color: '#007AFF',
    bgColor: '#EFF6FF',
  },
  confirm: {
    icon: 'help-circle',
    color: '#5856D6',
    bgColor: '#F5F3FF',
  },
  payment: {
    icon: 'card',
    color: '#34C759',
    bgColor: '#F0FDF4',
  },
};

const PremiumModal = ({
  visible,
  variant = 'success',
  title,
  message,
  primaryButton,
  secondaryButton,
  onClose,
  autoClose = false,
  autoCloseDelay = 3000,
}) => {
  const config = VARIANTS[variant] || VARIANTS.success;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        const timer = setTimeout(() => onClose?.(), autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, {transform: [{scale}], opacity}]}>
          
          {/* Icon */}
          <View style={[styles.iconContainer, {backgroundColor: config.bgColor}]}>
            <Icon name={config.icon} size={32} color={config.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {secondaryButton && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  handleClose();
                  secondaryButton.onPress?.();
                }}
                activeOpacity={0.7}>
                <Text style={styles.secondaryButtonText}>
                  {secondaryButton.text || 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {backgroundColor: config.color},
                secondaryButton && {flex: 1, marginLeft: 8},
              ]}
              onPress={() => {
                handleClose();
                primaryButton?.onPress?.();
              }}
              activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>
                {primaryButton?.text || 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default PremiumModal;
