# Tidelog

Tidelog is a Nuxt fishing diary. Users sign in with Firebase Authentication; trips and saved fishing spots are stored in separate Firestore collections under each account's Firebase UID.

Trip entries include a picker of 30 commonly caught Ontario fish, with an "Other" option for species outside the list. Entries can record multiple lures with individual performance notes, hook, line, weight, and water depth. Add optional individual fish details (length, weight, kept or released status, and a photo) to a catch; detailed entries represent one fish, while simpler species-and-quantity entries remain available. Save named fishing combo presets to quickly apply a set of lures, hook, line, and weight to a trip.
The **Tacklebox** page stores a personal lure inventory with name, brand, type, color/pattern, size/weight, and notes, as well as an optional rod inventory with brand, type, length, power, action, and notes. Select saved gear while logging a trip; trip logs keep a readable gear-name snapshot if an inventory item is later removed. Lure entries can be removed from the tacklebox without deleting their trip logs or catch history. The tacklebox summarizes lure catch totals by species.
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
When the diary is already open, users can create trips without a network connection. New trip details and catch photos are stored in account-scoped IndexedDB on that device, marked as waiting to sync, and uploaded automatically when connectivity returns. A manual **Try sync** action is available for retries. Unsynced entries can be discarded, but cannot be edited until they sync; existing trips cannot be edited or deleted offline. Previously synced trips and the rest of the app are not cached for offline browsing.
The diary can export a readable PDF report or a combined CSV file with trips, catches, saved spots, tacklebox gear, hidden lure entries, and combo presets. The CSV is the structured data export; photo fields contain Firebase Storage URLs, and the image files themselves remain in Storage.

## Other commands

```bash
npm run build
npm run dev
npm run preview
```

## iOS and Android app

The web app remains the primary shared Vue/Nuxt application. Capacitor packages a separate static, client-rendered build into native iOS and Android projects. Both app targets use the `com.tidelog.app` identifier.

1. Install dependencies and configure the Firebase values in `.env`.
2. Run `npm run mobile:sync` to generate the static app bundle and copy it into both native projects.
3. Run `npm run mobile:ios` to open the iOS project in Xcode, or `npm run mobile:android` to open Android Studio.
4. Select a simulator or connected device and run the app from Xcode or Android Studio.

Building iOS requires macOS and Xcode. Building Android requires Android Studio and its Android SDK. The native projects live in `ios/` and `android/`; run `npm run mobile:sync` after changing web code or Capacitor plugins. Source icon and splash assets live in `assets/`; regenerate platform assets with `npm run mobile:assets`.

The mobile app adds device-specific fishing workflows: take or choose catch photos with the native camera/photo picker, place a saved fishing spot using the device's location when the user taps the location button, receive haptic confirmation when a trip or spot is saved, and use the native network status to sync queued offline trips. Location is requested only for the explicit spot-placement action; the app does not track location in the background.

Before publishing, configure the final app-store identifiers and signing, verify Firebase configuration and authentication on physical devices, provide app-store privacy details and a privacy policy, and add an in-app account deletion flow (the app currently supports account creation). Test camera, location-denial, offline queue/retry, navigation, and accessibility on real iOS and Android devices. Native integrations provide useful device capabilities but do not guarantee store acceptance: Apple reviews minimum functionality and quality, and Google Play also reviews app quality and functionality. See [Apple App Review Guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality) and [Google Play's functionality policies](https://support.google.com/googleplay/android-developer/answer/9898783).
