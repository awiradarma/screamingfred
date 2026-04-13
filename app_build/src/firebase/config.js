import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // Using placeholder config for now, will need environment variables in production
  apiKey: "AIzaSy_dummy_key",
  authDomain: "screaming-fred.firebaseapp.com",
  projectId: "screaming-fred",
  storageBucket: "screaming-fred.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890abcdef"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
