// App settings for Pickleball Rotation Planner.
// Edit this file on GitHub: open it, tap the pencil icon, change the text between the quotes, then Commit changes.

// 1) Small text shown at the bottom of every page. Leave the quotes empty ("") to show nothing.
window.PB_FOOTER_TEXT = "Developed by Deep Thakkar";

// 2) Firebase settings.
//    Firebase console > Project settings (gear icon) > General > Your apps > your web app.
//    Copy each value from the "firebaseConfig" box into the matching line below.
//    These values are not secret. Your data is protected by the rules in firestore.rules.
//    While the values still start with PASTE, the app runs in demo mode (this device only).
window.PB_FIREBASE = {
  apiKey: "AIzaSyBI_qew3_Aqc4xT8lRwML9MLY5Lu5150SA",
  authDomain: "pickleball-group-cd174.firebaseapp.com",
  projectId: "pickleball-group-cd174",
  storageBucket: "pickleball-group-cd174.firebasestorage.app",
  messagingSenderId: "267112308400",
  appId: "1:267112308400:web:3f6167cd69fc0095482575"
};

// 3) The organizer's Gmail (lower case). Must match adminEmail() in firestore.rules.
window.PB_ADMIN_EMAIL = "niketrainingdeep@gmail.com";
