/*
 * Automatic Watering System Control App
 *
 * Backend
 *
 * (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
// jshint esversion:6, node:true
'use strict';

const SerialPort = require('serialport');
const RadioHeadSerial=require('radiohead-serial').RadioHeadSerial;

const bodyParser = require('body-parser');
const express = require('express');
const semver = require('semver');
const http = require('http');
const path = require('path');

const RH_MSG_START =         0x00;
const RH_MSG_BATTERY =       0x02;
const RH_MSG_SENSOR_VALUES = 0x10;
const RH_MSG_TEMP_SENSOR_DATA = 0x20;
const RH_MSG_CHANNEL_ON =    0x21; // < v2.0.0 only
const RH_MSG_CHANNEL_OFF =   0x22; // < v2.0.0 only
const RH_MSG_CHANNEL_STATE = 0x25; // >= v2.0.0 only

const RH_MSG_SETTINGS =      0x50;
const RH_MSG_GET_SETTINGS =  0x51;
const RH_MSG_SET_SETTINGS =  0x52;
const RH_MSG_SAVE_SETTINGS = 0x53;

const RH_MSG_CHECK_NOW =        0x60;
const RH_MSG_TURN_CHANNEL_ON =  0x61; // < v2.0.0 only
const RH_MSG_TURN_CHANNEL_OFF = 0x62; // < v2.0.0 only
const RH_MSG_PAUSE =            0x63;
const RH_MSG_RESUME =           0x64;
const RH_MSG_TURN_CHANNEL_ON_OFF = 0x65; // >= v2.0.0 only
const RH_MSG_POLL_DATA =        0x66; // >= v2.0.0 only
const RH_MSG_PAUSE_ON_OFF =     0x67; // >= v2.0.0 only
const RH_MSG_TURN_TEMP_SWITCH_ON_OFF = 0x68; // >= v2.2.0 only

const RH_MSG_GET_VERSION =      0xF0;
const RH_MSG_VERSION =          0xF1;
const RH_MSG_PING =             0xF2;
const RH_MSG_PONG =             0xF3;

class Watering {

  constructor () {
    // defaults
    this.addressClient = 0xDC;
    this.connected = false;
    this.settings = null;
    this.status = {
      adcRaw: ['-','-','-','-'],
      adcVolt: ['-','-','-','-'],
      batPercent: '-',
      batRaw: '-',
      batVolt: '-',
      temperature: '-',
      humidity: '-',
      on: [false, false, false, false]
    };
    this.softwareVersion = '';
    this.softwareVersionControl = require('./package.json').version;
    this.logData = [];
    this.lastPingData = Buffer.alloc(4);
    this.versionInterval = null;

    // bind own methods to 'this'
    this.apiCheckNow = this.apiCheckNow.bind(this);
    this.apiPoll = this.apiPoll.bind(this);
    this.apiPing = this.apiPing.bind(this);
    this.apiConnect = this.apiConnect.bind(this);
    this.apiDisconnect = this.apiDisconnect.bind(this);
    this.apiGetInfo = this.apiGetInfo.bind(this);
    this.apiGetSettings = this.apiGetSettings.bind(this);
    this.apiSetSettings = this.apiSetSettings.bind(this);
    this.apiSaveSettings = this.apiSaveSettings.bind(this);
    this.apiPause = this.apiPause.bind(this);
    this.apiResume = this.apiResume.bind(this);
    this.apiOnoff = this.apiOnoff.bind(this);
    this.apiTempSwitch = this.apiTempSwitch.bind(this);
    this.log = this.log.bind(this);
    this.rhsSend = this.rhsSend.bind(this);
    this.rhsReceived = this.rhsReceived.bind(this);

    // create a new express app
    this.app = express();

    // parse application/json data
    this.app.use(bodyParser.json());

    // create a new http server
    this.server = new http.Server(this.app);

    // serve static files
    this.app.use(express.static(path.join(__dirname, 'client')));

    // register API endpoints
    this.app.get('/api/checkNow', this.apiCheckNow);
    this.app.get('/api/poll', this.apiPoll);
    this.app.get('/api/ping', this.apiPing);
    this.app.get('/api/getInfo', this.apiGetInfo);
    this.app.get('/api/getPorts', this.apiGetPorts);
    this.app.get('/api/getSettings', this.apiGetSettings);
    this.app.get('/api/saveSettings', this.apiSaveSettings);
    this.app.get('/api/pause', this.apiPause);
    this.app.get('/api/resume', this.apiResume);
    this.app.post('/api/connect', this.apiConnect);
    this.app.get('/api/disconnect', this.apiDisconnect);
    this.app.post('/api/onoff', this.apiOnoff);
    this.app.post('/api/tempSwitch', this.apiTempSwitch);
    this.app.post('/api/setSettings', this.apiSetSettings);

    // let the server listen on the configured host and port
    this.server.listen(process.env.PORT || 3000, process.env.HOST || '127.0.0.1', () => {
      const address = this.server.address();
      console.log(`Control app started!\n\nNow open http://${address.address}:${address.port}/ in your browser.\n`);
    });
  }

  /**
   * API endpoint for sending the current information to the client.
   */
  apiGetInfo (req, res, next) {
    res.send({
      connected: this.connected,
      log: this.logData,
      settings: this.settings,
      status: this.status,
      softwareVersion: this.softwareVersion,
      softwareVersionControl: this.softwareVersionControl
    });
  }

  /**
   * API endpoint for sending a list of available serial ports to the client.
   */
  apiGetPorts (req, res, next) {
    SerialPort.list()
    .then((allPorts) => {
      // filter the ports to only show those with a pnpId and hide internal ports
      let ports = allPorts.filter((p) => { return p.pnpId; }).map((p) => { return p.path || p.comName; });
      res.send(ports);
    });
  }

  /**
   * API endpoint for connecting to seral-radio gateway.
   */
  apiConnect (req, res, next) {
    if (this.connected) {
      res.status(400);
      res.send('Already connected');
      return;
    }

    const port = req.body.port;
    const baud = parseInt(req.body.baud, 10);
    let addressThis;
    if (req.body.addressThis.startsWith('0x')) {
      addressThis = parseInt(req.body.addressThis, 16);
    } else {
      addressThis = parseInt(req.body.addressThis, 10);
    }
    if (req.body.addressClient.startsWith('0x')) {
      this.addressClient = parseInt(req.body.addressClient, 16);
    } else {
      this.addressClient = parseInt(req.body.addressClient, 10);
    }

    if (port.length > 0 && baud > 0 && addressThis > 0 && addressThis < 255 && this.addressClient > 0 && this.addressClient < 255) {
      res.status(200);
      res.send('Ok');
    } else {
      res.status(400);
      res.send('Invalid options!');
      return;
    }

    // init RadioHead
    this.rhs = new RadioHeadSerial(port, baud, addressThis);
    this.rhs.setRetries(5);
    this.rhs.on('data', this.rhsReceived);

    this.rhs.on('error', (err) => {
      this.log('RHSerial error! ' + err.toString());
    });

    this.connected = true;

    this.log(`connected to the serial-radio gateway via ${req.body.port}, baud ${req.body.baud}`);

    // request the software version from the watering system
    // use an interval to retry until we got a version
    const getVersion = () => {
      let buf = Buffer.alloc(1);
      buf[0] = RH_MSG_GET_VERSION;
      this.rhsSend(buf);
    };
    setTimeout(getVersion, 500);
    this.versionInterval = setInterval(getVersion, 3000);
  }

  /**
   * API endpoint for disconnecting from seral-radio gateway.
   */
  apiDisconnect (req, res, next) {
    if (!this.connected) {
      res.status(400);
      res.send('Not connected');
      return;
    }

    if (this.versionInterval !== null) {
      clearInterval(this.versionInterval);
      this.versionInterval = null;
    }

    this.rhs.close()
    .then(() => {
      this.rhs = null;
      this.connected = false;

      this.log('disconnected from the serial-radio gateway');

      res.status(200);
      res.send('Ok');
    });
  }

  /**
   * API endpoint for sending a 'check now' command to the watering system.
   */
  apiCheckNow (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_CHECK_NOW;
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'ping' command with random data to the watering system.
   */
  apiPing (req, res, next) {
    let buf = Buffer.alloc(5);
    buf[0] = RH_MSG_PING;
    for (let i = 1; i < 5; i++) {
      buf[i] = Math.floor(Math.random()*255);
    }
    this.lastPingData = buf.slice(1);
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'get settings' command to the watering system.
   */
  apiGetSettings (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_GET_SETTINGS;
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending new settings to the watering system.
   */
  apiSetSettings (req, res, next) {
    this.settings = {
      channelEnabled: [],
      adcTriggerValue: [],
      wateringTime: []
    };
    for (let chan = 0; chan < 4; chan++) {
      this.settings.channelEnabled[chan] = req.body.channelEnabled[chan];
      this.settings.adcTriggerValue[chan] = parseInt(req.body.adcTriggerValue[chan], 10);
      this.settings.wateringTime[chan] = parseInt(req.body.wateringTime[chan], 10);
    }
    this.settings.checkInterval = parseInt(req.body.checkInterval, 10);
    this.settings.tempSensorInterval = parseInt(req.body.tempSensorInterval, 10);
    this.settings.sendAdcValuesThroughRH = req.body.sendAdcValuesThroughRH;

    if (semver.satisfies(this.softwareVersion, '>=2.0.0')) {
      this.settings.pushDataEnabled = req.body.pushDataEnabled;
    }

    if (semver.satisfies(this.softwareVersion, '>=2.1.0')) {
      if (req.body.serverAddress.startsWith('0x')) {
        this.settings.serverAddress = parseInt(req.body.serverAddress, 16);
      } else {
        this.settings.serverAddress = parseInt(req.body.serverAddress, 10);
      }
      if (req.body.nodeAddress.startsWith('0x')) {
        this.settings.nodeAddress = parseInt(req.body.nodeAddress, 16);
      } else {
        this.settings.nodeAddress = parseInt(req.body.nodeAddress, 10);
      }
      this.settings.delayAfterSend = parseInt(req.body.delayAfterSend, 10);
    }

    if (semver.satisfies(this.softwareVersion, '>=2.2.0')) {
      this.settings.tempSwitchTriggerValue = parseInt(req.body.tempSwitchTriggerValue, 10);
      this.settings.tempSwitchHyst = parseFloat(req.body.tempSwitchHyst);
      this.settings.tempSwitchInverted = req.body.tempSwitchInverted;
    }

    let buf;
    if (semver.satisfies(this.softwareVersion, '>=2.2.0')) {
      buf = Buffer.alloc(28);
    } else if (semver.satisfies(this.softwareVersion, '>=2.1.0')) {
      buf = Buffer.alloc(26);
    } else {
      buf = Buffer.alloc(22);
    }
    buf[0] = RH_MSG_SET_SETTINGS;

    let bools = 0;
    for (let chan = 0; chan < 4; chan++) {
      if(this.settings.channelEnabled[chan]) {
        bools |= (1 << chan);
      }
      buf.writeUInt16LE(this.settings.adcTriggerValue[chan], 2+chan*2);
      buf.writeUInt16LE(this.settings.wateringTime[chan], 10+chan*2);
    }

    if (this.settings.sendAdcValuesThroughRH) {
      bools |= (1 << 7);
    }
    if (semver.satisfies(this.softwareVersion, '>=2.0.0') && this.settings.pushDataEnabled) {
      bools |= (1 << 6);
    }

    buf.writeUInt16LE(this.settings.checkInterval, 18);
    buf.writeUInt16LE(this.settings.tempSensorInterval, 20);

    if (semver.satisfies(this.softwareVersion, '>=2.1.0')) {
      buf[22] = this.settings.serverAddress;
      buf[23] = this.settings.nodeAddress;
      buf.writeUInt16LE(this.settings.delayAfterSend, 24);
    }

    if (semver.satisfies(this.softwareVersion, '>=2.2.0')) {
      buf.writeInt8(this.settings.tempSwitchTriggerValue, 26);
      const tempSwitchHystTenth = Math.floor(this.settings.tempSwitchHyst * 10);
      buf.writeUInt8(tempSwitchHystTenth, 27);
      if (this.settings.tempSwitchInverted) {
        bools |= (1 << 5);
      }
    }

    buf[1] = bools;

    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'save settings' command to the watering system.
   */
  apiSaveSettings (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_SAVE_SETTINGS;
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for turning a channel on or off at the watering system.
   */
  apiOnoff (req, res, next) {
    const chanToSet = parseInt(req.body.channel, 10) || 0;

    let buf;
    if (semver.satisfies(this.softwareVersion, '>=2.0.0')) {
      // >= v2.0.0
      buf = Buffer.alloc(5);
      buf[0] = RH_MSG_TURN_CHANNEL_ON_OFF;
      for (let chan = 0; chan < 4; chan++) {
        if (chan === chanToSet) {
          buf[chan + 1] = req.body.on ? 0x01 : 0x00;
        } else {
          // set channel state to 0xff to let the watering system ignore it
          buf[chan + 1] = 0xff;
        }
      }
    } else {
      // < v2.0.0
      buf = Buffer.alloc(2);
      buf[0] = req.body.on ? RH_MSG_TURN_CHANNEL_ON : RH_MSG_TURN_CHANNEL_OFF;
      buf[1] = chanToSet;
    }

    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for turning the temperature switch on or off at the watering system.
   */
  apiTempSwitch (req, res, next) {
    const buf = Buffer.alloc(2);
    buf[0] = RH_MSG_TURN_TEMP_SWITCH_ON_OFF;
    buf[1] = req.body.on ? 0x01 : 0x00;

    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'pause' command to the watering system.
   */
  apiPause (req, res, next) {
    let buf;
    if (semver.satisfies(this.softwareVersion, '>=2.0.0')) {
      // >= v2.0.0
      buf = Buffer.alloc(2);
      buf[0] = RH_MSG_PAUSE_ON_OFF;
      buf[1] = 0x01;
    } else {
      // < v2.0.0
      buf = Buffer.alloc(1);
      buf[0] = RH_MSG_PAUSE;
    }
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'resume' command to the watering system.
   */
  apiResume (req, res, next) {
    let buf;
    if (semver.satisfies(this.softwareVersion, '>=2.0.0')) {
      // >= v2.0.0
      buf = Buffer.alloc(2);
      buf[0] = RH_MSG_PAUSE_ON_OFF;
      buf[1] = 0x00;
    } else {
      // < v2.0.0
      buf = Buffer.alloc(1);
      buf[0] = RH_MSG_RESUME;
    }
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'poll data' command to the watering system.
   * Supported since v2.0.0
   */
  apiPoll (req, res, next) {
    const buf = Buffer.alloc(1);
    buf[0] = RH_MSG_POLL_DATA;
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * Method to convert a Buffer into a human readable string of hex numbers.
   */
  bufferToHexString (buf) {
    let str = '';
    for (let i = 0; i < buf.length; i++) {
      str += ' 0x';
      let hex = buf[i].toString(16).toUpperCase();
      str += (hex.length < 2) ? '0' + hex : hex;
    }
    return '<' + str.trim() + '>';
  }

  /**
   * Method to send data to the watering system through RadioHead.
   * @param buf A Buffer containing the data to send.
   */
  rhsSend (buf) {
    this.rhs.send(this.addressClient, buf)
    .then(() => {
      this.log('send message ' + this.bufferToHexString(buf));
    })
    .catch(() => {
      this.log('error sending message ' + this.bufferToHexString(buf));
    });
  }

  /**
   * Method which is called every time a message is received through RadioHead.
   * @param msg The received message as Buffer.
   */
  rhsReceived (msg) {
    // filter messages
    if (msg.headerFrom !== this.addressClient) {
      return;
    }

    this.log('received message ' + this.bufferToHexString(msg.data));

    switch (msg.data[0]) {
      case RH_MSG_START:
        this.log('system started');
        break;

      case RH_MSG_BATTERY:
        this.status.batPercent = msg.data[1];
        this.status.batRaw = msg.data.readUInt16LE(2);
        this.status.batVolt = 5/1023*this.status.batRaw;
        this.status.batVolt = Math.round(this.status.batVolt*100)/100;
        this.log(`battery: ${this.status.batPercent} %, ${this.status.batVolt} V (${this.status.batRaw})`);
        break;

      case RH_MSG_SENSOR_VALUES:
        for (let i = 0; i < 4; i++) {
          this.status.adcRaw[i] = msg.data.readUInt16LE(1 + i*2);
          this.status.adcVolt[i] = 5/1023*this.status.adcRaw[i];
          this.status.adcVolt[i] = Math.round(this.status.adcVolt[i]*100)/100;
        }
        this.log('sensors: ' +
          this.status.adcVolt[0] + 'V (' + this.status.adcRaw[0] + ') ' +
          this.status.adcVolt[1] + 'V (' + this.status.adcRaw[1] + ') ' +
          this.status.adcVolt[2] + 'V (' + this.status.adcRaw[2] + ') ' +
          this.status.adcVolt[3] + 'V (' + this.status.adcRaw[3] + ')');
        break;

      case RH_MSG_TEMP_SENSOR_DATA:
        if (msg.data.length >= 5) {
          this.status.temperature = msg.data.readFloatLE(1);
          this.status.temperature = Math.round(this.status.temperature*10)/10;
          this.log(`temperature: ${this.status.temperature} °C `);
        } else {
          this.status.temperature = '-';
        }
        if (msg.data.length >= 9) {
          this.status.humidity = msg.data.readFloatLE(5);
          this.status.humidity = Math.round(this.status.humidity*10)/10;
          this.log(`humidity: ${this.status.humidity} %`);
        } else {
          this.status.humidity = '-';
        }

        this.status.tempSwitchOn = false;
        if (semver.satisfies(this.softwareVersion, '>=2.2.0')) {
          // byte 5 or 6 is tempSwitchOn
          if (msg.data.length === 6) {
            this.status.tempSwitchOn = (msg.data[5] >= 0x01) ? true : false;
          } else if (msg.data.length === 10) {
            this.status.tempSwitchOn = (msg.data[9] >= 0x01) ? true : false;
          }
        }
        break;

      case RH_MSG_CHANNEL_ON: // < v2.0.0
        this.status.on[msg.data[1]] = true;
        this.log(`channel ${msg.data[1]} on`);
        break;

      case RH_MSG_CHANNEL_OFF: // < v2.0.0
        this.status.on[msg.data[1]] = false;
        this.log(`channel ${msg.data[1]} off`);
        break;

      case RH_MSG_CHANNEL_STATE: // >= v2.0.0
        for (let chan = 0; chan < 4; chan++) {
          const newChanState = !!msg.data[chan+1];
          if (newChanState !== this.status.on[chan]) {
            this.status.on[chan] = newChanState;
            this.log(`channel ${chan} ${newChanState ? 'on' : 'off'}`);
          }
        }
        break;

      case RH_MSG_SETTINGS:
        this.log('got settings');
        this.settings = {
          time: (new Date()).getTime(),
          channelEnabled: [],
          adcTriggerValue: [],
          wateringTime: []
        };
        for (let chan = 0; chan < 4; chan++) {
          this.settings.channelEnabled[chan] = ((msg.data[1] & (1 << chan)) != 0);
          this.settings.adcTriggerValue[chan] = msg.data.readUInt16LE(2+chan*2);
          this.settings.wateringTime[chan] = msg.data.readUInt16LE(10+chan*2);
        }
        this.settings.checkInterval = msg.data.readUInt16LE(18);
        this.settings.tempSensorInterval = msg.data.readUInt16LE(20);
        this.settings.sendAdcValuesThroughRH = ((msg.data[1] & (1 << 7)) != 0);

        if (semver.satisfies(this.softwareVersion, '>=2.0.0')) {
          this.settings.pushDataEnabled = ((msg.data[1] & (1 << 6)) != 0);
        }
        if (semver.satisfies(this.softwareVersion, '>=2.1.0')) {
          this.settings.serverAddress = msg.data[22];
          this.settings.nodeAddress = msg.data[23];
          this.settings.delayAfterSend = msg.data.readUInt16LE(24);
        }
        if (semver.satisfies(this.softwareVersion, '>=2.2.0')) {
          this.settings.tempSwitchTriggerValue = msg.data.readInt8(26);
          this.settings.tempSwitchHyst = msg.data.readUInt8(27) / 10;
          this.settings.tempSwitchInverted = ((msg.data[1] & (1 << 5)) != 0);
        }
        break;

      case RH_MSG_VERSION:
        clearInterval(this.versionInterval);
        this.versionInterval = null;
        this.softwareVersion = `v${msg.data[1]}.${msg.data[2]}.${msg.data[3]}`;
        this.log('got software version ' + this.softwareVersion);
        break;

      case RH_MSG_PONG:
        if (this.lastPingData.equals(msg.data.slice(1))) {
          // correct data
          this.log('got pong with correct data :-)');
        } else {
          // wrong data
          this.log('got pong with wrong data :-(');
        }
        break;
    }
  }

  /**
   * Method to log some text.
   */
  log (text) {
    const entry = {
      time: (new Date()).toISOString(),
      text: text
    };
    this.logData.push(entry);
    console.log(entry.time, entry.text);
  }
}

const watering = new Watering();
