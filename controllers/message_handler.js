const {
    TOPIC_CONFIG,
    TOPIC_CONFIG_ACK,
    TOPIC_ARM,
    TOPIC_PANIC,
    TOPIC_LAST_WILL,
    TOPIC_DOORBELL_ARK,
    TOPIC_DOORBELL,
    TOPIC_TEST,
    TOPIC_PANIC_ACK,
    TOPIC_BALANCE,
    TOPIC_SIGNAL_STRENGTH,
    TOPIC_MOTION_SENSORS,
    TOPIC_THREATS,
} = require("../config");

const {
    getDeviceStatus,
    changeArmStatus,
    updateDoorBell,
    saveAlarm,
    updateConnectionStatus,
    acknowledgeAlarm,
    getDeviceNetwork,
    getDeviceOwner,
    getUserbyPhone,
    getDevice,
    saveDeviceConnectionAudit,
    saveArmAudit,
    autGenerateDeviceStatus,
    saveMotionThreats,
    saveMotionSensorTrigers
} = require("./devices_controller");

const { v4: uuidv4 } = require("uuid");

module.exports = {
    [TOPIC_TEST]: (payload) => {
        console.log(payload);
    },
    [TOPIC_CONFIG]: async (payload, client) => {
        var deviceId = payload.deviceId.toString();

        //console.log("Logging configs::: " + JSON.stringify(payload));

        try {
            var deviceStatus = await getDeviceStatus(deviceId);
            var network = await getDeviceNetwork(payload.deviceId.toString());
            var deviceUser = await getDeviceOwner(payload.deviceId.toString());
            var user = deviceUser.phone == null ? 'Unknown' : await getUserbyPhone(deviceUser.phone);
            var device = await getDevice(payload.deviceId.toString());

            // var data = {
            //     network: network.code,
            //     address: device.address,
            //     name: `${user.firstName} ${user.lastName}`,
            //     ...deviceStatus,
            //     //ackId: deviceStatus.id,
            //     ackId: uuidv4(),
            //     subscription: true,
            //     led: true,
            //     logId: uuidv4(),
            // }; 
            //console.log(data); 

            if (deviceStatus) {

                console.log("Logging configs 1::: " + JSON.stringify(deviceStatus));

                var data = {
                    network: network.code,
                    address: device.address,
                    name: `${user.firstName} ${user.lastName}`,
                    ackId: uuidv4(),
                    subscription: true,
                    led: true,
                    childLock: deviceStatus.childLock,
                    armed: deviceStatus.armed,
                    siren: deviceStatus.siren,
                    doorBell: deviceStatus.doorBell,
                    motionSensor: deviceStatus.motionSensor,
                    strobeLight: deviceStatus.strobeLight,
                    deviceNumber: deviceStatus.deviceNumber,
                };

                var message = JSON.stringify(data);
                //console.log("Logging configs 2::: " + message);

                client.publish(`${TOPIC_CONFIG}/${deviceId}`, message);
            }
            else {

                console.log("Auto Generate Device Status for::: " + deviceId);
                autGenerateDeviceStatus(deviceId);

            }
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_CONFIG_ACK]: async (payload) => {
        try {
            var deviceId = payload.deviceId.toString();
            await updateConnectionStatus({
                online: true,
                deviceId: deviceId,
            });
            await saveDeviceConnectionAudit(payload, "on");
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_ARM]: async (payload) => {
        try {
            //console.log("testing arming -->>");

            await saveArmAudit(payload);
            await changeArmStatus(payload);
            //ArmStatus(payload);
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_DOORBELL_ARK]: async (payload) => {
        try {
            await updateDoorBell(payload);
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_DOORBELL]: async (payload) => {
        try {
            await updateDoorBell(payload);
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_PANIC]: async (payload) => {
        try {
            await saveAlarm(payload);
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_PANIC_ACK]: async (payload) => {
        try {
            await acknowledgeAlarm(payload);
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_LAST_WILL]: async (payload) => {
        try {
            var deviceId = payload.deviceId.toString();
            await updateConnectionStatus({
                online: false,
                deviceId: deviceId,
            });

            await saveDeviceConnectionAudit(payload, "off");
        } catch (error) {
            console.log(error);
        }
    },
    [TOPIC_SIGNAL_STRENGTH]: async (payload, client) => { },
    [TOPIC_BALANCE]: async (payload, client) => { },
    [TOPIC_MOTION_SENSORS]: async (payload, client) => {

        try {
            console.log('Motion sensors', payload);
            await saveMotionSensorTrigers(payload);
        } catch (error) {
            console.log(error);
        }

    },
    [TOPIC_THREATS]: async (payload, client) => {

        try {
            console.log('Device threats', payload);
            await saveMotionThreats(payload);
        } catch (error) {
            console.log(error);
        }


    },
};