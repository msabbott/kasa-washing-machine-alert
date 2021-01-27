
# TP-Link Kasa Washing Machine Alert

A basic alerting script for when the washing machine has finished, based on a TP-Link Kasa smart plug.

## Introduction

This is a script for monitoring a TP-Link Kasa energy monitor smart plug, detecting changes in power consumption, and waiting for a drop in consumption before sending a message to a Telegram chat.

### Purpose

We often to forget to empty the washing machine when it's finished, so this is a little tool to help prompt us

## Compatibility

This project uses the Node library "[tplink-smarthome-api](https://github.com/plasticrake/tplink-smarthome-api)" to communicate with the device. Although not currently listed as a compatible device, I have successfully used this with a TP-Link Kasa KP115 socket (I suspect that a KP105 should work as well.)

# How it works

The script works by polling each device at a "long" interval (default: 45 minutes.) When it detects the power consumption is over a given threshold (default: 1 watt) it determines that the machine is "On" and is "Active" (i.e. washing clothes.) At this point, it sends a message to the Telegram chat, switches to a "quick" interval (default: 2 minutes) and continually requests power consumption at this interval. When the power consumption drops below 1 Watt, it determines that the machine has finished and therefore sends a completion message to the chat, and returns to the "long" interval.

# Installation

Once downloaded, before the script can be executed, a configuration file, called "config.json", needs to be created. The file schema is described in the "Configuration" section of this document, and a template file is provided which can be copied and updated.

## Initial configuration discovery

Before the script can be used, you need to understand the power consumption of the appliance that is plugged into the smart plug. This may require you to measure the data whilst the appliance is running.

Using the Kasa app, measure the power consumption (in Watts) whilst the appliance is in the following states (Note that the smart plug should be turned On during all of these states)

1. When the appliance is turned off - This value is likely to be 0W.
2. When the appliance is turned on, but not active (i.e. Not washing clothes) - This value becomes the "power_on_threshold" for the device configuration.
3. When the appliance is turned on and active (i.e. Washing clothes) - This value may change over time during the appliance's cycle. Take the minimum observed value and round it downwards. This value becomes the "active_threshold" for the device configuration.

# Configuration

Configuration of the script is configured through a JSON file "config.json" - it should be located in the same directory as the index.js file.

A template configuration file, config.template.json is available as an example and can be copied and changed. The schema of the file is shown below:

    {
        "telegram": {
            "chat_id": -1,
            "access_token": "XXX:YYY"
        },
        "devices": [
            {
                "name": "Washing Machine",
                "ipaddress": "<ip address goes here>",
                "power_on_threshold": 0.25,
                "active_threshold": 1,
                "quick_polling_interval": 120000,
                "long_polling_interval": 2700000
            },
            {
                "name": "Dishwasher",
                "ipaddress": "<ip address goes here>",
                "power_on_threshold": 0.25,
                "active_threshold": 1,
                "quick_polling_interval": 120000,
                "long_polling_interval": 1800000
            }
        ],
        "messages": {
            "monitoring_started": "Starting up the monitoring",
            "device_active": "Detected the ${device_name} is turned on",
            "device_finished": "The ${device_name} has finished"
        }
    }

The schema of the sections is defined below.

## Telegram Chat configuration

Configuration for Telegram is contained solely within the "telegram" object. Only one of these should be present in the configuration object. The required object members are defined below

|Member                   |Type  |Description
|-------------------------|------|-----------
|chat_id                  |Number|ID of the Telegram chat where messages will be sent. N.B. *not* the username to send the chat to. Visit this page to determine the chat ID: <https://sean-bradley.medium.com/get-telegram-chat-id-80b575520659>
|telegram_bot_access_token|String|Telegram Bot ID. ID is generated when new bot is created on the Telegram platform.

## Device configuration

The array 'devices' holds a configuration object per device to be monitored. Each item in the array has the following configuration settings

|Member                |Type  |Units       |Description
|----------------------|------|------------|-----------
|name                  |String|N/A         |Preferred name for the appliance being monitored for use in messages
|ipaddress             |String|N/A         |IP address or hostname of the smart plug device
|power_on_threshold    |Number|Watts       |Threshold value above which the device is considered to be on, but not in an 'active' state
|power_active_threshold|Number|Watts       |Threshold value above which the device is considered to be in an 'active' state - e.g. washing clothes
|quick_polling_interval|Number|Milliseconds|When the device is detected as running, the status of the smart plug is polled at this interval
|long_polling_interval |Number|Milliseconds|When the device is detected as not running, the status of the smart plub is polled at this interval

## Message configuration

Message configuration is done using the "messages" object. The members in this object are used as messages sent to the chat group. The `msg_device_active` and `msg_device_finished` members can contain a placeholder `${device_name}` which is replaced with the name of the device in the `devices` configuration object.

|Member                |Type  |Default                                   |Description
|----------------------|------|------------------------------------------|-----------
|msg_monitoring_started|String|"Starting up the monitoring"              |Message sent to chat when the monitoring is started
|msg_device_active     |String|"Detected the ${device_name} is turned on"|Message sent to chat when the monitoring detects that the appliance is turned on an active. Note that this may not be a good technical description of the state of the appliance, but you should use a phrase that is better understood by the users rather than being technical accurate (e.g. using non-technical, more vague terms for non-programmers!)
|msg_device_finished   |String|"The ${device_name} has finished"         |Message sent to chat when the monitoring detects that the device has finished

# Running

Once configured, running the application is as simple as running:

    node index.js

# Testing

Tests? Tests are for wimps.

Truthfully, I haven't written tests because this is something I've hacked together. Feel free to build tests and submit a pull-request!
