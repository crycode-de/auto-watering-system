/*
 * Automatic Watering System - Control-App
 *
 * Internationalization
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
'use strict';

class I18n {

  constructor () {
    this.translateAll = this.translateAll.bind(this);
    this.__ = this.__.bind(this);

    // detect user language
    let lang = navigator.languages && navigator.languages[0] || // Chrome / Firefox
               navigator.language ||   // all browsers
               navigator.userLanguage || // IE <= 10
               'en'; // fallback default

    lang = lang.replace('-','_').split('_')[0];

    if (translations[lang]) {
      this.lang = lang;
    } else {
      this.lang = 'en';
    }

    this.translateAll();
  }

  /**
   * Translate all entities in the document having data-translate attribute.
   */
  translateAll () {
    let elems = document.querySelectorAll('[data-translate]');
    for (let i = 0; i < elems.length; i++) {
      let key = elems[i].dataset.translate;
      if (key) {
        elems[i].innerHTML = this.__(key);
      } else {
        key = elems[i].innerHTML;
        elems[i].dataset.translate = key;
        elems[i].innerHTML = this.__(key);
      }
    }

    elems = document.querySelectorAll('[data-translate-title]');
    for (let i = 0; i < elems.length; i++) {
      let key = elems[i].dataset.translateTitle;
      if (key) {
        elems[i].title = this.__(key);
      } else {
        key = elems[i].title;
        elems[i].dataset.translateTitle = key;
        elems[i].title = this.__(key);
      }
    }

    elems = document.querySelectorAll('[data-translate-placeholder]');
    for (let i = 0; i < elems.length; i++) {
      let key = elems[i].dataset.translatePlaceholder;
      if (key) {
        elems[i].placeholder = this.__(key);
      } else {
        key = elems[i].placeholder;
        elems[i].dataset.translatePlaceholder = key;
        elems[i].placeholder = this.__(key);
      }
    }

    document.title = this.__('pageTitle');
  }

  /**
   * Translate function.
   */
  __ (key) {
    if (!translations[this.lang] || !translations[this.lang][key]) {
      console.warn(`Missing translation for lang '${this.lang}' key '${key}'!`);
      return key;
    }

    return translations[this.lang][key];
  }
}

/**
 * All translations
 */
const translations = {
  de: {
    pageTitle: 'Automatisches Bewässerungssystem - Control-App',

    automaticWateringSystem: 'Automatisches Bewässerungssystem',
    errorGettingDataFromBackend: 'Fehler beim Laden der Daten vom Backend!',
    language: 'Sprache',
    german: 'Deutsch (German)',
    english: 'Englisch (English)',
    port: 'Schnittstelle',
    serialport: 'Serielle Schnittstelle',
    choosePort: 'Schnittstelle auswählen ...',
    baudRate: 'Baudrate',
    addressOfThisNode: 'Addresse dieses Teilnehmers',
    addressOfWateringSystem: 'Adress des Bewässerungssystems',
    '0x01or1': '0x01 oder 1',
    '0xDCor220': '0xDC oder 220',
    connect: 'Verbinden ...',
    outdatedWarning: '<strong>Warnung:</strong> Die Softwareversion des automatischen Bewässerungssystems ist veraltet! Manche Funktionen sind nicht verfügbar.',
    checkNow: 'Jetzt prüfen',
    sendPing: 'Ping senden',
    getSettings: 'Einstellungen vom Bewässerungssystem laden',
    pollData: 'Daten pollen',
    disconnect: 'Verbindung trennen',
    channel: 'Kanal',
    active: 'Aktiv',
    adcTriggerValues: 'ADC Triggerwerte',
    wateringTimes: 'Bewässerungszeiten',
    seconds: 'Sekunden',
    milliseconds: 'Millisekunden',
    ownAddress: 'Eigene adresse',
    pushDataToAddress: 'Sende Daten an Adresse',
    delayAfterSend: 'Verzögerung nach dem Senden',
    checkInterval: 'Prüfintervall',
    temperatureSensorInterval: 'Temperatursensorintervall',
    temperatureSwitchTriggerValue: 'Temperaturschalter Triggerwert',
    temperatureSwitchHysteresis: 'Temperaturschalter Hysterese',
    temperatureSwitchInverted: 'Temperaturschalter umgekehrt',
    sendAdcValues: 'ADC-Werte senden',
    enableAutomaticDataPush: 'Automatisches Senden der Daten',
    sendSettings: 'Sende Einstellungen an Bewässerungssystem',
    saveSettings: 'Aktuelle Einstellungen auf dem Bewässerungssystem in den EEPROM speichern',

    status: 'Status',
    values: 'Werte',
    temperature: 'Temperatur',
    humidity: 'Luftfeuchtigkeit',
    battery: 'Batterie',
    system: 'System',
    pause: 'Pause',
    resume: 'Forsetzen',

    on: 'Ein',
    off: 'Aus'
  },

  en: {
    pageTitle: 'Automatic Watering System - Control-App',

    automaticWateringSystem: 'Automatic Watering System',
    errorGettingDataFromBackend: 'Error while getting data from backend!',
    language: 'Language',
    german: 'German (Deutsch)',
    english: 'English (Englisch)',
    port: 'Port',
    serialport: 'Serialport',
    choosePort: 'Choose port ...',
    baudRate: 'Baud rate',
    addressOfThisNode: 'Address of this node',
    addressOfWateringSystem: 'Address of the watering system',
    '0x01or1': '0x01 or 1',
    '0xDCor220': '0xDC or 220',
    connect: 'Connect ...',
    outdatedWarning: '<strong>Warning:</strong> The software version of the automatic watering system is outdated! Some features may not be available.',
    checkNow: 'Check now',
    sendPing: 'Send ping',
    getSettings: 'Get settings from watering system',
    pollData: 'Poll data',
    disconnect: 'Disconnect',
    channel: 'Channel',
    active: 'Active',
    adcTriggerValues: 'ADC trigger values',
    wateringTimes: 'Watering times',
    seconds: 'seconds',
    milliseconds: 'milliseconds',
    ownAddress: 'Own address',
    pushDataToAddress: 'Push data to address',
    delayAfterSend: 'Delay after send',
    checkInterval: 'Check interval',
    temperatureSensorInterval: 'Temperature sensor interval',
    temperatureSwitchTriggerValue: 'Temperature switch trigger value',
    temperatureSwitchHysteresis: 'Temperature switch hysteresis',
    temperatureSwitchInverted: 'Temperature switch inverted',
    sendAdcValues: 'Send ADC values',
    enableAutomaticDataPush: 'Automatic data push',
    sendSettings: 'Send settings to watering system',
    saveSettings: 'Save current settings on watering system to EEPROM',

    status: 'Status',
    values: 'Values',
    temperature: 'Temperature',
    humidity: 'Humidity',
    battery: 'Battery',
    system: 'System',
    pause: 'Pause',
    resume: 'Resume',

    on: 'On',
    off: 'Off'
  }
}
