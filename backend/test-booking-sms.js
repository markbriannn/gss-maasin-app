/**
 * Test script to diagnose booking confirmation SMS issues
 * Run with: node backend/test-booking-sms.js
 */

const axios = require('axios');

const API_URL = 'https://gss-maasin-app.onrender.com/api';

// Test data - replace with real values
const TEST_PHONE = '09123456789'; // Replace with your phone number
const TEST_BOOKING = {
  id: 'test123',
  serviceCategory: 'Plumbing',
  scheduledDate: 'Dec 25, 2024',
  scheduledTime: '10:00 AM',
  totalAmount: 500,
};

async function testBookingSMS() {
  console.log('=== Testing Booking Confirmation SMS ===\n');
  console.log('Phone:', TEST_PHONE);
  console.log('Booking:', TEST_BOOKING);
  console.log('\n');

  const smsMessage = `GSS Maasin: Your booking for ${TEST_BOOKING.serviceCategory} is confirmed! Date: ${TEST_BOOKING.scheduledDate} at ${TEST_BOOKING.scheduledTime}. Total: ₱${TEST_BOOKING.totalAmount.toLocaleString()}. Job ID: ${TEST_BOOKING.id.slice(-6)}`;

  console.log('Message:', smsMessage);
  console.log('Message length:', smsMessage.length, 'characters');
  console.log('\n');

  try {
    console.log('Sending SMS...');
    const response = await axios.post(
      `${API_URL}/sms/send-sms`,
      {
        phoneNumber: TEST_PHONE,
        message: smsMessage,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    console.log('\n✅ SMS API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ SMS sent successfully!');
      console.log('Check your phone:', TEST_PHONE);
    } else {
      console.log('\n❌ SMS failed:');
      console.log('Error:', response.data.error);
    }
  } catch (error) {
    console.log('\n❌ Request failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else if (error.request) {
      console.log('No response received from server');
      console.log('Error:', error.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

// Run test
testBookingSMS();
