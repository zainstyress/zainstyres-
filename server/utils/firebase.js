const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  let bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'zainstyres.appspot.com';
  bucketName = bucketName.replace('.firebasestorage.app', '.appspot.com');

  try {
    const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      storageBucket: bucketName
    });

    console.log('✅ Firebase Admin Initialized via Service Account File');
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error.message);

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
      } else {
        console.error('❌ Missing FIREBASE_PROJECT_ID or FIREBASE_PRIVATE_KEY env vars');
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
