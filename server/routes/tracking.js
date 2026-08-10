const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');
const { protect } = require('../middleware/auth');

// Ping endpoint
router.post('/ping', protect, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.id).update({ 
      last_active_at: new Date().toISOString(),
      is_online: true 
    });
    
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

