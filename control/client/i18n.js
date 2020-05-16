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

    return translations[this.lang][key].replace(/\n/g, '<br />');
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
    outdatedWarning: '<strong>Warnung:</strong> Die Softwareversion des automatischen Bewässerungssystems ist veraltet! Manche Funktionen sind möglicherweise nicht verfügbar.',
    checkNow: 'Jetzt prüfen',
    sendPing: 'Ping senden',
    getSettings: 'Einstellungen vom Bewässerungssystem laden',
    pollData: 'Daten pollen',
    disconnect: 'Verbindung trennen',
    channel: 'Kanal',
    active: 'Aktiv',
    adcTriggerValues: 'ADC Triggerwerte',
    adcTriggerValuesInfo: 'Schwelle zum Aktivieren der automatischen Bewässerung pro Kanal.\nDies sind die reinen ADC-Werte, die vom Controller gemessen werden.\nBeim Überschreiten des hier eingestellten Wertes wird eine Bewässerung für den jeweiligen Kanal ausgelöst.',
    wateringTimes: 'Bewässerungszeiten',
    wateringTimesInfo: 'Zeit in Sekunden pro Kanal, die beim Überschreiten des jeweiligen <em>ADC Treiggerwertes</em> bewässert wird.',
    seconds: 'Sekunden',
    milliseconds: 'Millisekunden',
    ownAddress: 'Eigene Adresse',
    ownAddressInfo: 'Dies ist die Adresse des Bewässerungssystems im RadioHead-Netzwerk.\nDie Adresse kann in Hexadezimal- oder Dezimalschreibweise angegeben werden.\nBeispiel: <code>0xDC</code> oder <code>220</code>',
    pushDataToAddress: 'Sende Daten an Adresse',
    pushDataToAddressInfo: 'Zieladresse für automatisch gesendete Daten.\nDie Adresse kann in Hexadezimal- oder Dezimalschreibweise angegeben werden.\nBeispiel: <code>0x01</code> oder <code>1</code>',
    delayAfterSend: 'Verzögerung nach dem Senden',
    delayAfterSendInfo: 'Zeit in Millisekunden, die nach jedem Senden einer RadioHead-Nachricht gewartet wird.\nBei Übertragungsproblemen oder Verwendung eines Repeaters kann es helfen diese Zeit zu erhöhen.\nZu hohe Wartezeiten können sich jedoch auch negativ auf die Kommunikation auswerten.\nMinimum: <code>0</code>, Maximum: <code>65535</code>',
    checkInterval: 'Prüfintervall',
    checkIntervalInfo: 'Intervall in Sekunden, in dem die ADC-Werte geprüft werden und gegebenenfalls eine Bewässerung eingeleitet wird.\nMinimum: <code>0</code>, Maximum: <code>65535</code>',
    temperatureSensorInterval: 'Temperatursensorintervall',
    temperatureSensorIntervalInfo: 'Intervall in Sekunden, in dem der Temperatursensor ausgelesen wird.\nMinimum: <code>0</code>, Maximum: <code>65535</code>',
    temperatureSwitchTriggerValue: 'Temperaturschalter Triggerwert',
    temperatureSwitchTriggerValueInfo: 'Temperatur, bei der der temperaturabhängige Schalter geschaltet wird.\nHierbei wird die eingestellte Hysterese beachtet, soass ein Einschalten bei Trigger + Hysterese und ein Ausschalten bei Triggerwert - Hysterese erfolgt.\nMinimum: <code>-127</code>, Maximum: <code>127</code>\nZum Deaktivieren des temperaturabhängigen Schalters können Triggerwer und Hysterese auf <code>0</code> gesetzt werden.',
    temperatureSwitchHysteresis: 'Temperaturschalter Hysterese',
    temperatureSwitchHysteresisInfo: 'Hysterese für den temperaturabhängigen Schalter.\nDieser Wert zur Ermittlung der Schaltschwellen zusammen mit dem Triggerwert verwendet, um ein häufiges Ein- und Ausschalten zu verhindern.\nDie Hysterese kann in 0,1-er Schritten angegeben werden.\nMinimum: <code>0,0</code>, Maximum: <code>25,0</code>',
    temperatureSwitchInverted: 'Temperaturschalter umgekehrt',
    temperatureSwitchInvertedInfo: 'Standardmäßig wird der temperaturabhängige Schalter beim Überschreiten der eingestellten Temperatur eingeschaltet und beim Unterschreiten ausgeschaltet.\nDurch das Invertieren wird der Schalter beim Unterschreiten der eingestellten Temperatur eingeschaltet und beim Überschreiten ausgeschaltet.',
    sendAdcValues: 'ADC-Werte senden',
    sendAdcValuesInfo: 'Wenn aktiviert, dann werden die gemessenen ADC-Werte per RadioHead übertragen.\nWenn deaktiviert, dann werden nur die Schaltzustände der einzelnen Kanäle übertragen.',
    enableAutomaticDataPush: 'Automatisches Senden der Daten',
    enableAutomaticDataPushInfo: 'Wenn aktiviert, dann werden automatisch RadioHead-Nachrichten mit den aktuellen Messwerten und Zuständen gesendet. (Push)\nWenn deaktiviert, wird nur auf direkte Anfragen geantwortet. (Poll)\nWird das Bewässerungssystem einzeln ohne RadioHead-Zentrale betrieben, dann sollte das automatische Senden der Daten deaktiviert werden.',
    sendSettings: 'Sende Einstellungen an Bewässerungssystem',
    saveSettings: 'Aktuelle Einstellungen auf dem Bewässerungssystem in den EEPROM speichern',

    status: 'Status',
    values: 'Werte',
    temperature: 'Temperatur',
    humidity: 'Luftfeuchtigkeit',
    battery: 'Batterie',
    system: 'System',
    pause: 'Pause',
    resume: 'Fortsetzen',

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
    adcTriggerValuesInfo: 'Threshold for activating automatic watering per channel.\nThese are the pure ADC values measured by the controller.\nIf the value set here is exceeded, watering is triggered for the respective channel.',
    wateringTimes: 'Watering times',
    wateringTimesInfo: 'Time in seconds per channel that is watered when the respective <em>ADC trigger value</em> is exceeded.',
    seconds: 'seconds',
    milliseconds: 'milliseconds',
    ownAddress: 'Own address',
    ownAddressInfo: 'This is the address of the watering system in the RadioHead network.\nThe address may be provided in hexadecimal or decimal notation.\nExample: <code>0xDC</code> or <code>220</code>',
    pushDataToAddress: 'Push data to address',
    pushDataToAddressInfo: 'Target address for automatically send data.\nThe address may be provided in hexadecimal or decimal notation.\nExample: <code>0x01</code> or <code>1</code>',
    delayAfterSend: 'Delay after send',
    delayAfterSendInfo: 'Time in milliseconds to wait each time after a RadioHead message is sent.\nIf you have transmission problems or use a repeater, it can help to increase this time.\nHowever, delay times that are too long can also have a negative impact on communication.\nMinimum: <code>0</code>, Maximum: <code>65535</code>',
    checkInterval: 'Check interval',
    checkIntervalInfo: 'Interval in seconds in which the ADC values are checked and, if necessary, watering is initiated.\nMinimum: <code>0</code>, Maximum: <code>65535</code>',
    temperatureSensorInterval: 'Temperature sensor interval',
    temperatureSensorIntervalInfo: 'Interval in seconds in which the temperature sensor is read out.\nMinimum: <code>0</code>, Maximum: <code>65535</code>',
    temperatureSwitchTriggerValue: 'Temperature switch trigger value',
    temperatureSwitchTriggerValueInfo: 'Temperature at which the temperature-dependent switch is switched.\nThe set hysteresis is taken into account here, so that switching on with trigger value + hysteresis and switching off with trigger value - hysteresis takes place.\nMinimum: <code>-127</code>, Maximum: <code>127</code>\nTo deactivate the temperature-dependent switch, the trigger value and hysteresis can be set to <code>0</code>.',
    temperatureSwitchHysteresis: 'Temperature switch hysteresis',
    temperatureSwitchHysteresisInfo: 'Hysteresis for the temperature-dependent switch.\nThis value is used to determine the switching thresholds together with the trigger value to prevent frequent switching on and off.\nThe hysteresis can be specified in steps of 0.1.\nMinimum: <code>0.0</code>, Maximum: <code>25.0</code>',
    temperatureSwitchInverted: 'Temperature switch inverted',
    temperatureSwitchInvertedInfo: 'By default, the temperature-dependent switch is switched on when the set temperature is exceeded and switched off when the temperature falls below.\nInverting switches the switch on when the temperature falls below the set value and switches it off when the temperature is exceeded.',
    sendAdcValues: 'Send ADC values',
    sendAdcValuesInfo: 'If activated, the measured ADC values are transmitted via RadioHead.\nIf deactivated, only the switching states of the individual channels are transmitted.',
    enableAutomaticDataPush: 'Automatic data push',
    enableAutomaticDataPushInfo: 'If activated, RadioHead messages are automatically sent with the current measured values and states. (push)\nIf deactivated, only direct requests will be answered. (poll)\nIf the watering system is operated individually without a RadioHead center, the automatic transmission of the data should be deactivated.',
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
