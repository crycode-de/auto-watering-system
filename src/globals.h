/*
 * Automatic Watering System
 *
 * (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
#ifndef __GLOBALS_H__
#define __GLOBALS_H__

#include <Arduino.h>
#include <SPI.h>
#include <dht.h>
#include <PinChangeInterrupt.h>

#include "config.h"

// version number of the software
#define SOFTWARE_VERSION_MAJOR 1
#define SOFTWARE_VERSION_MINOR 0
#define SOFTWARE_VERSION_PATCH 1

// version of the eeporm data model; must be increased if the data model changes
#define EEPROM_VERSION 1

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
  uint16_t dhtInterval;        // dht sensor read interval in seconds
  bool sendAdcValuesThroughRH; // send all adc values through RadioHead or not
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
extern unsigned long dhtNextReadTime;

extern volatile bool channelOn[4];

extern bool pauseAutomatic;

extern dht dhtSensor;

#endif
