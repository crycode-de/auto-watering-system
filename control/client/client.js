/*
 * Automatic Watering System - Control-App
 *
 * Frontend
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
'use strict';

/**
 * Function to check if version A is greater or equal to version B.
 */
function checkVersionGe (vA, vB) {
  const [, vAmajor, vAminor, vArev] = vA.match(/(\d+)\.(\d+)\.(\d+)$/);
  const [, vBmajor, vBminor, vBrev] = vB.match(/(\d+)\.(\d+)\.(\d+)$/);

  if (parseInt(vAmajor, 10) < parseInt(vBmajor, 10)) return false;
  if (parseInt(vAminor, 10) < parseInt(vBminor, 10)) return false;
  if (parseInt(vArev, 10) < parseInt(vBrev, 10)) return false;

  return true;
}

class WateringClient {
  constructor () {
    document.getElementById('checkNowButton').onclick = this.apiCheckNow;
    document.getElementById('pingButton').onclick = this.apiPing;
    document.getElementById('pollButton').onclick = this.apiPoll;
    document.getElementById('connectButton').onclick = this.apiConnect;
    document.getElementById('disconnectButton').onclick = this.apiDisconnect;
    document.getElementById('getSettingsButton').onclick = this.apiGetSettings;
    document.getElementById('setSettingsButton').onclick = this.apiSetSettings;
    document.getElementById('saveSettingsButton').onclick = this.apiSaveSettings;
    document.getElementById('portSelect').onchange = (event) => {
      document.getElementById('port').value = event.target.value;
    }
    for (let i = 0; i < 4; i++) {
      document.getElementById('onoff' + i).onclick = this.apiOnoff.bind(this);
    }
    document.getElementById('pause').onclick = this.apiPause;
    document.getElementById('resume').onclick = this.apiResume;
    document.getElementById('tempSwitchOn').onclick = this.apiTempSwitch.bind(this);

    document.getElementById('deButton').onclick = () => {
      this.i18n.lang = 'de';
      this.i18n.translateAll();
    }
    document.getElementById('enButton').onclick = () => {
      this.i18n.lang = 'en';
      this.i18n.translateAll();
    }

    this.apiGetInfo = this.apiGetInfo.bind(this);

    // enable info icons
    const elems = document.querySelectorAll('[data-info]');
    for (let i = 0; i < elems.length; i++) {
      let key = elems[i].dataset.info;
      elems[i].onclick = (event) => {
        const infoElem = document.getElementById(event.target.dataset.info);
        if (infoElem.style.display === 'block') {
          infoElem.style.display = '';
        } else {
          infoElem.style.display = 'block';
        }
      };
    }


    this.settingsTime = 0;
    this.softwareVersion = null;
    this.logCount = 0;
    this.info = null;

    this.apiGetPorts();
    this.apiGetInfo();

    this.i18n = new I18n();

    // start interval to get the info every second
    window.setInterval(this.apiGetInfo, 1000);
  }

  /**
   * Method to get the current data from the backend.
   */
  apiGetInfo () {
    fetch('/api/getInfo')
    .then(res => res.json())
    .then((info) => {
      this.info = info;

      document.getElementById('fetchError').style.display = 'none';

      if (info.connected) {
        document.getElementById('connectDialog').style.display = 'none';
        document.getElementById('settingsDialog').style.display = '';
      } else {
        document.getElementById('connectDialog').style.display = '';
        document.getElementById('settingsDialog').style.display = 'none';
      }

      if (this.softwareVersion != info.softwareVersion) {
        document.getElementById('softwareVersion').innerHTML = info.softwareVersion;
        this.softwareVersion = info.softwareVersion;

        // show hint if software version of watering system is lower than the version of the controll app
        if (checkVersionGe(this.softwareVersion, info.softwareVersionControl)) {
          document.getElementById('versionOutdatedInfo').style.display = '';
        } else {
          document.getElementById('versionOutdatedInfo').style.display = 'block';
        }

        // push data can only be disabled in >= v2.0.0
        if (checkVersionGe(this.softwareVersion, '2.0.0')) {
          document.getElementById('pushDataEnabled').disabled = false;
        } else {
          document.getElementById('pushDataEnabled').disabled = true;
        }

        // server address can only be set in >= v2.1.0
        if (checkVersionGe(this.softwareVersion, '2.1.0')) {
          document.getElementById('serverAddress').disabled = false;
          document.getElementById('nodeAddress').disabled = false;
          document.getElementById('delayAfterSend').disabled = false;
        } else {
          document.getElementById('serverAddress').disabled = true;
          document.getElementById('nodeAddress').disabled = true;
          document.getElementById('delayAfterSend').disabled = true;
        }

        // temperature switch only available in >= v2.2.0
        if (checkVersionGe(this.softwareVersion, '2.2.0')) {
          document.getElementById('tempSwitchTriggerValue').disabled = false;
          document.getElementById('tempSwitchHyst').disabled = false;
          document.getElementById('tempSwitchInverted').disabled = false;
          document.getElementById('tempSwitchOn').disabled = false;
        } else {
          document.getElementById('tempSwitchTriggerValue').disabled = true;
          document.getElementById('tempSwitchHyst').disabled = true;
          document.getElementById('tempSwitchInverted').disabled = true;
          document.getElementById('tempSwitchOn').disabled = true;
        }
      }

      if (info.settings) {
        document.getElementById('settings').style.display = '';
        document.getElementById('setSettingsButton').style.display = '';
        document.getElementById('saveSettingsButton').style.display = '';
        if (info.settings.time > this.settingsTime) {
          this.settingsTime = info.settings.time;
          for (let i = 0; i < 4; i++) {
            document.getElementById('channelEnabled' + i).checked = info.settings.channelEnabled[i];
            document.getElementById('adcTriggerValue' + i).value = info.settings.adcTriggerValue[i];
            document.getElementById('wateringTime' + i).value = info.settings.wateringTime[i];
          }
          document.getElementById('checkInterval').value = info.settings.checkInterval;
          document.getElementById('tempSensorInterval').value = info.settings.tempSensorInterval;
          document.getElementById('sendAdcValuesThroughRH').checked = info.settings.sendAdcValuesThroughRH;

          if (checkVersionGe(this.softwareVersion, '2.0.0')) {
            document.getElementById('pushDataEnabled').checked = info.settings.pushDataEnabled;
          } else {
            document.getElementById('pushDataEnabled').checked = true;
          }
          if (checkVersionGe(this.softwareVersion, '2.1.0')) {
            document.getElementById('serverAddress').value = info.settings.serverAddress;
            document.getElementById('nodeAddress').value = info.settings.nodeAddress;
            document.getElementById('delayAfterSend').value = info.settings.delayAfterSend;
          } else {
            document.getElementById('serverAddress').value = '';
            document.getElementById('nodeAddress').value = '';
            document.getElementById('delayAfterSend').value = 10;
          }
          if (checkVersionGe(this.softwareVersion, '2.2.0')) {
            document.getElementById('tempSwitchTriggerValue').value = info.settings.tempSwitchTriggerValue;
            document.getElementById('tempSwitchHyst').value = info.settings.tempSwitchHyst;
            document.getElementById('tempSwitchInverted').checked = info.settings.tempSwitchInverted;
          } else {
            document.getElementById('tempSwitchTriggerValue').value = 0;
            document.getElementById('tempSwitchHyst').value = 0;
            document.getElementById('tempSwitchInverted').checked = false;
          }
        }
      } else {
        document.getElementById('settings').style.display = 'none';
        document.getElementById('setSettingsButton').style.display = 'none';
        document.getElementById('saveSettingsButton').style.display = 'none';
      }

      for (let i = 0; i < 4; i++) {
        document.getElementById('onoff' + i).innerHTML = info.status.on[i] ? this.i18n.__('on') : this.i18n.__('off');
        document.getElementById('onoff' + i).dataset.translate = info.status.on[i] ? 'on' : 'off';
        if (info.status.on[i]) {
          document.getElementById('onoff' + i).classList.add('on');
        } else {
          document.getElementById('onoff' + i).classList.remove('on');
        }
        document.getElementById('value' + i).innerHTML = info.status.adcVolt[i] + ' V (' + info.status.adcRaw[i] + ')';
      }
      document.getElementById('temperature').innerHTML = info.status.temperature + ' °C';
      document.getElementById('humidity').innerHTML = info.status.humidity + ' %';
      document.getElementById('battery').innerHTML = info.status.batPercent + ' %';
      document.getElementById('battery2').innerHTML = info.status.batVolt + ' V (' + info.status.batRaw + ')';

      if (info.status.tempSwitchOn) {
        document.getElementById('tempSwitchOn').innerHTML = this.i18n.__('on');
        document.getElementById('tempSwitchOn').dataset.translate = 'on';
        document.getElementById('tempSwitchOn').classList.add('on');
      } else {
        document.getElementById('tempSwitchOn').innerHTML = this.i18n.__('off');
        document.getElementById('tempSwitchOn').dataset.translate = 'off';
        document.getElementById('tempSwitchOn').classList.remove('on');
      }

      if (this.logCount != info.log.length) {
        document.getElementById('log').innerHTML = info.log.map((l) => { return l.time + ' ' + l.text }).reverse().join('\n');
        this.logCount = info.log.length;
      }
    })
    .catch((err) => {
      document.getElementById('fetchError').style.display = '';
    });
  }

  /**
   * Method to get the list of available serial ports from the backend.
   */
  apiGetPorts () {
    fetch('/api/getPorts')
    .then(res => res.json())
    .then((ports) => {
      let currentChilds = document.getElementById('portSelect').getElementsByClassName('dyn');
      for (let i = 0; i < currentChilds.length; i++) {
        currentChilds[i].remove();
      }
      for (let i = 0; i < ports.length; i++) {
        let option = document.createElement('option');
        option.innerHTML = ports[i];
        option.value = ports[i];
        option.class = 'dyn';
        document.getElementById('portSelect').appendChild(option);
      }
    });
  }

  /**
   * Method to send the 'check now' command to the watering system.
   */
  apiCheckNow () {
    fetch('/api/checkNow')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the 'ping' command to the watering system.
   */
  apiPing () {
    fetch('/api/ping')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the 'poll data' command to the watering system.
   */
  apiPoll () {
    fetch('/api/poll')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the 'get settings' command to the watering system.
   */
  apiGetSettings () {
    fetch('/api/getSettings')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the new settings to the watering system.
   */
  apiSetSettings () {
    fetch('/api/setSettings', {
      body: JSON.stringify({
        channelEnabled: [
          document.getElementById('channelEnabled0').checked,
          document.getElementById('channelEnabled1').checked,
          document.getElementById('channelEnabled2').checked,
          document.getElementById('channelEnabled3').checked
        ],
        adcTriggerValue: [
          document.getElementById('adcTriggerValue0').value,
          document.getElementById('adcTriggerValue1').value,
          document.getElementById('adcTriggerValue2').value,
          document.getElementById('adcTriggerValue3').value
        ],
        wateringTime: [
          document.getElementById('wateringTime0').value,
          document.getElementById('wateringTime1').value,
          document.getElementById('wateringTime2').value,
          document.getElementById('wateringTime3').value
        ],
        checkInterval: document.getElementById('checkInterval').value,
        tempSensorInterval: document.getElementById('tempSensorInterval').value,
        sendAdcValuesThroughRH: document.getElementById('sendAdcValuesThroughRH').checked,
        pushDataEnabled: document.getElementById('pushDataEnabled').checked,
        serverAddress: document.getElementById('serverAddress').value,
        nodeAddress: document.getElementById('nodeAddress').value,
        delayAfterSend: document.getElementById('delayAfterSend').value,
        tempSwitchTriggerValue: document.getElementById('tempSwitchTriggerValue').value,
        tempSwitchHyst: document.getElementById('tempSwitchHyst').value,
        tempSwitchInverted: document.getElementById('tempSwitchInverted').checked,
      }),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    })
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the 'save settings' command to the watering system.
   */
  apiSaveSettings () {
    fetch('/api/saveSettings')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to turn a channel on/off.
   * Called by pressing a button.
   */
  apiOnoff (event) {
    const data = {
      channel: event.target.dataset.chan || 0,
      on: false // turn off by default
    };
    if (this.info && !this.info.status.on[data.channel]) {
      // turn on
      data.on = true;
    }
    fetch('/api/onoff', {
      body: JSON.stringify(data),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    })
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to turn the temperature switch on/off.
   * Called by pressing a button.
   */
  apiTempSwitch (event) {
    const data = {
      on: !this.info.status.tempSwitchOn
    };
    fetch('/api/tempSwitch', {
      body: JSON.stringify(data),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    })
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the 'pause' command to the watering system.
   */
  apiPause () {
    fetch('/api/pause')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to send the 'resume' command to the watering system.
   */
  apiResume () {
    fetch('/api/resume')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to connect the backend to serial-radio gateway.
   */
  apiConnect () {
    fetch('/api/connect', {
      body: JSON.stringify({
        port: document.getElementById('port').value,
        baud: document.getElementById('baud').value,
        addressThis: document.getElementById('addressThis').value,
        addressClient: document.getElementById('addressClient').value
      }),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    })
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }

  /**
   * Method to disconnect the backend from serial-radio gateway.
   */
  apiDisconnect () {
    fetch('/api/disconnect')
    .then((res) => {
      if (res.status != 200) {
        alert('Error! ' + res.status + '\n' + res.body);
      }
    });
  }
}

window.watering = new WateringClient();
