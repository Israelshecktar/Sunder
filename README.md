<div align="center">
  <h1>⚡ Sunder <small>(Beta)</small></h1>
  <p>
    <strong>A high-performance, minimalist system cleaner built for the modern engineer.</strong>
  </p>
  <p>
    <a href="https://github.com/rust-lang/rust"><img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" /></a>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  </p>
</div>

<br/>

Unlike heavy, legacy "cleaner" apps, Sunder is powered by a **Rust engine** and a **Tauri v2 framework**, ensuring near-zero memory footprint and blazing-fast disk traversal.

---

## 🛠 Engineering Philosophy

Sunder is built on three core engineering pillars:

- 🛡️ **Safety First**: Uses the "Dry Run" pattern. No destructive action occurs without an explicit, audited user command.
- 🏎️ **Native Performance**: Leverages Rust's `rayon` for data-parallelism, scanning millions of files using all available CPU cores.
- 🪶 **Minimalist Footprint**: By utilizing the OS's native WebView (WebView2 on Windows, WebKit on macOS), we avoid the 100MB+ overhead of Electron.

## 🏗 Project Architecture

Sunder follows strict Clean Architecture to separate UI logic from high-privilege system operations.

```plaintext
├── src/                # Frontend (React + TypeScript)
│   ├── components/     # UI Components (Tailwind CSS)
│   └── hooks/          # Tauri IPC "Invoke" wrappers
├── src-tauri/          # Backend (Rust Core)
│   ├── src/
│   │   ├── commands/   # Exposed IPC functions (Scan, Purge, Metadata)
│   │   ├── engine/     # The "Heavy Lifting" (Parallel file crawler)
│   │   └── main.rs     # App entry point & lifecycle management
│   ├── capabilities/   # Tauri v2 Security Scopes (Permissions)
│   └── tauri.conf.json # Build & Security configurations
└── .github/workflows/  # CI/CD (Automated Multi-OS Builds)
```

## 🚀 Step-by-Step Engineering Setup

### 1. Prerequisites

- **Rust**: `rustup` (stable)
- **Node.js**: v20+
- **System Headers**:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: WebView2 & C++ Build Tools

### 2. Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/sunder.git

# 2. Install Frontend Dependencies
npm install

# 3. Launch in Dev Mode (Hot-reloading for both UI and Rust)
npm run tauri dev
```

### 3. Build & Distribution (The Beta Workflow)

To build a production-ready binary locally:

```bash
npm run tauri build
```

**Generates:**
- **macOS**: `target/release/bundle/dmg/Sunder.dmg`
- **Windows**: `target/release/bundle/msi/Sunder.msi`

## 🛡 Security & Permissions

Sunder adheres to **Tauri v2 Scopes**. We explicitly limit the app's file-system access in `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "fs:allow-read",
    "fs:allow-write",
    "path:default"
  ]
}
```

> **Note:** During Beta, we use the `trash` crate to move files to the Recycle Bin rather than immediate deletion to prevent data loss.

## 📈 Roadmap (Beta to Pro)

- [ ] **Phase 1 (MVP)**: Parallel disk scanning for `node_modules` and Temp folders.
- [ ] **Phase 2**: Sunburst Chart visualization for large "ghost" files.
- [ ] **Phase 3**: "Dev-Purge" mode specifically for Docker, Xcode, and Pip caches.
- [ ] **Phase 4**: Automated Notarization (macOS) and Code Signing (Windows).

## 🤝 Contributing

As an open-source beta, we welcome contributions!

1. Fork the project.
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: add ultra-fast scan'`).
4. Push to the branch (`git push origin feat/AmazingFeature`).
5. Open a Pull Request.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
