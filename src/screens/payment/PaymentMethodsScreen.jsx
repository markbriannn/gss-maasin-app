import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import paymentService from '../../services/paymentService';
import { globalStyles } from '../../css/globalStyles';
import { paymentStyles } from '../../styles/paymentStyles';

export const PaymentMethodsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isDark, theme } = useTheme();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('gcash');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const result = await paymentService.getPaymentMethods();
      
      if (result.success) {
        setMethods(result.methods || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentMethods();
    setRefreshing(false);
  };

  const handleSelectMethod = (methodId) => {
    setSelectedMethod(methodId);
  };

  const getMethodIcon = (method) => {
    switch (method.id) {
      case 'gcash':
        return 'phone-portrait-outline';
      case 'paymaya':
        return 'card-outline';
      case 'cash':
        return 'cash-outline';
      default:
        return 'wallet-outline';
    }
  };

  const getMethodColor = (method) => {
    switch (method.id) {
      case 'gcash':
        return '#007DFE';
      case 'paymaya':
        return '#00C853';
      case 'cash':
        return '#FF9800';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.centerContainer, isDark && {backgroundColor: theme.colors.background}]}>
        <ActivityIndicator size="large" color="#00B14F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, isDark && {backgroundColor: theme.colors.background}]} edges={['top']}>
      <View style={{flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? theme.colors.border : '#E5E7EB', backgroundColor: isDark ? theme.colors.card : '#FFFFFF'}}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={isDark ? theme.colors.text : '#1F2937'} />
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: isDark ? theme.colors.text : '#1F2937', marginLeft: 16}}>
          Payment Methods
        </Text>
      </View>
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B14F']} />}
      >
        <View style={[paymentStyles.header, isDark && {backgroundColor: theme.colors.card}]}>
          <Text style={[paymentStyles.headerTitle, isDark && {color: theme.colors.text}]}>Choose Payment</Text>
          <Text style={[paymentStyles.headerSubtitle, isDark && {color: theme.colors.textSecondary}]}>
            Select how you want to pay
          </Text>
        </View>

        <View style={[paymentStyles.methodsContainer, {padding: 16}]}>
          {methods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                paymentStyles.methodCard,
                isDark && {backgroundColor: theme.colors.card, borderColor: theme.colors.border},
                selectedMethod === method.id && {
                  borderColor: getMethodColor(method),
                  borderWidth: 2,
                },
              ]}
              onPress={() => handleSelectMethod(method.id)}
            >
              <View style={paymentStyles.methodHeader}>
                <View
                  style={[
                    paymentStyles.methodIconContainer,
                    { backgroundColor: `${getMethodColor(method)}20` },
                  ]}
                >
                  <Icon
                    name={getMethodIcon(method)}
                    size={28}
                    color={getMethodColor(method)}
                  />
                </View>
                <View style={paymentStyles.methodInfo}>
                  <Text style={[paymentStyles.methodBrand, isDark && {color: theme.colors.text}]}>{method.name}</Text>
                  <Text style={[paymentStyles.methodExpiry, isDark && {color: theme.colors.textSecondary}]}>
                    {method.type === 'ewallet' ? 'E-Wallet Payment' : 'Pay in Cash'}
                  </Text>
                </View>
                {selectedMethod === method.id && (
                  <View style={[paymentStyles.defaultBadge, { backgroundColor: getMethodColor(method) }]}>
                    <Icon name="checkmark" size={16} color="#FFF" />
                  </View>
                )}
              </View>

              {method.id === 'gcash' && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280' }}>
                    Pay securely using your GCash account
                  </Text>
                </View>
              )}

              {method.id === 'paymaya' && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280' }}>
                    Pay securely using your PayMaya/Maya account
                  </Text>
                </View>
              )}

              {method.id === 'cash' && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280' }}>
                    Pay cash directly to the service provider
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[paymentStyles.infoBox, isDark && {backgroundColor: theme.colors.card}]}>
          <Icon name="shield-checkmark" size={20} color="#00B14F" />
          <View style={paymentStyles.infoContent}>
            <Text style={[paymentStyles.infoText, isDark && {color: theme.colors.textSecondary}]}>
              All payments are secure and encrypted. GCash and PayMaya payments are processed through PayMongo.
            </Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <View style={{ backgroundColor: isDark ? theme.colors.card : '#F3F4F6', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? theme.colors.text : '#1F2937', marginBottom: 8 }}>
              How it works:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginRight: 8 }}>1.</Text>
              <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', flex: 1 }}>
                Select your preferred payment method above
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginRight: 8 }}>2.</Text>
              <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', flex: 1 }}>
                When booking a service, you'll be redirected to complete payment
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', marginRight: 8 }}>3.</Text>
              <Text style={{ fontSize: 12, color: isDark ? theme.colors.textSecondary : '#6B7280', flex: 1 }}>
                For cash payments, pay the provider directly after service completion
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentMethodsScreen;
