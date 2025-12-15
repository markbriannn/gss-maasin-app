/**
 * Reusable Animation Components for GSS Maasin
 * Provides smooth, polished animations throughout the app
 */

import React, {useRef, useEffect, useState} from 'react';
import {
  Animated,
  TouchableOpacity,
  View,
  StyleSheet,
  Easing,
} from 'react-native';

/**
 * 1. BUTTON PRESS FEEDBACK
 * Scales down when pressed, springs back on release
 */
export const AnimatedButton = ({
  children,
  onPress,
  style,
  disabled,
  activeScale = 0.95,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      {...props}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * 2. CARD PRESS ANIMATION
 * Scale down slightly when pressing cards
 */
export const AnimatedCard = ({
  children,
  onPress,
  style,
  activeScale = 0.98,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      {...props}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * 3. STAGGERED LIST ITEM ANIMATION
 * Fade in and slide up with staggered delay
 */
export const AnimatedListItem = ({children, index, style, delay = 50}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const staggerDelay = index * delay;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: staggerDelay,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: staggerDelay,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

/**
 * 4. PULSE ANIMATION (for Online status badges)
 */
export const PulsingDot = ({size = 10, color = '#10B981', style}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={[{width: size, height: size}, style]}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacityAnim,
          transform: [{scale: pulseAnim}],
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

/**
 * 5. SUCCESS CHECKMARK ANIMATION
 */
export const SuccessCheckmark = ({size = 60, color = '#10B981', onComplete}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }),
    ]).start(() => {
      if (onComplete) onComplete();
    });

    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{scale: scaleAnim}, {rotate}],
      }}>
      <View style={{
        width: size * 0.3,
        height: size * 0.5,
        borderRightWidth: 4,
        borderBottomWidth: 4,
        borderColor: '#FFFFFF',
        transform: [{rotate: '45deg'}, {translateX: -2}, {translateY: -2}],
      }} />
    </Animated.View>
  );
};

/**
 * 6. SHAKE ANIMATION (for errors)
 */
export const ShakeView = ({children, shake, style}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
        Animated.timing(shakeAnim, {toValue: 0, duration: 50, useNativeDriver: true}),
      ]).start();
    }
  }, [shake]);

  return (
    <Animated.View style={[style, {transform: [{translateX: shakeAnim}]}]}>
      {children}
    </Animated.View>
  );
};

/**
 * 7. SKELETON LOADING PLACEHOLDER
 */
export const SkeletonLoader = ({width, height, borderRadius = 8, style}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          overflow: 'hidden',
        },
        style,
      ]}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#F3F4F6',
          transform: [{translateX}],
        }}
      />
    </View>
  );
};

/**
 * 8. FLOATING ACTION BUTTON with bounce
 */
export const FloatingActionButton = ({
  children,
  onPress,
  style,
  visible = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handlePressIn = () => {
    Animated.spring(bounceAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {scale: Animated.multiply(scaleAnim, bounceAnim)},
          ],
        },
      ]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * 9. SLIDE UP MODAL/BOTTOM SHEET
 */
export const SlideUpView = ({children, visible, style, onClose}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

/**
 * 10. CHAT MESSAGE ANIMATION
 */
export const AnimatedMessage = ({children, isOwn, style}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 4,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

/**
 * 11. PROVIDER CARD SKELETON
 */
export const ProviderCardSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#E5E7EB', '#F3F4F6', '#E5E7EB'],
  });

  return (
    <View style={skeletonStyles.card}>
      <Animated.View style={[skeletonStyles.avatar, {backgroundColor}]} />
      <View style={skeletonStyles.content}>
        <Animated.View style={[skeletonStyles.title, {backgroundColor}]} />
        <Animated.View style={[skeletonStyles.subtitle, {backgroundColor}]} />
        <Animated.View style={[skeletonStyles.rating, {backgroundColor}]} />
      </View>
      <View style={skeletonStyles.actions}>
        <Animated.View style={[skeletonStyles.button, {backgroundColor}]} />
        <Animated.View style={[skeletonStyles.buttonPrimary, {backgroundColor}]} />
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    height: 16,
    width: '60%',
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    height: 12,
    width: '40%',
    borderRadius: 4,
    marginBottom: 6,
  },
  rating: {
    height: 12,
    width: '30%',
    borderRadius: 4,
  },
  actions: {
    alignItems: 'flex-end',
  },
  button: {
    height: 28,
    width: 70,
    borderRadius: 6,
    marginBottom: 6,
  },
  buttonPrimary: {
    height: 32,
    width: 80,
    borderRadius: 6,
  },
});

export default {
  AnimatedButton,
  AnimatedCard,
  AnimatedListItem,
  PulsingDot,
  SuccessCheckmark,
  ShakeView,
  SkeletonLoader,
  FloatingActionButton,
  SlideUpView,
  AnimatedMessage,
  ProviderCardSkeleton,
};
