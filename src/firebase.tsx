import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // ייבוא Firebase Authentication
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBLJpEoG1mRGlXRrkRYv7RorKBR2OArfyg",
  authDomain: "community-registration-db.firebaseapp.com",
  projectId: "community-registration-db",
  storageBucket: "community-registration-db.appspot.com",
  messagingSenderId: "165140931406",
  appId: "1:165140931406:web:ac0a79861c2fdc80b2741f",
  measurementId: "G-YCEMVFBJV3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // אתחול Firebase Authentication
const db = getFirestore(app);
const storage = getStorage(app);

// Function to upload a file to Firebase Storage and get the download URL
const uploadFileAndGetURL = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const storageRef = ref(storage, `uploads/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        // Track the upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      }, 
      (error) => {
        // Handle unsuccessful uploads
        console.error('Upload failed:', error);
        reject(error);
      }, 
      () => {
        // Handle successful uploads
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          resolve(downloadURL);
        });
      }
    );
  });
};

export { auth, db, storage, uploadFileAndGetURL }; // הוספת auth לייצוא
