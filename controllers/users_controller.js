const { admin } = require("../firebase");
const firestore = admin.firestore();
const { COLLLECTION_USERS } = require("../config");

exports.getUserByPhone = async (req, res) => {
  var phone = req.params["phone"];
  try {
    var snapshot = await firestore
      .collection(COLLLECTION_USERS)
      .where("phone", "==", phone)
      .get();
    if (!snapshot.empty) {
      var user = snapshot.docs[0].data();
      console.log(user);
      return res.send(user);
    } else {
      return res.send({});
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getUserById = async (userId) => {
  var doc = await firestore.collection(COLLLECTION_USERS).doc(userId).get();
  if (doc.exists()) {
    var user = doc.data();
    return user;
  } else {
    return null;
  }
};
