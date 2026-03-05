import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import paymentService from '../../services/paymentService';

const QRPaymentModal = ({
  visible,
  checkoutUrl,
  amount,
  bookingId, // Add bookingId prop
  onClose,
  onPaymentComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentDetected, setPaymentDetected] = useState(false);
  const [modalOpenTime, setModalOpenTime] = useState(null);
  const webViewRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Track when modal opens to prevent false positives
  useEffect(() => {
    if (visible) {
      setModalOpenTime(Date.now());
    } else {
      setModalOpenTime(null);
      setPaymentDetected(false);
    }
  }, [visible]);

  // Poll payment status every 2 seconds for faster updates
  // BUT only start polling after a delay to give user time to scan
  useEffect(() => {
    if (!visible || !bookingId) {
      // Clear polling when modal closes
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    console.log('[QRPayment] Starting payment status polling for booking:', bookingId);
    
    // IMPORTANT: Wait 8 seconds before starting to poll
    // This prevents false positives from old payment records
    const startPollingTimeout = setTimeout(() => {
      // Check immediately after delay
      checkPaymentStatus();
      
      // Then check every 2 seconds for faster response
      pollIntervalRef.current = setInterval(() => {
        checkPaymentStatus();
      }, 2000);
    }, 8000); // Wait 8 seconds before first check

    return () => {
      clearTimeout(startPollingTimeout);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [visible, bookingId]);

  const checkPaymentStatus = async () => {
    if (!bookingId || checkingPayment || paymentDetected) return;
    
    try {
      setCheckingPayment(true);
      const result = await paymentService.verifyAndProcessPayment(bookingId);
      
      if (result.success && result.status === 'paid') {
        // IMPORTANT: Only trigger success if modal has been open for at least 10 seconds
        // This ensures user had time to actually scan and complete payment
        // Prevents false positives from old payment records
        const timeElapsed = Date.now() - (modalOpenTime || 0);
        if (timeElapsed < 10000) {
          console.log('[QRPayment] Payment detected but modal opened only', Math.round(timeElapsed/1000), 'seconds ago - ignoring (likely old record)');
          return;
        }
        
        console.log('[QRPayment] Payment detected as paid after', Math.round(timeElapsed/1000), 'seconds!');
        setPaymentDetected(true);
        
        // Clear polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        // Show success message immediately
        Alert.alert(
          'Payment Successful! 💰',
          'Your payment has been received. Your booking is now being processed.',
          [{ 
            text: 'OK', 
            onPress: () => {
              // Notify parent
              if (onPaymentComplete) {
                onPaymentComplete();
              }
              onClose();
            }
          }]
        );
      }
    } catch (err) {
      console.log('[QRPayment] Error checking payment status:', err);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    
    // Check if payment was successful (redirected to success page)
    if (url.includes('/payment/success') || url.includes('status=paid')) {
      console.log('[QRPayment] Payment successful');
      if (onPaymentComplete) {
        onPaymentComplete();
      }
      onClose();
    }
    
    // Check if payment failed
    if (url.includes('/payment/failed') || url.includes('status=failed')) {
      console.log('[QRPayment] Payment failed');
      setError('Payment was not completed. Please try again.');
    }
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[QRPayment] WebView error:', nativeEvent);
    setError('Failed to load payment page. Please check your connection.');
  };

  const handleClose = () => {
    setLoading(true);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Icon name="qrcode-scan" size={24} color="#fff" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Scan QR Code to Pay</Text>
              <Text style={styles.headerAmount}>₱{amount?.toLocaleString()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Icon name="information-outline" size={20} color="#7C3AED" />
          <Text style={styles.instructionsText}>
            Scan the QR code with your banking app (GCash, Maya, BPI, etc.). Payment will be detected automatically within seconds.
          </Text>
        </View>

        {/* WebView */}
        {checkoutUrl ? (
          <View style={styles.webViewContainer}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>Loading payment page...</Text>
              </View>
            )}
            
            {error ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setError(null);
                    setLoading(true);
                    webViewRef.current?.reload();
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <WebView
                ref={webViewRef}
                source={{ uri: checkoutUrl }}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={handleError}
                onNavigationStateChange={handleNavigationStateChange}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
              />
            )}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>No payment URL provided</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {paymentDetected ? (
            <>
              <Icon name="check-circle" size={20} color="#10B981" />
              <Text style={[styles.footerText, { color: '#065F46' }]}>
                Payment Received! Processing...
              </Text>
            </>
          ) : checkingPayment ? (
            <>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={[styles.footerText, { color: '#6B21A8' }]}>
                Checking payment status...
              </Text>
            </>
          ) : (
            <>
              <Icon name="shield-check-outline" size={20} color="#10B981" />
              <Text style={styles.footerText}>
                Secured by PayMongo • Your payment is safe and encrypted
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#6B21A8',
    lineHeight: 18,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#065F46',
  },
});

export default QRPaymentModal;
