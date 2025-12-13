import React from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import {loadingStyles} from '../css/componentStyles';

const LoadingSpinner = ({
  size = 'large',
  color = '#00B14F',
  text,
  fullScreen = false,
  style,
}) => {
  if (fullScreen) {
    return (
      <View style={loadingStyles.fullScreenContainer}>
        <ActivityIndicator size={size} color={color} />
        {text && <Text style={loadingStyles.text}>{text}</Text>}
      </View>
    );
  }

  return (
    <View style={[loadingStyles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={loadingStyles.text}>{text}</Text>}
    </View>
  );
};

export default LoadingSpinner;
