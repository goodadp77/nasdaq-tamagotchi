import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2XWlFWOpQGTCv0g0yz8gd-GVNlaZyqxM",
  authDomain: "nasdaq-tamagotchi.firebaseapp.com",
  projectId: "nasdaq-tamagotchi",
  storageBucket: "nasdaq-tamagotchi.firebasestorage.app",
  messagingSenderId: "856810350280",
  appId: "1:856810350280:web:1961ce32f343b6fabaa7fd",
  measurementId: "G-4Y25D30HXP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);