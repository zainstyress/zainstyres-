const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');
const { protect } = require('../middleware/auth');

// Get search history
router.get('/history', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('search_history')
      .where('user_id', '==', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    
    const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a search
router.post('/save', protect, async (req, res) => {
  const { query, category } = req.body;
  try {
    if (!query) return res.status(400).json({ error: 'Query is required' });

    // Check for existing and remove to keep unique top
    const existing = await db.collection('search_history')
      .where('user_id', '==', req.user.id)
      .where('query', '==', query)
      .get();
    
    const batch = db.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    const searchData = { 
      user_id: req.user.id, 
      query, 
      category: category || null,
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('search_history').add(searchData);
    res.json({ id: docRef.id, ...searchData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all history
router.delete('/clear', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('search_history')
      .where('user_id', '==', req.user.id)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

