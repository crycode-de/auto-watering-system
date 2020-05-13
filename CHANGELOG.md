## v2.2.0 - 2020-05-13
- Added temperature-dependent switch to control a fan or heating

## v2.1.1 - 2020-04-23
- Fixed bug with *delay after send*

## v2.1.0 - 2020-04-22
- Polled data will always be send to the address of the polling node
- Made *server address*, *own address* and *delay after send* configurable at runtime

## v2.0.0 - 2020-04-13
- Added support for DS18B20, DS18S20, DS1820, DS1822 temperature sensors
- Added polling mode
- Changed some RadioHead messages
- Updated control app to support old and new version of the automatic watering system

## v1.0.3 - 2018-06-04
- Added fix for unplausible values read from the DHT sensor
- Added possibility to change host and port of the control app via env vars
- Only include dht.h if a DHT sensor is used

## v1.0.2 - 2018-05-30
- First public release
