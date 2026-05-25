import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAQBMRNTYfViM-iPy-nOZs3IdPEQRCQ56w",
  authDomain: "msw-artale.firebaseapp.com",
  projectId: "msw-artale",
  storageBucket: "msw-artale.firebasestorage.app",
  messagingSenderId: "793229546795",
  appId: "1:793229546795:web:8cff2b6f43ae48ac1d616e",
  measurementId: "G-YH8KBMMQGC"
};

// Retrieve config from localStorage or fallback to default
export function getFirebaseConfig() {
  const local = localStorage.getItem('artale_firebase_config');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error("Failed to parse custom Firebase config", e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

const config = getFirebaseConfig();

try {
  if (getApps().length === 0) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Helper to manually reinitialize if user saves a new config
export function reinitializeFirebase() {
  const newConfig = getFirebaseConfig();
  try {
    const activeApps = getApps();
    if (activeApps.length > 0) {
      // In web, you cannot easily delete default app without reloading or using deleteApp.
      // We can reload the page as suggested in original code, which is safer and fully updates the state!
    }
  } catch (error) {
    console.error("Reinitialization failed:", error);
  }
}

export { app, db, auth };
