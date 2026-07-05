const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kypher', {
  showMenu: () => ipcRenderer.send('show-pet-menu'),
  setIgnoreMouse: (shouldIgnore) => ipcRenderer.send('set-ignore-mouse', Boolean(shouldIgnore)),
  onCommand: (handler) => {
    const listener = (_event, command) => handler(command);
    ipcRenderer.on('pet-command', listener);
    return () => ipcRenderer.removeListener('pet-command', listener);
  }
});
