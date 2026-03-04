import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, LogBox, Animated, StyleSheet, Linking, Alert, Modal, TouchableOpacity } from 'react-native';
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
import { listenToIncomingCalls, answerCall, declineCall, endCall } from './src/services/callService';
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Set navigation ref for push notifications
  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef);
    }
  }, [setNavigationRef]);

  // Global incoming call listener — shows lightweight screen (NO Agora)
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = listenToIncomingCalls(user.uid, (call) => {
      setIncomingCall(call);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Handle incoming call from push notification
  useEffect(() => {
    if (incomingCallData) {
      setIncomingCall(incomingCallData);
      clearIncomingCall();
    }
  }, [incomingCallData, clearIncomingCall]);

  // Pulse animation for incoming call
  useEffect(() => {
    if (incomingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [incomingCall]);

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

      {/* Global Incoming Call Screen — lightweight, NO Agora SDK */}
      {incomingCall && (
        <Modal visible={true} transparent={false} animationType="slide" statusBarTranslucent>
          <StatusBar barStyle="light-content" backgroundColor="#B8860B" />
          <Animated.View style={{
            flex: 1,
            background: 'linear-gradient(180deg, #4A6741 0%, #B8860B 100%)',
            backgroundColor: '#5A7A50',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 80,
          }}>
            {/* Caller info */}
            <Animated.View style={{ alignItems: 'center', marginTop: 40 }}>
              <Animated.View style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: '#333',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
                transform: [{ scale: pulseAnim }],
              }}>
                <Animated.Text style={{ fontSize: 48, color: '#fff', fontWeight: 'bold' }}>
                  {(incomingCall.callerName || 'U').charAt(0).toUpperCase()}
                </Animated.Text>
              </Animated.View>
              <Animated.Text style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#fff',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                {incomingCall.callerName || 'Unknown'}
              </Animated.Text>
              <Animated.Text style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.7)',
                textAlign: 'center',
              }}>
                Audio call from H.E.L.P
              </Animated.Text>
            </Animated.View>

            {/* Decline / Answer buttons */}
            <Animated.View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 60,
            }}>
              {/* Decline */}
              <Animated.View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={handleDeclineCall}
                  activeOpacity={0.7}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}>
                  <Animated.Text style={{ fontSize: 28, color: '#fff' }}>✕</Animated.Text>
                </TouchableOpacity>
                <Animated.Text style={{ color: '#fff', fontSize: 14, marginTop: 8, fontWeight: '500' }}>
                  Decline
                </Animated.Text>
              </Animated.View>

              {/* Answer */}
              <Animated.View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={handleAnswerCall}
                  activeOpacity={0.7}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: '#22C55E',
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}>
                  <Animated.Text style={{ fontSize: 28, color: '#fff' }}>📞</Animated.Text>
                </TouchableOpacity>
                <Animated.Text style={{ color: '#fff', fontSize: 14, marginTop: 8, fontWeight: '500' }}>
                  Answer
                </Animated.Text>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}

      {/* Active Call — Agora VoiceCall only loads AFTER answering */}
      {answeredCall && (
        <ErrorBoundary>
          <VoiceCall
            callId={answeredCall.id}
            channelName={answeredCall.channelName}
            isIncoming={false}
            callerName={answeredCall.callerName || 'Unknown'}
            onEnd={handleEndCall}
          />
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
