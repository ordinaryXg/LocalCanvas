const { contextBridge, ipcRenderer } = require('electron')

const validChannels = [
  'project:autoSaved',
  'file:changed',
  'model:progress',
  'model:complete',
  'model:error',
  'model:batchItemComplete',
]

const listeners = new Map()

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
    readAbsolutePath: (absolutePath) =>
      ipcRenderer.invoke('file:readAbsolutePath', absolutePath),
    writeAsset: (projectId, relativePath, data) =>
      ipcRenderer.invoke('file:writeAsset', projectId, relativePath, data),
    selectFile: (filters) => ipcRenderer.invoke('file:selectFile', filters),
    selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
    saveWorkflow: (projectId, filename, content) =>
      ipcRenderer.invoke('file:saveWorkflow', projectId, filename, content),
  },
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (config) => ipcRenderer.invoke('config:write', config),
    testConnection: (provider, endpoint, apiKey) =>
      ipcRenderer.invoke('config:testConnection', provider, endpoint, apiKey),
    exists: () => ipcRenderer.invoke('config:exists'),
    needsOnboarding: () => ipcRenderer.invoke('config:needsOnboarding'),
  },
  model: {
    generateImage: (payload) => ipcRenderer.invoke('model:generateImage', payload),
    generateVideo: (payload) => ipcRenderer.invoke('model:generateVideo', payload),
    generateText: (payload) => ipcRenderer.invoke('model:generateText', payload),
    generateAudio: (payload) => ipcRenderer.invoke('model:generateAudio', payload),
    generateScript: (payload) => ipcRenderer.invoke('model:generateScript', payload),
    batchGenerateImages: (payload) => ipcRenderer.invoke('model:batchGenerateImages', payload),
    batchGenerateVideos: (payload) => ipcRenderer.invoke('model:batchGenerateVideos', payload),
    cancel: (taskId) => ipcRenderer.invoke('model:cancel', taskId),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  },
  on: (channel, callback) => {
    if (!validChannels.includes(channel)) return () => {}
    const wrapper = (_event, ...args) => callback(...args)
    ipcRenderer.on(channel, wrapper)
    const key = `${channel}:${callback}`
    listeners.set(key, wrapper)
    return () => {
      ipcRenderer.removeListener(channel, wrapper)
      listeners.delete(key)
    }
  },
  off: (channel, callback) => {
    const key = `${channel}:${callback}`
    const wrapper = listeners.get(key)
    if (wrapper) {
      ipcRenderer.removeListener(channel, wrapper)
      listeners.delete(key)
    }
  },
})
