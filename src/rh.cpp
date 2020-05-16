/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * RadioHead stuff.
 */

#include "rh.h"

#include <RH_ASK.h>
#include <RHReliableDatagram.h>
#include "actions.h"
#include "settings.h"

uint8_t rhBufTx[RH_BUF_TX_LEN];
uint8_t rhBufRx[RH_BUF_RX_LEN];

RH_ASK rhDriver(RH_SPEED, RH_RX_PIN, RH_TX_PIN, RH_PTT_PIN);
RHReliableDatagram rhManager(rhDriver, RH_OWN_ADDR);

/**
 * Init RadioHead.
 * Must be called once at startup time.
 */
void rhInit () {
  if (!rhManager.init()) {
    // blink error if init failed
    while (true) {
      blinkCode(BLINK_CODE_RH_INIT_ERROR);
      delay(1000);
    }
  }
  rhManager.setRetries(RH_SEND_RETRIES);
  rhManager.setTimeout(RH_SEND_TIMEOUT);
  rhManager.setThisAddress(settings.ownAddress); // apply own address from settings
}

/**
 * Function to receive a RadioHead message if a new message is available.
 */
void rhRecv () {
  if (rhManager.available()) {
    uint8_t rhRxLen = RH_BUF_RX_LEN;
    uint8_t rhRxFrom;
    uint8_t rhRxTo;
    if (rhManager.recvfromAck(rhBufRx, &rhRxLen, &rhRxFrom, &rhRxTo)) {
      // blink to show that we received something
      blinkCode(BLINK_CODE_RH_RECV);

      // make sure the message is send to our own address and has at least one byte
      if (rhRxTo != RH_OWN_ADDR || rhRxLen < 1) {
        return;
      }

      switch (rhBufRx[0]) {
        case RH_MSG_GET_SETTINGS:
          // request to send the current settings
          rhBufTx[1] = 0;
          for (uint8_t chan = 0; chan < 4; chan++) {
            // bit 0..3 indecate the enabled channels
            if (settings.channelEnabled[chan]) {
              rhBufTx[1] |= (1 << chan);
            }
            memcpy(&rhBufTx[2+chan*2], &settings.adcTriggerValue[chan], 2);
            memcpy(&rhBufTx[10+chan*2], &settings.wateringTime[chan], 2);
          }
          // bit 7 indecate if sending the adc values is enabled
          if (settings.sendAdcValuesThroughRH) {
            rhBufTx[1] |= (1 << 7);
          }
          // bit 6 indecate if data push is enabled
          if (settings.pushDataEnabled) {
            rhBufTx[1] |= (1 << 6);
          }
          // bit 5 indecate if temperature switch is inverted
          if (settings.tempSwitchInverted) {
            rhBufTx[1] |= (1 << 5);
          }

          memcpy(&rhBufTx[18], &settings.checkInterval, 2);
          memcpy(&rhBufTx[20], &settings.tempSensorInterval, 2);
          rhBufTx[22] = settings.serverAddress;
          rhBufTx[23] = settings.ownAddress;
          memcpy(&rhBufTx[24], &settings.delayAfterSend, 2);
          rhBufTx[26] = settings.tempSwitchTriggerValue;
          rhBufTx[27] = settings.tempSwitchHystTenth;

          rhSend(RH_MSG_SETTINGS, 28, rhRxFrom);
          break;

        case RH_MSG_SET_SETTINGS:
          // got new settings
          if (rhRxLen < 28) {
            return;
          }
          for (uint8_t chan = 0; chan < 4; chan++) {
            settings.channelEnabled[chan] = ((rhBufRx[1] & (1 << chan)) != 0);
            memcpy(&settings.adcTriggerValue[chan], &rhBufRx[2+chan*2], 2);
            memcpy(&settings.wateringTime[chan], &rhBufRx[10+chan*2], 2);
          }
          settings.sendAdcValuesThroughRH = ((rhBufRx[1] & (1 << 7)) != 0);
          settings.pushDataEnabled = ((rhBufRx[1] & (1 << 6)) != 0);
          settings.tempSwitchInverted = ((rhBufRx[1] & (1 << 5)) != 0);
          memcpy(&settings.checkInterval, &rhBufRx[18], 2);
          memcpy(&settings.tempSensorInterval, &rhBufRx[20], 2);
          settings.serverAddress = rhBufRx[22];

          // apply changed own address
          if (settings.ownAddress != rhBufRx[23]) {
            settings.ownAddress = rhBufRx[23];
            rhManager.setThisAddress(settings.ownAddress);
          }

          memcpy(&settings.delayAfterSend, &rhBufRx[24], 2);

          settings.tempSwitchTriggerValue = rhBufRx[26];
          settings.tempSwitchHystTenth = rhBufRx[27];

          // calc temperature switch high/low trigger values
          calcTempSwitchTriggerValues();

          // calc new read times
          // temperature sensor read is 5 seconds before adc read to avoid both readings at the same time
          tempSensorNextReadTime = millis() - 5000 + ((uint32_t)settings.tempSensorInterval * 1000);
          adcNextReadTime = millis() + ((uint32_t)settings.checkInterval * 1000);
          break;

        case RH_MSG_SAVE_SETTINGS:
          // save the current settings into the eeprom
          saveSettings();
          break;

        case RH_MSG_CHECK_NOW:
          // set the next adc read time to now plus two seconds to start a check
          adcNextReadTime = millis() + 2000;
          break;

        case RH_MSG_TURN_CHANNEL_ON_OFF:
          if (rhRxLen < 5) return;

          for (uint8_t chan = 0; chan < 4; chan++) {
            if (!settings.channelEnabled[chan]) continue;

            if (rhBufRx[chan + 1] == 0x01 && !channelOn[chan]) {
              // set marker to turn the channel on
              channelTurnOn[chan] = true;
            } else if (rhBufRx[chan + 1] == 0x00 && channelOn[chan]) {
              // set the turn off time for channel to now
              channelTurnOffTime[chan] = millis();
            }
          }
          break;

        case RH_MSG_TURN_TEMP_SWITCH_ON_OFF:
          // temperature switch on/off
          if (rhRxLen < 2) {
            return;
          }
          if (rhBufRx[1] == 0x01) {
            digitalWrite(TEMP_SWITCH_PIN, HIGH);
            tempSwitchOn = true;
          } else {
            digitalWrite(TEMP_SWITCH_PIN, LOW);
            tempSwitchOn = false;
          }
          rhSendData(RH_MSG_TEMP_SENSOR_DATA, RH_FORCE_SEND, rhRxFrom);
          break;

        case RH_MSG_PAUSE:
          // enable pause
          pauseAutomatic = true;
          break;

        case RH_MSG_RESUME:
          // resume from pause
          pauseAutomatic = false;
          break;

        case RH_MSG_PAUSE_ON_OFF:
          // pause on/off
          if (rhRxLen < 2) {
            return;
          }
          if (rhBufRx[1] == 0x01) {
            // enable pause
            pauseAutomatic = true;
          } else {
            // resume from pause
            pauseAutomatic = false;
          }
          break;

        case RH_MSG_POLL_DATA:
          // poll data
          if (rhRxLen >= 2) {
            // poll with data
            switch (rhBufRx[1]) {
              case RH_MSG_BATTERY:
                #if BAT_ENABLED == 1
                  rhSendData(RH_MSG_BATTERY, RH_FORCE_SEND, rhRxFrom);
                #endif
                break;
              case RH_MSG_CHANNEL_STATE:
                rhSendData(RH_MSG_CHANNEL_STATE, RH_FORCE_SEND, rhRxFrom);
                break;
              case RH_MSG_TEMP_SENSOR_DATA:
                rhSendData(RH_MSG_TEMP_SENSOR_DATA, RH_FORCE_SEND, rhRxFrom);
                break;
              case RH_MSG_SENSOR_VALUES:
                rhSendData(RH_MSG_SENSOR_VALUES, RH_FORCE_SEND, rhRxFrom);
                break;
              default:
                // no known poll request... send all
                #if BAT_ENABLED == 1
                  rhSendData(RH_MSG_BATTERY, RH_FORCE_SEND, rhRxFrom);
                #endif
                rhSendData(RH_MSG_CHANNEL_STATE, RH_FORCE_SEND, rhRxFrom);
                rhSendData(RH_MSG_TEMP_SENSOR_DATA, RH_FORCE_SEND, rhRxFrom);
                rhSendData(RH_MSG_SENSOR_VALUES, RH_FORCE_SEND, rhRxFrom);
            }
          } else {
            // poll without data... send all
            #if BAT_ENABLED == 1
              rhSendData(RH_MSG_BATTERY, RH_FORCE_SEND, rhRxFrom);
            #endif
            rhSendData(RH_MSG_CHANNEL_STATE, RH_FORCE_SEND, rhRxFrom);
            rhSendData(RH_MSG_TEMP_SENSOR_DATA, RH_FORCE_SEND, rhRxFrom);
            rhSendData(RH_MSG_SENSOR_VALUES, RH_FORCE_SEND, rhRxFrom);
          }
          break;

        case RH_MSG_GET_VERSION:
          // send the software version
          rhSendData(RH_MSG_VERSION, RH_FORCE_SEND, rhRxFrom);
          break;

        case RH_MSG_PING:
          // respond to a ping with the received data
          for (uint8_t i = 1; i < rhRxLen; i++) {
            rhBufTx[i] = rhBufRx[i];
          }
          rhSend(RH_MSG_PONG, rhRxLen, rhRxFrom); // use rhSend directly to allow variable data length
          break;
      }
    }
  }
}

/**
 * Function to send a RadioHead message.
 * The data part of the message must be set in rhBufTx before calling this function.
 * @param  msgType   Type-code of this message. Will be set in rhBufTx[0].
 * @param  len       Length of the data including the type byte.
 * @param  sendTo    Target address to send the message to. Defaults to the configured server address.
 * @return           `true` if the message is successfully send.
 */
bool rhSend(uint8_t msgType, uint8_t len, uint8_t sendTo, uint16_t delayAfterSend) {
  rhBufTx[0] = msgType;
  if (!rhManager.sendtoWait(rhBufTx, len, sendTo)) {
    blinkCode(BLINK_CODE_RH_SEND_ERROR);
    return false;
  }
  if (delayAfterSend > 0) {
    delay(delayAfterSend);
  }
  return true;
}

/**
 * Function to send a RadioHead message with the specified data.
 * The data part and the length of the message will be automatically set by global variables.
 * @param  msgType   Type-code of this message. Will be set in rhBufTx[0].
 * @param  forceSend Send the message event if push data is disabled. (default false)
 * @param  sendTo    Target address to send the message to. Defaults to the configured server address.
 * @return           `true` if the message is successfully send.
 */
bool rhSendData(uint8_t msgType, bool forceSend, uint8_t sendTo, uint16_t delayAfterSend) {
  if (!forceSend && !settings.pushDataEnabled) {
    // to nothing if push data is not enabled and we should not force sending data
    return true;
  }

  uint8_t len = 1;
  switch (msgType) {
    case RH_MSG_START:
      // nothing to do
      break;

    case RH_MSG_CHANNEL_STATE:
      rhBufTx[1] = channelOn[0] ? 0x01 : 0x00;
      rhBufTx[2] = channelOn[1] ? 0x01 : 0x00;
      rhBufTx[3] = channelOn[2] ? 0x01 : 0x00;
      rhBufTx[4] = channelOn[3] ? 0x01 : 0x00;
      len = 5;
      break;

    case RH_MSG_TEMP_SENSOR_DATA:
      #if TEMP_SENSOR_TYPE == 11 || TEMP_SENSOR_TYPE == 12 || TEMP_SENSOR_TYPE == 22
        memcpy(&rhBufTx[1], &temperature, 4);
        memcpy(&rhBufTx[5], &humidity, 4);
        rhBufTx[9] = (tempSwitchOn) ? 0x01 : 0x00;
        len = 10;
      #elif TEMP_SENSOR_TYPE == 1820
        memcpy(&rhBufTx[1], &temperature, 4);
        rhBufTx[5] = (tempSwitchOn) ? 0x01 : 0x00;
        len = 6;
      #else
        // nothing to do if no sensor is enabled
        return true;
      #endif
      break;

    case RH_MSG_SENSOR_VALUES:
      if (!settings.sendAdcValuesThroughRH) {
        // nothing to do if sending adc values is not enabled
        return true;
      }

      for (uint8_t chan = 0; chan < 4; chan++) {
        if (settings.channelEnabled[chan]) {
          memcpy(&rhBufTx[1+chan*2], &adcValues[chan], 2);
        } else {
          // if channel is disabled but sending adc values is enabled set the value in buffer to 0x0000
          rhBufTx[1+chan*2] = 0x00;
          rhBufTx[2+chan*2] = 0x00;
        }
      }
      len = 9;
      break;

    case RH_MSG_BATTERY:
      #if BAT_ENABLED == 1
        // calc battery percent value
        if (batteryRaw <= BAT_ADC_LOW) {
          rhBufTx[1] = 0;
        } else if (batteryRaw >= BAT_ADC_FULL) {
          rhBufTx[1] = 100;
        } else {
          rhBufTx[1] = 100 * (batteryRaw - BAT_ADC_LOW) / (BAT_ADC_FULL - BAT_ADC_LOW);
        }

        // store battery raw value into buffer
        memcpy(&rhBufTx[2], &batteryRaw, 2);
        len = 4;
      #else
        // battey not enabled
        return true;
      #endif
      break;

    case RH_MSG_VERSION:
        // send the software version
        rhBufTx[1] = SOFTWARE_VERSION_MAJOR;
        rhBufTx[2] = SOFTWARE_VERSION_MINOR;
        rhBufTx[3] = SOFTWARE_VERSION_PATCH;
        len = 4;
        break;
  }

  // send the data
  return rhSend(msgType, len, sendTo, delayAfterSend);
}
