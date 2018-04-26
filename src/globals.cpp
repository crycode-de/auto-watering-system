/*
 * Global definition of some variables/constants.
 */

#include "globals.h"

// global variables
Settings settings;

volatile bool channelTurnOn[4]; // volatile to use this inside a ISR
volatile unsigned long channelTurnOffTime[4];
unsigned long adcNextReadTime;
unsigned long dhtNextReadTime;

volatile bool channelOn[4];

dht dhtSensor;
