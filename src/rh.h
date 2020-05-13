/*
 * Automatic Watering System
 *
 * (c) 2018-2020 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
#ifndef __RH_H__
#define __RH_H__

#include "globals.h"

#define RH_MSG_START            0x00
#define RH_MSG_BATTERY          0x02
#define RH_MSG_SENSOR_VALUES    0x10
#define RH_MSG_TEMP_SENSOR_DATA 0x20
//#define RH_MSG_CHANNEL_ON     0x21 // < v2.0.0
//#define RH_MSG_CHANNEL_OFF    0x22 // < v2.0.0
#define RH_MSG_CHANNEL_STATE    0x25

#define RH_MSG_SETTINGS         0x50
#define RH_MSG_GET_SETTINGS     0x51
#define RH_MSG_SET_SETTINGS     0x52
#define RH_MSG_SAVE_SETTINGS    0x53

#define RH_MSG_CHECK_NOW        0x60
//#define RH_MSG_TURN_CHANNEL_ON  0x61 // < v2.0.0
//#define RH_MSG_TURN_CHANNEL_OFF 0x62 // < v2.0.0
#define RH_MSG_PAUSE            0x63
#define RH_MSG_RESUME           0x64
#define RH_MSG_TURN_CHANNEL_ON_OFF 0x65
#define RH_MSG_POLL_DATA        0x66
#define RH_MSG_PAUSE_ON_OFF     0x67
#define RH_MSG_TURN_TEMP_SWITCH_ON_OFF 0x68

#define RH_MSG_GET_VERSION      0xF0
#define RH_MSG_VERSION          0xF1
#define RH_MSG_PING             0xF2
#define RH_MSG_PONG             0xF3

// buffer for RadioHead messages
// rhBuf?x[0] - message type
#define RH_BUF_TX_LEN 28
#define RH_BUF_RX_LEN 28
extern uint8_t rhBufTx[RH_BUF_TX_LEN];
extern uint8_t rhBufRx[RH_BUF_RX_LEN];

// reduce the RadioHead max message length to save memory
#define RH_ASK_MAX_MESSAGE_LEN RH_BUF_LEN

#define RH_FORCE_SEND true
#define RH_SEND_ONLY_WHEN_PUSH_ENABLED false

void rhInit ();
void rhRecv ();
bool rhSend(uint8_t msgType, uint8_t len, uint8_t sendTo = settings.serverAddress, uint16_t delayAfterSend = settings.delayAfterSend);
bool rhSendData(uint8_t msgType, bool forceSend = RH_SEND_ONLY_WHEN_PUSH_ENABLED, uint8_t sendTo = settings.serverAddress, uint16_t delayAfterSend = settings.delayAfterSend);

#endif
