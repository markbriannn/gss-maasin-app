import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {globalStyles} from '../../css/globalStyles';
import {useAuth} from '../../context/AuthContext';
import {useTheme} from '../../context/ThemeContext';
import {db} from '../../config/firebase';
import {collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc} from 'firebase/firestore';

const AddressesScreen = ({navigation}) => {
  const {user} = useAuth();
  const {isDark, theme} = useTheme();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const userId = user?.uid || user?.id;
      if (!userId) {
        setAddresses([]);
        return;
      }

      const addressQuery = query(
        collection(db, 'addresses'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(addressQuery);
      const addressList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If no addresses, show empty state
      if (addressList.length === 0) {
        setAddresses([]);
      } else {
        setAddresses(addressList);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      // First, unset all defaults
      for (const addr of addresses) {
        if (addr.isDefault) {
          await updateDoc(doc(db, 'addresses', addr.id), {isDefault: false});
        }
      }
      // Set the new default
      await updateDoc(doc(db, 'addresses', id), {isDefault: true});
      
      setAddresses(addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === id,
      })));
    } catch (error) {
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'addresses', id));
              setAddresses(addresses.filter(addr => addr.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 16}}>
          Manage Addresses
        </Text>
        <TouchableOpacity>
          <Icon name="add" size={24} color="#00B14F" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{flex: 1, padding: 16}}>
        {isLoading ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <ActivityIndicator size="large" color="#00B14F" />
            <Text style={{marginTop: 16, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>Loading addresses...</Text>
          </View>
        ) : addresses.length === 0 ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <Icon name="location-outline" size={64} color={isDark ? theme.colors.border : '#D1D5DB'} />
            <Text style={{fontSize: 18, fontWeight: '600', color: isDark ? theme.colors.textSecondary : '#6B7280', marginTop: 16}}>
              No Addresses Yet
            </Text>
            <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginTop: 8, textAlign: 'center'}}>
              Add your addresses for quick booking
            </Text>
          </View>
        ) : (
          addresses.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: isDark ? theme.colors.card : '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: item.isDefault ? '#00B14F' : (isDark ? theme.colors.border : '#E5E7EB'),
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Icon name="location" size={20} color="#00B14F" />
                <Text style={{fontSize: 16, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 8}}>
                  {item.label || 'Address'}
                </Text>
                {item.isDefault && (
                  <View style={{marginLeft: 8, backgroundColor: isDark ? '#064E3B' : '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4}}>
                    <Text style={{fontSize: 12, color: isDark ? '#6EE7B7' : '#059669'}}>Default</Text>
                  </View>
                )}
              </View>
              
              {/* Full Address Display */}
              <View style={{marginBottom: 8}}>
                {item.houseNumber && (
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.text : '#1F2937', marginBottom: 2}}>
                    <Text style={{fontWeight: '600'}}>House/Bldg: </Text>{item.houseNumber}
                  </Text>
                )}
                {item.streetAddress && (
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.text : '#1F2937', marginBottom: 2}}>
                    <Text style={{fontWeight: '600'}}>Street: </Text>{item.streetAddress}
                  </Text>
                )}
                {item.barangay && (
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.text : '#1F2937', marginBottom: 2}}>
                    <Text style={{fontWeight: '600'}}>Barangay: </Text>{item.barangay}
                  </Text>
                )}
                {item.landmark && (
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280', fontStyle: 'italic'}}>
                    Near {item.landmark}
                  </Text>
                )}
                {/* Fallback to old address format */}
                {!item.streetAddress && !item.barangay && item.address && (
                  <Text style={{fontSize: 14, color: isDark ? theme.colors.textSecondary : '#6B7280'}}>{item.address}</Text>
                )}
              </View>
              
              <Text style={{fontSize: 12, color: isDark ? theme.colors.textSecondary : '#9CA3AF', marginBottom: 12}}>
                Maasin City, Southern Leyte
              </Text>
              
              <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                {!item.isDefault && (
                  <TouchableOpacity
                    style={{marginRight: 16}}
                    onPress={() => handleSetDefault(item.id)}>
                    <Text style={{fontSize: 14, color: '#00B14F'}}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={{fontSize: 14, color: '#EF4444'}}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddressesScreen;
