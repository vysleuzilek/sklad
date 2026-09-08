// Firebase config projektu sklad-u-havrana
const firebaseConfig = {
  apiKey: "AIzaSyDMY0TnEv2wbWN4QwKNFmix9tPCQrZWS_0",
  authDomain: "sklad-u-havrana.firebaseapp.com",
  projectId: "sklad-u-havrana",
  storageBucket: "sklad-u-havrana.firebasestorage.app",
  messagingSenderId: "196398904382",
  appId: "1:196398904382:web:063b5679f81b9e5e7f0d6f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
