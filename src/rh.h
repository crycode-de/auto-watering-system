#ifndef __RH_H__
#define __RH_H__

#include "globals.h"

#define RH_MSG_START         0x00
#define RH_MSG_BATTERY       0x02
#define RH_MSG_SENSOR_VALUES 0x10
#define RH_MSG_DHTDATA       0x20
#define RH_MSG_CHANNEL_ON    0x21
#define RH_MSG_CHANNEL_OFF   0x22

// buffer for RadioHead messages
// rhBufTx[0] - control byte
#define RH_BUF_TX_LEN 10 // TODO change to max need length
#define RH_BUF_RX_LEN 10 // TODO change to max need length
extern uint8_t rhBufTx[RH_BUF_TX_LEN];
extern uint8_t rhBufRx[RH_BUF_RX_LEN];

// reduce the RadioHead max message length to save memory
#define RH_ASK_MAX_MESSAGE_LEN RH_BUF_LEN

void rhInit ();
void rhRecv ();
bool rhSend(uint8_t msgType, uint8_t len);

#endif
