// TODO: vlož sem config ze svého Firebase projektu
// (Firebase Console -> Project settings -> Your apps -> Config)
const firebaseConfig = {
  apiKey: "TVOJE_API_KEY",
  authDomain: "TVUJ_PROJEKT.firebaseapp.com",
  projectId: "TVUJ_PROJEKT",
  storageBucket: "TVUJ_PROJEKT.appspot.com",
  messagingSenderId: "TVOJE_ID",
  appId: "TVOJE_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
