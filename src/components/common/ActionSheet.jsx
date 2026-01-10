/**
 * Action Sheet Component
 * Beautiful bottom sheet for action selections
 * iOS-style action sheet with smooth animations
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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ActionSheet = ({
  visible,
  title,
  message,
  actions = [],
  cancelText = 'Cancel',
  onCancel,
  destructiveIndex,
}) => {
  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;
  const itemAnims = useRef(actions.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      backdropAnim.setValue(0);
      slideAnim.setValue(400);
      itemAnims.forEach(anim => anim.setValue(0));

      // Entrance animations
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }),
      ]).start();

      // Staggered item animations
      itemAnims.forEach((anim, index) => {
        setTimeout(() => {
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 15,
            bounciness: 4,
          }).start();
        }, 50 + index * 50);
      });
    }
  }, [visible, actions.length]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onCancel?.();
    });
  };

  const handleAction = (action, index) => {
    handleClose();
    setTimeout(() => {
      action.onPress?.();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Animated.View style={[styles.overlay, {opacity: backdropAnim}]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.container,
            {transform: [{translateY: slideAnim}]},
          ]}>
          
          {/* Header */}
          {(title || message) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => {
              const isDestructive = index === destructiveIndex || action.destructive;
              
              return (
                <Animated.View
                  key={index}
                  style={{
                    opacity: itemAnims[index] || 1,
                    transform: [{
                      translateY: (itemAnims[index] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  }}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      index === 0 && styles.actionButtonFirst,
                      index === actions.length - 1 && styles.actionButtonLast,
                    ]}
                    onPress={() => handleAction(action, index)}
                    activeOpacity={0.7}>
                    {action.icon && (
                      <View style={[
                        styles.actionIcon,
                        isDestructive && styles.actionIconDestructive,
                      ]}>
                        <Icon
                          name={action.icon}
                          size={22}
                          color={isDestructive ? '#EF4444' : '#00B14F'}
                        />
                      </View>
                    )}
                    <Text style={[
                      styles.actionText,
                      isDestructive && styles.actionTextDestructive,
                    ]}>
                      {action.text}
                    </Text>
                    {action.subtitle && (
                      <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    )}
                    <Icon
                      name="chevron-forward"
                      size={20}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                  {index < actions.length - 1 && <View style={styles.separator} />}
                </Animated.View>
              );
            })}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            activeOpacity={0.8}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  actionButtonFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionButtonLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconDestructive: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionTextDestructive: {
    color: '#EF4444',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginRight: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 70,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3B82F6',
  },
});

export default ActionSheet;
