const spawn = require('child_process').spawn;
const fs = require('fs');
const dirname = require('path').dirname;
const Registry = require('winreg');
const stripJsonComments = require('strip-json-comments');

const isWindows = process.platform === 'win32';
const isDarwin = process.platform === 'darwin';
const isRootUser = process.env.USER === 'root';

const getAppPath = (manifestFilePath) => {
  const fileExist = fs.existsSync(manifestFilePath);

  if (fileExist) {
    const manifest = fs.readFileSync(manifestFilePath, 'utf8');
    return JSON.parse(stripJsonComments(manifest))['path'];
  } else {
    throw new Error(`No such manifest at ${manifestFilePath}`);
  }
};

const manifestPathForWindows = async (appName) => {
  return await Registry({
    hive: Registry.HKCU,
    key: `\\Software\\Google\\Chrome\\NativeMessagingHosts\\${appName}`
  })
  .values()
  .then(
    (items) => items.find(i => i.name === '(Default)').value,
    (err) => new Error(`No such native application for ${appName}`));
};

const manifestPathForUnix = (appName) => {
  let targetDir;

  if (isDarwin) {
    targetDir = isRootUser ?
      '/Library/Google/Chrome/NativeMessagingHosts' :
      `${process.env.HOME}/Library/Application\ Support/Google/Chrome/NativeMessagingHosts`
  } else {
    targetDir = isRootUser ?
      '/etc/opt/chrome/native-messaging-hosts' :
      `${process.env.HOME}/.config/google-chrome/NativeMessagingHosts`
  }

  return `${targetDir}/${appName}.json`
};

const getManifestPath = async (appName) => {
  return isWindows ?
    await manifestPathForWindows(appName) : manifestPathForUnix(appName);
};


const killHostProcess = (hostProcess, cb) => {
  hostProcess.kill('SIGTERM');
  setTimeout(() => {
    if (!hostProcess.killed) hostProcess.kill('SIGKILL');
  }, 1500);
  if (cb) return cb(hostProcess.killed)
};

const hostProcess = (manifestPath, appPath) => {
  const dirPath = dirname(manifestPath);
  const path = isWindows ? `${dirPath}/${appPath}` : appPath
  return spawn(path, [], {})
};

const Client = (appName) => {
  this.hostProcess = undefined;

  this.connect = async () => {
    const manifestPath = await getManifestPath(appName);
    const appPath = getAppPath(manifestPath);
    this.hostProcess = hostProcess(manifestPath, appPath);

    if (this.hostProcess) {
      this.streamOut = this.hostProcess.stdout;
      this.streamIn = this.hostProcess.stdin;
      this.streamErr = this.hostProcess.stderr;
    }

    this.hostProcess.on('error', error => {
      if (error.code === 'ENOENT')
        throw new Error(`File at path ${appPath} does not exist, or is not executable`)
    });

    return this;
  };

  this.close = (cb) => {
    if (this.hostProcess) {
      killHostProcess(this.hostProcess, (success) => {
        if (success) this.hostProcess = undefined;
        if (cb) return cb(success);
        return success;
      });
    }
  };

  this.send = (message) => {
    const length = new Buffer(4);
    const buffer = new Buffer(message);

    length.writeUInt32LE(buffer.length, 0);

    this.streamIn.write(length);
    this.streamIn.write(buffer);
  };

  this.isConnected = () => {
    return !!this.hostProcess;
  };

  return this;
};

module.exports = Client;