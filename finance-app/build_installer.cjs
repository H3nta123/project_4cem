const electronInstaller = require('electron-winstaller');
const path = require('path');

async function buildInstaller() {
  console.log('Creating windows installer...');
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'dist_electron_packager', 'finance-app-win32-x64'),
      outputDirectory: path.join(__dirname, 'installer'),
      authors: 'Me',
      exe: 'finance-app.exe',
      setupExe: 'setup.exe',
      description: 'Finance App',
      noMsi: true
    });
    console.log('Installer created successfully!');
  } catch (e) {
    console.log('No dice:', e.message);
  }
}

buildInstaller();
