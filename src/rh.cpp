/*
 * Automatic Watering System
 *
 * (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de)
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
          memcpy(&rhBufTx[18], &settings.checkInterval, 2);
          memcpy(&rhBufTx[20], &settings.dhtInterval, 2);

          rhSend(RH_MSG_SETTINGS, 22);
          break;

        case RH_MSG_SET_SETTINGS:
          // got new settings
          if (rhRxLen < 22) {
            return;
          }
          for (uint8_t chan = 0; chan < 4; chan++) {
            settings.channelEnabled[chan] = ((rhBufRx[1] & (1 << chan)) != 0);
            memcpy(&settings.adcTriggerValue[chan], &rhBufRx[2+chan*2], 2);
            memcpy(&settings.wateringTime[chan], &rhBufRx[10+chan*2], 2);
          }
          settings.sendAdcValuesThroughRH = ((rhBufRx[1] & (1 << 7)) != 0);
          memcpy(&settings.checkInterval, &rhBufRx[18], 2);
          memcpy(&settings.dhtInterval, &rhBufRx[20], 2);

          // calc new read times
          // dht read is 5 seconds before adc read to avoid both readings at the same time
          dhtNextReadTime = millis() - 5000 + ((uint32_t)settings.dhtInterval * 1000);
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

        case RH_MSG_TURN_CHANNEL_ON:
          // turn a channel on
          if (rhRxLen < 2 || rhBufRx[1] > 3) {
            return;
          }
          // set marker to turn the channel on
          channelTurnOn[rhBufRx[1]] = true;
          break;

        case RH_MSG_TURN_CHANNEL_OFF:
          // turn a channel on
          if (rhRxLen < 2 || rhBufRx[1] > 3) {
            return;
          }
          // set the turn off time for channel to now
          channelTurnOffTime[rhBufRx[1]] = millis();
          break;

        case RH_MSG_PAUSE:
          // enable pause
          pauseAutomatic = true;
          break;

        case RH_MSG_RESUME:
          // resume from pause
          pauseAutomatic = false;
          break;

        case RH_MSG_GET_VERSION:
          // send the software version
          rhBufTx[1] = SOFTWARE_VERSION_MAJOR;
          rhBufTx[2] = SOFTWARE_VERSION_MINOR;
          rhBufTx[3] = SOFTWARE_VERSION_PATCH;
          rhSend(RH_MSG_VERSION, 4);
          break;

        case RH_MSG_PING:
          // respond to a ping with the received data
          for (uint8_t i = 1; i < rhRxLen; i++) {
            rhBufTx[i] = rhBufRx[i];
          }
          rhSend(RH_MSG_PONG, rhRxLen);
          break;
      }
    }
  }
}

/**
 * Function to send a RadioHead message.
 * The data part of the message must be set in rhBufTx before calling this function.
 * @param  msgType Type-code of this message. Will be set in rhBufTx[0].
 * @param  len     Length of the data including the type byte.
 * @return         `true` if the message is successfully send.
 */
bool rhSend(uint8_t msgType, uint8_t len, uint8_t delayAfterSend) {
  rhBufTx[0] = msgType;
  if (!rhManager.sendtoWait(rhBufTx, len, RH_SERVER_ADDR)) {
    blinkCode(BLINK_CODE_RH_SEND_ERROR);
    return false;
  }
  if (delayAfterSend > 0) {
    delay(delayAfterSend);
  }
  return true;
}
