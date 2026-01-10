/**
 * Success Modal with animated checkmark
 * Premium design with glassmorphism and smooth animations
 * Now uses LinearGradient for enhanced visuals
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const SuccessModal = ({
  visible,
  title = 'Success!',
  message = 'Action completed successfully',
  buttonText = 'Continue',
  onClose,
  autoClose = true,
  autoCloseDelay = 2500,
  variant = 'success', // success, error, warning, info
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Variant configurations
  const variants = {
    success: {
      icon: 'checkmark',
      colors: ['#10B981', '#059669'],
      bgColor: '#10B981',
    },
    error: {
      icon: 'close',
      colors: ['#EF4444', '#DC2626'],
      bgColor: '#EF4444',
    },
    warning: {
      icon: 'warning',
      colors: ['#F59E0B', '#D97706'],
      bgColor: '#F59E0B',
    },
    info: {
      icon: 'information',
      colors: ['#3B82F6', '#2563EB'],
      bgColor: '#3B82F6',
    },
  };

  const config = variants[variant] || variants.success;

  useEffect(() => {
    if (visible) {
      // Haptic feedback (wrapped in try-catch)
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate(variant === 'error' ? [0, 50, 50, 50] : 50);
        } catch (e) {
          // Vibration permission not granted, ignore
        }
      }

      // Reset animations
      scaleAnim.setValue(0);
      checkAnim.setValue(0);
      fadeAnim.setValue(0);
      rotateAnim.setValue(0);

      // Start animations
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(checkAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 8,
            bounciness: 12,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto close
      if (autoClose && onClose) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const iconRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
            },
          ]}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.gradient}>
            
            {/* Success Circle */}
            <View style={styles.circleContainer}>
              <Animated.View
                style={[
                  styles.circleWrapper,
                  {
                    transform: [
                      {scale: Animated.multiply(checkAnim, pulseAnim)},
                      {rotate: variant === 'success' ? iconRotation : '0deg'},
                    ],
                  },
                ]}>
                <LinearGradient
                  colors={config.colors}
                  style={styles.circle}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}>
                  <Icon name={config.icon} size={50} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              
              {/* Ripple effect */}
              <Animated.View
                style={[
                  styles.ripple,
                  {
                    backgroundColor: config.bgColor,
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: [0.3, 0],
                    }),
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [1, 1.1],
                          outputRange: [1, 1.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={onClose}
              activeOpacity={0.8}>
              <LinearGradient
                colors={config.colors}
                style={styles.button}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}>
                <Text style={styles.buttonText}>{buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 25,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  circleContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrapper: {
    zIndex: 2,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  ripple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default SuccessModal;
