# Tidelog

Tidelog is a Nuxt fishing diary. Users sign in with Firebase Authentication; trips and saved fishing spots are stored in separate Firestore collections under each account's Firebase UID.

Trip entries include a picker of 30 commonly caught Ontario fish, with an "Other" option for species outside the list. Entries can record multiple lures with individual performance notes, hook, line, weight, and water depth. Add optional individual fish details (length, weight, kept or released status, and a photo) to a catch; detailed entries represent one fish, while simpler species-and-quantity entries remain available. Save named fishing combo presets to quickly apply a set of lures, hook, line, and weight to a trip.
The **Tacklebox** page stores a personal lure inventory with name, brand, type, color/pattern, size/weight, and notes, as well as an optional rod inventory with brand, type, length, power, action, and notes. Select saved gear while logging a trip; trip logs keep a readable gear-name snapshot if an inventory item is later removed. Lure entries can be removed from the tacklebox without deleting their trip logs or catch history. The tacklebox summarizes lure catch totals by species.
On the fishing spots page, choose **Pick a spot on map** and click the map to set a pin; no coordinate entry is needed.

DISCLAIMER: This project does use AI tools to help with backend development. I do not take credit for code related to connecting local data to the cloud firebase (I.E. useFirebaseAuth.ts). 
## Hosting on GitHub Pages

The site is built and published by `.github/workflows/deploy-pages.yml` on every push to `main`. One-time setup:

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions** (not "Deploy from a branch", which only shows this README).
2. **Settings → Secrets and variables → Actions → Variables:** add the same Firebase values as your local `.env`:
   `NUXT_PUBLIC_FIREBASE_API_KEY`, `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NUXT_PUBLIC_FIREBASE_PROJECT_ID`, `NUXT_PUBLIC_FIREBASE_APP_ID`, `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID`.
3. **Firebase console → Authentication → Settings → Authorized domains:** add the site's domain (`tidelog.danhlee.ca`).

Files in `public/` should be referenced with `asset('/assets/...')` so they still load when the site is served from `/<repo>/`.
