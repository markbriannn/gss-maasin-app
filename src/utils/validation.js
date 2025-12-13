import {REGEX_PATTERNS} from '../config/constants';

export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required';
  }
  if (!REGEX_PATTERNS.email.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePassword = (password) => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!REGEX_PATTERNS.password.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
  return null;
};

export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    return 'Phone number is required';
  }
  if (!REGEX_PATTERNS.phoneNumber.test(phoneNumber)) {
    return 'Please enter a valid Philippine phone number';
  }
  return null;
};

export const validateName = (name, fieldName = 'Name') => {
  if (!name) {
    return `${fieldName} is required`;
  }
  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  if (name.length > 50) {
    return `${fieldName} must not exceed 50 characters`;
  }
  return null;
};

export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMinLength = (value, minLength, fieldName = 'This field') => {
  if (!value || value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

export const validateMaxLength = (value, maxLength, fieldName = 'This field') => {
  if (value && value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  return null;
};

export const validateNumber = (value, fieldName = 'This field') => {
  if (value && isNaN(value)) {
    return `${fieldName} must be a valid number`;
  }
  return null;
};

export const validateRange = (value, min, max, fieldName = 'This field') => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  if (numValue < min || numValue > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
};

export const validateMatch = (value1, value2, fieldName1 = 'Password', fieldName2 = 'Confirm Password') => {
  if (value1 !== value2) {
    return `${fieldName1} and ${fieldName2} do not match`;
  }
  return null;
};

export const validateUrl = (url) => {
  if (!url) {
    return 'URL is required';
  }
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

export const validateForm = (values, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach((field) => {
    const fieldRules = rules[field];
    const value = values[field];
    
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const getPasswordStrength = (password) => {
  if (!password) return {score: 0, label: 'None', color: '#E5E7EB'};
  
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return {score, label: 'Weak', color: '#EF4444'};
  if (score <= 4) return {score, label: 'Medium', color: '#F59E0B'};
  return {score, label: 'Strong', color: '#10B981'};
};
