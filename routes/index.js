var express = require("express");
const { client } = require("../services/mqtt");
var router = express.Router();
const { getContacts } = require("../controllers/devices_controller");

const ivr = require("../controllers/IVR_controller");

const axios = require('axios');

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Yunga" });
});

router.post("/publish", (req, res) => {
  var message = req.body.message;
  var topic = req.body.topic;
  console.log(`PULISH:::${JSON.stringify(req.body)}`);
  client.publish(topic, message);
  res.send("Success");
});

router.get("/get_contacts/:device_id", async (req, res) => {
  var users = await getContacts({
    deviceId: req.params["device_id"],
  });
  res.send(users);
});

router.get("/IVR", function (req, res, next) {
//  res.render("index", { title: "Yunga" });
console.log("Initating IVR");

//ivr.makeCall();

/*axios.get('http://certsoftwares.net/theYunga/send_notificationv2?phone=256772378336&message=test')
  .then(response => {
    console.log(response.data);
    console.log(response.data.explanation);
  })
  .catch(error => {
    console.log(error);
  });*/

//http://certsoftwares.net/theYunga/send_notificationv2?phone=256789497829&message=test get

});



module.exports = router;
