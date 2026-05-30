// Main Electron process: creates the desktop window and loads the renderer.
const path = require("path");
const fs = require("fs/promises");
const { app, BrowserWindow, ipcMain, nativeImage, nativeTheme, protocol } = require("electron");
const DATA_DIR = path.join(__dirname, "data");
app.setAppUserModelId("com.easysearch.app");

// Register the custom scheme before the app is ready so fetch() can use it.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "appdata",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

async function handleAppDataRequest(request) {
  try {
    const requestUrl = new URL(request.url);
    const allowedFiles = new Set([
      "dictionary.json",
      "bible.json",
      "bible-versions.json",
      "bible-names.json",
      "bible-name-biodata.json",
      "concordance.json",
      "bsb_concordance.json",
      "strongs-occurrences.json",
      "commentary-manifest.json",
      "sources.json"
    ]);

    const resolveDataPath = (rootDir, relativePath) => {
      const normalizedPath = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
      if (!normalizedPath || normalizedPath.includes("..")) {
        return null;
      }

      const resolvedRoot = path.resolve(rootDir);
      const resolvedPath = path.resolve(resolvedRoot, normalizedPath);
      const rootPrefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
      const resolvedRootLower = resolvedRoot.toLowerCase();
      const resolvedPathLower = resolvedPath.toLowerCase();
      const rootPrefixLower = rootPrefix.toLowerCase();
      if (resolvedPathLower !== resolvedRootLower && !resolvedPathLower.startsWith(rootPrefixLower)) {
        return null;
      }
      return resolvedPath;
    };

    const serveFile = async (filePath) => {
      const fileContents = await fs.readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const contentType =
        extension === ".json" ? "application/json; charset=utf-8" :
        extension === ".htm" || extension === ".html" ? "text/html; charset=utf-8" :
        extension === ".css" ? "text/css; charset=utf-8" :
        extension === ".txt" ? "text/plain; charset=utf-8" :
        extension === ".ico" ? "image/x-icon" :
        extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" :
        extension === ".png" ? "image/png" :
        "application/octet-stream";

      return new Response(fileContents, {
        headers: {
          "content-type": contentType
        }
      });
    };

    if (requestUrl.pathname.startsWith("/translations/")) {
      const fileName = path.basename(requestUrl.pathname);
      if (!/^[a-z0-9_-]+\.json$/i.test(fileName)) {
        return new Response("Not found", { status: 404 });
      }

      const filePath = resolveDataPath(path.join(DATA_DIR, "translations"), fileName);
      if (!filePath) {
        return new Response("Not found", { status: 404 });
      }
      return serveFile(filePath);
    }

    if (requestUrl.pathname.startsWith("/commentaries/")) {
      const commentaryPath = requestUrl.pathname.replace(/^\/commentaries\//, "");
      const filePath = resolveDataPath(path.join(DATA_DIR, "commentaries"), commentaryPath);
      if (!filePath) {
        return new Response("Not found", { status: 404 });
      }
      return serveFile(filePath);
    }

    const fileName = path.basename(requestUrl.pathname);

    if (!allowedFiles.has(fileName)) {
      return new Response("Not found", { status: 404 });
    }

    const filePath = path.join(DATA_DIR, fileName);
    return serveFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function readLocalJson(relativePath) {
  const normalizedPath = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedPath || normalizedPath.includes("..")) {
    throw new Error("Invalid local data path.");
  }

  const allowedRoots = new Set([
    "dictionary.json",
    "bible.json",
    "bible-versions.json",
    "bible-names.json",
    "bible-name-biodata.json",
    "concordance.json",
    "bsb_concordance.json",
    "strongs-occurrences.json",
    "commentary-manifest.json",
    "sources.json"
  ]);

  let filePath = path.join(__dirname, "data", normalizedPath);
  if (normalizedPath.startsWith("translations/")) {
    filePath = path.join(__dirname, "data", normalizedPath);
  } else if (normalizedPath.startsWith("commentaries/")) {
    const commentaryRelativePath = normalizedPath.replace(/^commentaries\//, "");
    const resolvedPath = path.resolve(path.join(__dirname, "data", "commentaries"), commentaryRelativePath);
    const resolvedRoot = path.resolve(path.join(__dirname, "data", "commentaries"));
    const rootPrefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
    const resolvedPathLower = resolvedPath.toLowerCase();
    const resolvedRootLower = resolvedRoot.toLowerCase();
    const rootPrefixLower = rootPrefix.toLowerCase();
    if (!resolvedPathLower.startsWith(rootPrefixLower) && resolvedPathLower !== resolvedRootLower) {
      throw new Error("Local commentary file not allowed.");
    }
    if (!resolvedPath.toLowerCase().endsWith(".json")) {
      throw new Error("Local commentary file not allowed.");
    }
    filePath = resolvedPath;
  } else if (!allowedRoots.has(path.basename(normalizedPath))) {
    throw new Error("Local data file not allowed.");
  }

  const fileContents = await fs.readFile(filePath, "utf8");
  return JSON.parse(fileContents);
}

const APP_ICON_PATH = path.join(__dirname, "assets", "icon.ico");
const APP_ICON = nativeImage.createFromPath(APP_ICON_PATH);

function createWindow() {
  const window = new BrowserWindow({
    title: "Easy Search",
    width: 1000,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: true,
    icon: APP_ICON.isEmpty() ? undefined : APP_ICON_PATH,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1E1E1E" : "#F4F5F7",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!APP_ICON.isEmpty()) {
    window.setIcon(APP_ICON);
  }

  window.loadFile(path.join(__dirname, "index.html"));
  return window;
}

app.whenReady().then(() => {
  protocol.handle("appdata", handleAppDataRequest);
  ipcMain.handle("easy-search:read-json", (_event, relativePath) => readLocalJson(relativePath));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  ipcMain.removeHandler("easy-search:read-json");
  protocol.unhandle("appdata");
});
