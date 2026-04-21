import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (err) {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
    serviceAccount = JSON.parse(raw);
  }
  
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function test() {
  const q = db.collection('fichas').limit(3);
  const snapshot = await q.get();
  
  if (snapshot.empty) {
    console.log("No fichas found. Trying marcaciones...");
    const q2 = db.collection('marcaciones').limit(3);
    const snap2 = await q2.get();
    snap2.forEach(doc => {
      console.log('--- MARCACION', doc.id, '---');
      const data = doc.data();
      console.log('fotos object:', JSON.stringify(data.fotos || data.fotoList || null, null, 2));
    });
    return;
  }
  
  snapshot.forEach(doc => {
    console.log('--- FICHA', doc.id, '---');
    const data = doc.data();
    console.log('fotoList:', JSON.stringify(data.fotoList || data.fotos || null, null, 2));
  });
}

test().catch(console.error);
