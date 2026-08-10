const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');
const { protect } = require('../middleware/auth');
const Razorpay = require('razorpay');

const ORDER_STATUSES = new Set(['pending', 'confirmed', 'dispatched', 'delivered']);

function padSequence(sequence) {
  return String(sequence).padStart(4, '0');
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function generateOrderId() {
  const now = new Date();
  const dateKey = toDateKey(now);
  const counterRef = db.collection('order_counters').doc(dateKey);

  const sequence = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const nextSequence = (counterDoc.exists && Number(counterDoc.data().sequence)) || 0;
    const updatedSequence = nextSequence + 1;

    transaction.set(counterRef, {
      dateKey,
      sequence: updatedSequence,
      updatedAt: now.toISOString(),
    }, { merge: true });

    return updatedSequence;
  });

  return `ORD-${dateKey}-${padSequence(sequence)}`;
}

function normalizePaymentMethod(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (raw.includes('cash') || raw === 'cod') return 'Cash on Delivery';
  if (raw.includes('upi')) return 'UPI';
  return 'Card';
}

function normalizeIncomingOrder(body) {
  const delivery = body.delivery || {};
  const address = body.deliveryAddress || body.address || delivery;
  const items = Array.isArray(body.items) ? body.items : Array.isArray(body.orderItems) ? body.orderItems : [];

  return {
    customerName: body.customerName || delivery.fullName || body.name || '',
    mobileNumber: body.mobileNumber || body.mobile || delivery.phone || body.phone || '',
    deliveryAddress: {
      line1: address.line1 || address.address1 || body.line1 || '',
      line2: address.line2 || address.address2 || body.line2 || '',
      city: address.city || body.city || '',
      state: address.state || body.state || '',
      pincode: address.pincode || address.pin || body.pincode || body.pin || '',
    },
    items: items.map((item) => ({
      productName: item.productName || item.name || '',
      quantity: Number(item.quantity ?? item.qty ?? 1),
      price: Number(item.price ?? 0),
    })),
    subtotal: Number(body.subtotal ?? body.totalAmount ?? body.total ?? 0),
    tax: Number(body.tax ?? 0),
    totalAmount: Number(body.totalAmount ?? body.total ?? 0),
    paymentMethod: normalizePaymentMethod(body.paymentMethod),
  };
}

function toTimestamp(value) {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeOrder(doc) {
  const data = doc.data();
  const deliveryAddress = data.deliveryAddress || {};

  return {
    id: doc.id,
    orderId: data.orderId || doc.id,
    customerName: data.customerName || '',
    mobileNumber: data.mobileNumber || data.mobile || '',
    deliveryAddress: {
      line1: deliveryAddress.line1 || deliveryAddress.address1 || '',
      line2: deliveryAddress.line2 || deliveryAddress.address2 || '',
      city: deliveryAddress.city || '',
      state: deliveryAddress.state || '',
      pincode: deliveryAddress.pincode || deliveryAddress.pin || '',
    },
    items: Array.isArray(data.items)
      ? data.items.map((item) => ({
          productName: item.productName || item.name || '',
          quantity: Number(item.quantity ?? item.qty ?? 1),
          price: Number(item.price ?? 0),
        }))
      : [],
    subtotal: Number(data.subtotal ?? 0),
    tax: Number(data.tax ?? 0),
    totalAmount: Number(data.totalAmount ?? data.total ?? 0),
    paymentMethod: data.paymentMethod || 'Card',
    status: data.status || data.orderStatus || data.order_status || 'pending',
    createdAt: data.createdAt || data.created_at || null,
    updatedAt: data.updatedAt || data.updated_at || null,
  };
}

async function findOrderDoc(orderId) {
  const directRef = db.collection('orders').doc(orderId);
  const directDoc = await directRef.get();

  if (directDoc.exists) {
    return { ref: directRef, doc: directDoc };
  }

  const snapshot = await db.collection('orders').where('orderId', '==', orderId).limit(1).get();
  if (snapshot.empty) return null;

  const fallbackDoc = snapshot.docs[0];
  return { ref: fallbackDoc.ref, doc: fallbackDoc };
}

// Add address
router.post('/address', protect, async (req, res) => {
  try {
    const addressData = {
      user_id: req.user.id,
      ...req.body,
      created_at: new Date().toISOString()
    };
    const docRef = await db.collection('addresses').add(addressData);
    res.status(201).json({ id: docRef.id, ...addressData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user addresses
router.get('/addresses', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('addresses')
      .where('user_id', '==', req.user.id)
      .get();
    
    const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update address
router.put('/address/:id', protect, async (req, res) => {
  try {
    const addressRef = db.collection('addresses').doc(req.params.id);
    const doc = await addressRef.get();
    if (!doc.exists || doc.data().user_id !== req.user.id) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }
    
    await addressRef.update(req.body);
    res.json({ success: true, message: 'Address updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete address
router.delete('/address/:id', protect, async (req, res) => {
  try {
    const addressRef = db.collection('addresses').doc(req.params.id);
    const doc = await addressRef.get();
    if (!doc.exists || doc.data().user_id !== req.user.id) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }
    
    await addressRef.delete();
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Razorpay Init
router.post('/razorpay', protect, async (req, res) => {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret || key_id === 'your_razorpay_key_id') {
      return res.status(500).json({ error: 'Razorpay keys missing in backend .env' });
    }

    const instance = new Razorpay({ key_id, key_secret });
    const options = { 
      amount: Math.round(req.body.amount * 100), 
      currency: "INR", 
      receipt: "rcpt_" + Date.now().toString().slice(-10) 
    };
    const order = await instance.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error('Razorpay Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Order
router.post('/', protect, async (req, res) => {
  const { orderItems, addressId, paymentMethod, subtotal, tax, shipping, total, paymentId, razorpayOrderId } = req.body;
  if (!orderItems || orderItems.length === 0) return res.status(400).json({ error: 'No order items' });

  try {
    const orderStatus = paymentMethod === 'COD' ? 'Order Placed' : (paymentId ? 'Confirmed' : 'Pending');
    const paymentStatus = paymentMethod === 'COD' ? 'Pending' : (paymentId ? 'Paid' : 'Pending');

    const orderData = {
      user_id: req.user.id,
      items: orderItems,
      address_id: addressId,
      payment_method: paymentMethod,
      order_status: orderStatus,
      payment_status: paymentStatus,
      tracking_number: '',
      subtotal, tax, shipping, total,
      timeline: { orderPlaced: new Date().toISOString() },
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('orders').add(orderData);
    const createdOrder = { id: docRef.id, ...orderData };
    
    // Clear user cart in Firestore
    await db.collection('cart').doc(req.user.id).delete();
    
    // WhatsApp Notification to Admin
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken && accountSid !== 'your_twilio_sid') {
        const client = require('twilio')(accountSid, authToken);
        await client.messages.create({
          body: `*New Order Alert - ZainsTyres*\n\nOrder ID: ${createdOrder.id}\nTotal: ₹${total}\nPayment Method: ${paymentMethod}\nStatus: ${paymentStatus}`,
          from: 'whatsapp:+14155238886',
          to: `whatsapp:${process.env.ADMIN_WHATSAPP || '+911234567890'}`
        });
      }
    } catch (e) { console.error('WhatsApp Notification Failed:', e.message); }

    res.status(201).json(createdOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm Order without requiring session login
router.post('/confirm', async (req, res) => {
  try {
    const payload = normalizeIncomingOrder(req.body);

    if (!payload.customerName.trim()) return res.status(400).json({ success: false, error: 'Customer name is required' });
    if (!/^[0-9]{10}$/.test(String(payload.mobileNumber).trim())) return res.status(400).json({ success: false, error: 'Valid mobile number is required' });
    if (!payload.deliveryAddress.line1.trim()) return res.status(400).json({ success: false, error: 'Delivery address is required' });
    if (!payload.items.length) return res.status(400).json({ success: false, error: 'No items in order' });
    if (!payload.totalAmount || Number.isNaN(payload.totalAmount)) return res.status(400).json({ success: false, error: 'Total amount is required' });

    const orderId = `ORD-${Date.now()}`;
    const timestamp = new Date();

    const orderData = {
      orderId,
      customerName: payload.customerName.trim(),
      mobileNumber: String(payload.mobileNumber).trim(),
      deliveryAddress: payload.deliveryAddress,
      items: payload.items,
      subtotal: Number(payload.subtotal || 0),
      tax: Number(payload.tax || 0),
      totalAmount: Number(payload.totalAmount),
      paymentMethod: payload.paymentMethod,
      status: 'confirmed',
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    };

    await db.collection('orders').doc(orderId).set(orderData);

    const io = req.app.get('io');
    if (io) {
      io.emit('new-order', {
        orderId,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount,
      });
    }

    res.status(201).json({ success: true, orderId });
  } catch (err) {
    console.error('Order confirmation failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save order' });
  }
});

// Public lookup for the confirmation screen
router.get('/public/:orderId', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.orderId).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });

    res.json({ success: true, order: normalizeOrder(doc) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load order' });
  }
});

// Get User Orders
router.get('/myorders', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('user_id', '==', req.user.id)
      .orderBy('created_at', 'desc')
      .get();
    
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

