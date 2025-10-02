const { contextBridge, ipcRenderer } = require('electron');

// 보안을 위해 메인 프로세스와 렌더러 프로세스 간의 안전한 통신을 위한 API 제공
contextBridge.exposeInMainWorld('electronAPI', {
  // 플랫폼 정보
  platform: process.platform,
  
  // 앱 정보
  appVersion: process.env.npm_package_version || '1.0.0',
  
  // 개발 환경 여부
  isDev: process.env.NODE_ENV === 'development',
  
  // IPC 통신 예시 (필요에 따라 확장)
  sendMessage: (channel, data) => {
    const validChannels = ['app-version', 'platform-info'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  receiveMessage: (channel, func) => {
    const validChannels = ['app-version-reply', 'platform-info-reply'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

// 보안 경고 제거 (개발 환경에서만)
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('Electron preload script loaded');
  });
}
