use std::path::{Path, PathBuf};
use tauri::Emitter;
use walkdir::WalkDir;

// -- Shared types --

#[derive(Clone, serde::Serialize)]
struct ScanProgress {
    scanned_folders: u64,
    total_folders: u64,
    percent: f64,
    current_folder: String,
}

#[derive(Clone, serde::Serialize)]
struct CategorizedFolder {
    name: String,
    path: String,
    size_bytes: u64,
    category: String,
}

#[derive(Clone, serde::Serialize)]
struct ScanResult {
    total_size_bytes: u64,
    folders: Vec<CategorizedFolder>,
}

// -- Classification --

fn classify_folder(name: &str) -> &'static str {
    match name {
        ".colima" | ".docker" | ".lima" | ".orbstack" | ".multipass" => "Virtual Machines & Containers",
        "node_modules" | ".npm" | ".yarn" | ".pnpm-store" | ".rustup" | ".cargo"
        | ".gradle" | ".m2" | ".cocoapods" | ".pub-cache" | ".nuget" => "Package Caches",
        "target" | "dist" | "build" | ".next" | ".turbo" | "__pycache__"
        | ".angular" | "out" | ".build" => "Build Artifacts",
        "Library" => "System Libraries",
        ".Trash" => "Trash",
        "Applications" | "Desktop" | "Documents" | "Downloads"
        | "Movies" | "Music" | "Pictures" | "Public" => "User Files",
        _ => "Other",
    }
}

// -- Commands --

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not resolve home directory".into())
}

#[tauri::command]
async fn smart_scan(window: tauri::Window) -> Result<ScanResult, String> {
    let home = dirs::home_dir().ok_or("Could not resolve home directory")?;
    tauri::async_runtime::spawn_blocking(move || run_smart_scan(home, window))
        .await
        .map_err(|err| format!("Scan worker failed: {err}"))?
}

fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

fn run_smart_scan(home: PathBuf, window: tauri::Window) -> Result<ScanResult, String> {
    let child_dirs: Vec<_> = std::fs::read_dir(&home)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();

    let total_folders = child_dirs.len() as u64;
    let mut folders = Vec::new();
    let mut total_size_bytes = 0_u64;

    for (i, child_path) in child_dirs.into_iter().enumerate() {
        let name = child_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("(unknown)")
            .to_string();

        let _ = window.emit(
            "scan-progress",
            ScanProgress {
                scanned_folders: i as u64,
                total_folders,
                percent: (i as f64 / total_folders as f64) * 100.0,
                current_folder: name.clone(),
            },
        );

        let size_bytes = dir_size(&child_path);
        total_size_bytes += size_bytes;

        let category = classify_folder(&name).to_string();

        folders.push(CategorizedFolder {
            name,
            path: child_path.to_string_lossy().to_string(),
            size_bytes,
            category,
        });
    }

    let _ = window.emit(
        "scan-progress",
        ScanProgress {
            scanned_folders: total_folders,
            total_folders,
            percent: 100.0,
            current_folder: String::new(),
        },
    );

    folders.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(ScanResult {
        total_size_bytes,
        folders,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_home_dir, smart_scan])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
