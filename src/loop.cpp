/*
 * The Arduino loop function which is called in a infinite loop.
 */

#include "loop.h"

#include "actions.h"
#include "settings.h"
#include "rh.h"

void loop () {
  unsigned long now = millis();

  // check if we need to read from the dht sensor
  if (checkTime(now, dhtNextReadTime)) {
    // read from the sensor using the correct method for the sensor type
    #if DHT_TYPE == 11
      int dhtResult = dhtSensor.read11(DHT_PIN);
    #elif DHT_TYPE == 12
      int dhtResult = dhtSensor.read12(DHT_PIN);
    #elif DHT_TYPE == 22
      int dhtResult = dhtSensor.read22(DHT_PIN);
    #else
      #error DHT_TYPE must be 11, 12 or 22!
    #endif

    // check the result
    if (dhtResult == DHTLIB_OK) {
      // sensor read ok
      // send RadioHead message
      memcpy(&rhBufTx[1], &dhtSensor.temperature, 4);
      memcpy(&rhBufTx[5], &dhtSensor.humidity, 4);
      rhSend(RH_MSG_DHTDATA, 9);

    } else {
      // sensor read error
      blinkCode(BLINK_CODE_DHT_ERROR);
    }

    // calc next dht read time
    dhtNextReadTime = now + (settings.dhtInterval * 1000);
  }

  // check if we need to read the adc values
  if (checkTime(now, adcNextReadTime)) {
    // enable the adc
    ADCSRA |= (1<<ADEN);

    // read adc values and check if we need to turn on some channels
    for (uint8_t chan = 0; chan < 4; chan++) {
      if (settings.channelEnabled[chan]) {
        // read the adc value of the channel
        uint16_t adcVal = analogRead(sensorAdcPins[chan]);
        // check trigger value
        if (adcVal >= settings.adcTriggerValue[chan]) {
          // set marker to turn the channel on
          channelTurnOn[chan] = true;
        }
        // save for RadioHead
        if (settings.sendAdcValuesThroughRH) {
          memcpy(&rhBufTx[1+chan*2], &adcVal, 2);
        }
      } else if (settings.sendAdcValuesThroughRH) {
        // if channel is disabled but sending adc values is enabled set the value in buffer to 0x0000
        rhBufTx[1+chan*2] = 0x00;
        rhBufTx[2+chan*2] = 0x00;
      }
    }
    // send adc sensor values through RadioHead
    if (settings.sendAdcValuesThroughRH) {
      // send RadioHead message
      rhSend(RH_MSG_SENSOR_VALUES, 9);
    }

    // read battery voltage
    uint16_t batRaw = analogRead(BATTERY_ADC);
    uint8_t batPercent = 100 * (batRaw - BAT_ADC_LOW) / (BAT_ADC_FULL - BAT_ADC_LOW);

    // send RadioHead message
    rhBufTx[1] = batPercent;
    memcpy(&rhBufTx[2], &batRaw, 2);
    rhSend(RH_MSG_BATTERY, 4);

    // disable the adc
    ADCSRA &= ~(1<<ADEN);

    // calc next adc read time
    adcNextReadTime = now + (settings.checkInterval * 1000);
  }

  for (uint8_t chan = 0; chan < 4; chan++) {
    if (settings.channelEnabled[chan]) {
      // check turn off
      if (channelOn[chan] == true && checkTime(now, channelTurnOffTime[chan])) {
        turnValveOff(chan);
      }
      // check turn on
      else if (channelOn[chan] == false && channelTurnOn[chan] == true) {
        if (turnValveOn(chan)) {
          // calc the turn off time
          channelTurnOffTime[chan] = now + (settings.wateringTime[chan] * 1000);
          // reset the turn on indecator
          channelTurnOn[chan] = false;
        }
      }
    }
  }

  // receive RadioHead messages
  rhRecv();
}
