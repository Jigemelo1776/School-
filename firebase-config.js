// Replace the below config with your Firebase project config.
// How to get config:
// 1. Go to https://console.firebase.google.com/ and create a project.
// 2. Add a web app and copy the firebaseConfig object.
// 3. Paste it here (do NOT commit to public repos with real keys).

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();