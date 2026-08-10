const { auth, db } = require('./utils/firebase');
require('dotenv').config();

const seedAdmin = async () => {
  const email = 'admin@zaintyres.com';
  const password = 'Admin@123';

  try {
    console.log(`🚀 Seeding Admin User: ${email}...`);

    let userRecord;
    try {
      // Check if user already exists in Auth
      userRecord = await auth.getUserByEmail(email);
      // Force update password to ensure it matches
      await auth.updateUser(userRecord.uid, {
        password: password
      });
      console.log('✅ Admin password updated in Firebase Auth');
    } catch (e) {
      // Create user if not exists
      userRecord = await auth.createUser({
        email,
        password,
        displayName: 'Admin User',
      });
      console.log('✅ Admin created in Firebase Auth');
    }


    // Ensure user exists in Firestore
    const adminData = {
      email,
      role: 'admin',
      is_banned: false,
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(adminData, { merge: true });
    console.log('✅ Admin profile created/updated in Firestore');

    console.log('\n✨ Admin Seeding Complete!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
