/**
 * iOS-Style Loading Modal
 * Clean, minimal loading overlay with smooth animation
 */

import {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';

const LoadingModal = ({
  visible,
  message = 'Loading...',
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Continuous spin
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();

      // Subtle pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        spin.stop();
        pulse.stop();
      };
    } else {
      fadeValue.setValue(0);
      spinValue.setValue(0);
    }
  }, [visible]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, {opacity: fadeValue}]}>
        <Animated.View style={[styles.container, {transform: [{scale: pulseValue}]}]}>
          {/* iOS-style spinner */}
          <View style={styles.spinnerContainer}>
            <Animated.View style={[styles.spinner, {transform: [{rotate: spin}]}]}>
              <View style={styles.spinnerArc} />
            </Animated.View>
          </View>
          
          {message && <Text style={styles.message}>{message}</Text>}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  spinnerContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  spinner: {
    width: 36,
    height: 36,
  },
  spinnerArc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    borderTopColor: '#00B14F',
  },
  message: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoadingModal;
