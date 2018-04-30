'use strict';

const connectDialog = document.getElementById('connectDialog');
const portSelect = document.getElementById('portSelect');
const iPort = document.getElementById('iPort');
const iBaud = document.getElementById('iBaud');
const iAddressServer = document.getElementById('iAddressServer');
const iAddressClient = document.getElementById('iAddressClient');
const log = document.getElementById('log');
const settingsDialog = document.getElementById('settingsDialog');

class WateringClient {
  constructor () {
    document.getElementById('checkNowButton').onclick = this.checkNow;
    document.getElementById('connectButton').onclick = this.connect;
    document.getElementById('getSettingsButton').onclick = this._getSettings;
    document.getElementById('setSettingsButton').onclick = this._setSettings;
    document.getElementById('saveSettingsButton').onclick = this.saveSettings;

    this.getInfo = this.getInfo.bind(this);

    this.settingsTime = 0;

    this.getPorts();
    this.getInfo();
    window.setInterval(this.getInfo, 1000);
  }

  getInfo () {
    fetch('/api/getInfo')
    .then(res => res.json())
    .then((info) => {
      console.log(info);
      if (info.connected) {
        connectDialog.style.display = 'none';
        settingsDialog.style.display = '';
      } else {
        connectDialog.style.display = '';
        settingsDialog.style.display = 'none';
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
      log.innerHTML = info.log.map((l) => { return l.time + ' - ' + l.text }).join('\n');
    });
  }

  getPorts () {
    fetch('/api/getPorts')
    .then(res => res.json())
    .then((ports) => {
      let currentChilds = portSelect.getElementsByClassName('dyn');
      for (let i = 0; i < currentChilds.length; i++) {
        currentChilds[i].remove();
      }
      for (let i = 0; i < ports.length; i++) {
        let option = document.createElement('option');
        option.innerHTML = ports[i];
        option.value = ports[i];
        option.class = 'dyn';
        portSelect.appendChild(option);
      }
      portSelect.onchange = (event) => {
        iPort.value = portSelect.value;
      }
    });
  }

  checkNow () {
    fetch('/api/checkNow')
    .then((res) => {
      if (res.status != 200) {
        alert('Error!\n' + res.body);
      }
    });
  }

  _getSettings () {
    fetch('/api/getSettings')
    .then((res) => {
      if (res.status != 200) {
        alert('Error!\n' + res.body);
      }
    });
  }

  _setSettings () {
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
        alert('Error!\n' + res.body);
      }
    });
  }

  saveSettings () {
    fetch('/api/saveSettings')
    .then((res) => {
      if (res.status != 200) {
        alert('Error!\n' + res.body);
      }
    });
  }

  connect () {
    fetch('/api/connect', {
      body: JSON.stringify({
        port: iPort.value,
        baud: iBaud.value,
        addressServer: iAddressServer.value,
        addressClient: iAddressClient.value
      }),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    })
    .then((res) => {
      if (res.status != 200) {
        alert('Error!\n' + res.body);
      }
    });
  }
}

window.watering = new WateringClient();
