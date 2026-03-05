import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, LogBox, Animated, StyleSheet, Linking, Alert, Modal } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import { NotificationProvider, setNotificationNavigationRef } from './src/context/NotificationContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { PushNotificationProvider, usePushNotifications } from './src/context/PushNotificationContext';
import SplashScreen from './src/screens/splash/SplashScreen';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import GlobalModalProvider from './src/components/common/GlobalModalProvider';
import VoiceCall from './src/components/common/VoiceCall';
import { setBackgroundMessageHandler } from './src/services/pushNotificationService';
import { listenToIncomingCalls, answerCall, declineCall, endCall, listenToCall } from './src/services/callService';
import paymentService from './src/services/paymentService';
import { showSuccessModal, showErrorModal } from './src/utils/modalManager';

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
        showSuccessModal('Payment Successful! 🎉', 'Your payment has been processed.');
      }

      // Navigate to ClientMain - booking details show inline
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('ClientMain');
      }
    } else if (path.includes('payment/failed') && bookingId) {
      // Payment failed
      showErrorModal('Payment Failed', 'Your payment was not completed. Please try again.');

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
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { incomingCallData, clearIncomingCall, setNavigationRef } = usePushNotifications();
  const [incomingCall, setIncomingCall] = useState(null);
  const [answeredCall, setAnsweredCall] = useState(null); // Answered call triggers VoiceCall (with Agora)

  // Set navigation ref for push notifications
  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef);
    }
  }, [setNavigationRef]);

  // Global incoming call listener — DISABLED (Agora voice calls disabled)
  useEffect(() => {
    if (!user?.uid) return;

    // VOICE CALLS DISABLED - Commenting out to prevent crashes
    /*
    const unsubscribe = listenToIncomingCalls(user.uid, (call) => {
      // Only show if call is still ringing
      if (call.status === 'ringing') {
        console.log('[App] Showing incoming call:', call.id);
        setIncomingCall(call);
      } else {
        console.log('[App] Ignoring non-ringing call:', call.id, call.status);
      }
    });

    return () => unsubscribe();
    */
    return () => {};
  }, [user?.uid]);

  // Handle incoming call from push notification
  useEffect(() => {
    if (incomingCallData) {
      setIncomingCall(incomingCallData);
      clearIncomingCall();
    }
  }, [incomingCallData, clearIncomingCall]);

  // Monitor incoming call status and auto-dismiss if ended
  useEffect(() => {
    if (!incomingCall?.id) return;

    console.log('[App] Monitoring incoming call status:', incomingCall.id);
    const unsubscribe = listenToCall(incomingCall.id, (callData) => {
      console.log('[App] Incoming call status changed:', callData.status);
      // If call is no longer ringing, dismiss the notification
      if (callData.status !== 'ringing') {
        console.log('[App] Auto-dismissing incoming call notification');
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [incomingCall?.id]);

  const handleAnswerCall = async () => {
    if (incomingCall) {
      await answerCall(incomingCall.id);
      setAnsweredCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall) {
      await declineCall(incomingCall.id);
      setIncomingCall(null);
    }
  };

  const handleEndCall = async () => {
    if (answeredCall) {
      await endCall(answeredCall.id, 0).catch(() => { });
    }
    setAnsweredCall(null);
  };

  // Handle deep links
  useEffect(() => {
    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, navigationRef);
      }
    });

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, navigationRef);
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
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

      {/* Voice Call Screen - Shows for both incoming and outgoing calls */}
      {incomingCall && (
        <ErrorBoundary>
          <Modal visible={true} transparent={false} animationType="slide" statusBarTranslucent>
            <VoiceCall
              callId={incomingCall.id}
              channelName={incomingCall.channelName}
              isIncoming={true}
              callerName={incomingCall.callerName || 'Unknown'}
              onEnd={handleEndCall}
              onDecline={handleDeclineCall}
              onAnswer={handleAnswerCall}
            />
          </Modal>
        </ErrorBoundary>
      )}

      {/* Active Call - After answering */}
      {answeredCall && (
        <ErrorBoundary>
          <Modal visible={true} transparent={false} animationType="none" statusBarTranslucent>
            <VoiceCall
              callId={answeredCall.id}
              channelName={answeredCall.channelName}
              isIncoming={false}
              callerName={answeredCall.callerName || 'Unknown'}
              onEnd={handleEndCall}
            />
          </Modal>
        </ErrorBoundary>
      )}
    </>
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
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#00B14F' }}>
        <SafeAreaProvider>
          <NetworkProvider>
            <ThemeProvider>
              <AuthProvider>
                <NotificationProvider>
                  <PushNotificationProvider>
                    <SocketProvider>
                      <GlobalModalProvider>
                        {!isLoading && <AppContent />}
                        {showSplash && (
                          <Animated.View
                            style={[
                              StyleSheet.absoluteFill,
                              { opacity: splashOpacity }
                            ]}
                            pointerEvents={isLoading ? 'auto' : 'none'}
                          >
                            <SplashScreen />
                          </Animated.View>
                        )}
                      </GlobalModalProvider>
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
