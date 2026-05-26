const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

let db = null;
let firebaseInfo = {
  mode: 'uninitialized',
  projectId: null,
  clientEmail: null,
  initError: null
};

function initFirestore() {
  try {
    console.log('🔥 Initializing Firebase Admin using service-account.json...');

    const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`service-account.json not found at ${serviceAccountPath}`);
    }

    const serviceAccount = require(serviceAccountPath);

    console.log(`✅ Service account loaded: ${serviceAccount.project_id}`);

    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    db = getFirestore(app);

    firebaseInfo = {
      mode: 'admin-service-account-file',
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      initError: null
    };

    console.log(`✅ Firebase Admin connected successfully!`);
    console.log(`📊 Project: ${serviceAccount.project_id}`);
    console.log(`👤 Client Email: ${serviceAccount.client_email}`);

    testConnection();

  } catch (error) {
    firebaseInfo = {
      mode: 'failed',
      projectId: null,
      clientEmail: null,
      initError: error?.message || String(error)
    };
    console.error('❌ Firebase Admin init error:', error);
  }
}

async function testConnection() {
  try {
    if (!db) return;

    const testSnapshot = await db.collection('teams').limit(1).get();
    console.log(`✅ Firebase connection test: can read from teams (${testSnapshot.size} docs)`);

    const ambSnapshot = await db.collection('ambassadors').limit(1).get();
    console.log(`✅ Firebase connection test: can read from ambassadors (${ambSnapshot.size} docs)`);

  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
  }
}

initFirestore();

const dbWrapper = {
  collection(name) {
    if (!db) {
      throw new Error('Firebase not initialized. Check your service account file.');
    }
    return db.collection(name);
  }
};

function getFirestoreInstance() {
  if (!db) {
    throw new Error('Firebase not initialized. Check your service account file.');
  }
  return dbWrapper;
}

function convertFirestoreData(docSnap) {
  if (!docSnap) return null;

  const data = docSnap.data();
  const id = docSnap.id;

  if (!data) return { id };

  const converted = { id, ...data };

  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      converted[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && value._seconds !== undefined) {
      converted[key] = new Date(value._seconds * 1000).toISOString();
    } else if (Array.isArray(value)) {
      converted[key] = value.map(item => {
        if (item && typeof item === 'object' && typeof item.toDate === 'function') {
          return item.toDate().toISOString();
        }
        if (item && typeof item === 'object' && item._seconds !== undefined) {
          return new Date(item._seconds * 1000).toISOString();
        }
        return item;
      });
    }
  });

  return converted;
}

module.exports = {
  getFirestoreInstance,
  convertFirestoreData,
  firebaseInfo: () => firebaseInfo
};