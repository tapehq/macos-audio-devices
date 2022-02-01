'use strict';
const path = require('path');
const execa = require('execa');

const isAsar = __dirname.includes('.asar');
const asarDir = process.arch === 'arm64' ? 'app-arm64.asar' : 'app-x64.asar';
const asarDirname = isAsar ? __dirname.replace(asarDir, `${asarDir}.unpacked`) : __dirname;
const binary = path.join(asarDirname, 'audio-devices');

const generateExport = (name, getArgs, callback) => {
  module.exports[name] = async (...inputs) => {
    const result = await execa(binary, getArgs(...inputs));
    return callback(result);
  };

  module.exports[name].sync = (...inputs) => {
    const result = execa.sync(binary, getArgs(...inputs));
    return callback(result);
  };
};

const throwIfStderr = ({stderr}) => {
  if (stderr) {
    throw new Error(stderr);
  }
};

const parseStdout = ({stdout, stderr}) => {
  throwIfStderr({stderr});
  return JSON.parse(stdout);
};

generateExport('getAllDevices', () => ['list', '--json'], parseStdout);

generateExport('getInputDevices', () => ['list', '--input', '--json'], parseStdout);

generateExport('getOutputDevices', () => ['list', '--output', '--json'], parseStdout);

generateExport('getDevice', deviceId => ['get', '--json', deviceId], parseStdout);

generateExport('getDefaultOutputDevice', () => ['output', 'get', '--json'], parseStdout);

generateExport('getDefaultInputDevice', () => ['input', 'get', '--json'], parseStdout);

generateExport('getDefaultSystemDevice', () => ['system', 'get', '--json'], parseStdout);

generateExport('setDefaultOutputDevice', deviceId => ['output', 'set', deviceId], throwIfStderr);

generateExport('setDefaultInputDevice', deviceId => ['input', 'set', deviceId], throwIfStderr);

generateExport('setDefaultSystemDevice', deviceId => ['system', 'set', deviceId], throwIfStderr);

generateExport('getOutputDeviceVolume', deviceId => ['volume', 'get', deviceId], ({stdout, stderr}) => stderr ? undefined : stdout);

generateExport('setOutputDeviceVolume', (deviceId, volume) => ['volume', 'set', deviceId, volume], throwIfStderr);

generateExport(
  'createAggregateDevice',
  (name, mainDeviceId, otherDeviceIds, {multiOutput} = {}) => [
    'aggregate', 'create', '--json', (multiOutput && '--multi-output'), name, mainDeviceId, ...otherDeviceIds
  ].filter(Boolean),
  parseStdout
);

generateExport('destroyAggregateDevice', deviceId => ['aggregate', 'destroy', deviceId], throwIfStderr);
