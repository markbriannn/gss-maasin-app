import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const PHOTO_GUIDE_STEPS = [
  {
    title: "Step 1: Get Close",
    description: "Move closer to the problem area so we can see it clearly",
    icon: "🔍",
    tip: "Hold your phone steady"
  },
  {
    title: "Step 2: Good Lighting",
    description: "Make sure the area is well-lit. Turn on lights if needed",
    icon: "💡",
    tip: "Avoid shadows"
  },
  {
    title: "Step 3: Clear View",
    description: "Show the whole problem in the photo",
    icon: "📷",
    tip: "Take multiple angles"
  }
];

const PhotoGuideModal = ({ visible, onClose, isDark = false }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon name="close" size={28} color={isDark ? '#FFFFFF' : '#1F2937'} />
          </TouchableOpacity>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            marginLeft: 16,
            color: isDark ? '#FFFFFF' : '#1F2937',
          }}>
            📸 Photo Guide
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Introduction */}
          <View style={{
            backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            borderWidth: 2,
            borderColor: '#10B981',
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: isDark ? '#A7F3D0' : '#065F46',
              marginBottom: 8,
            }}>
              How to Take Good Photos
            </Text>
            <Text style={{
              fontSize: 16,
              color: isDark ? '#6EE7B7' : '#047857',
              lineHeight: 24,
            }}>
              Follow these simple steps to help the provider understand what needs to be fixed
            </Text>
          </View>

          {/* Steps */}
          {PHOTO_GUIDE_STEPS.map((step, index) => (
            <View
              key={index}
              style={{
                backgroundColor: isDark ? '#374151' : '#F0FDF4',
                borderRadius: 20,
                padding: 24,
                marginBottom: 20,
                borderWidth: 3,
                borderColor: '#10B981',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {/* Step Number Badge */}
              <View style={{
                position: 'absolute',
                top: -12,
                left: 20,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#10B981',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 4,
                borderColor: isDark ? '#1F2937' : '#FFFFFF',
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                  {index + 1}
                </Text>
              </View>

              {/* Icon */}
              <Text style={{
                fontSize: 64,
                textAlign: 'center',
                marginBottom: 16,
                marginTop: 12,
              }}>
                {step.icon}
              </Text>

              {/* Title */}
              <Text style={{
                fontSize: 22,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 12,
                color: isDark ? '#FFFFFF' : '#1F2937',
              }}>
                {step.title}
              </Text>

              {/* Description */}
              <Text style={{
                fontSize: 18,
                textAlign: 'center',
                color: isDark ? '#D1D5DB' : '#4B5563',
                lineHeight: 26,
                marginBottom: 12,
              }}>
                {step.description}
              </Text>

              {/* Tip */}
              <View style={{
                backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE',
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="bulb" size={20} color="#3B82F6" />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#3B82F6',
                    marginLeft: 8,
                  }}>
                    Tip:
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: isDark ? '#93C5FD' : '#1E40AF',
                    marginLeft: 4,
                  }}>
                    {step.tip}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Additional Tips */}
          <View style={{
            backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="information-circle" size={24} color="#3B82F6" />
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: isDark ? '#93C5FD' : '#1E40AF',
                marginLeft: 8,
              }}>
                More Tips
              </Text>
            </View>
            <View style={{ marginLeft: 32 }}>
              <Text style={{
                fontSize: 16,
                color: isDark ? '#BFDBFE' : '#1E3A8A',
                lineHeight: 24,
                marginBottom: 8,
              }}>
                • Take 2-3 photos from different angles
              </Text>
              <Text style={{
                fontSize: 16,
                color: isDark ? '#BFDBFE' : '#1E3A8A',
                lineHeight: 24,
                marginBottom: 8,
              }}>
                • Clean the camera lens before taking photos
              </Text>
              <Text style={{
                fontSize: 16,
                color: isDark ? '#BFDBFE' : '#1E3A8A',
                lineHeight: 24,
                marginBottom: 8,
              }}>
                • Show the surrounding area for context
              </Text>
              <Text style={{
                fontSize: 16,
                color: isDark ? '#BFDBFE' : '#1E3A8A',
                lineHeight: 24,
              }}>
                • Avoid blurry photos - hold phone steady
              </Text>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#10B981',
              borderRadius: 20,
              padding: 20,
              alignItems: 'center',
              marginBottom: 20,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}>
              ✓ Got It! Let's Start
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default PhotoGuideModal;
