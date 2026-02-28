import { useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type ScanProgress = {
  scanned_folders: number;
  total_folders: number;
  percent: number;
  current_folder: string;
};

type CategorizedFolder = {
  name: string;
  path: string;
  size_bytes: number;
  category: string;
};

type ScanResult = {
  total_size_bytes: number;
  folders: CategorizedFolder[];
};

type CategoryGroup = {
  category: string;
  totalBytes: number;
  folders: CategorizedFolder[];
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const UNITS = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const scaledValue = bytes / 1024 ** unitIndex;
  const decimalPlaces = scaledValue >= 100 || unitIndex === 0 ? 0 : 2;

  return `${scaledValue.toFixed(decimalPlaces)} ${UNITS[unitIndex]}`;
}

function groupFoldersByCategory(folders: CategorizedFolder[]): CategoryGroup[] {
  const categoryMap = new Map<string, CategoryGroup>();

  for (const folder of folders) {
    const existingGroup = categoryMap.get(folder.category);

    if (existingGroup) {
      existingGroup.totalBytes += folder.size_bytes;
      existingGroup.folders.push(folder);
    } else {
      categoryMap.set(folder.category, {
        category: folder.category,
        totalBytes: folder.size_bytes,
        folders: [folder],
      });
    }
  }

  const allGroups = [...categoryMap.values()];
  allGroups.sort((groupA, groupB) => groupB.totalBytes - groupA.totalBytes);
  return allGroups;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Virtual Machines & Containers": "\uD83D\uDDA5\uFE0F",
  "Package Caches": "\uD83D\uDCE6",
  "Build Artifacts": "\uD83D\uDD27",
  "System Libraries": "\uD83D\uDCDA",
  "Trash": "\uD83D\uDDD1\uFE0F",
  "User Files": "\uD83D\uDCC1",
  "Other": "\uD83D\uDCC2",
};

function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanPercent, setScanPercent] = useState(0);
  const [currentFolderName, setCurrentFolderName] = useState("");
  const [foldersScanned, setFoldersScanned] = useState(0);
  const [foldersTotal, setFoldersTotal] = useState(0);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  async function startScan() {
    setIsScanning(true);
    setErrorMessage("");
    setScanResult(null);
    setScanPercent(0);
    setCurrentFolderName("");
    setFoldersScanned(0);
    setFoldersTotal(0);
    setElapsedMilliseconds(0);
    setSelectedCategory(null);

    const scanStartTime = Date.now();
    const elapsedTimer = window.setInterval(
      () => setElapsedMilliseconds(Date.now() - scanStartTime),
      100,
    );

    let unlistenProgress: UnlistenFn | undefined;

    try {
      unlistenProgress = await listen<ScanProgress>(
        "scan-progress",
        (progressEvent) => {
          setScanPercent(progressEvent.payload.percent);
          setCurrentFolderName(progressEvent.payload.current_folder);
          setFoldersScanned(progressEvent.payload.scanned_folders);
          setFoldersTotal(progressEvent.payload.total_folders);
        },
      );

      const result = await invoke<ScanResult>("smart_scan");
      setScanResult(result);
      setScanPercent(100);
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : String(caughtError),
      );
    } finally {
      window.clearInterval(elapsedTimer);
      setElapsedMilliseconds(Date.now() - scanStartTime);
      unlistenProgress?.();
      setIsScanning(false);
    }
  }

  function selectCategory(categoryName: string) {
    setSelectedCategory((currentCategory) =>
      currentCategory === categoryName ? null : categoryName,
    );
  }

  const categoryGroups = scanResult
    ? groupFoldersByCategory(scanResult.folders)
    : [];

  const elapsedSeconds = (elapsedMilliseconds / 1000).toFixed(1);

  return (
    <main className="container">
      <h1>Sunder</h1>

      {!isScanning && !scanResult && (
        <div className="hero">
          <p>
            Detect what's eating your disk - <strong>Instantly.</strong> Break them{" "}
            <del>Down</del> <strong className="brand-word">Sunder.</strong>
          </p>
          <button className="scan-circle" onClick={startScan}>
            <span className="scan-circle-label">Scan</span>
          </button>
        </div>
      )}

      {isScanning && (
        <div className="progress-panel">
          <p className="progress-label">
            Scanning{currentFolderName ? `: ${currentFolderName}` : "..."}
          </p>
          <progress value={scanPercent} max={100} />
          <p className="numeric">
            {foldersScanned.toLocaleString()}/{foldersTotal.toLocaleString()} folders
            &middot; {elapsedSeconds}s
          </p>
        </div>
      )}

      {errorMessage && <p className="error">{errorMessage}</p>}

      {scanResult && (
        <>
          <section className="summary-card">
            <p className="summary-label">Total Size</p>
            <p className="summary-size numeric">
              {formatBytes(scanResult.total_size_bytes)}
            </p>
            <p className="summary-meta numeric">
              {scanResult.total_size_bytes.toLocaleString()} bytes &middot;{" "}
              {scanResult.folders.length} folders &middot; {elapsedSeconds}s
            </p>
          </section>

          <section className="categories-split">
            <div className="category-list">
              {categoryGroups.map((group) => (
                <button
                  key={group.category}
                  className={`category-row ${
                    selectedCategory === group.category ? "active" : ""
                  }`}
                  onClick={() => selectCategory(group.category)}
                >
                  <span className="category-row-label">
                    {CATEGORY_ICONS[group.category] || "\uD83D\uDCC2"}{" "}
                    {group.category}
                  </span>
                  <strong className="numeric">
                    {formatBytes(group.totalBytes)}
                  </strong>
                </button>
              ))}
            </div>

            <div className="detail-panel">
              {selectedCategory ? (
                <ul className="detail-folder-list">
                  {categoryGroups
                    .find(
                      (group) => group.category === selectedCategory,
                    )
                    ?.folders.sort(
                      (folderA, folderB) =>
                        folderB.size_bytes - folderA.size_bytes,
                    )
                    .map((folder) => (
                      <li key={folder.path} className="detail-folder-row">
                        <span className="detail-folder-name">
                          {folder.name}
                        </span>
                        <span className="detail-folder-size numeric">
                          {formatBytes(folder.size_bytes)}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="detail-empty">Select a category to explore</p>
              )}
            </div>
          </section>

          <button className="rescan-btn" onClick={startScan}>
            Rescan
          </button>
        </>
      )}
    </main>
  );
}

export default App;
