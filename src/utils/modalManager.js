/**
 * Global Modal Manager
 * Allows showing premium modals from anywhere in the app
 * 
 * Usage:
 * import { showSuccessModal, showErrorModal, showNotificationModal } from '../utils/modalManager';
 * 
 * showSuccessModal('Done!', 'Your action was successful');
 * showErrorModal('Oops!', 'Something went wrong');
 * showNotificationModal('job_accepted', 'Job Accepted!', 'A provider accepted your job');
 */

// Store modal callbacks
let modalCallbacks = {
  showPremium: null,
  showNotification: null,
  showConfirm: null,
  showLoading: null,
  hideLoading: null,
};

// Queue for calls made before registration
let pendingCalls = [];

// Register modal callbacks (called from GlobalModalProvider)
export const registerModalCallbacks = (callbacks) => {
  console.log('[ModalManager] Registering callbacks');
  modalCallbacks = {...modalCallbacks, ...callbacks};
  
  // Process any pending calls
  if (pendingCalls.length > 0) {
    console.log('[ModalManager] Processing', pendingCalls.length, 'pending calls');
    pendingCalls.forEach(({type, args}) => {
      if (type === 'premium' && modalCallbacks.showPremium) {
        modalCallbacks.showPremium(args);
      } else if (type === 'notification' && modalCallbacks.showNotification) {
        modalCallbacks.showNotification(args);
      } else if (type === 'confirm' && modalCallbacks.showConfirm) {
        modalCallbacks.showConfirm(args);
      }
    });
    pendingCalls = [];
  }
};

// Show success modal
export const showSuccessModal = (title, message, options = {}) => {
  const args = {
    variant: 'success',
    title,
    message,
    autoClose: true,
    ...options,
  };
  
  if (modalCallbacks.showPremium) {
    modalCallbacks.showPremium(args);
  } else {
    console.log('[ModalManager] Queueing success modal:', title);
    pendingCalls.push({type: 'premium', args});
  }
};

// Show error modal
export const showErrorModal = (title, message, options = {}) => {
  const args = {
    variant: 'error',
    title,
    message,
    autoClose: false,
    ...options,
  };
  
  if (modalCallbacks.showPremium) {
    modalCallbacks.showPremium(args);
  } else {
    console.log('[ModalManager] Queueing error modal:', title);
    pendingCalls.push({type: 'premium', args});
  }
};

// Show warning modal
export const showWarningModal = (title, message, options = {}) => {
  const args = {
    variant: 'warning',
    title,
    message,
    autoClose: false,
    ...options,
  };
  
  if (modalCallbacks.showPremium) {
    modalCallbacks.showPremium(args);
  } else {
    pendingCalls.push({type: 'premium', args});
  }
};

// Show info modal
export const showInfoModal = (title, message, options = {}) => {
  const args = {
    variant: 'info',
    title,
    message,
    autoClose: false,
    ...options,
  };
  
  if (modalCallbacks.showPremium) {
    modalCallbacks.showPremium(args);
  } else {
    pendingCalls.push({type: 'premium', args});
  }
};

// Show notification toast (slides from top)
export const showNotificationModal = (type, title, message, options = {}) => {
  const args = {
    type,
    title,
    message,
    autoClose: true,
    ...options,
  };
  
  console.log('[ModalManager] showNotificationModal called:', title, 'type:', type);
  console.log('[ModalManager] Callback exists:', !!modalCallbacks.showNotification);
  
  if (modalCallbacks.showNotification) {
    console.log('[ModalManager] Calling showNotification callback');
    modalCallbacks.showNotification(args);
  } else {
    console.log('[ModalManager] Queueing notification modal:', title);
    pendingCalls.push({type: 'notification', args});
    
    // Retry after a short delay in case callbacks are being registered
    setTimeout(() => {
      if (modalCallbacks.showNotification && pendingCalls.length > 0) {
        console.log('[ModalManager] Retrying pending calls after delay');
        const pending = [...pendingCalls];
        pendingCalls = [];
        pending.forEach(({type: callType, args: callArgs}) => {
          if (callType === 'notification' && modalCallbacks.showNotification) {
            modalCallbacks.showNotification(callArgs);
          }
        });
      }
    }, 500);
  }
};

// Show confirm dialog
export const showConfirmModal = (title, message, onConfirm, options = {}) => {
  const args = {
    title,
    message,
    onConfirm,
    ...options,
  };
  
  if (modalCallbacks.showConfirm) {
    modalCallbacks.showConfirm(args);
  } else {
    pendingCalls.push({type: 'confirm', args});
  }
};

// Show loading modal
export const showLoading = (message = 'Loading...') => {
  if (modalCallbacks.showLoading) {
    modalCallbacks.showLoading(message);
  } else {
    console.log('[ModalManager] showLoading callback not registered yet');
  }
};

// Hide loading modal
export const hideLoading = () => {
  if (modalCallbacks.hideLoading) {
    modalCallbacks.hideLoading();
  } else {
    console.log('[ModalManager] hideLoading callback not registered yet');
  }
};

export default {
  registerModalCallbacks,
  showSuccessModal,
  showErrorModal,
  showWarningModal,
  showInfoModal,
  showNotificationModal,
  showConfirmModal,
  showLoading,
  hideLoading,
};

// Test function - call this to test the notification modal
export const testNotificationModal = () => {
  console.log('[ModalManager] Testing notification modal...');
  showNotificationModal('job_accepted', 'Job Accepted', 'A provider has accepted your service request. They will arrive shortly.', {
    autoClose: true,
    onPress: () => console.log('[ModalManager] Test notification pressed'),
  });
};
