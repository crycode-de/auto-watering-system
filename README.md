# Automatic Watering System

The *Automatic Watering System* uses capacitive sensors to measure the soil moisture.
If the soil is too dry it opens magnetic valves for watering the plants.

It also measures the air temperature and humidity and sends them via 433 MHz radio messages.

Using the 433 MHz radio messages you are able to control and configure the watering system. For this the [RadioHead](http://www.airspayce.com/mikem/arduino/RadioHead/) library is used.

A full description of the *Automatic Watering System* is available at https://crycode.de/diy-automatisches-bewaesserungssystem (in german only).


## Software

The software is based on [PlatformIO](https://platformio.org/).
PlatformIO takes care of all dependencies automatically and you don't need to install anything else by hand.

Alternatively you may use ArduinoIDE for flashing the microcontroller.
Then you have to install the following librarys by hand:
* [RadioHead v1.82](https://platformio.org/lib/show/124/RadioHead/installation)
* [DHTStable v0.2.4](https://platformio.org/lib/show/1337/DHTStable/installation)
* [PinChangeInterrupt v1.2.6](https://platformio.org/lib/show/725/PinChangeInterrupt/installation)

### Configuration using 433 MHz radio messages

To configure the *Automatic Watering System* you may use the control app included in this software package.
The control app is available in the `control` directory.
All needed information are there in the [readme](control/README.md).


## License

Licensed under GPL Version 2

Copyright (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de/)
