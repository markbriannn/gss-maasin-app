/**
 * Payment Modal Component
 * Beautiful payment method selection modal
 * Supports GCash, Maya, and Cash options
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Payment method configurations
const PAYMENT_METHODS = {
  gcash: {
    name: 'GCash',
    icon: 'phone-portrait',
    colors: ['#007DFE', '#0066CC'],
    description: 'Pay with GCash e-wallet',
    logo: null, // Can add logo URI
  },
  maya: {
    name: 'Maya',
    icon: 'phone-portrait',
    colors: ['#00D68F', '#00B377'],
    description: 'Pay with Maya e-wallet',
    logo: null,
  },
  cash: {
    name: 'Cash',
    icon: 'cash',
    colors: ['#F59E0B', '#D97706'],
    description: 'Pay cash to provider',
    logo: null,
  },
};

const PaymentModal = ({
  visible,
  amount,
  serviceName,
  onSelectMethod,
  onClose,
  isProcessing = false,
  selectedMethod = null,
  showCash = true,
  title = 'Select Payment Method',
}) => {
  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const itemAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      backdropAnim.setValue(0);
      slideAnim.setValue(300);
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
            speed: 12,
            bounciness: 6,
          }).start();
        }, 100 + index * 80);
      });
    }
  }, [visible]);

  const handleClose = () => {
    if (isProcessing) return;
    
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const handleSelectMethod = (method) => {
    if (isProcessing) return;
    onSelectMethod?.(method);
  };

  const methods = showCash 
    ? ['gcash', 'maya', 'cash'] 
    : ['gcash', 'maya'];

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
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.gradient}>
            
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                disabled={isProcessing}>
                <Icon name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Amount Display */}
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amount}>₱{amount?.toLocaleString() || '0'}</Text>
              {serviceName && (
                <Text style={styles.serviceName}>{serviceName}</Text>
              )}
            </View>

            {/* Payment Methods */}
            <View style={styles.methodsContainer}>
              {methods.map((methodKey, index) => {
                const method = PAYMENT_METHODS[methodKey];
                const isSelected = selectedMethod === methodKey;
                const isLoading = isProcessing && isSelected;

                return (
                  <Animated.View
                    key={methodKey}
                    style={{
                      opacity: itemAnims[index],
                      transform: [{
                        translateY: itemAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      }],
                    }}>
                    <TouchableOpacity
                      style={[
                        styles.methodCard,
                        isSelected && styles.methodCardSelected,
                      ]}
                      onPress={() => handleSelectMethod(methodKey)}
                      disabled={isProcessing}
                      activeOpacity={0.7}>
                      <LinearGradient
                        colors={isSelected ? method.colors : ['#F3F4F6', '#E5E7EB']}
                        style={styles.methodIcon}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}>
                        {isLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Icon
                            name={method.icon}
                            size={24}
                            color={isSelected ? '#FFFFFF' : '#6B7280'}
                          />
                        )}
                      </LinearGradient>

                      <View style={styles.methodInfo}>
                        <Text style={[
                          styles.methodName,
                          isSelected && styles.methodNameSelected,
                        ]}>
                          {method.name}
                        </Text>
                        <Text style={styles.methodDescription}>
                          {method.description}
                        </Text>
                      </View>

                      <View style={[
                        styles.radioOuter,
                        isSelected && {borderColor: method.colors[0]},
                      ]}>
                        {isSelected && (
                          <View style={[
                            styles.radioInner,
                            {backgroundColor: method.colors[0]},
                          ]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Icon name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.securityText}>
                Secure payment powered by PayMongo
              </Text>
            </View>
          </LinearGradient>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -10},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 25,
  },
  gradient: {
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00B14F',
    letterSpacing: -1,
  },
  serviceName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  methodsContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  methodCardSelected: {
    borderColor: '#00B14F',
    backgroundColor: '#F0FDF4',
  },
  methodIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  methodNameSelected: {
    color: '#00B14F',
  },
  methodDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  securityText: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default PaymentModal;
