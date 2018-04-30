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

class Watering {

  constructor () {
    this.addressClient = 0xDC;
    this.connected = false;
    this.settings = null;
    this.logData = [];

    this.apiCheckNow = this.apiCheckNow.bind(this);
    this.apiConnect = this.apiConnect.bind(this);
    this.apiGetInfo = this.apiGetInfo.bind(this);
    this.apiGetSettings = this.apiGetSettings.bind(this);
    this.apiSetSettings = this.apiSetSettings.bind(this);
    this.apiSaveSettings = this.apiSaveSettings.bind(this);
    this.log = this.log.bind(this);
    this.rhsSend = this.rhsSend.bind(this);
    this.rhsReceived = this.rhsReceived.bind(this);

    // create a new express app
    this.app = express();

    // parse application/x-www-form-urlencoded
    this.app.use(bodyParser.urlencoded({ extended: false }));

    // parse application/json
    this.app.use(bodyParser.json());

    // create a new http server
    this.server = new http.Server(this.app);

    // serve static files
    this.app.use(express.static(path.join(__dirname, 'client')));

    this.app.get('/api/checkNow', this.apiCheckNow);
    this.app.get('/api/getInfo', this.apiGetInfo);
    this.app.get('/api/getPorts', this.apiGetPorts);
    this.app.get('/api/getSettings', this.apiGetSettings);
    this.app.get('/api/saveSettings', this.apiSaveSettings);

    this.app.post('/api/connect', this.apiConnect);
    this.app.post('/api/setSettings', this.apiSetSettings);

    // let the server listen on the configured host and port
    this.server.listen(3000, 'localhost', () => {
      const address = this.server.address();
      console.log(`Config app started!\n\nNow open http://${address.address}:${address.port}/ in your browser.`);
    });
  }

  apiGetInfo (req, res, next) {
    res.send({
      connected: this.connected,
      log: this.logData,
      settings: this.settings
    });
  }

  apiGetPorts (req, res, next) {
    SerialPort.list((err, allPorts) => {
      // filter the ports to only show those with a pnpId and hide internal ports
      let ports = allPorts.filter((p) => { return p.pnpId }).map((p) => { return p.comName });
      res.send(ports);
    });
  }

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
    this.rhs.on('data', this.rhsReceived);

    this.connected = true;
  }

  apiCheckNow (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_CHECK_NOW;
    this.rhsSend(buf);

    res.send('Ok');
  }

  apiGetSettings (req, res, next) {
    console.log('getSettings');
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_GET_SETTINGS;
    this.rhsSend(buf);

    res.send('Ok');
  }

  apiSetSettings (req, res, next) {
    console.log('setSettings');
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

  apiSaveSettings (req, res, next) {
    let buf = Buffer.alloc(1);
    buf[0] = RH_MSG_SAVE_SETTINGS;
    this.rhsSend(buf);

    res.send('Ok');
  }

  rhsSend (buf) {
    this.rhs.send(this.addressClient, buf)
    .then(() => {
      this.log('send message 0x' + buf[0].toString(16));
    })
    .catch(() => {
      this.log('error sending message 0x' + buf[0].toString(16));
    });
  }

  rhsReceived (msg) {
    // filter messages
    if (msg.headerFrom !== this.addressClient) {
      return;
    }

    switch (msg.data[0]) {
      case RH_MSG_START:
        this.log('System started');
        break;

      case RH_MSG_BATTERY:
        let raw = msg.data.readUInt16LE(2);
        let v = 5/1023*raw;
        v = Math.round(v*100)/100;
        this.log('Akku: ' + msg.data[1] + '%, ' + v + 'V (' + raw + ')');
        break;

      case RH_MSG_SENSOR_VALUES:
        {
          let r = [0, 0, 0, 0];
          let v = [0, 0, 0, 0];
          for (let i = 0; i < 4; i++) {
            r[i] = msg.data.readUInt16LE(1 + i*2);
            v[i] = 5/1023*r[i];
            v[i] = Math.round(v[i]*100)/100;
          }
          this.log('Sensors: ' + v[0] + 'V (' + r[0] + ') ' + v[1] + 'V (' + r[1] + ') ' + v[2] + 'V (' + r[2] + ') ' + v[3] + 'V (' + r[3] + ')');
        }
        break;

      case RH_MSG_DHTDATA:
        let t = msg.data.readFloatLE(1);
        let h = msg.data.readFloatLE(5);
        t=Math.round(t*10)/10;
        h=Math.round(h*10)/10;
        this.log('DHT: ' + t + '°C ' + h + '%');
        break;

      case RH_MSG_CHANNEL_ON:
        this.log('Channel ' + msg.data[1] + ' on');
        break;

      case RH_MSG_CHANNEL_OFF:
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

    }
  }

  log (text) {
    const entry = {
      time: new Date(),
      text: text
    };
    this.logData.push(entry);
    console.log(new Date(), text);
  }
}

const watering = new Watering();
