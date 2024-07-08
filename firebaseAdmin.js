import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };;

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'community-registration-db.appspot.com'
});

const db = getFirestore();
const bucket = getStorage().bucket();

export { db, bucket };
