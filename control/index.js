/*
 * Automatic Watering System Control App
 *
 * Backend
 *
 * (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
'use strict';

const SerialPort = require('serialport');
const RadioHeadSerial=require('radiohead-serial').RadioHeadSerial;

const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const path = require('path');

const RH_MSG_START =         0x00;
const RH_MSG_BATTERY =       0x02;
const RH_MSG_SENSOR_VALUES = 0x10;
const RH_MSG_DHTDATA =       0x20;
const RH_MSG_CHANNEL_ON =    0x21;
const RH_MSG_CHANNEL_OFF =   0x22;

const RH_MSG_SETTINGS =      0x50;
const RH_MSG_GET_SETTINGS =  0x51;
const RH_MSG_SET_SETTINGS =  0x52;
const RH_MSG_SAVE_SETTINGS = 0x53;

const RH_MSG_CHECK_NOW =        0x60;
const RH_MSG_TURN_CHANNEL_ON =  0x61;
const RH_MSG_TURN_CHANNEL_OFF = 0x62;
const RH_MSG_PAUSE =            0x63;
const RH_MSG_RESUME =           0x64;

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
    this.logData = [];
    this.lastPingData = Buffer.alloc(4);

    // bind own methods to 'this'
    this.apiCheckNow = this.apiCheckNow.bind(this);
    this.apiPing = this.apiPing.bind(this);
    this.apiConnect = this.apiConnect.bind(this);
    this.apiGetInfo = this.apiGetInfo.bind(this);
    this.apiGetSettings = this.apiGetSettings.bind(this);
    this.apiSetSettings = this.apiSetSettings.bind(this);
    this.apiSaveSettings = this.apiSaveSettings.bind(this);
    this.apiPause = this.apiPause.bind(this);
    this.apiResume = this.apiResume.bind(this);
    this.apiOnoff = this.apiOnoff.bind(this);
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
    this.app.get('/api/ping', this.apiPing);
    this.app.get('/api/getInfo', this.apiGetInfo);
    this.app.get('/api/getPorts', this.apiGetPorts);
    this.app.get('/api/getSettings', this.apiGetSettings);
    this.app.get('/api/saveSettings', this.apiSaveSettings);
    this.app.get('/api/pause', this.apiPause);
    this.app.get('/api/resume', this.apiResume);
    this.app.post('/api/connect', this.apiConnect);
    this.app.post('/api/onoff', this.apiOnoff);
    this.app.post('/api/setSettings', this.apiSetSettings);

    // let the server listen on the configured host and port
    this.server.listen(3000, 'localhost', () => {
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
      softwareVersion: this.softwareVersion
    });
  }

  /**
   * API endpoint for sending a list of available serial ports to the client.
   */
  apiGetPorts (req, res, next) {
    SerialPort.list((err, allPorts) => {
      // filter the ports to only show those with a pnpId and hide internal ports
      let ports = allPorts.filter((p) => { return p.pnpId }).map((p) => { return p.comName });
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
    let addressServer;
    if (req.body.addressServer.startsWith('0x')) {
      addressServer = parseInt(req.body.addressServer, 16);
    } else {
      addressServer = parseInt(req.body.addressServer, 10);
    }
    if (req.body.addressClient.startsWith('0x')) {
      this.addressClient = parseInt(req.body.addressClient, 16);
    } else {
      this.addressClient = parseInt(req.body.addressClient, 10);
    }

    if (port.length > 0 && baud > 0 && addressServer > 0 && addressServer < 255 && this.addressClient > 0 && this.addressClient < 255) {
      res.status(200);
      res.send('Ok');
    } else {
      res.status(400);
      res.send('Invalid options!');
      return;
    }

    // init RadioHead
    this.rhs = new RadioHeadSerial(port, baud, addressServer);
    this.rhs.setRetries(5);
    this.rhs.on('data', this.rhsReceived);

    this.rhs.on('error', (err) => {
      this.log('RHSerial error! ' + err.toString());
    });

    this.connected = true;

    this.log('connected to the serial-radio gateway');

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
      buf[i] = Math.floor(Math.random()*255)
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
    this.settings.dhtInterval = parseInt(req.body.dhtInterval, 10);
    this.settings.sendAdcValuesThroughRH = req.body.sendAdcValuesThroughRH;

    let buf = Buffer.alloc(22);
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
    buf[1] = bools;
    buf.writeUInt16LE(this.settings.checkInterval, 18);
    buf.writeUInt16LE(this.settings.dhtInterval, 20);

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
    let buf = Buffer.alloc(2);
    buf[0] = req.body.on ? RH_MSG_TURN_CHANNEL_ON : RH_MSG_TURN_CHANNEL_OFF;
    buf[1] = parseInt(req.body.channel, 10) || 0;
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'pause' command to the watering system.
   */
  apiPause (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_PAUSE;
    this.rhsSend(buf);

    res.send('Ok');
  }

  /**
   * API endpoint for sending a 'resume' command to the watering system.
   */
  apiResume (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_RESUME;
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
        this.log('System started');
        break;

      case RH_MSG_BATTERY:
        this.status.batPercent = msg.data[1];
        this.status.batRaw = msg.data.readUInt16LE(2);
        this.status.batVolt = 5/1023*this.status.batRaw;
        this.status.batVolt = Math.round(this.status.batVolt*100)/100;
        this.log('Battery: ' + this.status.batPercent + '%, ' + this.status.batVolt + 'V (' + this.status.batRaw + ')');
        break;

      case RH_MSG_SENSOR_VALUES:
        for (let i = 0; i < 4; i++) {
          this.status.adcRaw[i] = msg.data.readUInt16LE(1 + i*2);
          this.status.adcVolt[i] = 5/1023*this.status.adcRaw[i];
          this.status.adcVolt[i] = Math.round(this.status.adcVolt[i]*100)/100;
        }
        this.log('Sensors: '
          + this.status.adcVolt[0] + 'V (' + this.status.adcRaw[0] + ') '
          + this.status.adcVolt[1] + 'V (' + this.status.adcRaw[1] + ') '
          + this.status.adcVolt[2] + 'V (' + this.status.adcRaw[2] + ') '
          + this.status.adcVolt[3] + 'V (' + this.status.adcRaw[3] + ')');
        break;

      case RH_MSG_DHTDATA:
        this.status.temperature = msg.data.readFloatLE(1);
        this.status.humidity = msg.data.readFloatLE(5);
        this.status.temperature = Math.round(this.status.temperature*10)/10;
        this.status.humidity = Math.round(this.status.humidity*10)/10;
        this.log('DHT: ' + this.status.temperature + '°C ' + this.status.humidity + '%');
        break;

      case RH_MSG_CHANNEL_ON:
        this.status.on[msg.data[1]] = true;
        this.log('Channel ' + msg.data[1] + ' on');
        break;

      case RH_MSG_CHANNEL_OFF:
        this.status.on[msg.data[1]] = false;
        this.log('Channel ' + msg.data[1] + ' off');
        break;

      case RH_MSG_SETTINGS:
        this.log('Got settings');
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
        this.settings.dhtInterval = msg.data.readUInt16LE(20);
        this.settings.sendAdcValuesThroughRH = ((msg.data[1] & (1 << 7)) != 0);
        break;

      case RH_MSG_VERSION:
        clearInterval(this.versionInterval);
        this.softwareVersion = `v${msg.data[1]}.${msg.data[2]}.${msg.data[3]}`;
        this.log('Got software version ' + this.softwareVersion);
        break;

      case RH_MSG_PONG:
        if (this.lastPingData.equals(msg.data.slice(1))) {
          // correct data
          this.log('Got pong with correct data :-)');
        } else {
          // wrong data
          this.log('Got pong with wrong data :-(');
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
