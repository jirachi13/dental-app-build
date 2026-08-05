# Installing FLORAL

**https://dental-app-build.vercel.app**

FLORAL is a **Progressive Web App (PWA)**. It installs from the browser — there is
no app store, no installer file, and nothing for IT to package. Once installed it
opens in its own window with its own icon, exactly like a normal program.

Installing is optional. The app works fine in a browser tab. Installing is worth
doing on clinic machines because staff get a double-clickable icon instead of a
URL to remember, and the offline behaviour becomes obvious rather than hidden.

---

## Windows

**Microsoft Edge** (installed by default on Windows 10/11)

1. Open **https://dental-app-build.vercel.app** in Edge.
2. Click the **⋯** menu (top-right) → **Apps** → **Install this site as an app**.
   *Shortcut: an install icon (a small monitor with a down-arrow) also appears at
   the right end of the address bar.*
3. Confirm the name **FLORAL** → **Install**.
4. Tick **Create Desktop shortcut** (and **Pin to taskbar** if you want it there).

**Google Chrome**

1. Open the site in Chrome.
2. Click the **install icon** in the address bar, or **⋮** → **Cast, save and
   share** → **Install page as app**.
3. **Install**. To pin it: Start Menu → right-click **FLORAL** → **Pin to taskbar**.

---

## macOS

**Chrome or Edge** — same as Windows: the install icon appears in the address bar.
The app lands in your **Applications** folder and can be kept in the Dock.

**Safari 17 or newer** (macOS Sonoma and later)

1. Open the site in Safari.
2. **File** menu → **Add to Dock**.
3. Confirm the name → **Add**.

Older versions of Safari cannot install web apps. Use Chrome or Edge instead.

---

## Linux

**Chrome, Chromium, or Edge**

1. Open the site.
2. Click the **install icon** in the address bar, or **⋮** → **Cast, save and
   share** → **Install page as app**.
3. **Install**. This creates a normal applications-menu entry (a `.desktop` file),
   so FLORAL appears alongside your other programs and can be added to a dock or
   favourites bar.

**Firefox cannot install web apps on any desktop platform** — Mozilla removed the
feature. Firefox will still run FLORAL perfectly well in a normal tab.

---

## Android

**Chrome** (or Edge, Samsung Internet, Firefox)

1. Open the site.
2. A **"Install app"** or **"Add to Home screen"** banner usually appears. If it
   does not, tap **⋮** → **Add to Home screen** / **Install app**.
3. Confirm.

The icon appears on the home screen and in the app drawer. Android applies its own
icon shape (circle, squircle, or rounded square depending on the launcher) — the
FLORAL icon is designed for this and will not be clipped.

---

## iPhone / iPad

**Safari only.** Chrome and Firefox on iOS can only create a bookmark, not a real
app — Apple restricts installation to Safari.

1. Open the site in **Safari**.
2. Tap the **Share** button (the square with an up-arrow).
3. Scroll down → **Add to Home Screen**.
4. Confirm the name **FLORAL** → **Add**.

> ⚠️ **Important limitation on iPhone and iPad.** iOS clears a web app's stored
> data if the app goes unused for roughly a week. For FLORAL that includes the
> **offline queue** — records saved while offline and not yet synced. Someone who
> fills in records offline on an iPhone and does not reopen the app for several
> days can lose those unsynced entries.
>
> This is an Apple platform restriction, not a fault in FLORAL, and it does not
> affect anything already synced to the server.
>
> **Recommendation: use Android phones or Windows PCs for any work done offline.**
> iPhone and iPad are fine for normal online use.

---

## Browser support at a glance

| Platform | Chrome | Edge | Safari | Firefox |
|---|---|---|---|---|
| Windows | ✅ | ✅ | — | ❌ |
| macOS | ✅ | ✅ | ✅ (17+) | ❌ |
| Linux | ✅ | ✅ | — | ❌ |
| Android | ✅ | ✅ | — | ✅ |
| iOS / iPadOS | ❌ | ❌ | ✅ | ❌ |

❌ means the browser cannot *install* the app. Every browser listed can still run
FLORAL normally in a tab.

---

## What installing gives you

- Its own window — no address bar or tabs, so it looks and behaves like a normal
  program
- A desktop, Start Menu, Dock, applications-menu, or home-screen icon
- **Offline use.** The app still opens without a connection. An offline banner
  appears, and records you save are queued and sent automatically, oldest first,
  once the connection returns
- **Automatic updates.** When a new version is deployed, the app offers to
  reload — there is nothing to download or reinstall

## Uninstalling

Nothing was truly installed on the system, so removal is clean.

- **Windows / Linux**: right-click the icon in the Start Menu or applications menu
  → **Uninstall**
- **macOS**: drag it from Applications to the Trash (Safari: remove it from the Dock)
- **Android**: long-press the icon → **Uninstall**
- **iOS**: long-press the icon → **Remove App** → **Delete**

---

## Troubleshooting

**The install option is missing.** The site must be open over `https://` and fully
loaded. If you are already running the installed app, the option will not appear
again. Firefox on desktop never shows it.

**The icon is wrong or looks like a generic globe.** The app was probably installed
before the FLORAL logo was added (before 2026-08-06). Uninstall and reinstall to
pick up the current icon.

**Changes to the app are not showing.** Close and reopen the app so it can apply a
pending update. If it persists, uninstall and reinstall.

**Login fails right after install.** Check the connection — signing in requires
being online. Offline mode keeps you signed in, but cannot perform a fresh login.
