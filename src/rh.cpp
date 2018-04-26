/*
 * RadioHead stuff.
 */

#include "rh.h"

#include <RH_ASK.h>
#include <RHReliableDatagram.h>
#include "actions.h"

uint8_t rhBufTx[RH_BUF_TX_LEN];
uint8_t rhBufRx[RH_BUF_RX_LEN];

RH_ASK rhDriver(RH_SPEED, RH_RX_PIN, RH_TX_PIN);
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

      // TODO do something with this message
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
bool rhSend(uint8_t msgType, uint8_t len) {
  rhBufTx[0] = msgType;
  if (!rhManager.sendtoWait(rhBufTx, len, RH_SERVER_ADDR)) {
    blinkCode(BLINK_CODE_RH_SEND_ERROR);
    return false;
  }
  return true;
}
