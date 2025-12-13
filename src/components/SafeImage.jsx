import React from 'react';
import { Image, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * SafeImage component wraps React Native Image to handle null/undefined URIs
 * and provides a fallback icon when image is missing.
 */
const SafeImage = ({ 
  source, 
  style, 
  resizeMode = 'cover',
  fallbackIcon = 'image-outline',
  fallbackIconColor = '#9CA3AF',
  fallbackIconSize = 24,
  placeholderStyle = {}
}) => {
  // Extract URI from source object or use as direct source
  const uri = source?.uri || source;
  
  // If no valid URI, show placeholder
  if (!uri || typeof uri !== 'string') {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }, placeholderStyle]}>
        <Icon name={fallbackIcon} size={fallbackIconSize} color={fallbackIconColor} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        // Silently fail on image load error (optional logging)
        console.warn(`Failed to load image: ${uri}`);
      }}
    />
  );
};

export default SafeImage;
