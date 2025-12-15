import React, {useEffect, useRef} from 'react';
import {View, Text, Image, Animated, Easing} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {splashStyles as styles} from '../../css/authStyles';

const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Loading dots animations - scale and opacity for smooth effect
  const dot1Scale = useRef(new Animated.Value(0.3)).current;
  const dot2Scale = useRef(new Animated.Value(0.3)).current;
  const dot3Scale = useRef(new Animated.Value(0.3)).current;
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

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

    // Pulse animation for logo
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

    // Loading dots wave animation
    const createDotAnimation = (scaleAnim, opacityAnim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 0.3,
              duration: 400,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(400),
        ])
      );
    };

    createDotAnimation(dot1Scale, dot1Opacity, 0).start();
    createDotAnimation(dot2Scale, dot2Opacity, 200).start();
    createDotAnimation(dot3Scale, dot3Opacity, 400).start();
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
          <Animated.View 
            style={[
              styles.loadingDot, 
              {
                transform: [{scale: dot1Scale}],
                opacity: dot1Opacity,
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.loadingDot, 
              {
                transform: [{scale: dot2Scale}],
                opacity: dot2Opacity,
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.loadingDot, 
              {
                transform: [{scale: dot3Scale}],
                opacity: dot3Opacity,
              }
            ]} 
          />
        </View>
        <Text style={styles.footerText}>Loading...</Text>
      </Animated.View>
    </LinearGradient>
  );
};

export default SplashScreen;
