const util = require('util');
const { Client } = require('tplink-smarthome-api');
const { TelegramClient } = require('messaging-api-telegram');

const config = require('./config.json');

////////////////////////////////////////////////////
// Device configuration
////////////////////////////////////////////////////

const devices = [
    {
        "name": "Washing Machine",
        "ipaddress": "<ip address goes here>",
        "power_on_threshold": 0.25,
        "power_active_threshold": 1,
        "quick_polling_interval": 2 * 60 * 1000, // 2 minutes
        "long_polling_interval": 45 * 60 * 1000, // 45 minutes
    },
    {
        "name": "Dishwasher",
        "ipaddress": "<ip address goes here>",
        "power_on_threshold": 0.25,
        "power_active_threshold": 1,
        "quick_polling_interval": 2 * 60 * 1000, // 2 minutes
        "long_polling_interval": 30 * 60 * 1000, // 30 minutes
    }
];

////////////////////////////////////////////////////
// Telegram Chat configuration
////////////////////////////////////////////////////

// Telegram chat ID. Find out the Chat ID number here: https://sean-bradley.medium.com/get-telegram-chat-id-80b575520659
const chat_id = -1;

// Telegram Chat Bot access token
const telegram_bot_access_token = "XXX:YYY";

////////////////////////////////////////////////////
// Message configuration
////////////////////////////////////////////////////

const msg_monitoring_started = "Starting up the monitoring";
const msg_device_active = "Detected the ${device_name} is turned on";
const msg_device_finished = "The ${device_name} has finished";

const logEvent = function logEvent(eventName, device, state) {
    const stateString = state != null ? util.inspect(state) : '';
    console.log(
        `${new Date().toISOString()} ${eventName} ${device.model} ${device.name} ${device.host}:${device.port} ${stateString}`
    );
};

const telegram = new TelegramClient({ accessToken: telegram_bot_access_token });
telegram.sendMessage(chat_id, msg_monitoring_started);

// Create TP-Link client
const client = new Client();

// Iterate through devices in array
devices.forEach(function (deviceConfig, index) {

    console.info("Working with device: ", deviceConfig.name);
    console.info("Quick polling interval:", deviceConfig.quick_polling_interval);
    console.info("Long polling interval:", deviceConfig.long_polling_interval);
    console.info("Device IP Address:", deviceConfig.ipaddress);
    console.info("");

    client.getDevice({ host: deviceConfig.ipaddress }).then((device) => {
        device.getSysInfo().then((info) => {
            console.info(`${deviceConfig.name}: Found device ${info.dev_name} (${info.alias})`);
        });

        // Start polling at the long polling interval
        deviceConfig.previous_value = 0;
        deviceConfig.using_quick_polling = false;
        device.startPolling(deviceConfig.long_polling_interval);

        // Device (Common) Events
        device.on('emeter-realtime-update', (emeterRealtime) => {
            logEvent('emeter-realtime-update', device, emeterRealtime);

            if (deviceConfig.previous_value >= deviceConfig.power_active_threshold
                && emeterRealtime.power < deviceConfig.power_active_threshold) {
                telegram.sendMessage(chat_id, msg_device_finished.replace("${device_name}", deviceConfig.name));

                // Start listening again, but at a much longer interval, waiting for the next washload
                console.info(`${deviceConfig.name}: Switching to long polling interval`);
                device.stopPolling();
                device.startPolling(deviceConfig.long_polling_interval);
                deviceConfig.using_quick_polling = false;
            } else if (emeterRealtime.power >= deviceConfig.power_active_threshold && !deviceConfig.using_quick_polling) {
                telegram.sendMessage(chat_id, msg_device_active.replace("${device_name}", deviceConfig.name));
                // Stop long interval polling, and switch to a faster polling rate
                console.info(`${deviceConfig.name}: Switching to quick polling interval`);
                deviceConfig.using_quick_polling = true;
                device.stopPolling();
                device.startPolling(deviceConfig.quick_polling_interval);
            }

            // Log the previous power consumption to allow for comparison on next loop
            deviceConfig.previous_value = emeterRealtime.power;
        });
    });
});
