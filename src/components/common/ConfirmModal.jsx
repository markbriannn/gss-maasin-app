/**
 * Clean iOS-Style Confirm Modal
 * Minimal, professional design for confirmations
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Type configurations
const TYPES = {
  confirm: {
    icon: 'help-circle',
    color: '#007AFF',
    bgColor: '#EFF6FF',
  },
  delete: {
    icon: 'trash',
    color: '#FF3B30',
    bgColor: '#FEF2F2',
  },
  cancel: {
    icon: 'close-circle',
    color: '#FF9500',
    bgColor: '#FFFBEB',
  },
  logout: {
    icon: 'log-out',
    color: '#FF3B30',
    bgColor: '#FEF2F2',
  },
  approve: {
    icon: 'checkmark-circle',
    color: '#34C759',
    bgColor: '#F0FDF4',
  },
  reject: {
    icon: 'close-circle',
    color: '#FF3B30',
    bgColor: '#FEF2F2',
  },
};

const ConfirmModal = ({
  visible,
  type = 'confirm',
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false,
  destructive = false,
}) => {
  const config = TYPES[type] || TYPES.confirm;
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
    }
  }, [visible]);

  const buttonColor = destructive ? '#FF3B30' : config.color;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, {transform: [{scale}], opacity}]}>
          
          {/* Icon */}
          <View style={[styles.iconContainer, {backgroundColor: config.bgColor}]}>
            <Icon name={config.icon} size={28} color={config.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isLoading}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>
                {cancelText || 'Cancel'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, {backgroundColor: buttonColor}]}
              onPress={onConfirm}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {confirmText || 'Confirm'}
                </Text>
              )}
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
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
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
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ConfirmModal;
