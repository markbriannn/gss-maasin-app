/**
 * useModal Hook
 * Easy modal state management for premium modals
 * 
 * Usage:
 * const {showSuccess, showError, showConfirm, ModalComponent} = useModal();
 * 
 * showSuccess({title: 'Done!', message: 'Action completed'});
 * showError({title: 'Oops!', message: 'Something went wrong'});
 * showConfirm({
 *   title: 'Delete?',
 *   message: 'This cannot be undone',
 *   onConfirm: () => handleDelete(),
 * });
 */

import React, {useState, useCallback} from 'react';
import {PremiumModal, ConfirmModal, NotificationModal, LoadingModal} from '../components/common';

const useModal = () => {
  // Premium modal state
  const [premiumModal, setPremiumModal] = useState({
    visible: false,
    variant: 'info',
    title: '',
    message: '',
    primaryButton: null,
    secondaryButton: null,
    autoClose: false,
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

  // Notification modal state
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    type: 'default',
    title: '',
    message: '',
    onPress: null,
  });

  // Loading modal state
  const [loadingModal, setLoadingModal] = useState({
    visible: false,
    message: 'Loading...',
    subMessage: '',
  });

  // Show success modal
  const showSuccess = useCallback((options = {}) => {
    setPremiumModal({
      visible: true,
      variant: 'success',
      title: options.title || 'Success!',
      message: options.message || 'Action completed successfully',
      primaryButton: options.primaryButton || {text: 'OK', onPress: () => hideModal()},
      secondaryButton: options.secondaryButton,
      autoClose: options.autoClose ?? true,
      autoCloseDelay: options.autoCloseDelay || 3000,
    });
  }, []);

  // Show error modal
  const showError = useCallback((options = {}) => {
    setPremiumModal({
      visible: true,
      variant: 'error',
      title: options.title || 'Error',
      message: options.message || 'Something went wrong',
      primaryButton: options.primaryButton || {text: 'OK', onPress: () => hideModal()},
      secondaryButton: options.secondaryButton,
      autoClose: false,
    });
  }, []);

  // Show warning modal
  const showWarning = useCallback((options = {}) => {
    setPremiumModal({
      visible: true,
      variant: 'warning',
      title: options.title || 'Warning',
      message: options.message || 'Please be careful',
      primaryButton: options.primaryButton || {text: 'OK', onPress: () => hideModal()},
      secondaryButton: options.secondaryButton,
      autoClose: false,
    });
  }, []);

  // Show info modal
  const showInfo = useCallback((options = {}) => {
    setPremiumModal({
      visible: true,
      variant: 'info',
      title: options.title || 'Info',
      message: options.message || '',
      primaryButton: options.primaryButton || {text: 'Got it', onPress: () => hideModal()},
      secondaryButton: options.secondaryButton,
      autoClose: options.autoClose ?? false,
    });
  }, []);

  // Show payment modal
  const showPayment = useCallback((options = {}) => {
    setPremiumModal({
      visible: true,
      variant: 'payment',
      title: options.title || 'Payment Successful',
      message: options.message || 'Your payment has been processed',
      primaryButton: options.primaryButton || {text: 'Continue', onPress: () => hideModal()},
      secondaryButton: options.secondaryButton,
      autoClose: options.autoClose ?? true,
    });
  }, []);

  // Show confirm modal
  const showConfirm = useCallback((options = {}) => {
    setConfirmModal({
      visible: true,
      type: options.type || 'confirm',
      title: options.title || 'Confirm',
      message: options.message || 'Are you sure?',
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel || (() => hideConfirm()),
      isLoading: false,
      destructive: options.destructive || false,
    });
  }, []);

  // Show delete confirmation
  const showDelete = useCallback((options = {}) => {
    showConfirm({
      type: 'delete',
      title: options.title || 'Delete?',
      message: options.message || 'This action cannot be undone.',
      destructive: true,
      ...options,
    });
  }, [showConfirm]);

  // Show notification toast
  const showNotification = useCallback((options = {}) => {
    setNotificationModal({
      visible: true,
      type: options.type || 'default',
      title: options.title || 'Notification',
      message: options.message || '',
      image: options.image,
      onPress: options.onPress,
      autoClose: options.autoClose ?? true,
      autoCloseDelay: options.autoCloseDelay || 4000,
    });
  }, []);

  // Show loading modal
  const showLoading = useCallback((options = {}) => {
    setLoadingModal({
      visible: true,
      message: options.message || 'Loading...',
      subMessage: options.subMessage || '',
    });
  }, []);

  // Hide loading modal
  const hideLoading = useCallback(() => {
    setLoadingModal(prev => ({...prev, visible: false}));
  }, []);

  // Hide modals
  const hideModal = useCallback(() => {
    setPremiumModal(prev => ({...prev, visible: false}));
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmModal(prev => ({...prev, visible: false}));
  }, []);

  const hideNotification = useCallback(() => {
    setNotificationModal(prev => ({...prev, visible: false}));
  }, []);

  // Set confirm loading state
  const setConfirmLoading = useCallback((loading) => {
    setConfirmModal(prev => ({...prev, isLoading: loading}));
  }, []);

  // Modal components to render
  const ModalComponents = () => (
    <>
      <PremiumModal
        visible={premiumModal.visible}
        variant={premiumModal.variant}
        title={premiumModal.title}
        message={premiumModal.message}
        primaryButton={premiumModal.primaryButton}
        secondaryButton={premiumModal.secondaryButton}
        autoClose={premiumModal.autoClose}
        autoCloseDelay={premiumModal.autoCloseDelay}
        onClose={hideModal}
      />
      
      <ConfirmModal
        visible={confirmModal.visible}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || hideConfirm}
        isLoading={confirmModal.isLoading}
        destructive={confirmModal.destructive}
      />
      
      <NotificationModal
        visible={notificationModal.visible}
        type={notificationModal.type}
        title={notificationModal.title}
        message={notificationModal.message}
        image={notificationModal.image}
        onPress={notificationModal.onPress}
        onClose={hideNotification}
        autoClose={notificationModal.autoClose}
        autoCloseDelay={notificationModal.autoCloseDelay}
      />
      
      <LoadingModal
        visible={loadingModal.visible}
        message={loadingModal.message}
        subMessage={loadingModal.subMessage}
      />
    </>
  );

  return {
    // Show methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPayment,
    showConfirm,
    showDelete,
    showNotification,
    showLoading,
    // Hide methods
    hideModal,
    hideConfirm,
    hideNotification,
    hideLoading,
    // Utilities
    setConfirmLoading,
    // Component to render
    ModalComponents,
  };
};

export default useModal;
