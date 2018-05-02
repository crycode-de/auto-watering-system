/*
 * Automatic Watering System Control App
 *
 * Frontend
 *
 * (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
'use strict';

class WateringClient {
  constructor () {
    document.getElementById('checkNowButton').onclick = this.apiCheckNow;
    document.getElementById('connectButton').onclick = this.apiConnect;
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

    this.apiGetInfo = this.apiGetInfo.bind(this);

    this.settingsTime = 0;
    this.logCount = 0;
    this.info = null;

    this.apiGetPorts();
    this.apiGetInfo();

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
          document.getElementById('dhtInterval').value = info.settings.dhtInterval;
          document.getElementById('sendAdcValuesThroughRH').checked = info.settings.sendAdcValuesThroughRH;
        }
      } else {
        document.getElementById('settings').style.display = 'none';
        document.getElementById('setSettingsButton').style.display = 'none';
        document.getElementById('saveSettingsButton').style.display = 'none';
      }

      for (let i = 0; i < 4; i++) {
        document.getElementById('onoff' + i).innerHTML = info.status.on[i] ? 'On' : 'Off';
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
        dhtInterval: document.getElementById('dhtInterval').value,
        sendAdcValuesThroughRH: document.getElementById('sendAdcValuesThroughRH').checked
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
    let data = {
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
        addressServer: document.getElementById('addressServer').value,
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
}

window.watering = new WateringClient();
