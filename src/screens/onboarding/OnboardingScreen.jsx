import React, {useState, useRef} from 'react';
import {View, Text, ScrollView, TouchableOpacity, useWindowDimensions} from 'react-native';
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
  },
  {
    id: 2,
    title: 'Browse and Hire',
    subtitle: 'Find electricians, plumbers, carpenters and more. View profiles, ratings and distance',
    backgroundColor: '#DBEAFE',
    iconName: 'people-outline',
    iconColor: '#3B82F6',
  },
  {
    id: 3,
    title: 'Track in Real-Time',
    subtitle: 'See your provider coming to you on the map. Chat and stay updated',
    backgroundColor: '#FEF3C7',
    iconName: 'location-outline',
    iconColor: '#F59E0B',
  },
  {
    id: 4,
    title: 'Safe and Reliable',
    subtitle: 'All providers are verified. Pay securely through the app. Rate and review',
    backgroundColor: '#E0E7FF',
    iconName: 'shield-checkmark-outline',
    iconColor: '#6366F1',
  },
];

const OnboardingScreen = ({navigation}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const {width} = useWindowDimensions();

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
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
        {onboardingData.map((item) => (
          <View key={item.id} style={[styles.slide, {width}]}>
            <View style={[styles.imageContainer, {backgroundColor: item.backgroundColor}]}>
              <Icon name={item.iconName} size={120} color={item.iconColor} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
