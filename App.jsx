import React, {useEffect, useState, useRef} from 'react';
import {StatusBar, LogBox, Animated, StyleSheet, Linking, Alert} from 'react-native';
import {NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/context/AuthContext';
import {ThemeProvider, useTheme} from './src/context/ThemeContext';
import {SocketProvider} from './src/context/SocketContext';
import {NotificationProvider, setNotificationNavigationRef} from './src/context/NotificationContext';
import {NetworkProvider} from './src/context/NetworkContext';
import {PushNotificationProvider} from './src/context/PushNotificationContext';
import SplashScreen from './src/screens/splash/SplashScreen';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import {setBackgroundMessageHandler} from './src/services/pushNotificationService';
import paymentService from './src/services/paymentService';

// Create navigation ref for notification handling
const navigationRef = createNavigationContainerRef();

// Set up background message handler (must be outside component)
setBackgroundMessageHandler();

enableScreens();

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Animated: `useNativeDriver`',
  'ReactImageView: Image source "null" doesn\'t exist',
  'Image source "null" doesn\'t exist',
]);

// Custom navigation themes
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00B14F',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00B14F',
    background: '#111827',
    card: '#1F2937',
    text: '#F9FAFB',
    border: '#374151',
  },
};

// Deep linking configuration for payment redirects
const linking = {
  prefixes: ['gssmaasin://', 'https://gss-maasin-app.vercel.app'],
  config: {
    screens: {
      // Payment redirect screens
      JobDetails: {
        path: 'payment/:status',
        parse: {
          status: (status) => status,
          bookingId: (bookingId) => bookingId,
        },
      },
    },
  },
};

// Handle deep link for payment
const handleDeepLink = async (url, navigationRef) => {
  console.log('Deep link received:', url);
  
  if (!url) return;
  
  try {
    // Parse the URL manually (React Native doesn't have full URL API)
    let path = '';
    let bookingId = null;
    
    // Handle gssmaasin:// scheme
    if (url.startsWith('gssmaasin://')) {
      const withoutScheme = url.replace('gssmaasin://', '');
      const [pathPart, queryPart] = withoutScheme.split('?');
      path = pathPart;
      
      if (queryPart) {
        const params = queryPart.split('&');
        for (const param of params) {
          const [key, value] = param.split('=');
          if (key === 'bookingId') {
            bookingId = decodeURIComponent(value);
          }
        }
      }
    } else if (url.startsWith('https://')) {
      // Handle https:// URLs
      const withoutProtocol = url.replace('https://', '');
      const slashIndex = withoutProtocol.indexOf('/');
      const pathAndQuery = slashIndex >= 0 ? withoutProtocol.substring(slashIndex) : '';
      const [pathPart, queryPart] = pathAndQuery.split('?');
      path = pathPart;
      
      if (queryPart) {
        const params = queryPart.split('&');
        for (const param of params) {
          const [key, value] = param.split('=');
          if (key === 'bookingId') {
            bookingId = decodeURIComponent(value);
          }
        }
      }
    }
    
    console.log('Deep link path:', path, 'bookingId:', bookingId);
    
    if (path.includes('payment/success') && bookingId) {
      // Payment successful - verify and navigate
      const result = await paymentService.verifyAndProcessPayment(bookingId);
      
      if (result.success && result.status === 'paid') {
        Alert.alert('Payment Successful! 🎉', 'Your payment has been processed.');
      }
      
      // Navigate to ClientMain - booking details show inline
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('ClientMain');
      }
    } else if (path.includes('payment/failed') && bookingId) {
      // Payment failed
      Alert.alert('Payment Failed', 'Your payment was not completed. Please try again.');
      
      // Navigate to ClientMain
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('ClientMain');
      }
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
};

// Inner app component that uses theme
const AppContent = () => {
  const {isDark} = useTheme();
  
  // Handle deep links
  useEffect(() => {
    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, navigationRef);
      }
    });
    
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({url}) => {
      handleDeepLink(url, navigationRef);
    });
    
    return () => subscription.remove();
  }, []);
  
  return (
    <NavigationContainer 
      ref={navigationRef}
      linking={linking}
      theme={isDark ? CustomDarkTheme : CustomLightTheme}
      onReady={() => {
        // Set navigation ref for notification handling
        setNotificationNavigationRef(navigationRef);
      }}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#ffffff'}
        translucent={false}
      />
      <AppNavigator />
    </NavigationContainer>
  );
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wait for splash duration then fade out
    const timer = setTimeout(() => {
      // Start loading the main app
      setIsLoading(false);
      
      // Fade out splash screen
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1, backgroundColor: '#00B14F'}}>
        <SafeAreaProvider>
          <NetworkProvider>
            <ThemeProvider>
              <AuthProvider>
                <NotificationProvider>
                  <PushNotificationProvider>
                    <SocketProvider>
                      {!isLoading && <AppContent />}
                      {showSplash && (
                        <Animated.View 
                          style={[
                            StyleSheet.absoluteFill, 
                            {opacity: splashOpacity}
                          ]}
                          pointerEvents={isLoading ? 'auto' : 'none'}
                        >
                          <SplashScreen />
                        </Animated.View>
                      )}
                    </SocketProvider>
                  </PushNotificationProvider>
                </NotificationProvider>
              </AuthProvider>
            </ThemeProvider>
          </NetworkProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
