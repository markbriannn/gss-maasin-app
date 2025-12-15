const express = require('express');
const router = express.Router();
const { getAuth, getDb } = require('../config/firebase');

// Store reset codes temporarily (in production, use Redis or database)
const resetCodes = new Map();

// Generate and store reset code
router.post('/generate-reset-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verify user exists in Firebase Auth
    const auth = getAuth();
    try {
      await auth.getUserByEmail(email);
    } catch (error) {
      // Don't reveal if user exists or not for security
      return res.json({ success: true, message: 'If the email exists, a code will be sent' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiration (15 minutes)
    resetCodes.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
      attempts: 0,
    });

    // Return code (frontend will send via EmailJS)
    res.json({ success: true, code });
  } catch (error) {
    console.error('Generate reset code error:', error);
    res.status(500).json({ error: 'Failed to generate reset code' });
  }
});

// Verify code and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailLower = email.toLowerCase();
    const storedData = resetCodes.get(emailLower);

    if (!storedData) {
      return res.status(400).json({ error: 'No reset code found. Please request a new code.' });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      resetCodes.delete(emailLower);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new code.' });
    }

    // Check attempts (max 5)
    if (storedData.attempts >= 5) {
      resetCodes.delete(emailLower);
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Verify code
    if (storedData.code !== code) {
      storedData.attempts += 1;
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // Code is valid - update password using Firebase Admin SDK
    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    
    await auth.updateUser(user.uid, {
      password: newPassword,
    });

    // Clear the reset code
    resetCodes.delete(emailLower);

    // Log password change in Firestore
    const db = getDb();
    await db.collection('users').doc(user.uid).update({
      passwordChangedAt: new Date(),
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

module.exports = router;
