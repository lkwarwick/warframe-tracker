# Warframe Tracker

> [!Warning]
> This project is still in early development. It is highly likely that the underlying logic and UI will change over time.

Track your mastery progress and keep tabs on your Prime parts. A lightweight desktop companion for Warframe enthusiasts who want to stay on top of their grind.

## What It Does

Warframe Tracker helps you manage two key aspects of your Warframe progression; **Mastery Checklist**, and **Prime Parts Inventory**. To provide a way of saving data to the cloud in in OSS way, I opted to use GitHub Gist to save your progress to your own account. This way all you need is a PAT (Personal Access Token) and it will automatically create a file with the `` name. Add the following to a `.env` in your root directory:

```bash
VITE_GITHUB_TOKEN=<github-pat>
VITE_GIST_FILE_NAME=warframe-tracker.json
```

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
