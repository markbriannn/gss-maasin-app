import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

// Import registration screens
import PersonalInfoScreen from '../screens/registration/PersonalInfoScreen';
import ContactInfoScreen from '../screens/registration/ContactInfoScreen';
import EmailVerificationScreen from '../screens/registration/EmailVerificationScreen';
import LocationScreen from '../screens/registration/LocationScreen';
import PhoneVerificationScreen from '../screens/registration/PhoneVerificationScreen';
import PasswordScreen from '../screens/registration/PasswordScreen';
import ProfilePhotoScreen from '../screens/registration/ProfilePhotoScreen';
import CompletionScreen from '../screens/registration/CompletionScreen';

const Stack = createStackNavigator();

export default function ClientRegistrationNavigator() {
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
        options={{title: 'Personal Information'}}
      />
      <Stack.Screen
        name="ContactInfo"
        component={ContactInfoScreen}
        options={{title: 'Contact Information'}}
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
        options={{title: 'Create Password'}}
      />
      <Stack.Screen
        name="ProfilePhoto"
        component={ProfilePhotoScreen}
        options={{title: 'Profile Photo'}}
      />
      <Stack.Screen
        name="Completion"
        component={CompletionScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}
