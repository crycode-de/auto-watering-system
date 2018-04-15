#ifndef __MAIN_H__

#define __MAIN_H__

#include <Arduino.h>
#include <EEPROM.h>
#include <SPI.h>
#include <dht22.h>

#include "pins.h"

// version of the eeporm data model; must be increased if the data model changes
#define EEPROM_VERSION 1

// eeprom addresses
#define EEPROM_ADDR_VERSION 0 // 1 byte
#define EEPROM_ADDR_CFG     1 // many bytes

// structure of the config stored in the eeprom and loaded at runtime
struct Config {
  uint8_t  channelEnabled[4];  // indecator if the channel is enabled or not
  uint16_t adcTriggerValue[4]; // minimum adc value which will trigger the watering
  uint16_t wateringTime[4];    // watering time in seconds
  uint16_t checkInterval;      // adc check interval in seconds
};

/**
 * Macro to check the time for time-based events.
 * If a is greater than or equal to b this returns true, otherwise false.
 * This resprects a possible rollover of a and b.
 */
#define checkTime(a, b) ((long)(a - b) >= 0)

bool turnValveOn (uint8_t chan);
void turnValveOff (uint8_t chan);
void setDefaultConfig();
void saveConfig();


// global variables
Config cfg;

volatile bool channelTurnOn[4]; // volatile to use this inside a ISR
volatile unsigned long channelTurnOffTime[4];
unsigned long adcNextReadTime;

bool channelOn[4];

#endif
