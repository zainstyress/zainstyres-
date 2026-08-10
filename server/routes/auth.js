const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const { auth, db } = require('../utils/firebase');
const { protect } = require('../middleware/auth');


// Helper to set cookie with Firebase ID token
const sendToken = (token, user, statusCode, res) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    user: {
      id: user.id || user.uid,
      email: user.email,
      role: user.role || 'user'
    },
    token
  });
};

// @route   POST /api/auth/signup
router.post('/signup', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, name } = req.body;

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name || '',
    });

    // 2. Create user profile in Firestore
    const userData = {
      name: name || '',
      email,
      role: 'user',
      is_banned: false,
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // 3. Generate a custom token (Note: frontend usually handles this, 
    // but for the sake of keeping the flow, we'll return the user info.
    // Real ID tokens should be obtained via client-side SDK or REST API).
    // For simplicity, we'll ask the client to login after signup or use REST API.
    
    res.status(201).json({
      success: true,
      message: 'User created successfully. Please login.',
      user: { id: userRecord.uid, email, role: 'user' }
    });
  } catch (err) {
    console.error('Signup Error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Firebase Admin doesn't support signing in with password.
    // We must use the Firebase Auth REST API.
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error('FIREBASE_API_KEY is missing in .env');
    }

    const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      email,
      password,
      returnSecureToken: true
    });

    const data = response.data;


    if (data.error) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const { localId: uid, idToken } = data;

    // Fetch user details from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const user = userDoc.data();

    if (user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account has been banned' });
    }

    // Update login stats
    await db.collection('users').doc(uid).update({
      last_login_at: new Date().toISOString(),
      login_count: (user.login_count || 0) + 1
    });

    sendToken(idToken, { id: uid, ...user }, 200, res);
  } catch (err) {
    const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('Login Error:', errorMsg);
    res.status(500).json({ 
      success: false, 
      message: err.response && err.response.data && err.response.data.error ? err.response.data.error.message : 'Server error' 
    });
  }

});

// @route   POST /api/auth/admin-password-login
router.post('/admin-password-login', async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ success: false, message: 'Admin password not configured' });
  }

  if (username === adminUsername && password === adminPassword) {
    // We'll set a special cookie that indicates this is a password-authenticated admin
    // In a real app, you'd sign a JWT here. For simplicity, we'll use a secret string.
    const token = 'admin_secret_session_bypass'; 
    
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    };

    res.cookie('token', token, cookieOptions);

    return res.status(200).json({
      success: true,
      user: {
        id: 'admin_bypass',
        email: 'admin@system',
        username: adminUsername,
        role: 'admin',
        name: 'System Admin'
      },
      token
    });
  }

  res.status(401).json({ success: false, message: 'Incorrect password' });
});

// @route   GET /api/auth/logout
router.get('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @route   GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token || token === 'none') return res.status(401).json({ success: false, message: 'Not authenticated' });

    if (token === 'admin_secret_session_bypass') {
      return res.status(200).json({
        success: true,
        user: {
          id: 'admin_bypass',
          email: 'admin@system',
          username: process.env.ADMIN_USERNAME || 'admin',
          role: 'admin',
          name: 'System Admin'
        }
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) return res.status(404).json({ success: false, message: 'User not found' });
    
    const user = userDoc.data();
    if (user.is_banned) return res.status(403).json({ success: false, message: 'User is banned' });

    res.status(200).json({ success: true, user: { id: userDoc.id, ...user } });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// @route   PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, preferences } = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    
    if (name) {
      updateData.name = name;
      // Update Firebase Auth profile as well
      await auth.updateUser(req.user.id, { displayName: name });
    }
    if (phone !== undefined) updateData.phone = phone;
    if (preferences) updateData.preferences = preferences;

    await db.collection('users').doc(req.user.id).update(updateData);
    
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/auth/cards
router.get('/cards', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('users').doc(req.user.id).collection('cards').get();
    const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/auth/cards
router.post('/cards', protect, async (req, res) => {
  try {
    const { cardNumber, expiry, nameOnCard } = req.body;
    // VERY BASIC MOCK: Only store the last 4 digits and brand.
    // In production, never store full PAN, use Stripe/Razorpay tokens.
    const last4 = cardNumber.slice(-4);
    const brand = cardNumber.startsWith('4') ? 'Visa' : (cardNumber.startsWith('5') ? 'Mastercard' : 'Card');
    
    const cardData = {
      brand,
      last4,
      expiry,
      nameOnCard,
      created_at: new Date().toISOString()
    };
    
    const docRef = await db.collection('users').doc(req.user.id).collection('cards').add(cardData);
    res.status(201).json({ id: docRef.id, ...cardData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/auth/cards/:id
router.delete('/cards/:id', protect, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.id).collection('cards').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


