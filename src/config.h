/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Config containing all options which can be changed before compile.
 */

#ifndef __CONFIG_H__
#define __CONFIG_H__

#include <Arduino.h>

/*
 * Digital pins
 */
#define VALVE_0_PIN        2
#define VALVE_1_PIN        3
#define VALVE_2_PIN        4
#define VALVE_3_PIN        5
#define VALVE_0_BUTTON_PIN 6
#define VALVE_1_BUTTON_PIN 7
#define VALVE_2_BUTTON_PIN 8
#define VALVE_3_BUTTON_PIN 9
#define SENSORS_ACTIVE_PIN 10
#define LED_PIN            13
#define TEMP_SENSOR_PIN    14
#define EEPROM_RESET_PIN   15
#define TEMP_SWITCH_PIN    17

#define RH_TX_PIN          11
#define RH_RX_PIN          12
#define RH_PTT_PIN         EEPROM_RESET_PIN // unused but needed ... set to EEPROM_RESET_PIN because this is only used at early startup -> no conflicts :-)

/*
 * Analog pins
 */
#define SENSOR_0_ADC   A4
#define SENSOR_1_ADC   A5
#define SENSOR_2_ADC   A6
#define SENSOR_3_ADC   A7
#define BATTERY_ADC    A2

/*
 * Temperature (and humidity) sensor
 */
// Type of the used Sensor
//  11 for DHT11
//  12 for DHT12
//  22 for DHT22
//  1820 for DS18B20, DS18S20, DS1820, DS1822
//  0 for no Sensor
#define TEMP_SENSOR_TYPE 1820

// resolution for the DS18x20 temperature sendor, if used
// higher resolutions leads to longer conversion time
// 9 to 12
#define DS1820_RESOLUTION 11

/*
 * RadioHead
 */
// The default own RadioHead address. Can be overwritten by settings.
#define RH_OWN_ADDR 0xDC // 220

// The default server RadioHead address. Can be overwritten by settings.
#define RH_SERVER_ADDR 0x01


// RadioHead bitrate in bit/s
#define RH_SPEED 2000

// Number of retries to send a message. If set to 0, each message will only ever be sent once.
#define RH_SEND_RETRIES 3

// Timeout for an ack.
#define RH_SEND_TIMEOUT 200

/*
 * Battery
 */
// Enable battery readings (1 enabled, 0 disabled)
#define BAT_ENABLED 1

// Battery adc values
#define BAT_ADC_LOW  593 // 2.9V # 1023 * 2.9V / 5V
#define BAT_ADC_FULL 859 // 4.2V # 1023 * 4.2V / 5V

#endif
