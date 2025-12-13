import React, {useState} from 'react';
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

  const handleNext = () => {
    if (dateOfBirth.month && dateOfBirth.day && dateOfBirth.year) {
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
              onChangeText={(text) => setDateOfBirth({...dateOfBirth, day: text})}
            />
          </View>
          <View style={[authStyles.inputContainer, {flex: 1, marginLeft: 8}]}>
            <TextInput
              style={authStyles.input}
              placeholder="Year"
              keyboardType="number-pad"
              maxLength={4}
              value={dateOfBirth.year}
              onChangeText={(text) => setDateOfBirth({...dateOfBirth, year: text})}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleNext}
          disabled={!dateOfBirth.month || !dateOfBirth.day || !dateOfBirth.year}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DateOfBirthScreen;
