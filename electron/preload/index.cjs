const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  project: {
    create: (name) => ipcRenderer.invoke('project:create', name),
    load: (projectId) => ipcRenderer.invoke('project:load', projectId),
    save: (data) => ipcRenderer.invoke('project:save', data),
    list: () => ipcRenderer.invoke('project:list'),
    delete: (projectId) => ipcRenderer.invoke('project:delete', projectId),
  },
  file: {
    readAsset: (projectId, relativePath) =>
      ipcRenderer.invoke('file:readAsset', projectId, relativePath),
    writeAsset: (projectId, relativePath, data) =>
      ipcRenderer.invoke('file:writeAsset', projectId, relativePath, data),
    selectFile: (filters) => ipcRenderer.invoke('file:selectFile', filters),
    selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
    saveWorkflow: (projectId, filename, content) =>
      ipcRenderer.invoke('file:saveWorkflow', projectId, filename, content),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
  },
  on: (channel, callback) => {
    const validChannels = ['project:autoSaved', 'file:changed']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },
})
