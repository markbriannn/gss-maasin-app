import React, {useEffect, useRef} from 'react';
import {View, Text, Image, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {splashStyles as styles} from '../../css/authStyles';

const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
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
  }, []);

  return (
    <LinearGradient
      colors={['#00B14F', '#009A43', '#007A35']}
      style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
          },
        ]}>
        <Animated.View
          style={[
            styles.logoCircle,
            {
              transform: [{scale: pulseAnim}],
            },
          ]}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>GSS</Text>
          </View>
        </Animated.View>
        
        <Text style={styles.appName}>General Service System</Text>
        <Text style={styles.tagline}>
          Connect with trusted local service providers
        </Text>
        <Text style={styles.location}>Maasin City, Southern Leyte</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
          },
        ]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDotDelay1]} />
          <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
        </View>
        <Text style={styles.footerText}>Loading...</Text>
      </Animated.View>
    </LinearGradient>
  );
};

export default SplashScreen;
