import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';

const ProfilePhotoScreen = ({navigation, route}) => {
  const [photo, setPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectPhoto = () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your profile photo',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => openGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const openCamera = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.assets && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.assets && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const handleContinue = () => {
    navigation.navigate('Completion', {
      ...route.params,
      profilePhoto: photo,
    });
  };

  const handleSkip = () => {
    navigation.navigate('Completion', {
      ...route.params,
      profilePhoto: null,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: '100%'}]} />
          </View>
          <Text style={styles.stepText}>Step 7 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Icon name="camera" size={32} color="#00B14F" />
          </View>
          <Text style={styles.title}>Profile Photo</Text>
          <Text style={styles.subtitle}>Add a photo to help others recognize you</Text>
        </View>

        {/* Photo Section */}
        <TouchableOpacity style={styles.photoContainer} onPress={selectPhoto} activeOpacity={0.8}>
          {photo ? (
            <Image source={{uri: photo.uri}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="person" size={64} color="#D1D5DB" />
            </View>
          )}
          <View style={styles.editBadge}>
            <Icon name="camera" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Upload Button */}
        <TouchableOpacity style={styles.uploadButton} onPress={selectPhoto} activeOpacity={0.8}>
          <Icon name="cloud-upload-outline" size={20} color="#00B14F" style={{marginRight: 8}} />
          <Text style={styles.uploadButtonText}>{photo ? 'Change Photo' : 'Upload Photo'}</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Photo Tips</Text>
          <View style={styles.tipRow}>
            <Icon name="checkmark-circle" size={16} color="#00B14F" />
            <Text style={styles.tipText}>Use a clear, recent photo of yourself</Text>
          </View>
          <View style={styles.tipRow}>
            <Icon name="checkmark-circle" size={16} color="#00B14F" />
            <Text style={styles.tipText}>Make sure your face is clearly visible</Text>
          </View>
          <View style={styles.tipRow}>
            <Icon name="checkmark-circle" size={16} color="#00B14F" />
            <Text style={styles.tipText}>Avoid group photos or logos</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.button, !photo && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!photo || isUploading}
          activeOpacity={0.8}>
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Continue</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  progressSection: { marginBottom: 24 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#00B14F', borderRadius: 3 },
  stepText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  photoContainer: { alignSelf: 'center', marginBottom: 24, position: 'relative' },
  photo: { width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: '#00B14F' },
  photoPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  editBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#00B14F', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#00B14F', marginBottom: 24 },
  uploadButtonText: { fontSize: 16, fontWeight: '600', color: '#00B14F' },
  tipsCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tipText: { fontSize: 13, color: '#6B7280', marginLeft: 8, flex: 1 },
  button: { backgroundColor: '#00B14F', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#D1D5DB' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginRight: 8 },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
});

export default ProfilePhotoScreen;
