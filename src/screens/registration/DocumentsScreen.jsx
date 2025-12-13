import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

const DocumentsScreen = ({navigation, route}) => {
  const [documents, setDocuments] = useState({
    validId: null,
    certifications: [],
    selfie: null,
  });
  const [isCapturing, setIsCapturing] = useState(false);

  const handleUploadId = async () => {
    try {
      const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
      if (result?.assets && result.assets.length > 0) {
        const validId = result.assets[0];
        setDocuments((prev) => ({...prev, validId}));
      }
    } catch (error) {
      Alert.alert('Upload error', 'Unable to select ID. Please try again.');
      console.error('Valid ID upload error:', error);
    }
  };

  const handleUploadCertifications = async () => {
    try {
      const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 0});
      if (result?.assets && result.assets.length > 0) {
        setDocuments((prev) => ({...prev, certifications: result.assets}));
      }
    } catch (error) {
      Alert.alert('Upload error', 'Unable to select certifications. Please try again.');
      console.error('Certifications upload error:', error);
    }
  };

  const handleCaptureSelfie = async () => {
    try {
      setIsCapturing(true);
      // Request camera permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'We need access to your camera to capture a verification selfie.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission required', 'Camera permission is needed to capture a selfie.');
          return;
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        saveToPhotos: false,
        quality: 0.7,
      });
      if (result?.assets && result.assets.length > 0) {
        const selfie = result.assets[0];
        setDocuments((prev) => ({...prev, selfie}));
      } else if (result?.didCancel) {
        // User cancelled; no action needed
      }
    } catch (error) {
      Alert.alert('Camera error', 'Unable to capture selfie. Please try again.');
      console.error('Selfie capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = () => {
    navigation.navigate('PendingApproval', {
      ...route.params,
      documents,
    });
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '92%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 9 of 9</Text>
        <Text style={authStyles.title}>Documents</Text>
        <Text style={authStyles.subtitle}>
          Upload required documents for verification
        </Text>

        <View style={{marginTop: 24}}>
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12}}>
            Valid ID *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#E5E7EB',
              borderStyle: 'dashed',
              padding: 32,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleUploadId}>
            <Icon name="cloud-upload-outline" size={48} color="#9CA3AF" />
            <Text style={{fontSize: 14, color: '#6B7280', marginTop: 12}}>
              {documents.validId ? (documents.validId.fileName || 'ID Uploaded') : 'Upload Valid ID'}
            </Text>
          </TouchableOpacity>

          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12}}>
            Certifications (Optional)
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#E5E7EB',
              borderStyle: 'dashed',
              padding: 32,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleUploadCertifications}>
            <Icon name="cloud-upload-outline" size={48} color="#9CA3AF" />
            <Text style={{fontSize: 14, color: '#6B7280', marginTop: 12}}>
              {documents.certifications.length > 0
                ? `${documents.certifications.length} file(s) uploaded`
                : 'Upload Certifications'}
            </Text>
          </TouchableOpacity>

          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12}}>
            Selfie for Verification *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: documents.selfie ? '#00B14F' : '#E5E7EB',
              borderStyle: documents.selfie ? 'solid' : 'dashed',
              padding: 24,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleCaptureSelfie}
            disabled={isCapturing}>
            {isCapturing ? (
              <ActivityIndicator color="#00B14F" />
            ) : (
              <Icon name="camera" size={48} color={documents.selfie ? '#00B14F' : '#9CA3AF'} />
            )}
            <Text style={{fontSize: 14, color: '#6B7280', marginTop: 12}}>
              {documents.selfie ? 'Selfie captured' : 'Capture a selfie (front camera)'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleSubmit}
          disabled={!documents.validId || !documents.selfie}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
            Submit Application
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DocumentsScreen;
