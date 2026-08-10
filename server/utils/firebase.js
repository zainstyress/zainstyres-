const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
    
    // Admin SDK needs the raw bucket name (.appspot.com), not the client routing domain (.firebasestorage.app)
    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'zainstyres.appspot.com';
    bucketName = bucketName.replace('.firebasestorage.app', '.appspot.com');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      storageBucket: bucketName
    });
    
    console.log('✅ Firebase Admin Initialized via Service Account File');
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error.message);
    
    // Fallback if the file is missing but ENV vars exist
    try {
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        privateKey = privateKey.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
        
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
          storageBucket: bucketName
        });
        console.log('✅ Firebase Admin Initialized via ENV (Fallback)');
      }
    } catch (fallbackError) {
      console.error('❌ Firebase Admin Fallback Error:', fallbackError.message);
    }
  }
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };