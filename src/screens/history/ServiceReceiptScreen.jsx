import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { globalStyles } from '../../css/globalStyles';
import { receiptStyles as styles } from '../../css/historyStyles';

const ServiceReceiptScreen = ({ navigation, route }) => {
  const { booking, isProvider = false } = route.params || {};

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receipt</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6B7280' }}>Receipt not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Extract booking data
  const {
    id,
    serviceCategory,
    description,
    status,
    createdAt,
    completedAt,
    otherParty,
    // Pricing
    providerPrice,
    offeredPrice,
    totalAmount,
    price,
    systemFee = 0,
    systemFeePercentage = 5,
    additionalCharges = [],
    // Location
    streetAddress,
    barangay,
    location,
    // Dates
    scheduledDate,
    scheduledTime,
    // Review
    review,
    rating,
  } = booking;

  // Calculate amounts
  const baseAmount = providerPrice || offeredPrice || totalAmount || price || 0;
  const additionalTotal = additionalCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const subtotal = baseAmount + additionalTotal;
  const finalSystemFee = isProvider ? systemFee : 0; // Only providers pay system fee
  const finalTotal = subtotal;

  // Format dates
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#10B981';
      case 'cancelled': 
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'checkmark-circle';
      case 'cancelled':
      case 'rejected': return 'close-circle';
      default: return 'time';
    }
  };

  const handleShare = async () => {
    try {
      const receiptText = `
GSS Maasin Service Receipt
--------------------------
Receipt #: ${id?.slice(-8).toUpperCase() || 'N/A'}
Date: ${formatDate(completedAt || createdAt)}

Service: ${serviceCategory || 'Service'}
${isProvider ? 'Client' : 'Provider'}: ${otherParty?.name || 'N/A'}

Location: ${streetAddress ? `${streetAddress}, ${barangay}` : location || 'N/A'}

--------------------------
Service Fee: ₱${baseAmount.toLocaleString()}
${additionalCharges.length > 0 ? `Additional Charges: ₱${additionalTotal.toLocaleString()}` : ''}
${isProvider ? `System Fee (${systemFeePercentage}%): -₱${finalSystemFee.toLocaleString()}` : ''}
--------------------------
Total: ₱${(isProvider ? subtotal - finalSystemFee : finalTotal).toLocaleString()}

Thank you for using GSS Maasin!
      `.trim();

      await Share.share({
        message: receiptText,
        title: 'Service Receipt',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownload = () => {
    Alert.alert(
      'Download Receipt',
      'Receipt will be saved as PDF to your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: () => {
            // In a real app, implement PDF generation here
            Alert.alert('Success', 'Receipt downloaded successfully!');
          }
        },
      ]
    );
  };

  const handleRebook = () => {
    if (otherParty?.id) {
      navigation.navigate('BookService', {
        providerId: otherParty.id,
        providerName: otherParty.name,
        providerService: serviceCategory,
      });
    } else {
      navigation.navigate('ClientHome');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={18}
          color={i <= rating ? '#F59E0B' : '#D1D5DB'}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Receipt</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Icon name="share-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptCard}>
          {/* Receipt Header */}
          <View style={styles.receiptHeader}>
            <View style={styles.receiptLogo}>
              <Text style={styles.receiptLogoText}>G</Text>
            </View>
            <Text style={styles.receiptTitle}>GSS Maasin</Text>
            <Text style={styles.receiptSubtitle}>Service Receipt</Text>
          </View>

          {/* Status Section */}
          <View style={styles.statusSection}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(status) + '20' }]}>
              <Icon name={getStatusIcon(status)} size={20} color={getStatusColor(status)} />
            </View>
            <Text style={[styles.statusLabel, { color: getStatusColor(status) }]}>
              {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
            </Text>
          </View>

          {/* Receipt Body */}
          <View style={styles.receiptBody}>
            {/* Service Details */}
            <View style={styles.receiptSection}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Service</Text>
                <Text style={styles.infoValue}>{serviceCategory || 'Service'}</Text>
              </View>
              {description && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.infoValue} numberOfLines={3}>{description}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{scheduledDate || formatDate(completedAt || createdAt)}</Text>
              </View>
              {scheduledTime && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>{scheduledTime}</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Person Details */}
            <View style={styles.receiptSection}>
              <Text style={styles.sectionTitle}>{isProvider ? 'Client' : 'Service Provider'}</Text>
              <View style={styles.personCard}>
                <View style={styles.personAvatar}>
                  {otherParty?.photo ? (
                    <Image 
                      source={{ uri: otherParty.photo }} 
                      style={{ width: 48, height: 48, borderRadius: 24 }} 
                    />
                  ) : (
                    <Text style={styles.personAvatarText}>
                      {otherParty?.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{otherParty?.name || 'Unknown'}</Text>
                  <Text style={styles.personRole}>{isProvider ? 'Client' : 'Provider'}</Text>
                </View>
                {!isProvider && otherParty?.rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{otherParty.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Location */}
            <View style={styles.receiptSection}>
              <Text style={styles.sectionTitle}>Service Location</Text>
              <View style={styles.infoRow}>
                <Icon name="location-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'left' }]}>
                  {streetAddress ? `${streetAddress}, ${barangay}` : location || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            {/* Payment Breakdown */}
            <View style={styles.receiptSection}>
              <Text style={styles.sectionTitle}>Payment Details</Text>
              
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service Fee</Text>
                <Text style={styles.priceValue}>₱{baseAmount.toLocaleString()}</Text>
              </View>

              {/* Additional Charges */}
              {additionalCharges.length > 0 && (
                <View style={styles.additionalSection}>
                  <Text style={styles.additionalTitle}>Additional Charges</Text>
                  {additionalCharges.map((charge, index) => (
                    <View key={index} style={styles.additionalItem}>
                      <Text style={styles.additionalLabel}>{charge.reason || 'Additional'}</Text>
                      <Text style={styles.additionalValue}>₱{(charge.amount || 0).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              )}

              {isProvider && systemFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>System Fee ({systemFeePercentage}%)</Text>
                  <Text style={[styles.priceValue, { color: '#EF4444' }]}>-₱{systemFee.toLocaleString()}</Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {isProvider ? 'Your Earnings' : 'Total Paid'}
                </Text>
                <Text style={styles.totalValue}>
                  ₱{(isProvider ? subtotal - systemFee : finalTotal).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Review Section (for completed jobs) */}
            {status === 'completed' && (rating || review) && (
              <>
                <View style={styles.divider} />
                <View style={styles.receiptSection}>
                  <View style={styles.reviewSection}>
                    <View style={styles.reviewHeader}>
                      <Icon name="star" size={18} color="#065F46" />
                      <Text style={styles.reviewTitle}>
                        {isProvider ? 'Client Review' : 'Your Review'}
                      </Text>
                    </View>
                    {rating && (
                      <View style={styles.starsContainer}>
                        {renderStars(rating)}
                      </View>
                    )}
                    {review ? (
                      <Text style={styles.reviewText}>"{review}"</Text>
                    ) : (
                      <Text style={styles.noReviewText}>No written review</Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Receipt Footer */}
          <View style={styles.receiptFooter}>
            <Text style={styles.receiptId}>Receipt #{id?.slice(-8).toUpperCase() || 'N/A'}</Text>
            <Text style={styles.receiptDate}>
              Generated on {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            
            {/* QR Code Placeholder */}
            <View style={styles.qrContainer}>
              <View style={styles.qrPlaceholder}>
                <Icon name="qr-code-outline" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.qrText}>Scan for verification</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Icon name="download-outline" size={20} color="#374151" />
          <Text style={styles.downloadButtonText}>Download</Text>
        </TouchableOpacity>
        
        {!isProvider && status === 'completed' && (
          <TouchableOpacity style={styles.rebookButton} onPress={handleRebook}>
            <Icon name="refresh-outline" size={20} color="#FFFFFF" />
            <Text style={styles.rebookButtonText}>Book Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ServiceReceiptScreen;
