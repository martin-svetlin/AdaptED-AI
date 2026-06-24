
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";



const firebaseConfig = {
  apiKey: "AIzaSyAYTMmPi_aKtF_8SeTZ8YQuXt6PiRl93SY",
  authDomain: "adapted-ai-fc50c.firebaseapp.com",
  projectId: "adapted-ai-fc50c",
  storageBucket: "adapted-ai-fc50c.firebasestorage.app",
  messagingSenderId: "444548888351",
  appId: "1:444548888351:web:449e91aee44e80580ee22a",
  measurementId: "G-R034N0FNH4"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);