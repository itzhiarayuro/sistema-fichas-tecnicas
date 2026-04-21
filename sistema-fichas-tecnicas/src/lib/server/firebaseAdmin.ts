import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        let serviceAccount: any = undefined;
        
        if (serviceAccountValue) {
            let raw = serviceAccountValue.trim();
            // Eliminar comillas simples o dobles externas si existen
            if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
                raw = raw.slice(1, -1);
            }
            serviceAccount = JSON.parse(raw);
        }

        if (serviceAccount && serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        } else {
            // Fallback para desarrollo si no hay Service Account (usará Application Default Credentials)
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        }
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();

export default admin;
