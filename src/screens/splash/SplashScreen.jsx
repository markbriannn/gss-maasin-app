import React, { useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Grab/iOS-inspired splash with clean, premium feel
const SplashScreen = () => {
  // Core animations
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const locationTranslateY = useSharedValue(20);
  const locationOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const shimmerX = useSharedValue(-1);

  // Pulsing ring animations
  const pulse1Scale = useSharedValue(1);
  const pulse1Opacity = useSharedValue(0.6);
  const pulse2Scale = useSharedValue(1);
  const pulse2Opacity = useSharedValue(0.4);

  useEffect(() => {
    // Phase 1: Logo entrance (iOS-like spring bounce)
    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    });

    // Phase 2: Glow ring appears
    ringOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    ringScale.value = withDelay(300, withSpring(1, {
      damping: 15,
      stiffness: 120,
    }));

    // Phase 3: Pulsing rings (Grab-style radar pulse)
    pulse1Scale.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2.2, { duration: 2000, easing: Easing.out(Easing.ease) }),
      ),
      -1,
      false,
    ));
    pulse1Opacity.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      ),
      -1,
      false,
    ));
    pulse2Scale.value = withDelay(1600, withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2.2, { duration: 2000, easing: Easing.out(Easing.ease) }),
      ),
      -1,
      false,
    ));
    pulse2Opacity.value = withDelay(1600, withRepeat(
      withSequence(
        withTiming(0.4, { duration: 0 }),
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      ),
      -1,
      false,
    ));

    // Phase 4: Text reveals (staggered, iOS-style)
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(600, withSpring(0, { damping: 20, stiffness: 90 }));

    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(900, withSpring(0, { damping: 20, stiffness: 90 }));

    locationOpacity.value = withDelay(1100, withTiming(1, { duration: 500 }));
    locationTranslateY.value = withDelay(1100, withSpring(0, { damping: 20, stiffness: 90 }));

    // Phase 5: Footer + shimmer loading bar
    footerOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    shimmerX.value = withDelay(1400, withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    ));
  }, []);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const pulse1Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1Scale.value }],
    opacity: pulse1Opacity.value,
  }));

  const pulse2Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2Scale.value }],
    opacity: pulse2Opacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: taglineTranslateY.value }],
    opacity: taglineOpacity.value,
  }));

  const locationStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: locationTranslateY.value }],
    opacity: locationOpacity.value,
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerX.value, [-1, 1], [-200, SCREEN_WIDTH]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#00C853', '#00B14F', '#009A43', '#007A35']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}>


        {/* Main Logo Area */}
        <View style={styles.centerContent}>
          {/* Logo + Glow Ring wrapper */}
          <View style={styles.logoWrapper}>
            {/* Pulsing radar rings (Grab-style) */}
            <Animated.View style={[styles.pulseRing, pulse1Style]} />
            <Animated.View style={[styles.pulseRing, pulse2Style]} />

            {/* Glow ring behind logo */}
            <Animated.View style={[styles.glowRing, ringStyle]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)']}
                style={styles.glowGradient}
              />
            </Animated.View>

            {/* Logo */}
            <Animated.View style={[styles.logoContainer, logoStyle]}>
              <View style={styles.logoShadow}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../../../assets/gss_logo.jpg')}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </Animated.View>
          </View>

          {/* App Name - Staggered reveal */}
          <Animated.Text style={[styles.appName, titleStyle]}>
            Household Essential Logistics Portal
          </Animated.Text>

          {/* Tagline */}
          <Animated.View style={[styles.taglineContainer, taglineStyle]}>
            <View style={styles.taglineLine} />
            <Text style={styles.tagline}>
              One tap away from expert help
            </Text>
            <View style={styles.taglineLine} />
          </Animated.View>

          {/* Location */}
          <Animated.View style={[styles.locationContainer, locationStyle]}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location}>Maasin City, Southern Leyte</Text>
          </Animated.View>
        </View>

        {/* Footer with shimmer loading bar */}
        <Animated.View style={[styles.footer, footerStyle]}>
          {/* Shimmer loading bar (iOS-style) */}
          <View style={styles.shimmerTrack}>
            <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.5)',
                  'rgba(255,255,255,0.7)',
                  'rgba(255,255,255,0.5)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
          <Text style={styles.footerText}>Finding the best pros near you...</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Pulse rings (Grab-like radar)
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Glow ring
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
    borderRadius: 90,
  },

  // Center content
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo wrapper - centers glow ring behind logo
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    width: 180,
    height: 180,
  },

  // Logo
  logoContainer: {
    zIndex: 2,
  },
  logoShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  logoImage: {
    width: 122,
    height: 122,
    borderRadius: 61,
  },

  // App name
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Tagline with lines
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  taglineLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    maxWidth: 30,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginHorizontal: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Location
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  location: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 70,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 60,
  },

  // Shimmer loading bar (iOS-style)
  shimmerTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  shimmerBar: {
    position: 'absolute',
    width: 120,
    height: '100%',
  },
  shimmerGradient: {
    flex: 1,
    borderRadius: 2,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
