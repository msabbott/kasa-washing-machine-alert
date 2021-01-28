const util = require('util');
const { Client } = require('tplink-smarthome-api');
const { TelegramClient } = require('messaging-api-telegram');

const config = require('./config.json');

const logEvent = function logEvent(eventName, device, state) {
    const stateString = state != null ? util.inspect(state) : '';
    console.log(
        `${new Date().toISOString()} ${eventName} ${device.model} ${device.name} ${device.host}:${device.port} ${stateString}`
    );
};

const telegram = new TelegramClient({ accessToken: config.telegram.access_token });
telegram.sendMessage(config.telegram.chat_id, config.messages.monitoring_started);

// Create TP-Link client
const client = new Client();

// Iterate through devices in array
config.devices.forEach(function (deviceConfig, index) {

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

            if (deviceConfig.using_reminder_polling) {
                console.info(`${deviceConfig.name}: Hit the reminder interval.`);

                if (emeterRealtime.power < deviceConfig.power_active_threshold && emeterRealtime.power >= deviceConfig.power_on_threshold) {
                    // Power is still on, send reminder
                    console.info(`${deviceConfig.name}: Power is still on, sending reminder`);
                    telegram.sendMessage(config.telegram.chat_id, config.messages.device_finished_reminder.replace("${device_name}", deviceConfig.name));
                } else {
                    // Power is now either off, or the appliance is active again.
                    // No more reminders needed, allow system to recover
                    console.info(`${deviceConfig.name}: Power has changed. Stopping reminders`);
                    deviceConfig.using_reminder_polling = false;
                }
            }

            if (deviceConfig.previous_value >= deviceConfig.power_active_threshold
                && emeterRealtime.power < deviceConfig.power_active_threshold
                && !deviceConfig.using_reminder_polling) {
                telegram.sendMessage(config.telegram.chat_id, config.messages.device_finished.replace("${device_name}", deviceConfig.name));

                if (emeterRealtime.power > deviceConfig.power_on_threshold) {
                    console.info(`${deviceConfig.name}: Waiting for the reminder period`);
                    device.stopPolling();
                    device.startPolling(deviceConfig.reminder_interval);
                    deviceConfig.using_quick_polling = false;
                    deviceConfig.using_reminder_polling = true;
                } else {
                    // Start listening again, but at a much longer interval, waiting for the next washload
                    console.info(`${deviceConfig.name}: Switching to long polling interval`);
                    device.stopPolling();
                    device.startPolling(deviceConfig.long_polling_interval);
                    deviceConfig.using_quick_polling = false;
                    deviceConfig.using_reminder_polling = false;
                }

            } else if (emeterRealtime.power >= deviceConfig.power_active_threshold && !deviceConfig.using_quick_polling) {
                telegram.sendMessage(config.telegram.chat_id, config.messages.device_active.replace("${device_name}", deviceConfig.name));
                // Stop long interval polling, and switch to a faster polling rate
                console.info(`${deviceConfig.name}: Switching to quick polling interval`);
                deviceConfig.using_quick_polling = true;
                deviceConfig.using_reminder_polling = false;
                device.stopPolling();
                device.startPolling(deviceConfig.quick_polling_interval);
            }

            // Log the previous power consumption to allow for comparison on next loop
            deviceConfig.previous_value = emeterRealtime.power;
        });
    });
});
