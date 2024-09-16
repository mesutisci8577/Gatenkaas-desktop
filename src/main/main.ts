/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, globalShortcut, clipboard, desktopCapturer, Notification, nativeImage, Tray, Menu, dialog } from 'electron';
import { autoUpdater, AppUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import axios from 'axios';
import 'dotenv/config';
// import {logError} from 'electron-unhandled';


let curWindow;
let updateInterval = null;
let updateCheck = false;
let updateFound = false;
let updateNotAvailable = false;

// Basic flags for autoupdater
// autoUpdater.autoDownload = false;
// autoUpdater.autoInstallOnAppQuit = true;

const BACKEND_URL = process.env.STAGING === "true" ? "http://localhost:5001" : "https://api.snelterecht.nl";
const FRONTEND_URL = "https://app.snelterecht.nl";

// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

// New update available
autoUpdater.on('update-available', (info) => {
  // curWindow.showMessage("Update available")
  // let pth = autoUpdater.downloadUpdate();
  // curWindow.showMessage(pth)
  // new Notification({
  //   title: 'Er staat een update klaar',
  //   body: 'Er is een nieuwe update beschikbaar. We downloaden hem nu voor je...'
  // }).show();
  
  if (!updateCheck) { 
    updateInterval = null;    
    updateCheck = true;  
  }
});

autoUpdater.on("update-not-available", (info) => {
  // curWindow.showMessage("Update not available");
  // curWindow.showMessage(pth)
  if (!updateNotAvailable) {
    updateNotAvailable = true;
    dialog.showMessageBox({
      type: "error",
      title: "Error",
      message: `${error}`,
      buttons: ["Close"],
    });
  }
})

autoUpdater.on('update-downloaded', () => {
  // curWindow.showMessage("Update downloaded")
  // new Notification({
  //   title: 'Er staat een update klaar',
  //   body: 'Er is een nieuwe update beschikbaar. We downloaden hem voor je als je Snelterecht opnieuw opstart...'
  // }).show();  

  if (!updateFound) {
    updateInterval = null;
    updateFound = true;

    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 3500);
  }
});

autoUpdater.on('error', (error) => {
  console.error('Fout bij het updaten:', error);
  curWindow.showMessage(error)
  // logError(new Error(error.toString()));
});

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const captureScreen = async () => {
  console.log("Capturing screenshot...");
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (sources.length > 0) {
      const source = sources[0];
      const image = source.thumbnail.crop({
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
      });
      clipboard.writeImage(image);

      console.log("Screenshot taken and copied to clipboard");

      sendToBackend(image);
    } else {
      console.error("No screens found");
    }
  } catch (error) {
    console.error("Failed to capture screen", error);
  }
};

const sendToBackend = async (image: Electron.NativeImage) => {
  const backendUrl = BACKEND_URL;
  const selectedSoftware = await mainWindow?.webContents.executeJavaScript(
    'localStorage.getItem("selectedSoftware")'
  );

  console.log('Sending to backend...', backendUrl);

  if (!backendUrl) {
    console.error('BACKEND_URL is not set in the environment variables.');
    return;
  }

  try {
const response = await axios.post(
  `${backendUrl}/api/desktop/patients`,
  {
    image: image.toDataURL(),
    software: selectedSoftware,
  }
);

console.log(`Response ID: ${response.data}`);

    shell.openExternal(`${FRONTEND_URL}/patienten/all?fromApp=true&software=${selectedSoftware}&id=${response.data}`);

    console.log('Successfully sent to backend');

    // console.log(response)
    // const { firstName, lastName, phoneNumber, dossierNumber } = response.data;

    // const url = new URL(`${FRONTEND_URL}/patienten/all`);
    // url.searchParams.append('fromApp', 'true');
    // url.searchParams.append('software', selectedSoftware);
    // url.searchParams.append('firstName', firstName);
    // url.searchParams.append('lastName', lastName);
    // url.searchParams.append('phoneNumber', phoneNumber);
    // url.searchParams.append('dossierNumber', dossierNumber);

    // shell.openExternal(url.toString());
  } catch (error) {
    console.error('Failed to send to backend', error);
  }
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
    autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

app.whenReady().then(() => {
  createWindow();

  updateInterval = setInterval(() => autoUpdater.checkForUpdates(), 10000);

  tray = new Tray(
    nativeImage.createFromPath(
      path.join(process.resourcesPath, 'assets/icon.png'),
    ),
  );

  tray.on("click", () => {
    tray.popUpContextMenu();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Toevoegen vanaf patiëntenkaart',
      click: () => {
        captureScreen().catch((err) => {
          console.error('Failed to take screenshot:', err);
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Nieuwe lege plek melden',
      click: () => {
        shell.openExternal(`${FRONTEND_URL}/gaten/nieuw`);
      },
    },
    {
      label: 'Handmatig patiënt toevoegen',
      click: () => {
        shell.openExternal(`${FRONTEND_URL}/patienten/all`);
      },
    },
    { type: "separator" },
    {
      label: "Snelterecht afsluiten",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Snelterecht');
  tray.setContextMenu(contextMenu);

  autoUpdater.checkForUpdates()
  // curWindow.showMessage("Checking for updates")


  // Register the global shortcut
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    new Notification({
      title: 'Nieuwe patiënt aan het toevoegen...',
      body: 'We sturen je door naar Snelterecht.',
    }).show();

    captureScreen().catch((err) => {
      console.error('Failed to take screenshot:', err);
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', (e) => {
    e.preventDefault(); // Prevent the app from quitting
    if (process.platform === 'darwin') {
      app.dock.hide(); // Hide the dock icon on macOS
    }
  });
}).catch((err) => {
  console.error('Failed to initialize app:', err);
});


app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});



