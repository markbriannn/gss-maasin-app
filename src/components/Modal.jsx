import React from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {modalStyles} from '../css/componentStyles';

const Modal = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdropPress = true,
  size = 'medium',
  footer,
  style,
}) => {
  const getContainerStyle = () => {
    const styles = [modalStyles.modalContent];
    
    if (size === 'small') styles.push(modalStyles.modalContentSmall);
    if (size === 'large') styles.push(modalStyles.modalContentLarge);
    if (size === 'full') styles.push(modalStyles.modalContentFull);
    if (style) styles.push(style);
    
    return styles;
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback
        onPress={closeOnBackdropPress ? onClose : undefined}>
        <View style={modalStyles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={getContainerStyle()}>
              {(title || showCloseButton) && (
                <View style={modalStyles.modalHeader}>
                  {title && <Text style={modalStyles.modalTitle}>{title}</Text>}
                  {showCloseButton && (
                    <TouchableOpacity
                      onPress={onClose}
                      style={modalStyles.closeButton}>
                      <Icon name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <ScrollView
                style={modalStyles.modalBody}
                contentContainerStyle={modalStyles.modalBodyContent}
                showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
              
              {footer && <View style={modalStyles.modalFooter}>{footer}</View>}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

export default Modal;
