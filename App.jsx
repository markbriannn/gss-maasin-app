import React, {useEffect, useState, useRef} from 'react';
import {StatusBar, LogBox, Animated, StyleSheet} from 'react-native';
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

// Inner app component that uses theme
const AppContent = () => {
  const {isDark} = useTheme();
  
  return (
    <NavigationContainer 
      ref={navigationRef}
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
