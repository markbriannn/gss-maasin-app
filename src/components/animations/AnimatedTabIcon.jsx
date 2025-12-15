/**
 * Animated Tab Bar Icon
 * Smooth scale and bounce animation when tab is selected
 */

import React, {useEffect, useRef} from 'react';
import {Animated} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const AnimatedTabIcon = ({name, size, color, focused}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Bounce animation when selected
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          useNativeDriver: true,
          speed: 50,
          bounciness: 12,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 8,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{scale: scaleAnim}],
      }}>
      <Icon name={name} size={size} color={color} />
    </Animated.View>
  );
};

export default AnimatedTabIcon;
