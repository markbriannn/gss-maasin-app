import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {emptyStateStyles} from '../css/componentStyles';

const EmptyState = ({
  icon = 'file-tray-outline',
  title = 'No data',
  description,
  actionText,
  onActionPress,
  style,
}) => {
  return (
    <View style={[emptyStateStyles.container, style]}>
      <View style={emptyStateStyles.iconContainer}>
        <Icon name={icon} size={80} color="#E5E7EB" />
      </View>
      <Text style={emptyStateStyles.title}>{title}</Text>
      {description && (
        <Text style={emptyStateStyles.description}>{description}</Text>
      )}
      {actionText && onActionPress && (
        <TouchableOpacity
          style={emptyStateStyles.button}
          onPress={onActionPress}>
          <Text style={emptyStateStyles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EmptyState;
