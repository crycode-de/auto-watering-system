/*
 * Automatic Watering System
 *
 * (c) 2018-2021 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Handler functions for PCINTs triggered by pressed buttons.
 */

#include "pcint.h"

void handlePcintButton0 (void) {
  handlePcintButton(0);
}

void handlePcintButton1 (void) {
  handlePcintButton(1);
}

void handlePcintButton2 (void) {
  handlePcintButton(2);
}

void handlePcintButton3 (void) {
  handlePcintButton(3);
}

void handlePcintButton (uint8_t chan) {
  // check if the channel is on or off
  if (channelOn[chan]) {
    // turn off on next loop
    channelTurnOffTime[chan] = millis();
  } else {
    // turn on on next loop
    channelTurnOn[chan] = true;
  }
}
