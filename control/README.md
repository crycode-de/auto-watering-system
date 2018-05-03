# Automatic Watering System Control App

This is a tiny [Node.js](https://nodejs.org/) application for controlling and configuring the *Automatic Watering System*.


## Requirements

You need to have:
* Node.js installed on your system.
* A serial-radio gateway attached to your system. This gateway an be an using an Arduino for example.


## Installation

Before you can start you need to install the required *node_modules* once by running the following command inside of the `control` directory.
```
npm install
```

## Usage

Start the app:
```
npm start
```

Then open your browser and navigate to http://127.0.0.1:3000/.

*Hint:* All communication is only on your localhost and through RadioHead. No data is send over the internet! :-)

On the Website you have to configure your connection first.

Once you are connected to the serial-radio gateway you can:
* Interact with the watering system
* See all the received information (adc and DHT values, battery status, turned on channels)
* Turn on or off a channel
* Read the current settings from the watering system
* Send new settings to the watering system
* See the software version of the watering system
* Send pings and receive pongs


## Known issues

* Sometimes a command cannot be send to the watering system, or the watering system sends not the expected answer. This happens if the controller for the watering system is busy while sending the command. Simply try again after some seconds! ;-)


## License

Licensed under GPL Version 2

Copyright (c) 2018 Peter Müller <peter@crycode.de> (https://crycode.de/)
