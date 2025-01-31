const credentials = {
    apiKey: '711ea5fcc54758b12ef925efae601cb6405d6f5dccd9103d15a8df45f1e9e819',
    username: 'yungaapppivr'
}

// Initialize the SDK
const AfricasTalking = require('africastalking')(credentials);

// Get the voice service
const voice = AfricasTalking.VOICE;

const sms = AfricasTalking.SMS;


function makeCall() {

  console.log('making phone call initialisation');

//callTo: ['+256700408387', '+256772487314']
    const options = {
        // Set your Africa's Talking phone number in international format
        callFrom: '+256312319219',
        // Set the numbers you want to call to in a comma-separated list
        callTo: ['+256772487314']
    }

    // Make the call
    voice.call(options)
        .then(console.log)
        .catch(console.log);
}

function sendSMS() {

  console.log('making phone SMS initialisation');
    const options = {
        // Set the numbers you want to send to in international format
        to: ['+256772487314'],
        // Set your message
        message:"testing SMS"

    }

    // Make the call
    sms.send(options)
        .then(console.log)
        .catch(console.log);
}

//makeCall();
//sendSMS();

exports.makeCall = makeCall;
exports.sendSMS=sendSMS;
