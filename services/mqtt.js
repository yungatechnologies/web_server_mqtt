var mqtt = require("mqtt");
var messageHandler = require("../controllers/message_handler"); 

const {
  TOPIC_CONFIG,
  TOPIC_CONFIG_ACK,
  TOPIC_ARM,
  TOPIC_PANIC,
  TOPIC_LAST_WILL,
  TOPIC_DOORBELL_ARK,
  TOPIC_DOORBELL,
  TOPIC_TEST,
  TOPIC_BALANCE,
  TOPIC_PANIC_ACK,
  TOPIC_MOTION_SENSORS,
  TOPIC_THREATS
} = require("../config");



const { 
  saveLog,
  findDeviceNetworks,
  saveAlarm,
  saveDeviceSelfAlarmConfirmation,
} = require("../controllers/devices_controller");

// var client = mqtt.connect("http://18.193.168.59:1883");

var options = {
  port: 1883,
  host: "mqtt://mqtt.koinsightug.com",
  clientId: "mqttjs_" + Math.random().toString(16).substr(2, 8),
  username: "gkfiqxkh",
  password: "wtc48z8dSovj",
  keepalive: 60,
  reconnectPeriod: 1000,
  clean: true,
  protocolId: "MQIsdp",
  protocolVersion: 3,
  encoding: "utf8",
  debug: false,
};

var options_backup = {
  port: 1883,
  host: "mqtt://stellar-florist.cloudmqtt.com",
  clientId: "mqttjs_" + Math.random().toString(16).substr(2, 8),
  username: "gkfiqxkh",
  password: "wtc48z8dSovj",
  keepalive: 60,
  reconnectPeriod: 1000,
  clean: true,
  protocolId: "MQIsdp",
  protocolVersion: 3,
  encoding: "utf8",
  debug: false,
};

var options_test = {
  port: 1883,
  host: "mqtt://energetic-internist.cloudmqtt.com",
  clientId: "mqttjs_" + Math.random().toString(16).substr(2, 8),
  username: "pknwxjms",
  password: "cPStPmxfC5vl",
  keepalive: 60,
  reconnectPeriod: 1000,
  clean: true,
  protocolId: "MQIsdp",
  protocolVersion: 3,
  encoding: "utf8",
  debug: false,
};

var client = mqtt.connect("mqtt://mqtt.koinsightug.com", options);

//var client = mqtt.connect("mqtt://stellar-florist.cloudmqtt.com", options);
//var client = mqtt.connect("mqtt://energetic-internist.cloudmqtt.com", options);

 client.on("connect", async() => {
 //console.log('Initial connection with Fredrick Kasoma');
  console.log("MQTT:::", "Connected");
  client.subscribe(TOPIC_TEST);
  client.subscribe(TOPIC_CONFIG);
  client.subscribe(TOPIC_CONFIG_ACK);
  client.subscribe(TOPIC_PANIC);
  client.subscribe(TOPIC_ARM);
  client.subscribe(TOPIC_LAST_WILL);
  client.subscribe(TOPIC_DOORBELL);
  client.subscribe(TOPIC_DOORBELL_ARK);
  client.subscribe(TOPIC_BALANCE);
  client.subscribe(TOPIC_PANIC_ACK);
  client.subscribe(TOPIC_MOTION_SENSORS);
  client.subscribe(TOPIC_THREATS);

  
  //subscribe to device networks to be able to receive alarms published by devices;
  const networks=await findDeviceNetworks();
  console.log("findDeviceNetworks:: "+ networks.length);
   
  networks.forEach(network => {
    client.subscribe("yunga/panics/"+network);
    console.log(`Subscribing to ${network}`);
  });

});

client.on("message", (topic, message) => {

  //console.log('connecting Fredrick Kasoma');

  var payload = JSON.parse(message);
  let logTime = new Date();

  console.log(`logging: ${logTime} : ${topic} -> ${message}`);

  var topicStringArray = topic.split("/");

  //console.log(`logging: ${logTime} : Topic tokens length : ${topicStringArray.length}`);

  if(topicStringArray.length!=3){
    messageHandler[topic](payload, client);
  }else{
    if(topicStringArray[2]=='ack'){
      console.log(`logging: ${logTime} : saving ack`); 
      messageHandler[topic](payload, client);

    }else{
 
      if(payload.action==1){
        console.log(`logging: ${logTime} : saving alarm`);
        saveAlarm(payload);
      }else  if(payload.action==2){
        console.log(`logging: ${logTime} : saving device self alarm confirmations`);
        saveDeviceSelfAlarmConfirmation(payload);
      }else  if(payload.action==0){
        console.log(`logging: ${logTime} : saving device self alarm confirmations on cancel`);
        saveDeviceSelfAlarmConfirmation(payload);
      }

      
    }
  }

  try {
    var deviceId = payload.deviceId.toString();
    saveLog(deviceId, `${topic} -> ${message}`);
    console.log(`logging: ${logTime} : saving log`);
    //console.log(`Testing: ${topic}`);

  } catch (error) {
    console.log(error);
  }
});

client.on("error", (error) => {
  console.log("MQTT::", error);
});

exports.publish = (topic, message) => {
  client.publish(topic, message);
};

exports.client = client;
