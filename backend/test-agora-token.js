// Quick test script for Agora token generation
const fetch = require('node-fetch');

async function testAgoraToken() {
  try {
    console.log('Testing Agora token endpoint...\n');
    
    const response = await fetch('http://localhost:3001/api/agora/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelName: 'test_channel_123',
        uid: 0,
        role: 'publisher'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ SUCCESS! Token generated:');
    console.log('----------------------------');
    console.log('App ID:', data.appId);
    console.log('Channel:', data.channelName);
    console.log('UID:', data.uid);
    console.log('Token:', data.token.substring(0, 50) + '...');
    console.log('Expires:', new Date(data.expiresAt * 1000).toLocaleString());
    console.log('\n✅ Voice calling is ready to use!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n⚠️  Make sure backend server is running on port 3001');
    console.log('   Run: cd backend && node server.js');
  }
}

testAgoraToken();
