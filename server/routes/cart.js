const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');
const { protect } = require('../middleware/auth');

// Get user cart
router.get('/', protect, async (req, res) => {
  try {
    const cartDoc = await db.collection('cart').doc(req.user.id).get();
    
    if (!cartDoc.exists) {
      return res.json({ success: true, items: [] });
    }
    
    const cartData = cartDoc.data();
    const items = cartData.items || [];
    
    // In Firestore, we might want to fetch product details if they aren't stored in the cart
    // For now, let's assume the cart stores basic info or we fetch them here.
    // To match the previous logic of joining with products:
    const detailedItems = await Promise.all(items.map(async (item) => {
      const productDoc = await db.collection('products').doc(item.productId).get();
      return {
        ...productDoc.data(),
        id: productDoc.id,
        quantity: item.quantity,
        cartItemId: item.productId // Using productId as cartItemId for simplicity
      };
    }));
    
    res.json({ success: true, items: detailedItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add to cart
router.post('/', protect, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  try {
    const cartRef = db.collection('cart').doc(req.user.id);
    const cartDoc = await cartRef.get();
    
    let items = [];
    if (cartDoc.exists) {
      items = cartDoc.data().items || [];
    }
    
    const existingIndex = items.findIndex(item => item.productId === productId);
    
    if (existingIndex > -1) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({ productId, quantity });
    }
    
    await cartRef.set({ items }, { merge: true });
    
    res.json({ success: true, message: 'Item added to cart' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update cart item quantity
router.put('/:productId', protect, async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;
  try {
    const cartRef = db.collection('cart').doc(req.user.id);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    let items = cartDoc.data().items || [];
    const existingIndex = items.findIndex(item => item.productId === productId);
    
    if (existingIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not in cart' });
    }
    
    if (quantity <= 0) {
      items.splice(existingIndex, 1);
    } else {
      items[existingIndex].quantity = quantity;
    }
    
    await cartRef.update({ items });
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove item from cart
router.delete('/:productId', protect, async (req, res) => {
  try {
    const cartRef = db.collection('cart').doc(req.user.id);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    let items = cartDoc.data().items || [];
    const filteredItems = items.filter(item => item.productId !== req.params.productId);
    
    await cartRef.update({ items: filteredItems });
    res.json({ success: true, message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

