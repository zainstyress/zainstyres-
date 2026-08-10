const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');

const ADMIN_ORDER_STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered'];

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
    items: Array.isArray(data.items) ? data.items : [],
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

async function updateOrderStatus(req, res) {
  const status = String(req.body.status || '').trim().toLowerCase();

  if (!ADMIN_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status' });
  }

  try {
    const match = await findOrderDoc(req.params.orderId);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await match.ref.update({
      status,
      orderStatus: status,
      order_status: status,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await match.ref.get();
    res.json({
      success: true,
      order: normalizeOrder(updatedDoc),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Apply middleware to all routes in this file
router.use(isAuthenticatedUser);
router.use(authorizeRoles('admin'));

// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search, sort, page = 1, limit = 10 } = req.query;
    
    let query = db.collection('users');
    
    // Sort logic
    if (sort === 'oldest') {
      query = query.orderBy('created_at', 'asc');
    } else if (sort === 'newest') {
      query = query.orderBy('created_at', 'desc');
    } else if (sort === 'lastLogin') {
      query = query.orderBy('last_login_at', 'desc');
    } else {
      query = query.orderBy('created_at', 'desc');
    }

    const snapshot = await query.get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Manual search filtering (Firestore doesn't support ilike)
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => u.email && u.email.toLowerCase().includes(searchLower));
    }

    const totalUsers = users.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + Number(limit));

    res.status(200).json({
      success: true,
      totalUsers,
      users: paginatedUsers.map(u => { const { password, ...rest } = u; return rest; }),
      page: Number(page),
      pages: Math.ceil(totalUsers / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/admin/user/:id/ban
router.put('/user/:id/ban', async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userDoc.data();

    if (userDoc.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot ban yourself' });
    }

    const newBanStatus = !user.is_banned;
    await userRef.update({ is_banned: newBanStatus });

    res.status(200).json({
      success: true,
      message: `User has been ${newBanStatus ? 'banned' : 'unbanned'}`,
      user: { id: userDoc.id, ...user, is_banned: newBanStatus }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    res.status(200).json({ success: true, count: snapshot.size });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').get();
    const orders = snapshot.docs
      .map(normalizeOrder)
      .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/orders/:orderId/status
router.patch('/orders/:orderId/status', updateOrderStatus);

// Backwards-compatible alias for older clients.
router.put('/orders/:orderId/status', updateOrderStatus);

// @route   DELETE /api/admin/orders/:orderId
router.delete('/orders/:orderId', async (req, res) => {
  try {
    const match = await findOrderDoc(req.params.orderId);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await match.ref.delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const usersSnapshot = await db.collection('users').get();
    
    const orders = ordersSnapshot.docs.map(doc => doc.data());
    const totalOrders = ordersSnapshot.size;
    const activeUsers = usersSnapshot.size;
    
    const revenueToday = orders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    
    res.json({
      totalOrders,
      activeUsers,
      revenueToday,
      pendingOrders: orders.filter(o => o.order_status === 'Pending').length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

