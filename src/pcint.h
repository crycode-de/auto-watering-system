/*
 * Automatic Watering System
 *
 * (c) 2018-2021 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
#ifndef __PCINT_H__
#define __PCINT_H__

#include "globals.h"

void handlePcintButton (uint8_t chan);
void handlePcintButton0 (void);
void handlePcintButton1 (void);
void handlePcintButton2 (void);
void handlePcintButton3 (void);

#endif
