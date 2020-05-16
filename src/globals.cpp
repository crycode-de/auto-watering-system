/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Global definition of some variables/constants.
 */

#include "globals.h"

// global variables
Settings settings;


volatile bool channelTurnOn[4]; // volatile to use this inside a ISR
volatile unsigned long channelTurnOffTime[4];
unsigned long adcNextReadTime;
unsigned long tempSensorNextReadTime;

volatile bool channelOn[4];
uint16_t adcValues[4] = {0, 0, 0, 0};
float temperature = -99;
float humidity = -99;

#if BAT_ENABLED == 1
  uint16_t batteryRaw;
#endif

bool tempSwitchOn = false;
float tempSwitchTriggerValueHigh = 32;
float tempSwitchTriggerValueLow = 28;

bool pauseAutomatic;

#if TEMP_SENSOR_TYPE == 11 || TEMP_SENSOR_TYPE == 12 || TEMP_SENSOR_TYPE == 22
  dht dhtSensor;
#elif TEMP_SENSOR_TYPE == 1820
  OneWire oneWire(TEMP_SENSOR_PIN);
  DallasTemperature ds1820(&oneWire);
#endif
