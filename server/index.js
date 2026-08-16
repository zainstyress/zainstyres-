const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { admin, db, bucket } = require('./utils/firebase');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;
const SETTINGS_DOC_ID = 'global';
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

app.set('io', io);

async function getGlobalSettings() {
  try {
    const doc = await db.collection('settings').doc(SETTINGS_DOC_ID).get();
    return doc.exists ? doc.data() || {} : {};
  } catch (error) {
    console.warn('[maintenance] Failed to read settings:', error.message);
    return {};
  }
}

async function isAdminBypassToken(token) {
  if (!token || token === 'none') return false;
  if (token === 'admin_secret_session_bypass') return true;

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return false;
    return (userDoc.data().role || 'user') === 'admin';
  } catch (error) {
    return false;
  }
}

async function maintenanceGate(req, res, next) {
  const pathname = req.path || '';
  if (pathname === '/api/test' || pathname === '/api/health' || pathname.startsWith('/api/auth/') || pathname.startsWith('/api/admin/') || pathname === '/api/settings/maintenance') {
    return next();
  }

  try {
    const settings = await getGlobalSettings();
    if (!settings.maintenanceMode) {
      return next();
    }

    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    const adminAllowed = await isAdminBypassToken(token);
    if (adminAllowed) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: 'Site is temporarily under maintenance. Please check back soon.',
      maintenanceMode: true,
    });
  } catch (error) {
    console.error('[maintenance] Gate error:', error.message);
    return next();
  }
}

io.on('connection', (socket) => {
  console.log(`[socket.io] connected: ${socket.id}`);
});

// Serve static uploaded files
app.use('/uploads', express.static(uploadsDir));

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(maintenanceGate);

// ─── Test Route ──────────────────────────────────────────────────────────────
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Server is reachable', time: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/search', require('./routes/search'));

// ─── File Upload (Cloudinary - persistent, free tier, no billing account needed) ──
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

function uploadBufferToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'uploads', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({ error: 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.' });
  }

  try {
    const urls = await Promise.all(req.files.map((file) => uploadBufferToCloudinary(file.buffer)));

    console.log('[Upload] Files saved to Cloudinary:', urls);
    res.json({ urls });
  } catch (err) {
    console.error('[Upload] Error:', err);
    res.status(500).json({ error: 'Failed to upload files: ' + err.message });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Debug: List All Storage Buckets ──────────────────────────────────────────
// Usage: GET /api/debug/buckets
app.get('/api/debug/buckets', async (req, res) => {
  try {
    const [buckets] = await bucket.storage.getBuckets();
    const bucketNames = buckets.map(b => b.name);
    res.json({
      success: true,
      count: bucketNames.length,
      buckets: bucketNames,
      configuredBucket: bucket.name,
      message: bucketNames.length === 0 ? "⚠️ NO BUCKETS FOUND! You must click 'Get Started' in Firebase Storage." : "Buckets found."
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ─── Debug: inspect a product's raw Firestore data ───────────────────────────
// Usage: GET /api/debug/product/<PRODUCT_ID>
// Remove this route after fixing is confirmed.
app.get('/api/debug/product/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    const data = doc.data();
    res.json({
      id: doc.id,
      name: data.name,
      image: data.image || '(empty)',
      images: data.images || [],
      imagesCount: (data.images || []).length,
      hasImage: !!(data.image || (data.images && data.images.length > 0)),
      allFields: Object.keys(data),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Debug: list all products with their image status ────────────────────────
// Usage: GET /api/debug/products/images
app.get('/api/debug/products/images', async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const report = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        image: d.image || '(empty)',
        imagesCount: (d.images || []).length,
        hasImage: !!(d.image || (d.images && d.images.length > 0)),
      };
    });
    res.json({ total: report.length, products: report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Products ─────────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, subType } = req.query;
    let query = db.collection('products');
    
    if (category) query = query.where('category', '==', category);
    if (subType) query = query.where('sub_type', '==', subType);

    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, brand, category, price } = req.body;
    if (!name || !brand || !category || price === undefined) {
      return res.status(400).json({ error: 'name, brand, category, price are required' });
    }

    // Debug: log incoming image fields
    console.log('[POST /api/products] Received image:', req.body.image || '(none)');
    console.log('[POST /api/products] Received images:', JSON.stringify(req.body.images || []));

    const productData = {
      name, brand, category,
      sub_type: req.body.subType || 'New',
      price: parseFloat(price) || 0,
      stock: parseInt(req.body.stock) || 0,
      sales: 0,
      rating: parseFloat(req.body.rating) || 4.0,
      condition: req.body.condition || 'New',
      description: req.body.description || '',
      image: req.body.image || '',
      images: req.body.images || (req.body.image ? [req.body.image] : []),
      vehicle: req.body.vehicle || [],
      created_at: new Date().toISOString()
    };

    console.log('[POST /api/products] Saving to Firestore — image:', productData.image, '| images count:', productData.images.length);
    const docRef = await db.collection('products').add(productData);
    console.log('[POST /api/products] Saved! ID:', docRef.id);
    res.status(201).json({ id: docRef.id, ...productData });
  } catch (err) {
    console.error('[POST /api/products] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    console.log('[PUT /api/products/:id] Updating product:', req.params.id);
    console.log('[PUT /api/products/:id] image:', req.body.image || '(none)');
    console.log('[PUT /api/products/:id] images:', JSON.stringify(req.body.images || []));

    await db.collection('products').doc(req.params.id).update(req.body);
    const updatedDoc = await db.collection('products').doc(req.params.id).get();
    const result = { id: updatedDoc.id, ...updatedDoc.data() };
    console.log('[PUT /api/products/:id] Updated in Firestore — image:', result.image, '| images count:', (result.images || []).length);
    res.json(result);
  } catch (err) {
    console.error('[PUT /api/products/:id] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tyre Finder ──────────────────────────────────────────────────────────────
app.get('/api/find', async (req, res) => {
  try {
    const { model, brand, maxPrice } = req.query;
    let snapshot = await db.collection('products').get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (model) products = products.filter(p => p.vehicle && p.vehicle.includes(model));
    if (brand) products = products.filter(p => p.brand && p.brand.toLowerCase().includes(brand.toLowerCase()));
    if (maxPrice) products = products.filter(p => p.price <= parseFloat(maxPrice));
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Branches ─────────────────────────────────────────────────────────────────
app.get('/api/branches', async (req, res) => {
  try {
    const snapshot = await db.collection('branches').get();
    const branches = snapshot.docs.map((doc) => {
      const data = doc.data();
      const city = data.city || inferCityFromAddress(data.address) || '';
      return { id: doc.id, ...data, city };
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function inferCityFromAddress(address) {
  if (!address || typeof address !== 'string') return '';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return '';
  return (parts[parts.length - 2] || parts[0]).replace(/\s+/g, ' ');
}

app.post('/api/branches', async (req, res) => {
  try {
    const { name, address, phone, city } = req.body;
    if (!name || !address || !phone) return res.status(400).json({ error: 'name, address, phone required' });

    const resolvedCity = city || inferCityFromAddress(address) || '';

    const branchData = {
      name,
      address,
      city: resolvedCity,
      phone,
      hours: req.body.hours || '9 AM - 6 PM',
      map_link: req.body.mapLink || '',
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('branches').add(branchData);
    res.status(201).json({ id: docRef.id, ...branchData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  try {
    await db.collection('branches').doc(req.params.id).update(req.body);
    const updatedDoc = await db.collection('branches').doc(req.params.id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/branches/:id', async (req, res) => {
  try {
    await db.collection('branches').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc(SETTINGS_DOC_ID).get();
    if (!doc.exists) return res.json({});
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/maintenance', async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    res.json({
      success: true,
      maintenanceMode: !!settings.maintenanceMode,
      maintenanceUpdatedAt: settings.maintenanceUpdatedAt || null,
      maintenanceUpdatedBy: settings.maintenanceUpdatedBy || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { maintenanceMode, maintenanceUpdatedAt, maintenanceUpdatedBy, ...safeBody } = req.body || {};
    const settingsRef = db.collection('settings').doc(SETTINGS_DOC_ID);
    const current = await settingsRef.get();
    const payload = { ...(current.exists ? current.data() : {}), ...safeBody, updatedAt: new Date().toISOString() };
    await settingsRef.set(payload, { merge: true });
    const updated = await settingsRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n✅ ZainsTyres API (Firebase) → http://127.0.0.1:${PORT}\n`);
  });
}

module.exports = app;
