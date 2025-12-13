import React, {useState} from 'react';
import {View, TextInput, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {inputStyles} from '../css/componentStyles';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  rightIcon,
  onRightIconPress,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry && !rightIcon;

  return (
    <View style={[inputStyles.container, style]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      
      <View
        style={[
          inputStyles.inputContainer,
          isFocused && inputStyles.inputContainerFocused,
          error && inputStyles.inputContainerError,
          !editable && inputStyles.inputContainerDisabled,
        ]}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={error ? '#EF4444' : isFocused ? '#00B14F' : '#9CA3AF'}
            style={inputStyles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            inputStyles.input,
            multiline && inputStyles.inputMultiline,
            icon && {paddingLeft: 0},
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={inputStyles.rightIcon}>
            <Icon
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={inputStyles.rightIcon}>
            <Icon name={rightIcon} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={inputStyles.errorText}>{error}</Text>}
      
      {maxLength && (
        <Text style={inputStyles.helperText}>
          {value.length} / {maxLength}
        </Text>
      )}
    </View>
  );
};

export default Input;
