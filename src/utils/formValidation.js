/**
 * Form Validation Utilities
 * Real-time validation with support for shake animations
 */

// Validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+63|0)?[0-9]{10,11}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  number: /^\d+$/,
  price: /^\d+(\.\d{1,2})?$/,
};

/**
 * Validation rules
 */
export const validators = {
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    if (!PATTERNS.email.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const cleaned = value.replace(/[\s-]/g, '');
    if (!PATTERNS.phone.test(cleaned)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[a-z]/.test(value)) {
      return 'Password must contain a lowercase letter';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Password must contain an uppercase letter';
    }
    if (!/\d/.test(value)) {
      return 'Password must contain a number';
    }
    if (!/[@$!%*?&#]/.test(value)) {
      return 'Password must contain a special character (@$!%*?&#)';
    }
    return null;
  },

  confirmPassword: (value, password) => {
    if (!value) return null;
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  },

  minLength: (value, min, fieldName = 'This field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max, fieldName = 'This field') => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} must be less than ${max} characters`;
    }
    return null;
  },

  name: (value, fieldName = 'Name') => {
    if (!value) return null;
    if (value.length < 2) {
      return `${fieldName} must be at least 2 characters`;
    }
    if (!PATTERNS.name.test(value)) {
      return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    }
    return null;
  },

  price: (value, fieldName = 'Price') => {
    if (!value) return null;
    if (!PATTERNS.price.test(value)) {
      return `${fieldName} must be a valid amount`;
    }
    if (parseFloat(value) <= 0) {
      return `${fieldName} must be greater than 0`;
    }
    return null;
  },

  minValue: (value, min, fieldName = 'Value') => {
    if (!value) return null;
    if (parseFloat(value) < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return null;
  },

  maxValue: (value, max, fieldName = 'Value') => {
    if (!value) return null;
    if (parseFloat(value) > max) {
      return `${fieldName} must be less than ${max}`;
    }
    return null;
  },

  age: (birthDate, minAge = 18) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < minAge) {
      return `You must be at least ${minAge} years old`;
    }
    return null;
  },
};

/**
 * Validate a single field
 */
export const validateField = (value, rules) => {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
};

/**
 * Validate entire form
 * @param {object} values - Form values
 * @param {object} validationRules - Rules for each field
 * @returns {object} Errors object
 */
export const validateForm = (values, validationRules) => {
  const errors = {};
  
  for (const [field, rules] of Object.entries(validationRules)) {
    const error = validateField(values[field], rules);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
};

/**
 * Check if form is valid
 */
export const isFormValid = (errors) => {
  return Object.keys(errors).length === 0;
};

/**
 * Get password strength
 */
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

/**
 * Create validation rules for common forms
 */
export const createLoginValidation = () => ({
  email: [
    (v) => validators.required(v, 'Email'),
    validators.email,
  ],
  password: [
    (v) => validators.required(v, 'Password'),
  ],
});

export const createRegistrationValidation = () => ({
  firstName: [
    (v) => validators.required(v, 'First name'),
    (v) => validators.name(v, 'First name'),
  ],
  lastName: [
    (v) => validators.required(v, 'Last name'),
    (v) => validators.name(v, 'Last name'),
  ],
  email: [
    (v) => validators.required(v, 'Email'),
    validators.email,
  ],
  phone: [
    (v) => validators.required(v, 'Phone number'),
    validators.phone,
  ],
  password: [
    (v) => validators.required(v, 'Password'),
    validators.password,
  ],
  confirmPassword: [
    (v) => validators.required(v, 'Confirm password'),
  ],
});

export default {
  validators,
  validateField,
  validateForm,
  isFormValid,
  getPasswordStrength,
  createLoginValidation,
  createRegistrationValidation,
};
