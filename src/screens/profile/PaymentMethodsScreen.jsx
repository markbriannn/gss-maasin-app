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
import {db} from '../../config/firebase';
import {collection, query, where, getDocs, doc, updateDoc, deleteDoc} from 'firebase/firestore';

const PaymentMethodsScreen = ({navigation}) => {
  const {user} = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const userId = user?.uid || user?.id;
      if (!userId) {
        // Default payment method - cash
        setPaymentMethods([
          {
            id: 'cash_default',
            type: 'cash',
            label: 'Cash on Delivery',
            number: null,
            isDefault: true,
          },
        ]);
        return;
      }

      const paymentQuery = query(
        collection(db, 'paymentMethods'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(paymentQuery);
      const methods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Always include cash option
      if (!methods.find(m => m.type === 'cash')) {
        methods.push({
          id: 'cash_default',
          type: 'cash',
          label: 'Cash on Delivery',
          number: null,
          isDefault: methods.length === 0,
        });
      }
      
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods([
        {
          id: 'cash_default',
          type: 'cash',
          label: 'Cash on Delivery',
          number: null,
          isDefault: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'gcash':
        return 'phone-portrait-outline';
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      default:
        return 'wallet-outline';
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const userId = user?.uid || user?.id;
      // Update in Firebase
      for (const pm of paymentMethods) {
        if (pm.id !== 'cash_default' && pm.isDefault) {
          await updateDoc(doc(db, 'paymentMethods', pm.id), {isDefault: false});
        }
      }
      if (id !== 'cash_default') {
        await updateDoc(doc(db, 'paymentMethods', id), {isDefault: true});
      }
      
      setPaymentMethods(paymentMethods.map(pm => ({
        ...pm,
        isDefault: pm.id === id,
      })));
    } catch (error) {
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id !== 'cash_default') {
                await deleteDoc(doc(db, 'paymentMethods', id));
              }
              setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove payment method');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={globalStyles.container} edges={['top']}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: '#1F2937', marginLeft: 16}}>
          Payment Methods
        </Text>
        <TouchableOpacity>
          <Icon name="add" size={24} color="#00B14F" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{flex: 1, padding: 16}}>
        {isLoading ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <ActivityIndicator size="large" color="#00B14F" />
            <Text style={{marginTop: 16, color: '#6B7280'}}>Loading payment methods...</Text>
          </View>
        ) : (
          paymentMethods.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: item.isDefault ? '#00B14F' : '#E5E7EB',
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
                  <Icon name={getIcon(item.type)} size={20} color="#00B14F" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
                    {item.label}
                  </Text>
                  {item.number && (
                    <Text style={{fontSize: 14, color: '#6B7280'}}>{item.number}</Text>
                  )}
                </View>
                {item.isDefault && (
                  <View style={{backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4}}>
                    <Text style={{fontSize: 12, color: '#059669'}}>Default</Text>
                  </View>
                )}
              </View>
              <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8}}>
                {!item.isDefault && (
                  <TouchableOpacity
                    style={{marginRight: 16}}
                    onPress={() => handleSetDefault(item.id)}>
                    <Text style={{fontSize: 14, color: '#00B14F'}}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                {item.type !== 'cash' && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text style={{fontSize: 14, color: '#EF4444'}}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentMethodsScreen;
