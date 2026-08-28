# Warframe Tracker

> [!Warning]
> This project is still in early development. It is highly likely that the underlying logic and UI will change over time.

Track your mastery progress and keep tabs on your Prime parts. A lightweight desktop companion for Warframe enthusiasts who want to stay on top of their grind. User progress is saved locally on the computer running the app, in a dedicated folder that can be managed with Syncthing.

## What It Does

Warframe Tracker helps you manage two key aspects of your Warframe progression: **Mastery Checklist** and **Prime Parts Inventory**. The app does not currently require an account, GitHub token, or cloud service.

### Local Save Data

The desktop app uses [`electron-store`](https://github.com/sindresorhus/electron-store) to save device-specific window preferences separately from syncable tracker data.

Tracker data is stored in a dedicated subfolder of Electron's app-data directory:

```text
<app-data>/warframe-tracker/sync-data/user-data.json
```

Sync only the `sync-data` folder with Syncthing to share mastered items, component counts, and other personal settings between devices. Window size and position are stored alongside it but remain in `window-state.json`, outside the folder you sync.

On Linux, the default location is:

```text
~/.config/warframe-tracker/window-state.json
```

The Syncthing folder on Linux is:

```text
~/.config/warframe-tracker/sync-data/
```

Typical locations on other platforms are:

```text
# macOS
~/Library/Application Support/warframe-tracker/window-state.json

# Windows
%APPDATA%/warframe-tracker/window-state.json
```

The syncable data is stored under the `userData` key in `user-data.json` with this shape:

```json
{
   "userData": {
      "mastered": {},
      "components": {},
      "settings": {},
      "updatedAt": "2026-08-28T00:00:00.000Z"
   }
}
```

The app loads this record when it starts and saves changes automatically as mastery or component counts are updated. It also attempts a final save when the window closes. Existing data from the old combined `config.json` file is migrated automatically on first launch after this change. If the syncable file is missing or invalid, the app starts with empty progress.

### Mastery Checklist
Keep track of all the equipment you've mastered across every category:
- Warframes
- Primary Weapons
- Secondary Weapons
- Melee Weapons
- Archwings
- Companions

Never lose progress wondering what you've already leveled. The app remembers exactly where you left off.

### Prime Parts Inventory
Track your Prime parts collection and their ducat values at a glance. Perfect for keeping organized when you're racking up parts for prime vaulted items or just managing your farm haul.

## Getting Started (Users)

### How to Run

Since this is still in pre-release, you'll need to run it as a development build. Head over to the [developer setup section](#for-developers) below and follow the instructions to clone, install dependencies, and start the dev server.

## For Developers

Want to contribute or just get it running? Here's how to set up the project.

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Linux** with X11 support

### Setup & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/warframe-tracker.git
   cd warframe-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

1. **(Optional) Install Electron
   
   Not sure why (if you know, please submit a bug fix PR!) Electron fails to install. If you get an error like this, run the following command:
   ```bash
   npm run fix:electron
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The app will launch in development mode with hot reload enabled. Any changes to the code will automatically refresh the window.

### Desktop Integration (Optional)

To add Warframe Tracker to your applications menu, create a desktop entry:

```bash
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/warframe-tracker.desktop << EOF
[Desktop Entry]
Type=Application
Name=Warframe Tracker
Comment=Track your Warframe mastery and Prime parts
Exec=npm run dev --prefix /path/to/warframe-tracker
Icon=/path/to/warframe-tracker/electron/assets/icon.png
Terminal=false
Categories=Utility;Games;
EOF

update-desktop-database ~/.local/share/applications
```

Replace `/path/to/warframe-tracker` with the full path to your project directory. Your application launcher will now show Warframe Tracker.

---

**Have questions or want to contribute?** Feel free to open an issue or submit a pull request!

Happy tracking, Tenno.
