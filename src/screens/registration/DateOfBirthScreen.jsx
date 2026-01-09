import React, {useState, useMemo} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';

const DateOfBirthScreen = ({navigation, route}) => {
  const [dateOfBirth, setDateOfBirth] = useState({
    month: '',
    day: '',
    year: '',
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calculate age and check if under 18
  const {age, isUnder18} = useMemo(() => {
    if (!dateOfBirth.month || !dateOfBirth.day || !dateOfBirth.year || dateOfBirth.year.length < 4) {
      return {age: null, isUnder18: false};
    }
    
    const birthDate = new Date(
      parseInt(dateOfBirth.year),
      parseInt(dateOfBirth.month) - 1,
      parseInt(dateOfBirth.day)
    );
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return {age: calculatedAge, isUnder18: calculatedAge < 18};
  }, [dateOfBirth]);

  const canContinue = dateOfBirth.month && dateOfBirth.day && dateOfBirth.year && dateOfBirth.year.length === 4 && !isUnder18;

  const handleNext = () => {
    if (canContinue) {
      navigation.navigate('ServiceCategories', {
        ...route.params,
        dateOfBirth: `${dateOfBirth.year}-${dateOfBirth.month}-${dateOfBirth.day}`,
      });
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '56%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 6 of 9</Text>
        <Text style={authStyles.title}>Date of Birth</Text>
        <Text style={authStyles.subtitle}>
          You must be at least 18 years old to provide services
        </Text>

        <View style={authStyles.inputContainer}>
          <Icon name="calendar-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <Picker
            selectedValue={dateOfBirth.month}
            onValueChange={(value) => setDateOfBirth({...dateOfBirth, month: value})}
            style={{flex: 1}}>
            <Picker.Item label="Month" value="" />
            {months.map((month, index) => (
              <Picker.Item key={month} label={month} value={String(index + 1).padStart(2, '0')} />
            ))}
          </Picker>
        </View>

        <View style={{flexDirection: 'row', marginBottom: 16}}>
          <View style={[authStyles.inputContainer, {flex: 1, marginRight: 8}]}>
            <TextInput
              style={authStyles.input}
              placeholder="Day"
              keyboardType="number-pad"
              maxLength={2}
              value={dateOfBirth.day}
              onChangeText={(text) => setDateOfBirth({...dateOfBirth, day: text.replace(/[^0-9]/g, '')})}
            />
          </View>
          <View style={[authStyles.inputContainer, {flex: 1, marginLeft: 8}]}>
            <TextInput
              style={authStyles.input}
              placeholder="Year"
              keyboardType="number-pad"
              maxLength={4}
              value={dateOfBirth.year}
              onChangeText={(text) => setDateOfBirth({...dateOfBirth, year: text.replace(/[^0-9]/g, '')})}
            />
          </View>
        </View>

        {/* Age validation message */}
        {isUnder18 && (
          <View style={{
            backgroundColor: '#FEE2E2',
            borderWidth: 1,
            borderColor: '#EF4444',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Icon name="warning" size={24} color="#EF4444" style={{marginRight: 12}} />
            <View style={{flex: 1}}>
              <Text style={{color: '#DC2626', fontWeight: '700', fontSize: 14}}>
                Age Requirement Not Met
              </Text>
              <Text style={{color: '#DC2626', fontSize: 13, marginTop: 4}}>
                You must be at least 18 years old to register as a provider. You are currently {age} years old.
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            authStyles.button, 
            authStyles.buttonPrimary,
            !canContinue && {backgroundColor: '#D1D5DB'}
          ]}
          onPress={handleNext}
          disabled={!canContinue}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DateOfBirthScreen;
