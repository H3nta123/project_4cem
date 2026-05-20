const electronInstaller = require('electron-winstaller');
const path = require('path');

async function buildInstaller() {
  console.log('Building Windows installer...');
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'dist_electron', 'finance-app-win32-x64'),
      outputDirectory: path.join(__dirname, 'dist_installer'),
      authors: 'FinancePro',
      exe: 'finance-app.exe',
      setupExe: 'FinancePro-Setup.exe',
      description: 'Finance App',
      noMsi: true,
      setupIcon: undefined // Add an icon if you have one
    });
    console.log('It worked! Installer created at dist_installer/FinancePro-Setup.exe');
  } catch (e) {
    console.log(`No dice: ${e.message}`);
  }
}

buildInstaller();
