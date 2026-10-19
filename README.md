# Tidelog

Tidelog is a Nuxt fishing diary. Users sign in with Firebase Authentication; trips and saved fishing spots are stored in separate Firestore collections under each account's Firebase UID.

Trip entries include a picker of 30 commonly caught Ontario fish, with an "Other" option for species outside the list. Entries can record multiple lures with individual performance notes, hook, line, weight, and water depth. Save named fishing combo presets to quickly apply a set of lures, hook, line, and weight to a trip.
On the fishing spots page, choose **Pick a spot on map** and click the map to set a pin; no coordinate entry is needed.

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Cloud Firestore** database.
4. Enable **Cloud Storage** for the project.
5. Copy `.env.example` to `.env` and fill in the Firebase web app settings, including the storage bucket.
6. Deploy `firestore.rules` to Firestore and `storage.rules` to Firebase Storage.
7. Run `npm install` and `npm run dev`.

The Firestore rules restrict each account to its own `/users/{uid}/...` records. Firebase web configuration values are public client identifiers; Firestore security rules and Firebase Authentication enforce account access. Do not add Firebase Admin credentials or service account keys to this app.

New accounts start with an empty diary and fishing map. The old sample entries were demonstration data and are not copied into user accounts.
Trip logs can contain multiple species and quantities, plus up to six images (10 MB each). Images are saved under the signed-in user's Storage path; Storage rules restrict access to that user's image files.
Open **My diary** to edit or delete a trip; deleting a trip also removes its attached images.

## Other commands

```bash
npm run build
npm run dev
npm run preview
```
