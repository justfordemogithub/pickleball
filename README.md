# Pickleball Rotation Planner

A web app for your pickleball group. It makes fair doubles schedules for 4 to 12 players on one or two courts. Everyone in the group sees winners and finished games live on their own phone, and each session ends with an analysis and a PDF.

- **Hosting:** GitHub Pages (free)
- **Login and live data:** Firebase, free Spark plan only. No billing account is needed.
- **Who can use it:** up to 12 Google accounts that the organizer adds on the organizer-only **Manage members** page.
- **Storage:** each session is deleted automatically 7 days after it starts.

Until Firebase is connected, the app runs in **demo mode**. In demo mode it works fully, but sessions stay on the one device.

---

## Part A: Put the app on GitHub (about 5 minutes)

1. Sign in at github.com. Tap **+** (top right), then **New repository**.
2. **Repository name:** `pickleball`. The name becomes part of your link.
3. Choose **Public**. Free GitHub Pages needs a public repository. Your data is still private, because it lives in Firebase behind the member list.
4. Tap **Create repository**.
5. Tap **uploading an existing file**. Drag in **everything** from the unzipped folder, including the `icons` and `vendor` folders. Tap **Commit changes**.
6. Open **Settings**, then **Pages**.
   - Under **Build and deployment**, set **Source** to **Deploy from a branch**.
   - Set **Branch** to **main**, folder **/(root)**, then tap **Save**.
7. Wait 1 to 2 minutes. Your link will be:
   **`https://YOUR-GITHUB-USERNAME.github.io/pickleball/`**
   The app opens in demo mode.

## Part B: Connect Firebase, free plan (about 15 minutes)

1. Go to **console.firebase.google.com** and sign in with the organizer's Gmail.
2. **Create a project.** Tap **Create a project**, name it `pickleball-group`, turn **Google Analytics** off, then tap **Create project**.
3. **Turn on Gmail login.**
   - Open **Build**, then **Authentication**, then **Get started**.
   - Under **Sign-in method**, tap **Google**, switch **Enable** on, pick your support email, then tap **Save**.
4. **Allow your GitHub link.**
   - In **Authentication**, open **Settings**, then **Authorized domains**, then tap **Add domain**.
   - Type `YOUR-GITHUB-USERNAME.github.io` (no `https://`, no `/pickleball`) and tap **Add**.
5. **Create the database.**
   - Open **Build**, then **Firestore Database**, then **Create database**.
   - Choose location **asia-south1 (Mumbai)**, or the one nearest to you. You cannot change this later.
   - Choose **Start in production mode**, then tap **Create**.
6. **Publish the rules.**
   - In Firestore, open the **Rules** tab.
   - Delete everything there and paste the whole file `firestore.rules`.
   - On the `adminEmail` line, replace `your.name@gmail.com` with the organizer's Gmail.
   - Tap **Publish**.
7. **Register the web app.**
   - Tap the **gear icon**, then **Project settings**. Under **Your apps**, tap the **Web** icon (`</>`).
   - Nickname: `pickleball-web`. Leave **Firebase Hosting** unticked.
   - Tap **Register app**. You will see a box called `firebaseConfig`.
8. **Paste the settings into GitHub.**
   - On GitHub, open `firebase-config.js` and tap the **pencil** (edit) icon.
   - Copy each value from the `firebaseConfig` box into the matching line: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
   - On the `PB_ADMIN_EMAIL` line, put the same organizer Gmail as in step 6.
   - Tap **Commit changes**, then wait 1 to 2 minutes.
9. **Add your group.**
   - Open your link, tap **Sign in with Google**, and choose the organizer's Gmail.
   - Open the menu (top right), then **Manage members**. For each person type their **Gmail** and a **username** (2 to 20 characters, different for everyone), then tap **Add**. Up to 11 more people. Only you see this page.
   - The app shows usernames instead of emails, for example "Started by Riya". Tap the pencil next to a person to change their username at any time.

Done. Share the link with your group. On a phone, use the browser's **Add to Home Screen** to get an app icon.

### Staying free

- Never tap **Upgrade** or add a billing account in Firebase. On the free Spark plan nothing can be charged. If a daily free limit were ever reached (for example if someone deliberately flooded the database with requests), the app would pause until the next day. Your data stays safe.
- Share the app link only within your group. Now and then you can check Firebase > Firestore Database > **Usage** for unusual numbers of reads or writes.
- A 12-player session uses only a few hundred of the 50,000 free reads and 20,000 free writes per day.
- Firebase does not need any access to your GitHub account. The only link between them is the authorized domain from step B4.

## Keeping it secure (5 minutes, once)

1. **Turn on 2-Step Verification** for the organizer's Google account and for your GitHub account. Anyone who gets into either account could change the app or the member list.
2. **Remove `localhost`** from Firebase > Authentication > Settings > Authorized domains. Keep only `YOUR-GITHUB-USERNAME.github.io` and the two Firebase domains (`...firebaseapp.com`, `...web.app`).
3. **Do not add other people** to the Firebase project or to the GitHub repository. Members only need to be on the in-app member list.
4. **Do not enable other sign-in methods** in Firebase (Email/Password, Anonymous, Phone). Only Google is needed.
5. On a shared or borrowed phone, use **Sign out** from the menu. It also removes the sessions saved on that phone.

What the app already does for you:

- Only signed-in members on your list can read or change sessions. This is checked by the database, not only by the screen.
- Only you, the organizer, can see or change the member list.
- The database refuses badly formed or oversized data, and the app ignores anything it cannot read safely.
- "Started by" and "Last change by" use the username you gave each person, checked by the database, so they cannot be faked.
- Each member's phone only learns their own username, never the list of emails.
- The page only runs its own code and Google's Firebase code, and refuses to open inside other websites.

## Change the footer text

The small line at the bottom of every page ("Developed by ABC") is set in `firebase-config.js`:

1. On GitHub, open `firebase-config.js` and tap the **pencil** (edit) icon.
2. Change the words between the quotes on this line: `window.PB_FOOTER_TEXT = "Developed by ABC";`
3. Tap **Commit changes**. The new text appears within 1 to 2 minutes (refresh the page).

Leave the quotes empty (`""`) to hide the line.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | Look and feel |
| `engine.js` | Fair rotation maker: equal play time, rotating partners and opponents, even court time |
| `app.js` | Login, members, live sessions, analysis, PDF |
| `firebase-config.js` | **Your settings**: footer text, Firebase values (step B8), organizer Gmail |
| `firestore.rules` | Who may read and change data (step B6). Not used by the page itself. |
| `vendor/jspdf.umd.min.js` | PDF library (jsPDF 4.2.1, MIT licence), served from your own site |
| `manifest.webmanifest`, `icons/` | Home-screen icon and name |

## If something goes wrong

- **"This web address is not allowed yet"**: redo step B4 and check the spelling of your domain.
- **"Database rules needed"** after signing in as the organizer: the rules are not published, or the Gmail in `firestore.rules` and `firebase-config.js` do not match.
- **"Not on the member list yet"**: the organizer must add that Gmail under Manage members.
- **A member's changes are not saved** right after their username was changed: they should close and reopen the app once.
- **The Google sign-in window opens but nothing happens afterwards**: tell the developer. As a temporary workaround, delete the line that starts with `<meta http-equiv="Content-Security-Policy"` in `index.html`.
- **The app still says demo mode**: check that no value in `firebase-config.js` still starts with `PASTE`, then wait 2 minutes and refresh.
