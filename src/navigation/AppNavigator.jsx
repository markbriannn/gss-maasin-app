import React, {useState, useEffect} from 'react';
import {View, Text, Animated} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../context/AuthContext';
import {useTheme} from '../context/ThemeContext';
import {db} from '../config/firebase';
import {collection, query, where, onSnapshot} from 'firebase/firestore';
import AnimatedTabIcon from '../components/animations/AnimatedTabIcon';

// Badge Component
const BadgeIcon = ({iconName, focused, color, size, count}) => (
  <View>
    <Icon name={iconName} size={size} color={color} />
    {count > 0 && (
      <View style={{
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
      }}>
        <Text style={{fontSize: 10, fontWeight: '700', color: '#FFFFFF'}}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    )}
  </View>
);

// Custom Messages Icon with Badge
const MessagesTabIcon = ({focused, color, size, userId}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Don't count archived or deleted conversations
        if (!data.archived?.[userId] && !data.deleted?.[userId]) {
          const unreadByUser = data.unreadCount?.[userId] || 0;
          count += unreadByUser;
        }
      });
      setUnreadCount(count);
    }, (error) => {
      console.log('Error listening to messages:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <BadgeIcon 
      iconName={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
      focused={focused} 
      color={color} 
      size={size} 
      count={unreadCount} 
    />
  );
};

// Provider Jobs Tab Icon with Badge (available jobs + active jobs)
const ProviderJobsTabIcon = ({focused, color, size, userId}) => {
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const bookingsRef = collection(db, 'bookings');
    
    // Query 1: Available jobs (admin approved, pending, no provider assigned)
    const availableQuery = query(
      bookingsRef,
      where('status', 'in', ['pending', 'pending_negotiation'])
    );

    // Query 2: Provider's active jobs
    const activeQuery = query(
      bookingsRef,
      where('providerId', '==', userId),
      where('status', 'in', ['accepted', 'traveling', 'arrived', 'in_progress'])
    );

    let availableCount = 0;
    let activeCount = 0;

    const unsubAvailable = onSnapshot(availableQuery, (snapshot) => {
      // Filter jobs that are admin approved and don't have a provider
      const availableJobs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.adminApproved === true && !data.providerId;
      });
      availableCount = availableJobs.length;
      setBadgeCount(availableCount + activeCount);
    }, (error) => {
      console.log('Error listening to available jobs:', error);
    });

    const unsubActive = onSnapshot(activeQuery, (snapshot) => {
      activeCount = snapshot.docs.length;
      setBadgeCount(availableCount + activeCount);
    }, (error) => {
      console.log('Error listening to active jobs:', error);
    });

    return () => {
      unsubAvailable();
      unsubActive();
    };
  }, [userId]);

  return (
    <BadgeIcon 
      iconName={focused ? 'briefcase' : 'briefcase-outline'} 
      focused={focused} 
      color={color} 
      size={size} 
      count={badgeCount} 
    />
  );
};

// Client Bookings Tab Icon with Badge (active bookings with updates)
const ClientBookingsTabIcon = ({focused, color, size, userId}) => {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const bookingsRef = collection(db, 'bookings');
    // Include all active statuses that client should be notified about
    const q = query(
      bookingsRef,
      where('clientId', '==', userId),
      where('status', 'in', ['accepted', 'in_progress', 'traveling', 'arrived', 'pending_completion', 'counter_offer'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveCount(snapshot.docs.length);
    }, (error) => {
      console.log('Error listening to client bookings:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <BadgeIcon 
      iconName={focused ? 'calendar' : 'calendar-outline'} 
      focused={focused} 
      color={color} 
      size={size} 
      count={activeCount} 
    />
  );
};

// Admin Providers Tab Icon with Badge (pending approval)
const AdminProvidersTabIcon = ({focused, color, size}) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    // Query all providers and filter locally for pending status
    const q = query(
      usersRef,
      where('role', '==', 'PROVIDER')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter providers that are pending (check both status and providerStatus fields)
      const pendingProviders = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'pending' || data.providerStatus === 'pending' || 
               (!data.status && !data.providerStatus); // Also count if no status set
      });
      setPendingCount(pendingProviders.length);
    }, (error) => {
      console.log('Error listening to pending providers:', error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <BadgeIcon 
      iconName={focused ? 'people' : 'people-outline'} 
      focused={focused} 
      color={color} 
      size={size} 
      count={pendingCount} 
    />
  );
};

// Admin Jobs Tab Icon with Badge (pending jobs needing approval)
const AdminJobsTabIcon = ({focused, color, size}) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const bookingsRef = collection(db, 'bookings');
    // Query for pending jobs - filter adminApproved locally since it might be undefined
    const q = query(
      bookingsRef,
      where('status', 'in', ['pending', 'pending_negotiation'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter jobs that haven't been admin approved yet (false or undefined)
      const pendingJobs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.adminApproved !== true;
      });
      setPendingCount(pendingJobs.length);
    }, (error) => {
      console.log('Error listening to pending jobs:', error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <BadgeIcon 
      iconName={focused ? 'briefcase' : 'briefcase-outline'} 
      focused={focused} 
      color={color} 
      size={size} 
      count={pendingCount} 
    />
  );
};

// Import Screens
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PhoneOTPScreen from '../screens/auth/PhoneOTPScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ClientRegistrationNavigator from './ClientRegistrationNavigator';
import ProviderRegistrationNavigator from './ProviderRegistrationNavigator';

// Client Screens
import ClientHomeScreen from '../screens/client/ClientHomeScreen';
import ClientBookingsScreen from '../screens/client/ClientBookingsScreen';
import ClientMessagesScreen from '../screens/client/ClientMessagesScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';
import ClientProviderDetailsScreen from '../screens/client/ProviderDetailsScreen';
import BookServiceScreen from '../screens/booking/BookServiceScreen';
import JobDetailsScreen from '../screens/client/JobDetailsScreen';
import JobTrackingScreen from '../screens/client/JobTrackingScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

// Profile Screens
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PaymentMethodsScreen from '../screens/payment/PaymentMethodsScreen';
import FavoritesScreen from '../screens/profile/FavoritesScreen';

// Payment Screens
import WalletScreen from '../screens/payment/WalletScreen';
import TransactionHistoryScreen from '../screens/payment/TransactionHistoryScreen';
import PayoutSetupScreen from '../screens/payment/PayoutSetupScreen';

// Settings & Legal Screens
import SettingsScreen from '../screens/settings/SettingsScreen';
import HelpScreen from '../screens/help/HelpScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import AboutScreen from '../screens/legal/AboutScreen';

// Provider Screens
import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';
import ProviderJobsScreen from '../screens/provider/ProviderJobsScreen';
import ProviderEarningsScreen from '../screens/provider/ProviderEarningsScreen';
import ProviderProfileScreen from '../screens/provider/ProviderProfileScreen';
import ProviderJobDetailsScreen from '../screens/provider/ProviderJobDetailsScreen';
import ProviderTrackingScreen from '../screens/provider/ProviderTrackingScreen';

import ProviderMessagesScreen from '../screens/provider/ProviderMessagesScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProvidersScreen from '../screens/admin/AdminProvidersScreen';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminMapScreen from '../screens/admin/AdminMapScreen';
import AdminMessagesScreen from '../screens/admin/AdminMessagesScreen';
import AdminEarningsScreen from '../screens/admin/AdminEarningsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

// Chat Screen
import ChatScreen from '../screens/chat/ChatScreen';

// Review Screen
import ReviewScreen from '../screens/review/ReviewScreen';

// History Screens
import ServiceHistoryScreen from '../screens/history/ServiceHistoryScreen';
import ServiceReceiptScreen from '../screens/history/ServiceReceiptScreen';

// Navigation Screen
import DirectionsScreen from '../screens/navigation/DirectionsScreen';

// Gamification Screen
import LeaderboardScreen from '../screens/gamification/LeaderboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Client Bottom Tabs
function ClientTabs() {
  const {isDark, theme} = useTheme();
  const {user} = useAuth();
  const userId = user?.uid || user?.id;
  
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          if (route.name === 'Messages') {
            return <MessagesTabIcon focused={focused} color={color} size={size} userId={userId} />;
          }
          if (route.name === 'Bookings') {
            return <ClientBookingsTabIcon focused={focused} color={color} size={size} userId={userId} />;
          }
          
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00B14F',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? theme.colors.border : '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={ClientHomeScreen} />
      <Tab.Screen name="Bookings" component={ClientBookingsScreen} />
      <Tab.Screen name="Messages" component={ClientMessagesScreen} />
      <Tab.Screen name="Profile" component={ClientProfileScreen} />
    </Tab.Navigator>
  );
}

// Provider Bottom Tabs
function ProviderTabs() {
  const {isDark, theme} = useTheme();
  const {user} = useAuth();
  const userId = user?.uid || user?.id;
  
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          if (route.name === 'Messages') {
            return <MessagesTabIcon focused={focused} color={color} size={size} userId={userId} />;
          }
          if (route.name === 'Jobs') {
            return <ProviderJobsTabIcon focused={focused} color={color} size={size} userId={userId} />;
          }
          
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00B14F',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? theme.colors.border : '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Dashboard" component={ProviderDashboardScreen} />
      <Tab.Screen name="Jobs" component={ProviderJobsScreen} />
      <Tab.Screen name="Messages" component={ProviderMessagesScreen} />
      <Tab.Screen name="Earnings" component={ProviderEarningsScreen} />
      <Tab.Screen name="Profile" component={ProviderProfileScreen} />
    </Tab.Navigator>
  );
}

// Admin Bottom Tabs
function AdminTabs() {
  const {isDark, theme} = useTheme();
  const {user} = useAuth();
  const userId = user?.uid || user?.id;
  
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          if (route.name === 'Providers') {
            return <AdminProvidersTabIcon focused={focused} color={color} size={size} />;
          }
          if (route.name === 'Jobs') {
            return <AdminJobsTabIcon focused={focused} color={color} size={size} />;
          }
          if (route.name === 'Messages') {
            return <MessagesTabIcon focused={focused} color={color} size={size} userId={userId} />;
          }
          
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00B14F',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? theme.colors.border : '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Providers" component={AdminProvidersScreen} />
      <Tab.Screen name="Jobs" component={AdminJobsScreen} />
      <Tab.Screen name="Messages" component={AdminMessagesScreen} />
      <Tab.Screen name="Map" component={AdminMapScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const {isAuthenticated, userRole, isLoading} = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(true); // Default to true on error to skip onboarding
    } finally {
      setOnboardingChecked(true);
    }
  };

  if (isLoading || !onboardingChecked) {
    // Return a green background to prevent white flash during loading
    return <View style={{flex: 1, backgroundColor: '#00B14F'}} />;
  }

  // Normalize role to uppercase for comparison
  const normalizedRole = userRole?.toUpperCase() || 'CLIENT';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: ({current, next, layouts}) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              }),
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          };
        },
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 250,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 200,
            },
          },
        },
      }}>
      {!isAuthenticated ? (
        <>
          {!hasSeenOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : null}
          <Stack.Screen 
            name="GuestHome" 
            component={GuestHomeScreen}
            options={{animationEnabled: false}}
          />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PhoneOTP" component={PhoneOTPScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen
            name="ClientRegistration"
            component={ClientRegistrationNavigator}
          />
          <Stack.Screen
            name="ProviderRegistration"
            component={ProviderRegistrationNavigator}
          />
        </>
      ) : normalizedRole === 'ADMIN' ? (
        <>
          <Stack.Screen name="AdminMain" component={AdminTabs} />
          <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
          <Stack.Screen name="AdminEarnings" component={AdminEarningsScreen} />
          <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
          <Stack.Screen name="AdminChat" component={ChatScreen} options={{gestureEnabled: false}} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{gestureEnabled: false}} />
          <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        </>
      ) : normalizedRole === 'PROVIDER' ? (
        <>
          <Stack.Screen name="ProviderMain" component={ProviderTabs} />
          <Stack.Screen name="ProviderJobDetails" component={ProviderJobDetailsScreen} />
          <Stack.Screen name="ProviderTracking" component={ProviderTrackingScreen} />
          <Stack.Screen name="Directions" component={DirectionsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{gestureEnabled: false}} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="ServiceHistory" component={ServiceHistoryScreen} />
          <Stack.Screen name="ServiceReceipt" component={ServiceReceiptScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
          <Stack.Screen name="PayoutSetup" component={PayoutSetupScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="ClientMain" component={ClientTabs} />
          <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
          <Stack.Screen name="HireProvider" component={BookServiceScreen} />
          <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
          <Stack.Screen name="Tracking" component={JobTrackingScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{gestureEnabled: false}} />
          <Stack.Screen name="Review" component={ReviewScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="ServiceHistory" component={ServiceHistoryScreen} />
          <Stack.Screen name="ServiceReceipt" component={ServiceReceiptScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
