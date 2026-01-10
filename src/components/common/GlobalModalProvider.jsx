/**
 * Global Modal Provider
 * Provides premium modals that can be triggered from anywhere in the app
 * Wrap your app with this component and use modalManager to show modals
 */

import {useState, useEffect, useCallback, useRef} from 'react';
import {registerModalCallbacks} from '../../utils/modalManager';
import PremiumModal from './PremiumModal';
import NotificationModal from './NotificationModal';
import ConfirmModal from './ConfirmModal';
import LoadingModal from './LoadingModal';

const GlobalModalProvider = ({children}) => {
  const isRegistered = useRef(false);
  
  // Premium modal state
  const [premiumModal, setPremiumModal] = useState({
    visible: false,
    variant: 'success',
    title: '',
    message: '',
    autoClose: true,
    onClose: null,
  });

  // Notification modal state
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    type: 'default',
    title: '',
    message: '',
    onPress: null,
    autoClose: true,
  });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    isLoading: false,
  });

  // Loading modal state
  const [loadingModal, setLoadingModal] = useState({
    visible: false,
    message: 'Loading...',
  });

  // Show premium modal
  const showPremium = useCallback((options) => {
    setPremiumModal({
      visible: true,
      variant: options.variant || 'success',
      title: options.title || '',
      message: options.message || '',
      autoClose: options.autoClose ?? true,
      onClose: options.onClose,
    });
  }, []);

  // Show notification modal
  const showNotification = useCallback((options) => {
    setNotificationModal({
      visible: true,
      type: options.type || 'default',
      title: options.title || '',
      message: options.message || '',
      onPress: options.onPress,
      autoClose: options.autoClose ?? true,
      image: options.image,
    });
  }, []);

  // Show confirm modal
  const showConfirm = useCallback((options) => {
    setConfirmModal({
      visible: true,
      type: options.type || 'confirm',
      title: options.title || '',
      message: options.message || '',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      destructive: options.destructive,
      isLoading: false,
    });
  }, []);

  // Show loading modal
  const showLoading = useCallback((message = 'Loading...') => {
    setLoadingModal({visible: true, message});
  }, []);

  // Hide loading modal
  const hideLoading = useCallback(() => {
    setLoadingModal(prev => ({...prev, visible: false}));
  }, []);

  // Register callbacks immediately on mount
  useEffect(() => {
    if (!isRegistered.current) {
      registerModalCallbacks({
        showPremium,
        showNotification,
        showConfirm,
        showLoading,
        hideLoading,
      });
      isRegistered.current = true;
    }
  }, [showPremium, showNotification, showConfirm, showLoading, hideLoading]);

  // Close handlers
  const closePremium = useCallback(() => {
    setPremiumModal(prev => ({...prev, visible: false}));
  }, []);

  const closeNotification = useCallback(() => {
    setNotificationModal(prev => ({...prev, visible: false}));
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(prev => ({...prev, visible: false}));
  }, []);

  const handleConfirm = useCallback(() => {
    const onConfirmFn = confirmModal.onConfirm;
    closeConfirm();
    onConfirmFn?.();
  }, [confirmModal.onConfirm, closeConfirm]);

  const handlePremiumClose = useCallback(() => {
    const onCloseFn = premiumModal.onClose;
    closePremium();
    onCloseFn?.();
  }, [premiumModal.onClose, closePremium]);

  return (
    <>
      {children}
      
      {/* Global Loading Modal */}
      <LoadingModal
        visible={loadingModal.visible}
        message={loadingModal.message}
      />
      
      {/* Global Premium Modal */}
      <PremiumModal
        visible={premiumModal.visible}
        variant={premiumModal.variant}
        title={premiumModal.title}
        message={premiumModal.message}
        primaryButton={{text: 'OK', onPress: handlePremiumClose}}
        onClose={handlePremiumClose}
        autoClose={premiumModal.autoClose}
        autoCloseDelay={3000}
      />
      
      {/* Global Notification Modal */}
      <NotificationModal
        visible={notificationModal.visible}
        type={notificationModal.type}
        title={notificationModal.title}
        message={notificationModal.message}
        image={notificationModal.image}
        onPress={notificationModal.onPress}
        onClose={closeNotification}
        autoClose={notificationModal.autoClose}
        autoCloseDelay={4000}
      />
      
      {/* Global Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmModal.onCancel || closeConfirm}
        isLoading={confirmModal.isLoading}
        destructive={confirmModal.destructive}
      />
    </>
  );
};

export default GlobalModalProvider;
