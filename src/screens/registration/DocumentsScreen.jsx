import {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Modal,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

const ID_TYPES = [
  {value: 'national_id', label: 'National ID'},
  {value: 'drivers_license', label: "Driver's License"},
  {value: 'passport', label: 'Passport'},
  {value: 'sss', label: 'SSS ID'},
  {value: 'philhealth', label: 'PhilHealth ID'},
  {value: 'postal', label: 'Postal ID'},
  {value: 'voters', label: "Voter's ID"},
  {value: 'prc', label: 'PRC ID'},
  {value: 'umid', label: 'UMID'},
  {value: 'tin', label: 'TIN ID'},
];

const DocumentsScreen = ({navigation, route}) => {
  const [documents, setDocuments] = useState({
    validId: null,
    idType: null,
    barangayClearance: null,
    policeClearance: null,
    certifications: [],
    selfie: null,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to capture documents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleCaptureId = async () => {
    if (!documents.idType) {
      Alert.alert('Select ID Type', 'Please select the type of ID first.');
      return;
    }

    try {
      setIsCapturing(true);
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission required', 'Camera permission is needed.');
        setIsCapturing(false);
        return;
      }

      console.log('[DocumentsScreen] Opening camera for ID...');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        saveToPhotos: false,
        quality: 0.8,
      });

      console.log('[DocumentsScreen] Camera result:', result);

      if (result?.didCancel) {
        console.log('[DocumentsScreen] User cancelled camera');
      } else if (result?.errorCode) {
        console.error('[DocumentsScreen] Camera error:', result.errorCode, result.errorMessage);
        Alert.alert('Camera Error', result.errorMessage || 'Unable to open camera');
      } else if (result?.assets && result.assets.length > 0) {
        setDocuments((prev) => ({...prev, validId: result.assets[0]}));
      }
    } catch (error) {
      Alert.alert('Camera error', 'Unable to capture photo.');
      console.error('ID capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };


  const handleCaptureBarangayClearance = async () => {
    try {
      setIsCapturing(true);
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission required', 'Camera permission is needed.');
        setIsCapturing(false);
        return;
      }

      console.log('[DocumentsScreen] Opening camera for Barangay Clearance...');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        saveToPhotos: false,
        quality: 0.8,
      });

      console.log('[DocumentsScreen] Camera result:', result);

      if (result?.didCancel) {
        console.log('[DocumentsScreen] User cancelled camera');
      } else if (result?.errorCode) {
        console.error('[DocumentsScreen] Camera error:', result.errorCode, result.errorMessage);
        Alert.alert('Camera Error', result.errorMessage || 'Unable to open camera');
      } else if (result?.assets && result.assets.length > 0) {
        setDocuments((prev) => ({...prev, barangayClearance: result.assets[0]}));
      }
    } catch (error) {
      Alert.alert('Camera error', 'Unable to capture photo.');
      console.error('Barangay clearance capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCapturePoliceClearance = async () => {
    try {
      setIsCapturing(true);
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission required', 'Camera permission is needed.');
        setIsCapturing(false);
        return;
      }

      console.log('[DocumentsScreen] Opening camera for Police Clearance...');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        saveToPhotos: false,
        quality: 0.8,
      });

      console.log('[DocumentsScreen] Camera result:', result);

      if (result?.didCancel) {
        console.log('[DocumentsScreen] User cancelled camera');
      } else if (result?.errorCode) {
        console.error('[DocumentsScreen] Camera error:', result.errorCode, result.errorMessage);
        Alert.alert('Camera Error', result.errorMessage || 'Unable to open camera');
      } else if (result?.assets && result.assets.length > 0) {
        setDocuments((prev) => ({...prev, policeClearance: result.assets[0]}));
      }
    } catch (error) {
      Alert.alert('Camera error', 'Unable to capture photo.');
      console.error('Police clearance capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUploadCertifications = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 0,
      });
      if (result?.assets && result.assets.length > 0) {
        setDocuments((prev) => ({...prev, certifications: result.assets}));
      }
    } catch (error) {
      Alert.alert('Upload error', 'Unable to select photos.');
      console.error('Certifications upload error:', error);
    }
  };

  const handleCaptureSelfie = async () => {
    try {
      setIsCapturing(true);
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission required', 'Camera permission is needed.');
        setIsCapturing(false);
        return;
      }

      console.log('[DocumentsScreen] Opening camera for Selfie...');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        saveToPhotos: false,
        quality: 0.7,
      });

      console.log('[DocumentsScreen] Camera result:', result);

      if (result?.didCancel) {
        console.log('[DocumentsScreen] User cancelled camera');
      } else if (result?.errorCode) {
        console.error('[DocumentsScreen] Camera error:', result.errorCode, result.errorMessage);
        Alert.alert('Camera Error', result.errorMessage || 'Unable to open camera');
      } else if (result?.assets && result.assets.length > 0) {
        setDocuments((prev) => ({...prev, selfie: result.assets[0]}));
      }
    } catch (error) {
      Alert.alert('Camera error', 'Unable to capture selfie.');
      console.error('Selfie capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSelectIdType = (idType) => {
    setDocuments((prev) => ({...prev, idType: idType.value}));
    setShowIdTypePicker(false);
  };

  const handleSubmit = () => {
    navigation.navigate('PendingApproval', {
      ...route.params,
      documents,
    });
  };

  const getIdTypeLabel = () => {
    const selected = ID_TYPES.find((t) => t.value === documents.idType);
    return selected?.label || 'Select ID Type';
  };

  const isFormValid =
    documents.validId &&
    documents.idType &&
    documents.barangayClearance &&
    documents.policeClearance &&
    documents.selfie;


  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '85%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 6 of 7</Text>
        <Text style={authStyles.title}>Upload Documents</Text>
        <Text style={authStyles.subtitle}>
          Please provide the required documents for verification
        </Text>

        <View style={{marginTop: 24}}>
          {/* ID Type Selection */}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
            Type of Valid ID *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: documents.idType ? '#00B14F' : '#E5E7EB',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
            onPress={() => setShowIdTypePicker(true)}>
            <Text style={{color: documents.idType ? '#1F2937' : '#9CA3AF'}}>
              {getIdTypeLabel()}
            </Text>
            <Icon name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* Valid ID Capture */}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
            Valid ID *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: documents.validId ? '#F0FDF4' : '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: documents.validId ? '#00B14F' : '#E5E7EB',
              borderStyle: documents.validId ? 'solid' : 'dashed',
              padding: 20,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={handleCaptureId}
            disabled={isCapturing}>
            {documents.validId ? (
              <Image
                source={{uri: documents.validId.uri}}
                style={{width: 200, height: 120, borderRadius: 8}}
                resizeMode="cover"
              />
            ) : isCapturing ? (
              <ActivityIndicator size="large" color="#00B14F" />
            ) : (
              <Icon name="camera-outline" size={48} color="#9CA3AF" />
            )}
            <Text
              style={{
                fontSize: 14,
                color: documents.validId ? '#00B14F' : '#6B7280',
                marginTop: 12,
                textAlign: 'center',
              }}>
              {documents.validId ? 'ID Captured ✓ (Tap to retake)' : 'Take a photo of your ID'}
            </Text>
          </TouchableOpacity>

          {/* Barangay Clearance */}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
            Barangay Clearance *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: documents.barangayClearance ? '#F0FDF4' : '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: documents.barangayClearance ? '#00B14F' : '#E5E7EB',
              borderStyle: documents.barangayClearance ? 'solid' : 'dashed',
              padding: 20,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={handleCaptureBarangayClearance}
            disabled={isCapturing}>
            {documents.barangayClearance ? (
              <Image
                source={{uri: documents.barangayClearance.uri}}
                style={{width: 200, height: 120, borderRadius: 8}}
                resizeMode="cover"
              />
            ) : isCapturing ? (
              <ActivityIndicator size="large" color="#00B14F" />
            ) : (
              <Icon name="document-text-outline" size={48} color="#9CA3AF" />
            )}
            <Text
              style={{
                fontSize: 14,
                color: documents.barangayClearance ? '#00B14F' : '#6B7280',
                marginTop: 12,
                textAlign: 'center',
              }}>
              {documents.barangayClearance
                ? 'Barangay Clearance Captured ✓'
                : 'Take a photo of your Barangay Clearance'}
            </Text>
          </TouchableOpacity>


          {/* Police Clearance */}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
            Police Clearance *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: documents.policeClearance ? '#F0FDF4' : '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: documents.policeClearance ? '#00B14F' : '#E5E7EB',
              borderStyle: documents.policeClearance ? 'solid' : 'dashed',
              padding: 20,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={handleCapturePoliceClearance}
            disabled={isCapturing}>
            {documents.policeClearance ? (
              <Image
                source={{uri: documents.policeClearance.uri}}
                style={{width: 200, height: 120, borderRadius: 8}}
                resizeMode="cover"
              />
            ) : isCapturing ? (
              <ActivityIndicator size="large" color="#00B14F" />
            ) : (
              <Icon name="shield-checkmark-outline" size={48} color="#9CA3AF" />
            )}
            <Text
              style={{
                fontSize: 14,
                color: documents.policeClearance ? '#00B14F' : '#6B7280',
                marginTop: 12,
                textAlign: 'center',
              }}>
              {documents.policeClearance
                ? 'Police Clearance Captured ✓'
                : 'Take a photo of your Police Clearance'}
            </Text>
          </TouchableOpacity>

          {/* Certifications (Optional - Gallery) */}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
            Certifications (Optional)
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: documents.certifications.length > 0 ? '#F0FDF4' : '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: documents.certifications.length > 0 ? '#00B14F' : '#E5E7EB',
              borderStyle: documents.certifications.length > 0 ? 'solid' : 'dashed',
              padding: 20,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={handleUploadCertifications}>
            <Icon
              name="ribbon-outline"
              size={48}
              color={documents.certifications.length > 0 ? '#00B14F' : '#9CA3AF'}
            />
            <Text
              style={{
                fontSize: 14,
                color: documents.certifications.length > 0 ? '#00B14F' : '#6B7280',
                marginTop: 12,
              }}>
              {documents.certifications.length > 0
                ? `${documents.certifications.length} certification(s) uploaded ✓`
                : 'Upload from gallery (TESDA, etc.)'}
            </Text>
          </TouchableOpacity>

          {/* Selfie */}
          <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8}}>
            Selfie for Verification *
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: documents.selfie ? '#F0FDF4' : '#F9FAFB',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: documents.selfie ? '#00B14F' : '#E5E7EB',
              borderStyle: documents.selfie ? 'solid' : 'dashed',
              padding: 20,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleCaptureSelfie}
            disabled={isCapturing}>
            {documents.selfie ? (
              <Image
                source={{uri: documents.selfie.uri}}
                style={{width: 120, height: 120, borderRadius: 60}}
                resizeMode="cover"
              />
            ) : isCapturing ? (
              <ActivityIndicator size="large" color="#00B14F" />
            ) : (
              <Icon name="person-circle-outline" size={48} color="#9CA3AF" />
            )}
            <Text
              style={{
                fontSize: 14,
                color: documents.selfie ? '#00B14F' : '#6B7280',
                marginTop: 12,
              }}>
              {documents.selfie ? 'Selfie Captured ✓' : 'Take a selfie (front camera)'}
            </Text>
          </TouchableOpacity>

          <Text style={{fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12}}>
            * Required documents for verification
          </Text>
        </View>


        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary, !isFormValid && {opacity: 0.5}]}
          disabled={!isFormValid}
          onPress={handleSubmit}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>
            Submit Application
          </Text>
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>

      {/* ID Type Picker Modal */}
      <Modal visible={showIdTypePicker} transparent animationType="slide">
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '70%',
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
              }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#1F2937'}}>
                Select ID Type
              </Text>
              <TouchableOpacity onPress={() => setShowIdTypePicker(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{padding: 16}}>
              {ID_TYPES.map((idType) => (
                <TouchableOpacity
                  key={idType.value}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                  }}
                  onPress={() => handleSelectIdType(idType)}>
                  <Icon
                    name={documents.idType === idType.value ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={documents.idType === idType.value ? '#00B14F' : '#9CA3AF'}
                  />
                  <Text
                    style={{
                      marginLeft: 12,
                      fontSize: 16,
                      color: documents.idType === idType.value ? '#00B14F' : '#1F2937',
                    }}>
                    {idType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DocumentsScreen;
