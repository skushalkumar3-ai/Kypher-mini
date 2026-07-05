const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
const logPath = path.join(__dirname, 'kypher-debug.log');

function log(message) {
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    log(`did-fail-load ${code}: ${description}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log(`render-process-gone ${JSON.stringify(details)}`);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`console ${level} ${sourceId}:${line} ${message}`);
  });
  mainWindow.loadFile('index.html');
}

function buildPetMenu() {
  return Menu.buildFromTemplate([
    { label: 'Start 25m Focus Session', click: () => mainWindow?.webContents.send('pet-command', 'focus') },
    { label: 'Start 5m Break', click: () => mainWindow?.webContents.send('pet-command', 'break') },
    { type: 'separator' },
    { label: 'Perch Here', click: () => mainWindow?.webContents.send('pet-command', 'perch') },
    { label: 'Explore Screen', click: () => mainWindow?.webContents.send('pet-command', 'explore') },
    { label: 'Do a Hero Pose', click: () => mainWindow?.webContents.send('pet-command', 'hero') },
    { type: 'separator' },
    {
      label: 'Speech Frequency',
      submenu: [
        { label: '15 seconds', click: () => mainWindow?.webContents.send('pet-command', 'speech-15') },
        { label: '30 seconds', click: () => mainWindow?.webContents.send('pet-command', 'speech-30') },
        { label: '60 seconds', click: () => mainWindow?.webContents.send('pet-command', 'speech-60') },
        { label: 'Off', click: () => mainWindow?.webContents.send('pet-command', 'speech-off') }
      ]
    },
    { type: 'separator' },
    { label: 'Quit Kypher Mini', role: 'quit' }
  ]);
}

app.whenReady().then(() => {
  log('app ready');
  createWindow();

  ipcMain.on('show-pet-menu', () => {
    buildPetMenu().popup({ window: mainWindow });
  });

  ipcMain.on('set-ignore-mouse', (_event, shouldIgnore) => {
    mainWindow?.setIgnoreMouseEvents(Boolean(shouldIgnore), { forward: true });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

process.on('uncaughtException', (error) => {
  log(`uncaughtException ${error.stack || error.message}`);
});

process.on('unhandledRejection', (error) => {
  log(`unhandledRejection ${error.stack || error}`);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
