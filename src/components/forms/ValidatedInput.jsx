/**
 * ValidatedInput Component
 * Input with real-time validation and shake animation on error
 */

import React, {useState, useRef, useEffect} from 'react';
import {View, Text, TextInput, Animated, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ValidatedInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  touched,
  onBlur,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon,
  rightIcon,
  onRightIconPress,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  showCharCount = false,
  validateOnChange = true,
  validator,
  isDark = false,
  theme = {},
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Shake animation when error appears
  useEffect(() => {
    if ((error || localError) && touched) {
      triggerShake();
    }
  }, [error, localError, touched]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 50, useNativeDriver: true}),
    ]).start();
  };

  const handleChangeText = (text) => {
    onChangeText(text);
    
    // Real-time validation
    if (validateOnChange && validator) {
      const validationError = validator(text);
      setLocalError(validationError);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) onBlur();
    
    // Validate on blur
    if (validator) {
      const validationError = validator(value);
      setLocalError(validationError);
    }
  };

  const displayError = error || localError;
  const hasError = displayError && touched;
  const isValid = touched && !displayError && value;

  const getBorderColor = () => {
    if (hasError) return '#EF4444';
    if (isValid) return '#10B981';
    if (isFocused) return '#00B14F';
    return isDark ? theme.colors?.border || '#374151' : '#E5E7EB';
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        {transform: [{translateX: shakeAnim}]}
      ]}
    >
      {label && (
        <Text style={[
          styles.label,
          isDark && {color: theme.colors?.text || '#F9FAFB'}
        ]}>
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        {borderColor: getBorderColor()},
        isFocused && styles.inputFocused,
        hasError && styles.inputError,
        isValid && styles.inputValid,
        isDark && {backgroundColor: theme.colors?.card || '#1F2937'},
        !editable && styles.inputDisabled,
      ]}>
        {icon && (
          <Icon 
            name={icon} 
            size={20} 
            color={hasError ? '#EF4444' : isDark ? '#9CA3AF' : '#6B7280'} 
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
            isDark && {color: theme.colors?.text || '#F9FAFB'},
            inputStyle,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
        />
        
        {/* Status icon */}
        {isValid && !rightIcon && (
          <Icon name="checkmark-circle" size={20} color="#10B981" style={styles.rightIcon} />
        )}
        
        {hasError && !rightIcon && (
          <Icon name="alert-circle" size={20} color="#EF4444" style={styles.rightIcon} />
        )}
        
        {rightIcon && (
          <Icon 
            name={rightIcon} 
            size={20} 
            color={isDark ? '#9CA3AF' : '#6B7280'} 
            style={styles.rightIcon}
            onPress={onRightIconPress}
          />
        )}
      </View>
      
      {/* Error message */}
      {hasError && (
        <Animated.View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{displayError}</Text>
        </Animated.View>
      )}
      
      {/* Character count */}
      {showCharCount && maxLength && (
        <Text style={[
          styles.charCount,
          isDark && {color: theme.colors?.textSecondary || '#9CA3AF'}
        ]}>
          {value?.length || 0}/{maxLength}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: '#00B14F',
    shadowColor: '#00B14F',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputValid: {
    borderColor: '#10B981',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginRight: 4,
  },
  rightIcon: {
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ValidatedInput;
