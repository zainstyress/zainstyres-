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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

app.set('io', io);

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

// ─── File Upload (Local Server Storage) ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize filename to avoid weird characters
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }
  
  try {
    // Return the relative URLs for the uploaded files
    const urls = req.files.map(file => {
      // Create a URL that points to the static /uploads route
      // In development, this will be relative and the frontend Vite proxy will route it.
      // E.g., /uploads/1623456789-image.jpg
      return `/uploads/${file.filename}`;
    });

    console.log('[Upload] Files saved locally:', urls);
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
    const branches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    if (!name || !address || !phone) return res.status(400).json({ error: 'name, address, phone required' });
    
    const branchData = { 
      name, 
      address, 
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
    const snapshot = await db.collection('settings').limit(1).get();
    if (snapshot.empty) return res.json({});
    const doc = snapshot.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const snapshot = await db.collection('settings').limit(1).get();
    let result;
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await db.collection('settings').doc(docId).update(req.body);
      const updated = await db.collection('settings').doc(docId).get();
      result = { id: updated.id, ...updated.data() };
    } else {
      const docRef = await db.collection('settings').add(req.body);
      const created = await docRef.get();
      result = { id: created.id, ...created.data() };
    }
    res.json(result);
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
