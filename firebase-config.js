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
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// 3) The organizer's Gmail (lower case). Must match adminEmail() in firestore.rules.
window.PB_ADMIN_EMAIL = "your.name@gmail.com";
