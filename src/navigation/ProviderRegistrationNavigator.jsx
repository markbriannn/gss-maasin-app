import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

// Import provider registration screens
import PersonalInfoScreen from '../screens/registration/PersonalInfoScreen';
import ContactInfoScreen from '../screens/registration/ContactInfoScreen';
import EmailVerificationScreen from '../screens/registration/EmailVerificationScreen';
import LocationScreen from '../screens/registration/LocationScreen';
import PhoneVerificationScreen from '../screens/registration/PhoneVerificationScreen';
import PasswordScreen from '../screens/registration/PasswordScreen';
import DateOfBirthScreen from '../screens/registration/DateOfBirthScreen';
import ServiceCategoriesScreen from '../screens/registration/ServiceCategoriesScreen';
import AboutServiceScreen from '../screens/registration/AboutServiceScreen';
import DocumentsScreen from '../screens/registration/DocumentsScreen';
import PendingApprovalScreen from '../screens/registration/PendingApprovalScreen';

const Stack = createStackNavigator();

export default function ProviderRegistrationNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}>
      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{title: "Let's Get to Know You"}}
      />
      <Stack.Screen
        name="ContactInfo"
        component={ContactInfoScreen}
        options={{title: 'Just a Bit More'}}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
        options={{title: 'Verify Email'}}
      />
      <Stack.Screen
        name="Location"
        component={LocationScreen}
        options={{title: 'Set Your Location'}}
      />
      <Stack.Screen
        name="PhoneVerification"
        component={PhoneVerificationScreen}
        options={{title: 'Verify Phone Number'}}
      />
      <Stack.Screen
        name="Password"
        component={PasswordScreen}
        options={{title: 'Secure Your Account'}}
      />
      <Stack.Screen
        name="DateOfBirth"
        component={DateOfBirthScreen}
        options={{title: 'When Were You Born'}}
      />
      <Stack.Screen
        name="ServiceCategories"
        component={ServiceCategoriesScreen}
        options={{title: 'What Services Do You Offer'}}
      />
      <Stack.Screen
        name="AboutService"
        component={AboutServiceScreen}
        options={{title: 'Tell Clients About Yourself'}}
      />
      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{title: 'Upload Documents'}}
      />
      <Stack.Screen
        name="PendingApproval"
        component={PendingApprovalScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}
