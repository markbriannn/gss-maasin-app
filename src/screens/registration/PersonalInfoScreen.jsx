import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {authStyles} from '../../css/authStyles';

const PersonalInfoScreen = ({navigation}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
  });

  const handleNext = () => {
    if (formData.firstName && formData.lastName) {
      navigation.navigate('ContactInfo', {personalInfo: formData});
    }
  };

  return (
    <SafeAreaView style={authStyles.container}>
      <ScrollView contentContainerStyle={authStyles.scrollContent}>
        <View style={authStyles.progressBar}>
          <View style={[authStyles.progressFill, {width: '14%'}]} />
        </View>
        <Text style={authStyles.stepIndicator}>Step 1 of 7</Text>
        <Text style={authStyles.title}>Personal Information</Text>
        <Text style={authStyles.subtitle}>Let's start with your basic details</Text>

        <View style={authStyles.inputContainer}>
          <Icon name="person-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="First Name *"
            value={formData.firstName}
            onChangeText={(text) => setFormData({...formData, firstName: text})}
          />
        </View>

        <View style={authStyles.inputContainer}>
          <Icon name="person-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Middle Name (Optional)"
            value={formData.middleName}
            onChangeText={(text) => setFormData({...formData, middleName: text})}
          />
        </View>

        <View style={authStyles.inputContainer}>
          <Icon name="person-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Last Name *"
            value={formData.lastName}
            onChangeText={(text) => setFormData({...formData, lastName: text})}
          />
        </View>

        <View style={authStyles.inputContainer}>
          <Icon name="person-outline" size={20} color="#9CA3AF" style={authStyles.inputIcon} />
          <TextInput
            style={authStyles.input}
            placeholder="Suffix (Jr., Sr., III, etc.)"
            value={formData.suffix}
            onChangeText={(text) => setFormData({...formData, suffix: text})}
          />
        </View>

        <TouchableOpacity
          style={[authStyles.button, authStyles.buttonPrimary]}
          onPress={handleNext}
          disabled={!formData.firstName || !formData.lastName}>
          <Text style={[authStyles.buttonText, authStyles.buttonTextPrimary]}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PersonalInfoScreen;
