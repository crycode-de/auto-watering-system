/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Settings and setting-handlers for the options which can be changed at runtime.
 */

#include "settings.h"

#include <EEPROM.h>

/**
 * Load the default settings.
 */
void loadDefaultSettings () {
  // set default values
  for (uint8_t chan = 0; chan < 4; chan++) {
    settings.channelEnabled[chan] = (chan == 0); // only channel 0 is active
    settings.adcTriggerValue[chan] = 512; // adc trigger value
    settings.wateringTime[chan] = 5; // opening time in seconds
  }
  settings.checkInterval = 300; // check interval - 5 minutes
  settings.tempSensorInterval = 60; // temperature sensor read interval - 1 minute
  settings.sendAdcValuesThroughRH = true; // send all read adc values using through RadioHead
  settings.pushDataEnabled = true; // push data actively via RadioHead
  settings.serverAddress = RH_SERVER_ADDR; // RadioHead remote node address
  settings.ownAddress = RH_OWN_ADDR; // RadioHead address of this node
  settings.delayAfterSend = 10; // milliseconds to delay after each send
  settings.tempSwitchTriggerValue = 30; // turn on temperature switch if > 30°C
  settings.tempSwitchHystTenth = 20; // 2°C hysteresis -> 32°C on, 28°C off
  settings.tempSwitchInverted = false; // don't invert - turn on if greater

  calcTempSwitchTriggerValues();
}

/**
 * Load the stored settings from the eeprom.
 */
void loadSettings () {
  EEPROM.get(EEPROM_ADDR_SETTINGS, settings);

  calcTempSwitchTriggerValues();
}

/**
 * Save the current settings into the eeporm.
 */
void saveSettings () {
  // write to eeprom
  EEPROM.put(EEPROM_ADDR_SETTINGS, settings);
}

/**
 * Calculate temperature switch high/low trigger values.
 */
void calcTempSwitchTriggerValues () {
  tempSwitchTriggerValueHigh = settings.tempSwitchTriggerValue + (float)settings.tempSwitchHystTenth/10;
  tempSwitchTriggerValueLow = settings.tempSwitchTriggerValue - (float)settings.tempSwitchHystTenth/10;
}
