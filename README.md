# Tidelog

Tidelog is a Nuxt fishing diary. Users sign in with Firebase Authentication; trips and saved fishing spots are stored in separate Firestore collections under each account's Firebase UID.

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Cloud Firestore** database.
4. Copy `.env.example` to `.env` and fill in the API key, auth domain, project ID, and app ID from the Firebase web app settings.
5. Deploy `firestore.rules` to the project's Firestore database.
6. Run `npm install` and `npm run dev`.

The Firestore rules restrict each account to its own `/users/{uid}/...` records. Firebase web configuration values are public client identifiers; Firestore security rules and Firebase Authentication enforce account access. Do not add Firebase Admin credentials or service account keys to this app.

New accounts start with an empty diary and fishing map. The old sample entries were demonstration data and are not copied into user accounts.

## Other commands

```bash
npm run build
npm run dev
npm run preview
```
