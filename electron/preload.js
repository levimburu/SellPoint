// Preload script — runs in an isolated context before the renderer loads.
// We're not exposing any Node APIs to the web app yet (contextIsolation: true,
// nodeIntegration: false), which is the secure default. This file exists as
// the designated bridge point for when we add local SQLite access in Phase 2.

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('sellpointDesktop', {
  isElectron: true,
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0',
})
