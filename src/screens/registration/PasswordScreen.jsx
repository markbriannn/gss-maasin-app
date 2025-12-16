import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

const PasswordScreen = ({navigation, route}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canContinue = hasMinLength && passwordsMatch;

  const handleNext = () => {
    if (!canContinue) return;
    
    const routeNames = navigation.getState?.()?.routeNames || [];
    const isProviderFlow = routeNames.includes('DateOfBirth');
    const nextScreen = isProviderFlow ? 'DateOfBirth' : 'ProfilePhoto';

    navigation.navigate(nextScreen, {
      ...(route?.params || {}),
      password: password,
      isProvider: isProviderFlow,
    });
  };

  const PasswordRequirement = ({met, text}) => (
    <View style={styles.requirementRow}>
      <Icon 
        name={met ? 'checkmark-circle' : 'ellipse-outline'} 
        size={16} 
        color={met ? '#00B14F' : '#9CA3AF'} 
      />
      <Text style={[styles.requirementText, met && styles.requirementMet]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: '85%'}]} />
          </View>
          <Text style={styles.stepText}>Step 6 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Icon name="shield-checkmark" size={32} color="#00B14F" />
          </View>
          <Text style={styles.title}>Create Password</Text>
          <Text style={styles.subtitle}>Secure your account with a strong password</Text>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.toggleBtn}>
              <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Password Requirements</Text>
          <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
          <PasswordRequirement met={hasUppercase} text="One uppercase letter (recommended)" />
          <PasswordRequirement met={hasNumber} text="One number (recommended)" />
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={[
            styles.inputContainer,
            confirmPassword && (passwordsMatch ? styles.inputSuccess : styles.inputError)
          ]}>
            <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.toggleBtn}>
              <Icon name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && (
            <View style={styles.matchStatus}>
              <Icon 
                name={passwordsMatch ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={passwordsMatch ? '#00B14F' : '#EF4444'} 
              />
              <Text style={[styles.matchText, passwordsMatch ? styles.matchSuccess : styles.matchError]}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>Continue</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
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
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16 },
  inputSuccess: { borderColor: '#00B14F', backgroundColor: '#F0FDF4' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#1F2937' },
  toggleBtn: { padding: 8 },
  requirementsCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  requirementsTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  requirementText: { fontSize: 13, color: '#6B7280', marginLeft: 8 },
  requirementMet: { color: '#00B14F' },
  matchStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  matchText: { fontSize: 13, marginLeft: 6 },
  matchSuccess: { color: '#00B14F' },
  matchError: { color: '#EF4444' },
  button: { backgroundColor: '#00B14F', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#D1D5DB' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginRight: 8 },
});

export default PasswordScreen;
