# SourceDeck

AI-powered lead generation and pipeline management desktop application.

## Developer Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install
```bash
npm install
```

### Run in development
```bash
npm start
```

### Build for macOS
```bash
npm run build:mac
```

### Build for Windows
```bash
npm run build:win
```

### Release (macOS + Windows)
```bash
npm run release
```

## Architecture

- **Electron 29** desktop shell with auto-updater
- **Single-file HTML** interface (`sourcedeck.html`)
- **electron-store** for persistent local data with OS keychain encryption
- **electron-updater** for automatic updates via GitHub Releases
- **electron-builder** for cross-platform packaging (DMG + NSIS)

## Tabs

| Tab | Purpose |
|-----|---------|
| Dashboard | Pipeline stats, recent activity, quick actions |
| Discover | AI lead generation with multi-source support |
| Pipeline | Lead triage table with status management |
| Outreach | Email composer and reply tracking |
| Settings | BYOK API key management with encrypted storage |

## License

Proprietary. All rights reserved.
