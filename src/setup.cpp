/*
 * The Arduino setup function which is called once on startup.
 */

#include "setup.h"

#include <EEPROM.h>
#include "actions.h"
#include "pcint.h"
#include "rh.h"
#include "settings.h"

void setup () {

  // setup the pins
  pinMode(VALVE_0_PIN, OUTPUT);
  pinMode(VALVE_1_PIN, OUTPUT);
  pinMode(VALVE_2_PIN, OUTPUT);
  pinMode(VALVE_3_PIN, OUTPUT);
  pinMode(VALVE_0_BUTTON_PIN, INPUT_PULLUP);
  pinMode(VALVE_1_BUTTON_PIN, INPUT_PULLUP);
  pinMode(VALVE_2_BUTTON_PIN, INPUT_PULLUP);
  pinMode(VALVE_3_BUTTON_PIN, INPUT_PULLUP);
  pinMode(SENSORS_ACTIVE_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(EEPROM_RESET_PIN, INPUT_PULLUP);

  // all channels are off while starting
  for (uint8_t chan = 0; chan < 4; chan++) {
    channelOn[chan] = false;
    channelTurnOn[chan] = false;
    channelTurnOffTime[chan] = 0;
    digitalWrite(valvePins[chan], LOW);
  }
  digitalWrite(SENSORS_ACTIVE_PIN, LOW);
  pauseAutomatic = false;

  // enable PCINT for the buttons
  attachPCINT(digitalPinToPCINT(VALVE_0_BUTTON_PIN), handlePcintButton0, FALLING);
  attachPCINT(digitalPinToPCINT(VALVE_1_BUTTON_PIN), handlePcintButton1, FALLING);
  attachPCINT(digitalPinToPCINT(VALVE_2_BUTTON_PIN), handlePcintButton2, FALLING);
  attachPCINT(digitalPinToPCINT(VALVE_3_BUTTON_PIN), handlePcintButton3, FALLING);

  // setup the ADC
  ADMUX =
    (1 << ADLAR) | // left shift result
    (0 << REFS1) | // Sets ref. voltage to VCC, bit 1
    (0 << REFS0) | // Sets ref. voltage to VCC, bit 0
    (0 << MUX3)  | // use ADC2 as default input, MUX bit 3
    (0 << MUX2)  | // use ADC2 as default input, MUX bit 2
    (1 << MUX1)  | // use ADC2 as default input, MUX bit 1
    (0 << MUX0);   // use ADC2 as default input, MUX bit 0
  ADCSRA =
    (1 << ADEN)  | // enable ADC
    (1 << ADPS2) | // set prescaler to 64, bit 2
    (1 << ADPS1) | // set prescaler to 64, bit 1
    (0 << ADPS0);  // set prescaler to 64, bit 0

  // disable ADC for powersaving
  ADCSRA &= ~(1<<ADEN);

  // disable analog comperator for powersaving
  ACSR |= (1<<ACD);

  // need to reset the config?
  if (digitalRead(EEPROM_RESET_PIN) == LOW || EEPROM.read(EEPROM_ADDR_VERSION) != EEPROM_VERSION) {
    // set default config
    loadDefaultSettings();

    // save config to eeprom
    saveSettings();

    // write the current config data model version to the eeprom
    EEPROM.update(EEPROM_ADDR_VERSION, EEPROM_VERSION);

    // blink LED while eeprom reset button is pressed
    while (digitalRead(EEPROM_RESET_PIN) == LOW) {
      blinkCode(BLINK_SHORT, BLINK_SHORT, BLINK_SHORT);
      delay(1000);
    }
  } else {
    // read config from eeprom
    loadSettings();
  }

  // init RadioHead
  rhInit();


  // calc adc and dht next read time, 5/10 seconds from now
  // dht read is 5 seconds before adc read to avoid both readings at the same time
  dhtNextReadTime = millis() + 5000;
  adcNextReadTime = millis() + 10000;

  // send RadioHead start message
  rhSend(RH_MSG_START, 1);
}
