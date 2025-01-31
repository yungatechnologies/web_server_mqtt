const { admin } = require("../firebase");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const {
    BUTTON_LOG,
    BUTTON_ALLARM_TRIGGER,
    COLLECTION_DEVICE_STATUS,
    COLLECTIONS_NETWORKS,
    COLLECTION_DEVICE_USERS,
    COLLECTION_DEVICES,
    COLLECTION_ALARMS,
    COLLECTION_DOORBELLS,
    COLLECTION_INSTALLATIONS,
    COLLLECTION_USERS,
    COLLECTION_DEVICE_CONNECTION_AUDIT,
    COLLECTION_ALARMS_ACK,
    COLLECTION_DEVICE_ARM_AUDIT,
    COLLECTION_DEVICE_SELF_ALARM_CONFIRMATION,
    COLLECTION_THREATS,
    COLLECTION_MOTION_SENSORS,
} = require("../config");

var moment = require('moment');
var tc = require("timezonecomplete");

const db = admin.database();
const firestore = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function alarms(req, res) {
    var action = req.params["action"];
    var deviceNumber = req.params["deviceNumber"];

    try {
        var deviceDetails = await getDevice(deviceNumber);
        if (action === "0") {
            var alarms = await getAlarms(deviceNumber);
            if (alarms.length) {
                var details = alarms[0];
                var person = await getUserbyPhone(details.userPhone);
                res.send(
                    `<1> <${person.firstName} ${person.lastName}> {${person.phone}}`
                );
            } else {
                res.send(`<0> <${deviceDetails.address}> {0}`);
            }
        } else if (action === "1") {
            // Turn off alarm
            await turnOffAlrm(deviceNumber);
            res.send(`<0> <${deviceDetails.address}> {0}`);
        } else {
            res.send("<0> <Unknown action> {0}");
        }
    } catch (error) {
        console.log(error);
        res.send(`<0> <Error> {0}`);
    }
}

async function devices(req, res) {
    return res.send("Devices");
}

async function getDeviceByNumber(deviceNumber) {
    try {
        var snapshot = await firestore
            .collection(COLLECTION_DEVICES)
            .where("deviceNumber", "==", deviceNumber)
            .get();
        if (!snapshot.empty) {
            var device = snapshot.docs[0].data();
            return device;
        } else {
            return Promise.reject(new Error("Device with not found"));
        }
    } catch (error) {
        return Promise.reject(error);
    }
}

async function log(req, res) {
    try {
        console.log(req.params);
        var deviceNumber = req.params.deviceNumber;
        var actionId = req.params.actionId;
        //save log
        saveLog(deviceNumber, actionId);
        //Decide which action to take
        decideAction(deviceNumber, actionId);
        //Fetch the outgoing status
        var status = await getIncomingStatus(deviceNumber);
        res.send(status);
    } catch (error) {
        res.send(error.message);
    }
}

function saveLog(deviceNumber, action) {
    var time = new Date().getTime();
    var log = {
        deviceNumber: deviceNumber,
        action: action,
        time: time,
    };
    var ref = db.ref(`logs/${deviceNumber}/logs`);
    ref.push().set(log);
}

function getDevice(deviceNumber) {
    return new Promise((resolve, reject) => {
        firestore
            .collection(COLLECTION_INSTALLATIONS)
            .where("deviceNumber", "==", deviceNumber)
            .get()
            .then((snapshot) => {
                if (!snapshot.empty) {
                    var device = snapshot.docs[0].data();
                    return resolve(device);
                } else {
                    return resolve({ address: "Unknown" });
                }
            })
            .catch((error) => {
                console.log(error);
                return reject(error);
            });
    });
}

async function info(req, res) {
    try {
        console.log(req.params);
        var deviceNumber = req.params.deviceNumber;
        var infoId = req.params.infoId;
        //Get info
        var results = "+256701222487";
        var info = `<${results}>`;
        res.send(info);
    } catch (error) {
        res.send(error.message);
    }
}

async function decideAction(deviceNumber, actionId) {
    switch (actionId) {
        case BUTTON_LOG:
            //Do nothing
            break;
        case BUTTON_ALLARM_TRIGGER:
            triggerAlarm(deviceNumber);
            break;
        default:
            break;
    }
}

async function getUserbyPhone(phone) {
    var snapshot = await firestore
        .collection(COLLLECTION_USERS)
        .where("phone", "==", phone)
        .get();
    if (!snapshot.empty) {
        var user = snapshot.docs[0].data();
        return user;
    } else {
        return {};
    }
}

async function getAlarms(deviceNumber) {
    var snapshot = await firestore
        .collection(COLLECTION_ALARMS)
        .where("respondent", "==", deviceNumber)
        .where("active", "==", true)
        .get();
    if (!snapshot.empty) {
        var alarms = snapshot.docs.map((doc) => doc.data());
        return alarms;
    } else {
        return [];
    }
}

async function getIncomingStatus(deviceNumber) {
    return `<A0 G0 B0 D0 S0 N0> ${deviceNumber}`;
}

async function turnOffAlrm(deviceNumber) {
    console.log("TURN OFF ALEARM");
    try {
        var alarms = await getAlarms(deviceNumber);
        if (alarms.length) {
            var alarm = alarms[alarms.length - 1];
            firestore
                .collection("alarms")
                .doc(alarm.id)
                .update({
                    active: false,
                })
                .catch((e) => console.error(e));
        }
        return true;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

async function getDeviceStatus(deviceId) {
    var status = {};
    try {
        var snapshot = await firestore
            .collection(COLLECTION_DEVICE_STATUS)
            .where("deviceNumber", "==", deviceId)
            .get();
        if (!snapshot.empty) {
            status = snapshot.docs[0].data();
            return status;
        } else {
            return null;
        }
    } catch (error) {
        console.log(error.message);
        return null;
    }
}

async function getDeviceNetwork(deviceId) {
    try {
        var snapshot = await firestore
            .collection(COLLECTIONS_NETWORKS)
            .where("devices", "array-contains", deviceId)
            .get();
        var network = snapshot.docs[0].data();
        return network;
    } catch (error) {
        console.log(error.message);
        return null;
    }
}

async function getDeviceOwner(deviceId) {
    try {
        var snapshot = await firestore
            .collection(COLLECTION_DEVICE_USERS)
            .where("deviceNumber", "==", deviceId)
            .where("role", "==", "OWNER")
            .get();
        var owner = snapshot.docs[0].data();
        return owner;
    } catch (error) {
        console.log(error.message);
        return null;
    }
}

async function changeArmStatus(payload) {
    try {
        var status = await getDeviceStatus(payload.deviceId.toString());
        var ref = firestore.collection(COLLECTION_DEVICE_STATUS).doc(status.id);
        await firestore.runTransaction(async (t) => {
            t.update(ref, {
                armed: payload.action,
            });
        });
    } catch (error) {
        console.log(error);
    }
}

async function saveArmAudit(payload) {
    try {
        var audit = {
            date: FieldValue.serverTimestamp(),
            details: payload
        }

        var ref = firestore.collection(COLLECTION_DEVICE_ARM_AUDIT).add(audit);

    } catch (error) {
        console.log(error);
    }
}

async function saveAlarm(payload) {
    try {

        var id = null;
        var source = null;
        if (typeof payload.id !== 'undefined') {
            if (payload.id !== null) {
                id = payload.id;
            }
        }

        if (typeof payload.source !== 'undefined') {
            if (payload.source !== null) {
                source = payload.source;
            }
        }

        if (id === null) {
            var network = await getDeviceNetwork(payload.deviceId.toString());
            var deviceUser = await getDeviceOwner(payload.deviceId.toString());
            var user = await getUserbyPhone(deviceUser.phone);
            var device = await getDevice(payload.deviceId.toString());

            var alarm = {
                date: FieldValue.serverTimestamp(),
                active: true,
                deviceNumber: payload.deviceId,
                network: network.code,
                address: device.address,
                name: `${user.firstName} ${user.lastName}`,
                id: payload.ackId,
                action: payload.action,
                ackId: payload.ackId,
                source: "device",
                receipts: [],
                responses: [],
            };

            //firestore.collection("testingAlarm").doc(alarm.id).set(alarm);
            firestore.collection(COLLECTION_ALARMS).doc(alarm.id).set(alarm);
            //firestore.collection(COLLECTION_ALARMS).add(alarm);
        } else {
            var deviceUser = await getDeviceOwner(payload.deviceId.toString());
            var user = await getUserbyPhone(deviceUser.phone);
            const ref = firestore.collection(COLLECTION_ALARMS).doc(id);
            await firestore.runTransaction(async (t) => {
                t.update(ref, {
                    //action:payload.action,
                    source: source,
                    name: `${user.firstName} ${user.lastName}`,
                });
            });
        }


    } catch (error) {
        console.log(error);
    }
}

async function saveDeviceSelfAlarmConfirmation(payload) {
    try {

        var network = await getDeviceNetwork(payload.deviceId.toString());
        var deviceUser = await getDeviceOwner(payload.deviceId.toString());
        var user = await getUserbyPhone(deviceUser.phone);
        var device = await getDevice(payload.deviceId.toString());

        var alarm = {
            date: FieldValue.serverTimestamp(),
            active: true,
            deviceNumber: payload.deviceId,
            network: network.code,
            address: device.address,
            name: `${user.firstName} ${user.lastName}`,
            id: uuidv4(),
            action: payload.action,
            ackId: payload.ackId,
            source: "device",
            receipts: [],
            responses: [],
        };

        //firestore.collection(COLLECTION_ALARMS).doc(alarm.id).set(alarm);
        firestore.collection(COLLECTION_DEVICE_SELF_ALARM_CONFIRMATION).add(alarm);


    } catch (error) {
        console.log(error);
    }
}

async function acknowledgeAlarmBackup(payload) {
    try {
        if (payload.action === 2) {
            var ref = firestore.collection(COLLECTION_ALARMS).doc(payload.ackId);
            await firestore.runTransaction(async (t) => {
                t.update(ref, {
                    receipts: FieldValue.arrayUnion(payload.deviceId),
                    action: payload.action,
                });
            });
        } else if (payload.action === 4) {
            var ref = firestore.collection(COLLECTION_ALARMS).doc(payload.ackId);
            await firestore.runTransaction(async (t) => {
                t.update(ref, {
                    responses: FieldValue.arrayUnion(payload.deviceId),
                    action: payload.action,
                });
            });
        } else {
            var ref = firestore.collection(COLLECTION_ALARMS).doc(payload.ackId);
            await firestore.runTransaction(async (t) => {
                t.update(ref, {
                    action: payload.action,
                });
            });
        }
    } catch (error) {
        console.log(error);
    }
}

async function acknowledgeAlarm(payload) {
    try {

        var audit = {
            date: FieldValue.serverTimestamp(),
            details: payload
        }
        var ref = firestore.collection(COLLECTION_ALARMS_ACK).add(audit);

    } catch (error) {
        console.log(error);
    }
}

async function updateConnectionStatus(payload) {
    try {
        var device = await getDeviceByNumber(payload.deviceId);
        const ref = firestore.collection(COLLECTION_DEVICES).doc(device.id);
        await firestore.runTransaction(async (t) => {
            t.update(ref, {
                online: payload.online,
            });
        });
    } catch (error) {
        console.log(error);
    }
}

async function acknowledgeDoorBell(payload) {
    var ref = firestore.collection(COLLECTION_DOORBELLS).doc(payload.ackId);
    try {
        var map;
        if (payload.action == 3) {
            console.log("Doorbell action is 3");
            map = {
                action: payload.action,
                "result": 1
            };
        } else {
            console.log("Doorbell action not 3");
            map = {
                action: payload.action,
            };
        }

        await firestore.runTransaction(async (t) => {
            t.update(ref, map);
        });

        console.log("Doorbell update complete");
    } catch (error) {
        console.log(error);
    }
}

async function updateDoorBell(payload) {
    var ref = firestore.collection(COLLECTION_DOORBELLS).doc(payload.ackId);
    try {
        var map;
        if (payload.action == 3) {
            console.log("Doorbell action is 3");
            map = {
                action: payload.action,
                "result": 1
            };
        } else {
            console.log("Doorbell action not 3");
            map = {
                action: payload.action,
            };
        }

        await firestore.runTransaction(async (t) => {
            t.update(ref, map);
        });

        console.log("Doorbell update complete");
    } catch (error) {
        console.log(error);
    }
}

async function getContacts(payload) {
    var deviceUsers = await getDeviceUsers(payload);
    var devicesOwners = await getNetworkDeviceOwners(payload);
    var user = [deviceUsers, ...devicesOwners].map((u) => u.phone);

    var unique = [];
    user.forEach((u) => {
        if (!unique.includes(u)) {
            unique.push(u);
        }
    });

    return unique.toString();
}

async function getNetworkDeviceOwners(payload) {
    var snapshot = await firestore
        .collection(COLLECTIONS_NETWORKS)
        .where("devices", "array-contains", payload.deviceId)
        .get();

    var devices = snapshot.docs.map((doc) => doc.data());

    console.log("DEVICES:::", devices);

    var users = [];

    var deviceNumbers = devices[0].devices;

    for (let index = 0; index < deviceNumbers.length; index++) {
        const deviceNumber = deviceNumbers[index];

        console.log("DEVICE_NUMBER:::", deviceNumber);

        var snap2 = await firestore
            .collection(COLLECTION_DEVICE_USERS)
            .where("deviceNumber", "==", deviceNumber)
            .where("role", "==", "OWNER")
            .get();

        console.log(snap2.docs);

        if (!snap2.empty) {
            var u = snap2.docs[0].data();
            users.push(u);
        }
    }
    return users;
}

async function getDeviceUsers(payload) {
    var snapshot = await firestore
        .collection(COLLECTION_DEVICE_USERS)
        .where("deviceNumber", "==", payload.deviceId)
        .get();

    return snapshot.docs[0].data();
}




async function saveDeviceConnectionAudit(payload, status) {
    try {

        var audit = {
            time: FieldValue.serverTimestamp(),
            status: status,
            deviceNumber: payload.deviceId,
        };

        firestore.collection(COLLECTION_DEVICE_CONNECTION_AUDIT).add(audit);

    } catch (error) {
        console.log(error);
    }
}

async function findDeviceNetworks() {
    var networks = [];
    try {

        var snapshot = await firestore
            .collection(COLLECTIONS_NETWORKS)
            .get();
        snapshot.forEach(doc => {
            var network = doc.data();
            //console.log("findDeviceNetworks:: "+JSON.stringify(network));
            networks.push(network.code);
            //console.log("networks size: "+networks.length);
        });
        return networks;
    } catch (error) {
        console.log(error.message);
        return networks;
    }
}

async function autoArm() {
    var snapshot = await firestore.collection("deviceStatus").where("autoArm", "==", true).get();
    var today = new Date()
    var now = new Date(today.toLocaleString("en-US", { timeZone: "Africa/Kampala" }))

    // current hours
    let hours = now.getHours();

    // current minutes
    let minutes = now.getMinutes();

    // current seconds
    let seconds = now.getSeconds();

    var timeNow = `${hours}:${minutes}:${seconds}`

    //console.log(`Time now in 24 hours:: ${timeNow}`);

    var startTime = moment(timeNow, 'HH:mm:ss')

    snapshot.forEach(doc => {
        var status = doc.data();

        var armTime = status.armTime;

        var timeInTwentyFour = tConvert(armTime);
        if (timeInTwentyFour !== null) {

            var endTime = moment(timeInTwentyFour, 'HH:mm');

            var secondsDiff = endTime.diff(startTime, 'seconds');

            var autoArmMinutes = secondsDiff / (60);

            //console.log(`armTime Time now in 12 hours:::: ${status.deviceNumber}: ${armTime}`);
            //console.log(` armTime Time now in 24 hours:::: ${status.deviceNumber}: ${timeInTwentyFour}`);

            //console.log(`autoArmMinutes: ${autoArmMinutes}`);

            if (autoArmMinutes > 0 && autoArmMinutes <= 1) {
                if (status.armed == 0) {
                    console.log(`Auto arm ${status.deviceNumber}`);
                    changeArmStatusAutomatically(`${status.deviceNumber}`, 1);
                }

            }
        }
        //notify Tonny with the new task

    });
}

async function autoDisArm() {
    var snapshot = await firestore.collection("deviceStatus").where("autoArm", "==", true).get();
    var today = new Date()
    var now = new Date(today.toLocaleString("en-US", { timeZone: "Africa/Kampala" }))

    // current hours
    let hours = now.getHours();

    // current minutes
    let minutes = now.getMinutes();

    // current seconds
    let seconds = now.getSeconds();

    var timeNow = `${hours}:${minutes}:${seconds}`

    // console.log(`Time now in 24 hours:: ${timeNow}`);

    var startTime = moment(timeNow, 'HH:mm:ss')

    snapshot.forEach(doc => {
        var status = doc.data();

        var disarmTime = status.disarmTime;

        var timeInTwentyFour = tConvert(disarmTime);

        if (timeInTwentyFour !== null) {

            var endTime = moment(timeInTwentyFour, 'HH:mm');

            var secondsDiff = endTime.diff(startTime, 'seconds');

            var autoDisArmMinutes = secondsDiff / (60);

            //console.log(`disarmTime Time now in 12 hours:: ${status.deviceNumber}: ${disarmTime}`);
            //console.log(` disarmTime Time now in 24 hours:: ${status.deviceNumber}: ${timeInTwentyFour}`);

            //console.log(`autoDisarmTimeMinutes: ${autoDisArmMinutes}`);

            if (autoDisArmMinutes > 0 && autoDisArmMinutes <= 1) {
                if (status.armed == 1) {
                    //console.log("Auto Disarm");
                    // console.log(`Auto Disarm ${status.deviceNumber}`);
                    changeArmStatusAutomatically(`${status.deviceNumber}`, 0);
                }

            }
        }

    });


}



async function changeArmStatusAutomatically(deviceId, armStatus) {
    try {
        var status = await getDeviceStatus(deviceId);
        var ref = firestore.collection(COLLECTION_DEVICE_STATUS).doc(status.id);
        await firestore.runTransaction(async (t) => {
            t.update(ref, {
                armed: armStatus,
            });
        });
    } catch (error) {
        console.log(error);
    }
}


function tConvert(time) {
    try {
        var hours = Number(time.match(/^(\d+)/)[1]);
        var minutes = Number(time.match(/:(\d+)/)[1]);
        var AMPM = time.match(/\s(.*)$/)[1];
        if (AMPM == "PM" && hours < 12) hours = hours + 12;
        if (AMPM == "AM" && hours == 12) hours = hours - 12;
        var sHours = hours.toString();
        var sMinutes = minutes.toString();
        if (hours < 10) sHours = "0" + sHours;
        if (minutes < 10) sMinutes = "0" + sMinutes;
        return sHours + ":" + sMinutes;

    } catch (ex) {
        // console.log(`Time converstion Error:: ${ex}`);
        return null;
    }

}

async function SMSAPI(phone, message) {
    try {
        console.log("sending SMS=>>");
        var url = `http://web.yunga-ug.com:3200/sms/${phone}/${message}`;
        var res = await axios.get(url);
        console.log("Sending SMSAPI:::", res);
        // logSMSResponse(res);
        return res;
    } catch (error) {
        console.log("ERROR:::", error);
        return error;
    }
}

async function emailAPI(email, message, subject) {
    try {
        console.log("sending Email=>>");
        var url = `http://web.yunga-ug.com:3200/email/${email}/${message}/${subject}`;
        var res = await axios.get(url);
        console.log("sending Email response:::", res);
        //logEmailResponse(res);
        return res;
    } catch (error) {
        console.log("ERROR:::", error);
        return error;
    }
}

async function getAllDeviceUsers() {

    var snapshot = await admin
        .firestore()
        .collection("deviceUsers")
        .get();

    var users = [];
    try {
        for (const doc of snapshot.docs) {
            console.log("Phone Data:: " + JSON.stringify(doc.data()));

            users.push(doc.data().phone);
        }
    } catch (err) {
        console.log(err);
    }

    return users;
}

async function getSystemAdmins() {
    var snapshot = await admin
        .firestore()
        .collection("admins")
        .where("role", "==", "ADMIN")
        .get();

    var users = [];
    try {
        for (const doc of snapshot.docs) {
            console.log("Admin Data:: " + JSON.stringify(doc.data()));
            var adminUser = {
                name: doc.data().name,
                phone: doc.data().phoneNumber,
                email: doc.data().email,
            };
            users.push(adminUser);
        }
    } catch (err) {
        console.log(err);
    }

    return users;
}

async function sendsmsNotification() {

    //var contacts = await getAllDeviceUsers();

    //var admins = await getSystemAdmins();

    //console.log("admins====>> " + admins.length);

    //console.log("CONTACTS:::", contacts.length);

    var message = "Dear Yunga user, Good news 30 percent of homes on our security network have been able to reconnect automatically. If your device is not up and running yet, our tehnical team will be reaching out to you between Sunday 22nd and Wednesday 25th for a manual reconnection. Our humble apologies for the inconveniences.";

    try {

        //for (const contact of contacts) {
            //console.log(`contact ==>${contact}`);

            //SMSAPI(contact, message);
        //}

        // notify system administrators
        //for (const contact of admins) {

            //SMSAPI(contact.phone, message);

            SMSAPI("+256700408387", message);

            //emailAPI(contact.email, msg, "YUNGA DEVICE ALARM TRIGERED");
       // }
    } catch (error) {
        console.log(error);
    }
}

async function logSMSResponse(payload) {
    if (typeof payload !== "undefined" && payload !== null) {
        var smsAuit = {
            time: FieldValue.serverTimestamp(),
            id: uuidv4(),
            responseData: payload,
        };

        admin
            .firestore()
            .collection("emailNotifications")
            .add(smsAuit);
    }
}

async function logEmailResponse(payload) {
    if (typeof payload !== "undefined" && payload !== null) {
        var emailAuit = {
            time: FieldValue.serverTimestamp(),
            id: uuidv4(),
            responseData: payload,
        };

        admin
            .firestore()
            .collection("smsNotifications")
            .add(emailAuit);
    }
}

async function autGenerateDeviceStatus(deviceNumber) {
    try {

        let id=uuidv4();

        var deviceStatus = {
            id: id,
            deviceNumber: deviceNumber,
            armTime: "",
            disarmTime: "",
            childLock: false,
            doorBell: true,
            motionSensor: true,
            siren: true,
            strobeLight: true,
            armed:0,
            autoArm:false,

        };

        firestore.collection(COLLECTION_DEVICE_STATUS).doc(id).set(deviceStatus);

    } catch (error) {
        console.log(error);
    }
}

async function saveMotionThreats(payload, status) {
    try {

        let id=uuidv4();

        var saveMotionThreats = {
            time: FieldValue.serverTimestamp(),
            id:id,
            deviceNumber: payload.deviceId,
            motionDetect: payload.motionDetect,
            threatLevel: payload.threatLevel,
        };

        firestore.collection(COLLECTION_THREATS).add(saveMotionThreats);

    } catch (error) {
        console.log(error);
    }
}

async function saveMotionSensorTrigers(payload, status) {
    try {

        let id=uuidv4();

        var saveMotionThreats = {
            time: FieldValue.serverTimestamp(),
            id:id,
            deviceNumber: payload.deviceId,
            motionDetect: payload.motionDetect,
            threatLevel: payload.threatLevel,
        };

        firestore.collection(COLLECTION_MOTION_SENSORS).add(saveMotionThreats);

    } catch (error) {
        console.log(error);
    }
}

exports.log = log;
exports.info = info;
exports.devices = devices;
exports.alarms = alarms;
exports.getDeviceByNumber = getDeviceByNumber;
exports.getDeviceStatus = getDeviceStatus;
exports.getDeviceNetwork = getDeviceNetwork;
exports.getDeviceOwner = getDeviceOwner;
exports.changeArmStatus = changeArmStatus;
exports.updateDoorBell = updateDoorBell;
exports.saveAlarm = saveAlarm;
exports.acknowledgeAlarm = acknowledgeAlarm;
exports.updateConnectionStatus = updateConnectionStatus;
exports.acknowledgeDoorBell = acknowledgeDoorBell;
exports.getUserbyPhone = getUserbyPhone;
exports.getDevice = getDevice;
exports.saveLog = saveLog;
exports.getContacts = getContacts;
exports.saveDeviceConnectionAudit = saveDeviceConnectionAudit;
exports.findDeviceNetworks = findDeviceNetworks;
exports.saveDeviceSelfAlarmConfirmation = saveDeviceSelfAlarmConfirmation;
exports.saveArmAudit = saveArmAudit;
exports.autoArm = autoArm;
exports.autoDisArm = autoDisArm;
exports.sendsmsNotification = sendsmsNotification;
exports.autGenerateDeviceStatus=autGenerateDeviceStatus;
exports.saveMotionThreats=saveMotionThreats;
exports.saveMotionSensorTrigers=saveMotionSensorTrigers;



