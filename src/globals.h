/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
#ifndef __GLOBALS_H__
#define __GLOBALS_H__

#include "config.h"

#include <Arduino.h>
#include <SPI.h>
#if TEMP_SENSOR_TYPE == 11 || TEMP_SENSOR_TYPE == 12 || TEMP_SENSOR_TYPE == 22
  #include <dht.h>
#elif TEMP_SENSOR_TYPE == 1820
  #include <OneWire.h>
  #include <DallasTemperature.h>
#endif
#include <PinChangeInterrupt.h>

// version number of the software
#define SOFTWARE_VERSION_MAJOR 2
#define SOFTWARE_VERSION_MINOR 1
#define SOFTWARE_VERSION_PATCH 0

// version of the eeporm data model; must be increased if the data model changes
#define EEPROM_VERSION 4

// eeprom addresses
#define EEPROM_ADDR_VERSION  0 // 1 byte
#define EEPROM_ADDR_SETTINGS 1 // many bytes

// array for dynamic access to defined pins
const uint8_t valvePins[4] = { VALVE_0_PIN, VALVE_1_PIN, VALVE_2_PIN, VALVE_3_PIN };
const uint8_t buttonPins[4] = { VALVE_0_BUTTON_PIN, VALVE_1_BUTTON_PIN, VALVE_2_BUTTON_PIN, VALVE_3_BUTTON_PIN };
const uint8_t sensorAdcPins[4] = { SENSOR_0_ADC, SENSOR_1_ADC, SENSOR_2_ADC, SENSOR_3_ADC };


// structure of the settings stored in the eeprom and loaded at runtime
struct Settings {
  bool channelEnabled[4];      // indecator if the channel is enabled or not
  uint16_t adcTriggerValue[4]; // minimum adc value which will trigger the watering
  uint16_t wateringTime[4];    // watering time in seconds
  uint16_t checkInterval;      // adc check interval in seconds
  uint16_t tempSensorInterval; // temperature sensor read interval in seconds
  bool sendAdcValuesThroughRH; // send all adc values through RadioHead or not
  bool pushDataEnabled;        // if data will be actively pushed by the system over RadioHead
  uint8_t serverAddress;       // the address of the server in the RadioHead network
  uint8_t ownAddress;          // the address of this node in the RadioHead network
  uint16_t delayAfterSend;     // time in milliseconds to delay after each data send
};

/**
 * Macro to check the time for time-based events.
 * If a is greater than or equal to b this returns true, otherwise false.
 * This resprects a possible rollover of a and b.
 */
#define checkTime(a, b) ((long)(a - b) >= 0)

// global variables
extern Settings settings;


extern volatile bool channelTurnOn[4]; // volatile to use this inside a ISR
extern volatile unsigned long channelTurnOffTime[4];
extern unsigned long adcNextReadTime;
extern unsigned long tempSensorNextReadTime;

extern volatile bool channelOn[4];
extern uint16_t adcValues[4];
extern float temperature;
extern float humidity;
extern uint16_t batteryRaw;

extern bool pauseAutomatic;

#if TEMP_SENSOR_TYPE == 11 || TEMP_SENSOR_TYPE == 12 || TEMP_SENSOR_TYPE == 22
  extern dht dhtSensor;
#elif TEMP_SENSOR_TYPE == 1820
  extern DallasTemperature ds1820;
#endif

#endif
