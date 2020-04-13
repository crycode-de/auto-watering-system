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
}

/**
 * Load the stored settings from the eeprom.
 */
void loadSettings () {
  EEPROM.get(EEPROM_ADDR_SETTINGS, settings);
}

/**
 * Save the current settings into the eeporm.
 */
void saveSettings () {
  // write to eeprom
  EEPROM.put(EEPROM_ADDR_SETTINGS, settings);
}
