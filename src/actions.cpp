/*
 * Automatic Watering System
 *
 * (c) 2018-2021 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Functions to do some actions.
 */

#include "actions.h"

#include "rh.h"

/**
 * Blink the LED with a tripple blink code.
 * @param t1 Time 1 in ms.
 * @param t2 Time 2 in ms (optional).
 * @param t3 Time 3 in ms (optional).
 */
void blinkCode (uint16_t t1, uint16_t t2, uint16_t t3) {
  digitalWrite(LED_PIN, HIGH);
  delay(t1);
  digitalWrite(LED_PIN, LOW);
  if (t2 > 0) {
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(t2);
    digitalWrite(LED_PIN, LOW);
  }
  if (t3 > 0) {
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(t3);
    digitalWrite(LED_PIN, LOW);
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

  // send RadioHead message
  rhSendData(RH_MSG_CHANNEL_STATE);

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

  // send RadioHead message
  rhSendData(RH_MSG_CHANNEL_STATE);
}
