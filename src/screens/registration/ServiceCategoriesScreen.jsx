import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { authStyles } from '../../css/authStyles';
import { SERVICE_CATEGORIES } from '../../config/constants';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const ServiceCategoriesScreen = ({ navigation, route }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState(SERVICE_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'serviceCategories'))
      .then(snap => {
        if (!snap.empty) {
          const cats = snap.docs.map(d => ({
            id: d.id,
            name: d.data().name || '',
            // Map Firestore emoji icon to Ionicons name for mobile
            icon: iconNameFromCategory(d.data().name || ''),
            color: d.data().color || '#6B7280',
          }));
          setCategories(cats);
        }
      })
      .catch(() => {
        // Keep hardcoded fallback on error
      })
      .finally(() => setLoading(false));
  }, []);

  // Map category name to an Ionicons icon name
  const iconNameFromCategory = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('electric')) return 'flash';
    if (lower.includes('plumb')) return 'water';
    if (lower.includes('carpenter') || lower.includes('wood')) return 'hammer';
    if (lower.includes('clean')) return 'sparkles';
    return 'construct';
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
  };

  const handleNext = () => {
    if (selectedCategory) {
      navigation.navigate('AboutService', {
        ...route.params,
        serviceCategory: selectedCategory,
        serviceCategories: [selectedCategory],
      });
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, { width: '70%' }]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 7 of 9</Text>
        <Text style={authStyles.title}>Service Category</Text>
        <Text style={authStyles.subtitle}>
          Select the main service you provide
        </Text>

        <View style={{ marginTop: 24 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#00B14F" style={{ marginVertical: 32 }} />
          ) : (
            categories.map((category) => (
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
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937' }}>
                    {category.name}
                  </Text>
                  {category.description && (
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
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
            ))
          )}
        </View>

        {/* System Rate Info */}
        {selectedCategory ? (
          <View style={{
            backgroundColor: '#ECFDF5',
            borderWidth: 1,
            borderColor: '#6EE7B7',
            borderRadius: 12,
            padding: 14,
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <Text style={{ fontSize: 18 }}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46' }}>System Rate</Text>
              <Text style={{ fontSize: 13, color: '#047857', marginTop: 2 }}>
                The platform sets a fixed rate of{' '}
                <Text style={{ fontWeight: '700' }}>₱200 per job</Text>{' '}
                for {selectedCategory}. You will receive this amount for every completed job.
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            authStyles.button,
            authStyles.buttonPrimary,
            !selectedCategory && { backgroundColor: '#D1D5DB' },
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
