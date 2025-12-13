import React from 'react';
import {View, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {globalStyles} from '../../css/globalStyles';

const ProviderTrackingScreen = () => {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.centerContainer}>
        <Text style={globalStyles.heading3}>Provider Tracking Screen</Text>
        <Text style={globalStyles.bodyMedium}>Implementation in progress</Text>
      </View>
    </SafeAreaView>
  );
};

export default ProviderTrackingScreen;
