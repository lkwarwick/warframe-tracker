# Warframe Tracker

> Local Warframe mastery tracker application, built for Linux.


## Overview

I built this application for a number of reasons, but to summarise: moved to Linux, couldn't run Alecaframe without a bunch of other dependencies, and I hate ads. So I built this in a tech stack I'm fairly used to (apologies):

- Plotly Dash (Python) for the web-app.
- Electron to host the web-app as it's own application

Below showcases what the app looks like. It allows for quick overviews of all the item's in Warframe, and fitlering by pre-defined options (i.e., Prime Only, Hide Completed).

<p align="center"> <img src="docs/main.png" alt="Main application window"> </p>

## Limitations

Other trackers (such as AlecaFrame) are in a gray area when it comes to how they access your Warframe account's data (some people have said they've been banned for it).

Because of this, this application does not access your accounts data, meaning you must manually check off the progress of the items (annoying I know).

## Scope

The app contains tabs for the following groups of items:

- Warframes
- Primary Weapons
- Secondary Weapons
- Melee Weapons

## Running the Application

### Prerequisites

- Python + `uv` installed
- Node.js installed

### Project Structure

```
root/
    backend/        # Dash (Python)
    electron/       # Electron app
    pyproject.toml
```

### Install Dependencies

Backend:

```bash
cd backend
uv sync
```

Electron:

```bash
cd electron
npm install
```

### Run

```bash
npm start --prefix electron
```

### Behaviour

- Electron waits for the Dash server (localhost).
- Dash runs as the local UI backend.
- Electron provides the desktop shell around it.

### Adding as an Application (Linux)

Once the repository has been cloned and exists on your local device, you can add a new desktop entry file:

Create:

```
~/.local/share/applications/warframe-tracker.desktop
```

```
[Desktop Entry]
Type=Application
Name=Warframe Tracker
Exec=npm start --prefix /full/path/to/your/project/electron
Icon=/full/path/to/your/project/electron/assets/favicon.png
Terminal=false
Categories=Game;Utility
StartupNotify=True
```

Then run:

```
update-desktop-database ~/.local/share/applications
```

And it show now appear in your application launcher