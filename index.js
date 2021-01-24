const util = require('util');
const { Client } = require('tplink-smarthome-api');
const { TelegramClient } = require('messaging-api-telegram');

////////////////////////////////////////////////////
// Script configuration
////////////////////////////////////////////////////

// Polling intervals in milliseconds
const quick_polling_interval = 2 * 60 * 1000; // 2 minutes
const long_polling_interval = 45 * 60 * 1000; // 45 minutes

////////////////////////////////////////////////////
// Device configuration
////////////////////////////////////////////////////

// IP address (or host name) for the Smart plug
const device_ip = "";

// Threshold value (in Watts) for when device goes into an 'active' state (e.g washing clothes)
const power_active_threshold = 1;

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

const device_name = "washing machine";
const msg_monitoring_started = "Starting up the monitoring";
const msg_device_active = `Detected the ${device_name} is turned on`;
const msg_device_finished = `The ${device_name} has finished`;

const logEvent = function logEvent(eventName, device, state) {
    const stateString = state != null ? util.inspect(state) : '';
    console.log(
        `${new Date().toISOString()} ${eventName} ${device.model} ${device.host}:${device.port
        } ${stateString}`
    );
};

const telegram = new TelegramClient({ accessToken: telegram_bot_access_token });

console.info(`Quick polling interval: ${quick_polling_interval} milliseconds`);
console.info(`Long polling interval: ${long_polling_interval} milliseconds`);
console.info(`Device IP Address: ${device_ip}`);
console.info(`Machine state 'Active' power threshold: ${power_active_threshold} Watt`);
console.info("");

telegram.sendMessage(chat_id, msg_monitoring_started);

var previous = 0;
var using_quick_polling = false;

const client = new Client();
const plug = client.getDevice({ host: device_ip }).then((device) => {

    device.getSysInfo().then((info) => {
        console.info(`Found device ${info.dev_name} (${info.alias})`);
    });

    // Start polling at the long polling interval
    device.startPolling(long_polling_interval);
    using_quick_polling = false;

    // Device (Common) Events
    device.on('emeter-realtime-update', (emeterRealtime) => {
        logEvent('emeter-realtime-update', device, emeterRealtime);

        if (previous >= power_active_threshold && emeterRealtime.power < power_active_threshold) {
            telegram.sendMessage(chat_id, msg_device_finished);

            // Start listening again, but at a much longer interval, waiting for the next washload
            console.info("Switching to long polling interval");
            device.stopPolling();
            device.startPolling(long_polling_interval);
            using_quick_polling = false;
        } else if (emeterRealtime.power >= power_active_threshold && !using_quick_polling) {
            telegram.sendMessage(chat_id, msg_device_active);
            // Stop long interval polling, and switch to a faster polling rate
            console.info("Switching to quick polling interval");
            using_quick_polling = true;
            device.stopPolling();
            device.startPolling(quick_polling_interval);
        }

        // Log the previous power consumption to allow for comparison on next loop
        previous = emeterRealtime.power;
    });
});