
# kasa-washing-machine-alert
A basic alerting script for when the washing machine has finished, based on a TP-Link Kasa smart plug.

## Introduction
This is a script for monitoring a Kasa energy monitor smart plug, detecting changes in power consumption, and waiting for a drop in consumption before sending a message to a Telegram chat.

### Purpose
We often to forget to empty the washing machine when it's finished, so this is a little tool to help prompt us

## Compatibility
This project uses the Node library "tplink-smarthome-api" to communicate with the device. Although not currently listed as a compatible device, I have successfully used this with a TP-Link Kasa KP115 socket (I suspect that a KP105 should work as well.)

# How it works
The script works by polling the device at a "long" interval (default: 45 minutes.) When it detects the power consumption is over a given threshold (default: 1 watt) it determines that the machine is "On" and is "Active" (i.e. washing clothes.) At this point, it sends a message to the Telegram chat, switches to a "quick" interval (default: 2 minutes) and continually requests power consumption at this interval. When the power consumption drops below 1 Watt, it determines that the machine has finished and therefore sends a completion message to the chat, and returns to the "long" interval.

# Configuration
There are number of configuration variables at the top of the script which need to be changed in order to make it work.

# Running
Once configured, running the application is as simple as running:
    node index.js
