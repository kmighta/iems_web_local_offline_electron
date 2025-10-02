const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// 개발 환경에서 Vite 개발 서버 URL
const VITE_DEV_SERVER_URL = 'http://localhost:5868';

// 프로덕션 환경에서 빌드된 파일 경로
const MAIN_DIST = path.join(__dirname, '../dist');
const RENDERER_DIST = path.join(MAIN_DIST, 'index.html');

// 보안 설정
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 메인 윈도우 생성
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../public/iEMS_logo.png'),
    show: false, // 윈도우가 준비될 때까지 숨김
    titleBarStyle: 'default'
  });

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 환경에서 개발자 도구 자동 열기
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // URL 로드
  if (isDev) {
    // 개발 환경: Vite 개발 서버 사용
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // 프로덕션 환경: 빌드된 파일 사용
    mainWindow.loadFile(RENDERER_DIST);
  }

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    // macOS가 아닌 경우 앱 종료
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  return mainWindow;
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(() => {
  createWindow();

  // macOS에서 독 아이콘 클릭 시 윈도우 재생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫힐 때 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 보안: 새 윈도우 생성 방지
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// 개발 환경에서 Vite 개발 서버가 시작될 때까지 대기
if (isDev) {
  app.on('ready', () => {
    // Vite 개발 서버가 시작될 때까지 잠시 대기
    setTimeout(() => {
      createWindow();
    }, 1000);
  });
}
