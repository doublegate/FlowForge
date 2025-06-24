const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;
let mongoProcess;

// Configuration
const BACKEND_PORT = process.env.PORT || 3002;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5173;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    icon: path.join(__dirname, '../images/icon.png'),
    titleBarStyle: 'default',
    backgroundColor: '#0d1117'
  });

  // Create application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workflow',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-workflow');
          }
        },
        {
          label: 'Open Workflow',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('open-workflow');
          }
        },
        {
          label: 'Save Workflow',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-workflow');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/doublegate/FlowForge/docs');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/doublegate/FlowForge/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'About FlowForge',
          click: () => {
            const aboutWindow = new BrowserWindow({
              width: 400,
              height: 300,
              parent: mainWindow,
              modal: true,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              }
            });
            aboutWindow.loadURL(`data:text/html,
              <html>
                <head>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                      background: #0d1117;
                      color: #58a6ff;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      margin: 0;
                    }
                    h1 { margin: 20px 0 10px 0; }
                    p { color: #8b949e; margin: 5px 0; }
                    a { color: #58a6ff; text-decoration: none; }
                  </style>
                </head>
                <body>
                  <h1>FlowForge</h1>
                  <p>Version 0.2.0</p>
                  <p>Visual GitHub Actions Workflow Builder</p>
                  <p style="margin-top: 20px;">
                    <a href="#" onclick="require('electron').shell.openExternal('https://github.com/doublegate/FlowForge')">
                      GitHub Repository
                    </a>
                  </p>
                </body>
              </html>
            `);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load the frontend URL
  const startUrl = IS_PRODUCTION 
    ? `file://${path.join(__dirname, '../frontend/dist/index.html')}`
    : `http://localhost:${FRONTEND_PORT}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackendServices() {
  console.log('Starting backend services...');

  // Start MongoDB if in production (Flatpak)
  if (IS_PRODUCTION) {
    const mongoPath = path.join(__dirname, '../mongodb/bin/mongod');
    const mongoDataPath = path.join(app.getPath('userData'), 'mongodb');
    
    mongoProcess = spawn(mongoPath, [
      '--dbpath', mongoDataPath,
      '--port', '27017',
      '--quiet'
    ]);

    mongoProcess.on('error', (err) => {
      console.error('Failed to start MongoDB:', err);
    });
  }

  // Start the backend server
  const backendPath = path.join(__dirname, '../backend/server.js');
  backendProcess = spawn('node', [backendPath], {
    env: {
      ...process.env,
      NODE_ENV: IS_PRODUCTION ? 'production' : 'development',
      PORT: BACKEND_PORT,
      FRONTEND_URL: IS_PRODUCTION ? 'file://' : `http://localhost:${FRONTEND_PORT}`
    }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function stopBackendServices() {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (mongoProcess) {
    mongoProcess.kill();
  }
}

// App event handlers
app.whenReady().then(() => {
  startBackendServices();
  
  // Wait a bit for backend to start
  setTimeout(() => {
    createWindow();
  }, IS_PRODUCTION ? 3000 : 1000);
});

app.on('window-all-closed', () => {
  stopBackendServices();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopBackendServices();
});

// Handle file associations (for .yml and .yaml files)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('open-file', filePath);
  }
});