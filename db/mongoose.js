
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
if (process.env.NODE_ENV === 'test'){
    mongoose.connect('mongodb://localhost/bank_test')
    const db = mongoose.connection
    db.on('error', console.error.bind(console, '连接错误:'));
    db.once('open', function() {
        console.log('connect to server success')
        console.log(`current node env : ${process.env.NODE_ENV}`)
    })
}else {
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/bank')
    const db = mongoose.connection
    db.on('error', console.error.bind(console, '连接错误:'));
    db.once('open', function() {
        console.log('connect to server success')
        console.log(`current node env : ${process.env.NODE_ENV}`)
    })
}


module.exports.mongoose = mongoose

