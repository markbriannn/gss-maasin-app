import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {onboardingStyles as styles} from '../../css/authStyles';

const onboardingData = [
  {
    id: 1,
    title: 'Welcome to GSS',
    subtitle: 'Connect with trusted local service providers in Maasin City',
    backgroundColor: '#E6F7EF',
    iconName: 'hand-left-outline',
    iconColor: '#00B14F',
    secondaryIcon: 'sparkles',
  },
  {
    id: 2,
    title: 'Browse and Hire',
    subtitle: 'Find electricians, plumbers, carpenters and more. View profiles, ratings and distance',
    backgroundColor: '#DBEAFE',
    iconName: 'people-outline',
    iconColor: '#3B82F6',
    secondaryIcon: 'search',
  },
  {
    id: 3,
    title: 'Track in Real-Time',
    subtitle: 'See your provider coming to you on the map. Chat and stay updated',
    backgroundColor: '#FEF3C7',
    iconName: 'location-outline',
    iconColor: '#F59E0B',
    secondaryIcon: 'navigate',
  },
  {
    id: 4,
    title: 'Safe and Reliable',
    subtitle: 'All providers are verified. Pay securely through the app. Rate and review',
    backgroundColor: '#E0E7FF',
    iconName: 'shield-checkmark-outline',
    iconColor: '#6366F1',
    secondaryIcon: 'star',
  },
];

// Animated Icon Component with multiple effects
const AnimatedIcon = ({iconName, iconColor, secondaryIcon, isActive}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);

      // Main icon entrance - bounce in with rotation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Sparkle animations (staggered)
      const animateSparkle = (sparkleAnim, delay) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.delay(1500),
          ])
        ).start();
      };

      animateSparkle(sparkle1, 0);
      animateSparkle(sparkle2, 500);
      animateSparkle(sparkle3, 1000);
    }
  }, [isActive]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <View style={{alignItems: 'center', justifyContent: 'center', height: 180}}>
      {/* Sparkle effects */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 10,
          right: 30,
          opacity: sparkle1,
          transform: [{scale: sparkle1}],
        }}>
        <Icon name="sparkles" size={24} color={iconColor} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 40,
          left: 20,
          opacity: sparkle2,
          transform: [{scale: sparkle2}],
        }}>
        <Icon name="star" size={20} color={iconColor} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 30,
          right: 20,
          opacity: sparkle3,
          transform: [{scale: sparkle3}],
        }}>
        <Icon name="flash" size={22} color={iconColor} />
      </Animated.View>

      {/* Main icon with animations */}
      <Animated.View
        style={{
          transform: [
            {scale: Animated.multiply(scaleAnim, pulseAnim)},
            {rotate},
            {translateY: floatAnim},
          ],
        }}>
        <Icon name={iconName} size={120} color={iconColor} />
      </Animated.View>

      {/* Secondary floating icon */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 20,
          right: 50,
          opacity: scaleAnim,
          transform: [
            {
              translateY: Animated.multiply(floatAnim, -0.5),
            },
            {scale: 0.8},
          ],
        }}>
        <View
          style={{
            backgroundColor: iconColor + '30',
            borderRadius: 20,
            padding: 8,
          }}>
          <Icon name={secondaryIcon} size={24} color={iconColor} />
        </View>
      </Animated.View>
    </View>
  );
};

// Animated Text Component
const AnimatedText = ({title, subtitle, isActive}) => {
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(50)).current;
  const subtitleSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isActive) {
      titleAnim.setValue(0);
      subtitleAnim.setValue(0);
      titleSlide.setValue(50);
      subtitleSlide.setValue(50);

      // Staggered text animation
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(titleAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(titleSlide, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.back(1)),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleSlide, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={styles.content}>
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleAnim,
            transform: [{translateY: titleSlide}],
          },
        ]}>
        {title}
      </Animated.Text>
      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: subtitleAnim,
            transform: [{translateY: subtitleSlide}],
          },
        ]}>
        {subtitle}
      </Animated.Text>
    </View>
  );
};

// Animated Dot Indicator
const AnimatedDot = ({isActive, index, onPress}) => {
  const widthAnim = useRef(new Animated.Value(isActive ? 24 : 8)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isActive ? 24 : 8,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.5,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive]);

  return (
    <TouchableOpacity onPress={() => onPress(index)} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: widthAnim,
            height: 8,
            borderRadius: 4,
            marginHorizontal: 4,
            opacity: opacityAnim,
            backgroundColor: isActive ? '#00B14F' : '#D1D5DB',
          },
        ]}
      />
    </TouchableOpacity>
  );
};

// Animated Button
const AnimatedButton = ({onPress, isLastSlide}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLastSlide) {
      // Attention-grabbing animation for "Get Started"
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLastSlide]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}>
      <Animated.View
        style={[
          styles.nextButton,
          {
            transform: [{scale: scaleAnim}],
            shadowOpacity: isLastSlide ? glowAnim : 0.2,
            shadowRadius: isLastSlide ? 15 : 5,
            shadowColor: '#00B14F',
            elevation: isLastSlide ? 8 : 4,
          },
        ]}>
        <Text style={styles.nextButtonText}>
          {isLastSlide ? 'Get Started' : 'Next'}
        </Text>
        <Icon
          name={isLastSlide ? 'rocket' : 'arrow-forward'}
          size={20}
          color="#FFFFFF"
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const OnboardingScreen = ({navigation}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const {width} = useWindowDimensions();

  const handleScroll = event => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    if (index !== currentIndex && index >= 0 && index < onboardingData.length) {
      setCurrentIndex(index);
    }
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('GuestHome');
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      completeOnboarding();
    }
  };

  const handleDotPress = index => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1}}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        {onboardingData.map((item, index) => (
          <View key={item.id} style={[styles.slide, {width}]}>
            <View
              style={[
                styles.imageContainer,
                {backgroundColor: item.backgroundColor},
              ]}>
              <AnimatedIcon
                iconName={item.iconName}
                iconColor={item.iconColor}
                secondaryIcon={item.secondaryIcon}
                isActive={currentIndex === index}
              />
            </View>
            <AnimatedText
              title={item.title}
              subtitle={item.subtitle}
              isActive={currentIndex === index}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <AnimatedDot
              key={index}
              index={index}
              isActive={index === currentIndex}
              onPress={handleDotPress}
            />
          ))}
        </View>

        <AnimatedButton
          onPress={handleNext}
          isLastSlide={currentIndex === onboardingData.length - 1}
        />
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
