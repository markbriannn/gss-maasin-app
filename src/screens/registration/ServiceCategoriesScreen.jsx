import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {SERVICE_CATEGORIES} from '../../config/constants';

const ServiceCategoriesScreen = ({navigation, route}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
  };

  const handleNext = () => {
    if (selectedCategory) {
      navigation.navigate('AboutService', {
        ...route.params,
        serviceCategory: selectedCategory,
        // Keep backward compatibility
        serviceCategories: [selectedCategory],
      });
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '70%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 7 of 9</Text>
        <Text style={authStyles.title}>Service Category</Text>
        <Text style={authStyles.subtitle}>
          Select the main service you provide
        </Text>

        <View style={{marginTop: 24}}>
          {SERVICE_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor:
                  selectedCategory === category.name ? '#D1FAE5' : '#F9FAFB',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 2,
                borderColor:
                  selectedCategory === category.name ? '#00B14F' : 'transparent',
              }}
              onPress={() => handleSelectCategory(category.name)}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: category.color + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                <Icon name={category.icon} size={24} color={category.color} />
              </View>
              <View style={{flex: 1}}>
                <Text
                  style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
                  {category.name}
                </Text>
                {category.description && (
                  <Text
                    style={{fontSize: 13, color: '#6B7280', marginTop: 2}}>
                    {category.description}
                  </Text>
                )}
              </View>
              {selectedCategory === category.name ? (
                <Icon name="checkmark-circle" size={24} color="#00B14F" />
              ) : (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: '#D1D5DB',
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            authStyles.button,
            authStyles.buttonPrimary,
            !selectedCategory && {backgroundColor: '#D1D5DB'},
          ]}
          onPress={handleNext}
          disabled={!selectedCategory}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ServiceCategoriesScreen;
