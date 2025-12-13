import React from 'react';
import {View, Text, TouchableOpacity, ScrollView, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';

const ProfilePhotoScreen = ({navigation, route}) => {
  const handleSkip = () => {
    navigation.navigate('Completion', route.params);
  };

  const handleUpload = () => {
    // Image picker implementation
    handleSkip();
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '84%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 6 of 7</Text>
        <Text style={authStyles.title}>Profile Photo</Text>
        <Text style={authStyles.subtitle}>Add a photo to personalize your profile</Text>

        <View style={{alignItems: 'center', marginVertical: 32}}>
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Icon name="person" size={60} color="#9CA3AF" />
          </View>
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleUpload}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Upload Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonOutline]}
          onPress={handleSkip}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextOutline]}>Skip for Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfilePhotoScreen;
