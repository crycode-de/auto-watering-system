/*
 * Automatic Watering System
 *
 * (c) 2018-2021 Peter Müller <peter@crycode.de> (https://crycode.de)
 */
#ifndef __SETTINGS_H__
#define __SETTINGS_H__

#include "globals.h"

void loadDefaultSettings ();
void loadSettings ();
void saveSettings ();
void calcTempSwitchTriggerValues();

#endif
