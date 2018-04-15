#ifndef __PINS_H__

#define __PINS_H__

#include <Arduino.h>

#define VALVE_0_PIN        2
#define VALVE_1_PIN        3
#define VALVE_2_PIN        4
#define VALVE_3_PIN        5
#define VALVE_0_BUTTON_PIN 6
#define VALVE_1_BUTTON_PIN 7
#define VALVE_2_BUTTON_PIN 8
#define VALVE_3_BUTTON_PIN 9
#define SENSORS_ACTIVE_PIN 10
#define RH_TX_PIN          11
#define RH_RX_PIN          12
#define LED_PIN            13
#define DHT_PIN            14
#define EEPROM_RESET_PIN   15

#define SENSOR_0_ADC   A4
#define SENSOR_1_ADC   A5
#define SENSOR_2_ADC   A6
#define SENSOR_3_ADC   A7
#define BATTERY_ADC    A2
#define BRIGHTNESS_ADC A3

const uint8_t valvePins[4] = { VALVE_0_PIN, VALVE_1_PIN, VALVE_2_PIN, VALVE_3_PIN };
const uint8_t buttonPins[4] = { VALVE_0_BUTTON_PIN, VALVE_1_BUTTON_PIN, VALVE_2_BUTTON_PIN, VALVE_3_BUTTON_PIN };

const uint8_t sensorAdcPins[4] = { SENSOR_0_ADC, SENSOR_1_ADC, SENSOR_2_ADC, SENSOR_3_ADC };

#endif
