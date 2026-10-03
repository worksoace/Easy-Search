# Easy Search

Easy Search is a lightweight offline Bible study and search desktop app built with Electron. It is designed for fast reading, word lookup, reference lookup, dictionary study, Bible name research, Strong's concordance exploration, and commentary reading without requiring an internet connection during normal use.

The app bundles its study data locally under `app/data`, so users can search and read immediately after installation. The interface puts the Bible reader beside a single tabbed study sidebar for Strong's, dictionary entries, Bible names and biodata, and commentary. Comparison and reading progress live in Reader options, and cross-references expand when needed.

## Features

- Offline Bible reading and search from bundled translation files.
- Multiple Bible versions through the local `bible-versions.json` manifest.
- KJV+ support with embedded Strong's numbers for Hebrew and Greek lookup.
- Webster dictionary lookup for general word definitions.
- Hitchcock Bible names lookup with related biodata where available.
- Strong's concordance entries with definitions, transliteration details, and sample verse references.
- Commentary panel with local Matthew Henry and Jamieson-Fausset-Brown commentary files.
- Search history and book filtering for repeated study sessions.
- A spacious Bible reader with a keyboard-accessible tabbed study sidebar.
- Compact passage navigation, collapsible cross-references, and reader options for comparison and reading progress.
- Right-click lookup for selected text inside study panels.
- Local preferences for layout, theme, hidden sections, and shortcuts.
- Windows installer and portable build support through `electron-builder`.

## Tech Stack

- Electron 31
- JavaScript, HTML, and CSS
- Web Worker based search in `app/search-worker.js`
- Local JSON and HTML study data in `app/data`
- `electron-builder` for Windows packaging

## Project Structure

```text
.
|-- app/
|   |-- assets/                 # App icons and bundled UI assets
|   |-- data/                   # Offline Bible, dictionary, concordance, names, and commentary data
|   |-- index.html              # Main app shell
|   |-- main.js                 # Electron main process
|   |-- preload.js              # Safe preload bridge
|   |-- renderer.js             # UI behavior, search orchestration, preferences, and panel logic
|   |-- search-worker.js        # Background search worker
|   `-- style.css               # App styling
|-- scripts/                    # Data and build helper scripts
|-- package.json                # App metadata, scripts, and Electron Builder config
|-- package-lock.json           # Locked npm dependency versions
|-- appicon.png                 # Source app icon image
|-- icon.ico                    # Windows icon
`-- README.md
```

Generated folders such as `node_modules`, `build`, `dist`, and temporary data folders are intentionally excluded by `.gitignore`.

## Requirements

- Node.js and npm
- Windows PowerShell for the current npm scripts
- Windows if you want to build the NSIS installer exactly as configured

The app itself is an Electron desktop application. The current package scripts are written for Windows because they use PowerShell and Windows installer assets.

## Installation

Install dependencies after cloning the repository:

```powershell
npm install
```

## Running the App

Start the Electron app in development mode:

```powershell
npm start
```

This launches Electron using `app/main.js` as the main process entry point.

## Available Scripts

```powershell
npm start
```

Runs the app locally with Electron.

```powershell
npm run data:bibles
```

Runs the public-domain Bible data download/conversion helper.

```powershell
npm run build:icon
```

Builds the Windows `.ico` file from the source icon image.

```powershell
npm run build:installer-assets
```

Generates installer-related image assets used by the NSIS build configuration.

```powershell
npm run build:portable
```

Builds a portable Windows package with Electron Builder.

```powershell
npm run build
```

Builds the Windows NSIS installer. Output is written to `dist/`.

## Data Notes

The app is built around local data files in `app/data`. Important datasets include:

- `bible-versions.json`: manifest for Bible versions shown in the app selector.
- `translations/*.json`: local Bible translation files used for offline reading and search.
- `dictionary.json`: Webster dictionary data.
- `bible-names.json`: Hitchcock Bible names data.
- `bible-name-biodata.json`: people and place biodata matched to Bible names.
- `concordance.json`: Strong's Hebrew and Greek concordance entries.
- `strongs-occurrences.json`: Strong's occurrence data used for related verse behavior.
- `commentary-manifest.json`: manifest for available local commentary sources.
- `commentaries/`: local commentary HTML files used by the commentary panel.

For source attribution and redistribution notes, see `app/data/README.md` and `app/data/sources.json`. Some translations or data sources may have different licensing requirements than public-domain texts, so verify permissions before redistributing modified bundles.

## Development Notes

The renderer owns most of the study workspace behavior. Search work is delegated to `app/search-worker.js` so the interface can stay responsive while querying Bible verses and study datasets.

Preferences and layout state are stored locally by the app. If a layout or setting appears stuck during development, clear the app's local storage or reset the relevant preference from the settings panel.

When adding new data files, update the relevant manifest file so the renderer can discover them. For Bible translations, update `app/data/bible-versions.json` and make sure the corresponding translation JSON follows the existing structure used by the bundled files.

## Building for Release

Before creating a release build, install dependencies and confirm the app starts locally:

```powershell
npm install
npm start
```

Then build the installer:

```powershell
npm run build
```

The generated installer and unpacked build output are placed in `dist/`. That folder is ignored by Git because it contains generated binaries and large build artifacts.

## Repository

GitHub remote:

```text
https://github.com/worksoace/Easy-Search.git
```

## License and Attribution

This repository contains application code plus bundled study data from multiple sources. Review `app/data/README.md` and `app/data/sources.json` before publishing releases, redistributing data, or adding new translations. Keep source notes current whenever bundled data changes.
