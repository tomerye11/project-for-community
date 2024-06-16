// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const db = getFirestore(app);
const storage = getStorage(app);

// Function to upload a file to Firebase Storage
const uploadFile = (file: File) => {
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
    }, 
    () => {
      // Handle successful uploads
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        console.log('File available at', downloadURL);
      });
    }
  );
};

export { db, storage, uploadFile };
