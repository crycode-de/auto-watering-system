#include "main.h"

void setup() {
  // TODO setup adc

  // all channels are off while starting
  for (uint8_t chan = 0; chan < 4; chan++) {
    channelOn[chan] = false;
    channelTurnOn[chan] = false;
    channelTurnOffTime[chan] = 0;
  }

  // TODO setup pins

  // set the eeprom reset pin as input with internal pullup activated
  pinMode(EEPROM_RESET_PIN, INPUT_PULLUP);

  // need to reset the config?
  if (digitalRead(EEPROM_RESET_PIN) == LOW || EEPROM.read(EEPROM_ADDR_VERSION) != EEPROM_VERSION) {
    // set default config
    setDefaultConfig();

    // save config to eeprom
    saveConfig();

    // write the current config data model version to the eeprom
    EEPROM.update(EEPROM_ADDR_VERSION, EEPROM_VERSION);

    // blink LED while eeprom reset button is pressed
    while (digitalRead(EEPROM_RESET_PIN) == LOW) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
  } else {
    // read config from eeprom
    EEPROM.get(EEPROM_ADDR_CFG, cfg);
  }

  // calc adc next read times
  for (uint8_t chan = 0; chan < 4; chan++) {
    if (cfg.channelEnabled[chan]) {
      // channel is enabled
      adcNextReadTime = millis() + (cfg.checkInterval * 1000);
    }
  }
}

void loop() {
  unsigned long now = millis();

  // check if we need to read the adc values
  if (checkTime(now, adcNextReadTime)) {
    // read adc values and check if we need to turn on some channels
    for (uint8_t chan = 0; chan < 4; chan++) {
      if (cfg.channelEnabled[chan]) {
        // read the adc value of the channel
        uint16_t adcVal = analogRead(sensorAdcPins[chan]);
        // check trigger value
        if (adcVal >= cfg.adcTriggerValue[chan]) {
          // set marker to turn the channel on
          channelTurnOn[chan] = true;
        }
      }
    }

    // calc next adc read time
    adcNextReadTime = now + (cfg.checkInterval * 1000);
  }

  for (uint8_t chan = 0; chan < 4; chan++) {
    if (cfg.channelEnabled[chan]) {
      // check turn off
      if (channelOn[chan] == true && checkTime(now, channelTurnOffTime[chan])) {
        turnValveOff(chan);
      }
      // check turn on
      else if (channelOn[chan] == false && channelTurnOn[chan] == true) {
        if (turnValveOn(chan)) {
          // calc the turn off time
          channelTurnOffTime[chan] = now + (cfg.wateringTime[chan] * 1000);
          // reset the turn on indecator
          channelTurnOn[chan] = false;
        }
      }
    }
  }

}

/**
 * Turns the valve of the given channel on if no other valve is currently turned on.
 *
 * Returns `true` if the valve is turned on, `false` if it is not turned on
 * because an other valve is already on.
 */
bool turnValveOn (uint8_t chan) {
  // check if we can turn on
  if (channelOn[0] || channelOn[1] || channelOn[2] || channelOn[3]) {
    // one channel is on
    return false;
  }

  // turn the valve pin on
  digitalWrite(valvePins[chan], HIGH);

  // set marker that this channel is on
  channelOn[chan] = true;

  // TODO send RadioHead message

  return true;
}

/**
 * Turns the valve of the given channel off.
 */
void turnValveOff (uint8_t chan) {
  // turn the valve pin off
  digitalWrite(valvePins[chan], LOW);

  // set marker that this channel is off
  channelOn[chan] = false;

  // TODO send RadioHead message
}

/**
 * Load the default config.
 */
void setDefaultConfig() {
  // set default values
  for (uint8_t chan = 0; chan < 4; chan++) {
    cfg.channelEnabled[chan] = (chan == 0); // only channel 0 is active
    cfg.adcTriggerValue[chan] = 512; // adc trigger value
    cfg.wateringTime[chan] = 5; // opening time in seconds
  }
  cfg.checkInterval = 300; // check interval - 5 minutes
}

/**
 * Save the current config into the eeporm.
 */
void saveConfig() {
  // write to eeprom
  EEPROM.put(EEPROM_ADDR_CFG, cfg);
}
