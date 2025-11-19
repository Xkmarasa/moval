import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1MidSAhEoPIHZdAA8JvoGyfljNB7iaww",
  authDomain: "moval-fff66.firebaseapp.com",
  projectId: "moval-fff66",
  storageBucket: "moval-fff66.firebasestorage.app",
  messagingSenderId: "990800591006",
  appId: "1:990800591006:web:7d2f566ed4e3e95ceb638f",
  measurementId: "G-KGDWELF803"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);