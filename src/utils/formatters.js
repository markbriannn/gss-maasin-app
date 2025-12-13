export const formatCurrency = (amount, currency = '₱') => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  return `${currency}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('63')) {
    const number = cleaned.substring(2);
    if (number.length === 10) {
      return `+63 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }
  }
  
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }
  
  return phoneNumber;
};

export const formatDistance = (distanceInKm) => {
  if (typeof distanceInKm !== 'number') {
    distanceInKm = parseFloat(distanceInKm) || 0;
  }
  
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
  
  return `${distanceInKm.toFixed(1)} km`;
};

export const formatRating = (rating, maxRating = 5) => {
  if (typeof rating !== 'number') {
    rating = parseFloat(rating) || 0;
  }
  return rating.toFixed(1);
};

export const formatPercentage = (value, decimals = 0) => {
  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }
  return `${value.toFixed(decimals)}%`;
};

export const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number') {
    bytes = parseFloat(bytes) || 0;
  }
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatName = (firstName, middleName, lastName, suffix) => {
  let fullName = firstName || '';
  
  if (middleName) {
    fullName += ` ${middleName}`;
  }
  
  if (lastName) {
    fullName += ` ${lastName}`;
  }
  
  if (suffix) {
    fullName += ` ${suffix}`;
  }
  
  return fullName.trim();
};

export const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [];
  
  if (address.streetAddress) parts.push(address.streetAddress);
  if (address.barangay) parts.push(address.barangay);
  if (address.city) parts.push(address.city);
  if (address.province) parts.push(address.province);
  
  return parts.join(', ');
};

export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + suffix;
};

export const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ');
};

export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

export const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  
  const visibleChars = Math.min(3, Math.floor(username.length / 2));
  const masked = username.substring(0, visibleChars) + '***';
  return `${masked}@${domain}`;
};

export const maskPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return phoneNumber;
  
  const last4 = cleaned.slice(-4);
  return `${'*'.repeat(cleaned.length - 4)}${last4}`;
};
