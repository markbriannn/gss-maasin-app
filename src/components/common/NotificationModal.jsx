/**
 * iOS/MIUI Style Notification Banner
 * Clean, minimal design like native system notifications
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24);

// Notification type configurations
const NOTIFICATION_TYPES = {
  job_accepted: {icon: 'checkmark-circle', color: '#34C759'},
  job_cancelled: {icon: 'close-circle', color: '#FF3B30'},
  provider_traveling: {icon: 'car', color: '#007AFF'},
  provider_arrived: {icon: 'location', color: '#AF52DE'},
  job_started: {icon: 'construct', color: '#FF9500'},
  job_completed: {icon: 'checkmark-done-circle', color: '#34C759'},
  payment_received: {icon: 'card', color: '#34C759'},
  payment_released: {icon: 'wallet', color: '#34C759'},
  new_booking: {icon: 'briefcase', color: '#5856D6'},
  booking_approved: {icon: 'shield-checkmark', color: '#34C759'},
  booking_rejected: {icon: 'shield-half', color: '#FF3B30'},
  message: {icon: 'chatbubble', color: '#007AFF'},
  new_message: {icon: 'chatbubble', color: '#007AFF'},
  default: {icon: 'notifications', color: '#8E8E93'},
};

const NotificationModal = ({
  visible,
  type = 'default',
  title,
  message,
  image,
  onPress,
  onClose,
  autoClose = true,
  autoCloseDelay = 4000,
}) => {
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.default;
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        const timer = setTimeout(() => handleDismiss(), autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  };

  const handlePress = () => {
    handleDismiss();
    setTimeout(() => onPress?.(), 250);
  };

  if (!visible) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.banner, {transform: [{translateY}], opacity}]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          style={styles.touchable}>
          
          {/* App icon + name + time row */}
          <View style={styles.headerRow}>
            <View style={styles.appInfo}>
              <View style={styles.appIconBox}>
                <Text style={styles.appIconText}>G</Text>
              </View>
              <Text style={styles.appName}>GSS MAASIN</Text>
            </View>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>

          {/* Content row */}
          <View style={styles.contentRow}>
            {image ? (
              <Image source={{uri: image}} style={styles.avatar} />
            ) : (
              <View style={[styles.iconBox, {backgroundColor: config.color + '15'}]}>
                <Icon name={config.icon} size={22} color={config.color} />
              </View>
            )}
            <View style={styles.textBox}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.message} numberOfLines={2}>{message}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: 12,
  },
  banner: {
    backgroundColor: 'rgba(250, 250, 250, 0.97)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  touchable: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  appIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  appName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 18,
    opacity: 0.8,
  },
});

export default NotificationModal;
