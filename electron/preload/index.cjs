const { contextBridge, ipcRenderer } = require('electron')

const validChannels = [
  'dag:progress',
  'project:autoSaved',
  'file:changed',
  'model:progress',
  'model:complete',
  'model:error',
  'model:batchItemComplete',
  'compose:progress',
  'ffmpeg:progress',
  'app:requestSave',
  'update:available',
  'update:progress',
  'update:downloaded',
  'update:error',
]

const listeners = new Map()

contextBridge.exposeInMainWorld('api', {
  auth: {
    register: (payload) => ipcRenderer.invoke('auth:register', payload),
    login: (payload) => ipcRenderer.invoke('auth:login', payload),
    logout: () => ipcRenderer.invoke('auth:logout'),
    enterGuest: () => ipcRenderer.invoke('auth:enterGuest'),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
  },
  user: {
    getProfile: () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: (updates) => ipcRenderer.invoke('user:updateProfile', updates),
  },
  agent: {
    chat: (payload) => ipcRenderer.invoke('agent:chat', payload),
    listSessions: (projectId) => ipcRenderer.invoke('agent:listSessions', projectId),
    getSession: (sessionId) => ipcRenderer.invoke('agent:getSession', sessionId),
    listSkills: () => ipcRenderer.invoke('agent:listSkills'),
    buildFromTemplate: (payload) => ipcRenderer.invoke('agent:buildFromTemplate', payload),
    buildPatch: (payload) => ipcRenderer.invoke('agent:buildPatch', payload),
    expandShots: (payload) => ipcRenderer.invoke('agent:expandShots', payload),
  },
  dag: {
    createRun: (payload) => ipcRenderer.invoke('dag:createRun', payload),
    getRun: (dagRunId) => ipcRenderer.invoke('dag:getRun', dagRunId),
    updateRun: (payload) => ipcRenderer.invoke('dag:updateRun', payload),
    updateNode: (payload) => ipcRenderer.invoke('dag:updateNode', payload),
    recover: () => ipcRenderer.invoke('dag:recover'),
  },
  project: {
    create: (name) => ipcRenderer.invoke('project:create', name),
    load: (projectId) => ipcRenderer.invoke('project:load', projectId),
    save: (data) => ipcRenderer.invoke('project:save', data),
    list: () => ipcRenderer.invoke('project:list'),
    delete: (projectId) => ipcRenderer.invoke('project:delete', projectId),
    reorder: (orderedIds) => ipcRenderer.invoke('project:reorder', orderedIds),
    readThumbnail: (projectId) => ipcRenderer.invoke('project:readThumbnail', projectId),
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
    resolveAssetPath: (projectId, relativePath) =>
      ipcRenderer.invoke('file:resolveAssetPath', projectId, relativePath),
  },
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (config) => ipcRenderer.invoke('config:write', config),
    testConnection: (provider, endpoint, apiKey) =>
      ipcRenderer.invoke('config:testConnection', provider, endpoint, apiKey),
    exists: () => ipcRenderer.invoke('config:exists'),
    needsOnboarding: () => ipcRenderer.invoke('config:needsOnboarding'),
  },
  capability: {
    sync: () => ipcRenderer.invoke('capability:sync'),
    getStatus: () => ipcRenderer.invoke('capability:getStatus'),
    probe: (request) => ipcRenderer.invoke('capability:probe', request),
    listProbedProfiles: () => ipcRenderer.invoke('capability:listProbedProfiles'),
    getProbedProfile: (configId) => ipcRenderer.invoke('capability:getProbedProfile', configId),
  },
  model: {
    beginGenerateImage: (payload) => ipcRenderer.invoke('model:beginGenerateImage', payload),
    generateImage: (payload) => ipcRenderer.invoke('model:generateImage', payload),
    beginGenerateVideo: (payload) => ipcRenderer.invoke('model:beginGenerateVideo', payload),
    generateVideo: (payload) => ipcRenderer.invoke('model:generateVideo', payload),
    beginGenerateText: (payload) => ipcRenderer.invoke('model:beginGenerateText', payload),
    generateText: (payload) => ipcRenderer.invoke('model:generateText', payload),
    beginGenerateAudio: (payload) => ipcRenderer.invoke('model:beginGenerateAudio', payload),
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
    setDirty: (dirty) => ipcRenderer.invoke('app:setDirty', dirty),
    setActiveProject: (projectId) => ipcRenderer.invoke('app:setActiveProject', projectId),
    setLocale: (locale) => ipcRenderer.invoke('app:setLocale', locale),
    quitConfirmed: () => ipcRenderer.invoke('app:quitConfirmed'),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
  },
  asset: {
    list: (projectId) => ipcRenderer.invoke('asset:list', projectId),
    import: (projectId, filePath) => ipcRenderer.invoke('asset:import', projectId, filePath),
    thumbnail: (filePath) => ipcRenderer.invoke('asset:thumbnail', filePath),
    delete: (projectId, relativePath) =>
      ipcRenderer.invoke('asset:delete', projectId, relativePath),
    revealInFolder: (projectId, relativePath) =>
      ipcRenderer.invoke('asset:revealInFolder', projectId, relativePath),
    open: (projectId, relativePath) => ipcRenderer.invoke('asset:open', projectId, relativePath),
    openFolder: (projectId, relativePath) =>
      ipcRenderer.invoke('asset:openFolder', projectId, relativePath),
  },
  ffmpeg: {
    detect: (userPath) => ipcRenderer.invoke('ffmpeg:detect', userPath),
    download: () => ipcRenderer.invoke('ffmpeg:download'),
    ensure: () => ipcRenderer.invoke('ffmpeg:ensure'),
    trim: (payload) => ipcRenderer.invoke('ffmpeg:trim', payload),
    getVideoInfo: (input) => ipcRenderer.invoke('ffmpeg:getVideoInfo', input),
  },
  compose: {
    start: (payload) => ipcRenderer.invoke('compose:start', payload),
    cancel: () => ipcRenderer.invoke('compose:cancel'),
    openOutputDir: () => ipcRenderer.invoke('compose:openOutputDir'),
  },
  storyboard: {
    export: (payload) => ipcRenderer.invoke('storyboard:export', payload),
    openOutputDir: () => ipcRenderer.invoke('storyboard:openOutputDir'),
  },
  audio: {
    checkDemucs: () => ipcRenderer.invoke('audio:checkDemucs'),
    separateVocals: (payload) => ipcRenderer.invoke('audio:separateVocals', payload),
  },
  projectExtra: {
    rename: (projectId, name) => ipcRenderer.invoke('project:rename', projectId, name),
    openDir: (projectId) => ipcRenderer.invoke('project:openDir', projectId),
  },
  history: {
    query: (filter) => ipcRenderer.invoke('history:query', filter),
    getStats: () => ipcRenderer.invoke('history:getStats'),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
  },
  workflow: {
    list: (presetOnly) => ipcRenderer.invoke('workflow:list', presetOnly),
    load: (workflowId) => ipcRenderer.invoke('workflow:load', workflowId),
    save: (payload) => ipcRenderer.invoke('workflow:save', payload),
    delete: (workflowId) => ipcRenderer.invoke('workflow:delete', workflowId),
    export: (workflowId) => ipcRenderer.invoke('workflow:export', workflowId),
    import: () => ipcRenderer.invoke('workflow:import'),
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
