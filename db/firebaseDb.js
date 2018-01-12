const admin = require("firebase-admin")
const serviceAccount = require("./taiwanbankrate-c95a8-firebase-adminsdk-0v5ad-2dd66d0f34.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://taiwanbankrate-c95a8.firebaseio.com/"
})
const FirebaseDb = admin.database()

module.exports.FirebaseDb = FirebaseDb