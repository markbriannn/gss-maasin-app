import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { globalStyles } from '../../css/globalStyles';
import { useTheme } from '../../context/ThemeContext';

const ProviderDetailsScreen = () => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: colors.background }]}>
      <View style={globalStyles.centerContainer}>
        <Text style={[globalStyles.heading3, { color: colors.text }]}>Provider Details Screen</Text>
        <Text style={[globalStyles.bodyMedium, { color: colors.textSecondary }]}>Implementation in progress</Text>
      </View>
    </SafeAreaView>
  );
};

export default ProviderDetailsScreen;
