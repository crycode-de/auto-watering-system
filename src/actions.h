#ifndef __MAIN_H__
#define __MAIN_H__

#include "globals.h"

#define BLINK_LONG  500
#define BLINK_SHORT 100
#define BLINK_VERRY_SHORT 50

#define BLINK_CODE_RH_INIT_ERROR BLINK_LONG, BLINK_SHORT, BLINK_SHORT
#define BLINK_CODE_RH_SEND_ERROR BLINK_LONG, BLINK_SHORT, BLINK_LONG
#define BLINK_CODE_DHT_ERROR     BLINK_LONG, BLINK_LONG,  BLINK_SHORT

#define BLINK_CODE_RH_RECV BLINK_VERRY_SHORT, BLINK_VERRY_SHORT

void blinkCode (uint16_t t1, uint16_t t2 = 0, uint16_t t3 = 0);
bool turnValveOn (uint8_t chan);
void turnValveOff (uint8_t chan);

#endif
