/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * The Arduino loop function which is called in a infinite loop.
 */

#include "loop.h"

#include "actions.h"
#include "settings.h"
#include "rh.h"

bool adcOn = false;

void loop () {
  unsigned long now = millis();

  // temperature sensor code only if TEMP_SENSOR_TYPE is not 0
  #if TEMP_SENSOR_TYPE != 0
    // check if we need to read from the temperature sensor
    if (checkTime(now, tempSensorNextReadTime)) {
      // read from the sensor using the correct method for the sensor type

      bool sensorReadOk = false;

      #if TEMP_SENSOR_TYPE == 11 || TEMP_SENSOR_TYPE == 12 || TEMP_SENSOR_TYPE == 22
        // DHT sensor
        #if TEMP_SENSOR_TYPE == 11
          int dhtResult = dhtSensor.read11(TEMP_SENSOR_PIN);
        #elif TEMP_SENSOR_TYPE == 12
          int dhtResult = dhtSensor.read12(TEMP_SENSOR_PIN);
        #elif TEMP_SENSOR_TYPE == 22
          int dhtResult = dhtSensor.read22(TEMP_SENSOR_PIN);
        #endif

        // check the result and also if the values are plausible
        if (dhtResult == DHTLIB_OK
          && dhtSensor.humidity >= 0 && dhtSensor.humidity <= 100
          && dhtSensor.temperature >= -50 && dhtSensor.temperature <= 100) {
          // sensor read ok
          temperature = dhtSensor.temperature;
          humidity = dhtSensor.humidity;
          // send RadioHead message
          memcpy(&rhBufTx[1], &temperature, 4);
          memcpy(&rhBufTx[5], &humidity, 4);
          sensorReadOk = true;
        } else {
          temperature = -99;
          humidity = -99;
        }

      #elif TEMP_SENSOR_TYPE == 1820
        // DS18x20 sensor
        ds1820.requestTemperatures();
        temperature = ds1820.getTempCByIndex(0);

        if (temperature != DEVICE_DISCONNECTED_C) {
          memcpy(&rhBufTx[1], &temperature, 4);
          rhBufTx[5] = 0x00;
          rhBufTx[6] = 0x00;
          rhBufTx[7] = 0x00;
          rhBufTx[8] = 0x00;
          sensorReadOk = true;
        } else {
          temperature = -99;
        }

      #else
        #error TEMP_SENSOR_TYPE must be 11, 12, 22, 1820 or 0!
      #endif

      if (sensorReadOk) {
        rhSendData(RH_MSG_TEMP_SENSOR_DATA);
      } else {
        // sensor read error
        blinkCode(BLINK_CODE_TEMP_SENSOR_ERROR);
      }

      // calc next dht read time
      tempSensorNextReadTime = now + ((uint32_t)settings.tempSensorInterval * 1000);
    }
  #endif

  // check if we need to turn on the adc and sensors 1 second before reading the adc values
  // this is to give the sensors and the adc some time to reach a stable level
  if (adcOn == false && checkTime(now, (adcNextReadTime - 1000))) {
      // enable the adc
      ADCSRA |= (1<<ADEN);

      // enable the sensors
      digitalWrite(SENSORS_ACTIVE_PIN, HIGH);

      // set marker that the adc is on
      adcOn = true;
  }

  // check if we need to read the adc values
  if (checkTime(now, adcNextReadTime)) {
    // only read sensors if not pause
    if (!pauseAutomatic) {
      // read adc values and check if we need to turn on some channels
      for (uint8_t chan = 0; chan < 4; chan++) {
        if (settings.channelEnabled[chan]) {
          // read the adc value of the channel
          adcValues[chan] = analogRead(sensorAdcPins[chan]);
          // check trigger value
          if (adcValues[chan] >= settings.adcTriggerValue[chan]) {
            // set marker to turn the channel on
            channelTurnOn[chan] = true;
          }
        }
      }
      // send RadioHead message (send adc check is done later...)
      rhSendData(RH_MSG_SENSOR_VALUES);
    }

    // disable the sensors
    digitalWrite(SENSORS_ACTIVE_PIN, LOW);

    // read battery voltage
    batteryRaw = analogRead(BATTERY_ADC);
    rhSendData(RH_MSG_BATTERY);

    // disable the adc
    ADCSRA &= ~(1<<ADEN);

    // set marker that the adc is off
    adcOn = false;

    // calc next adc read time
    adcNextReadTime = now + ((uint32_t)settings.checkInterval * 1000);
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
          channelTurnOffTime[chan] = now + ((uint32_t)settings.wateringTime[chan] * 1000);
          // reset the turn on indecator
          channelTurnOn[chan] = false;
        }
      }
    }
  }

  // receive RadioHead messages
  rhRecv();
}
