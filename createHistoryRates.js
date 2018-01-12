const mongoose = require('mongoose')
const Bank = require('./model/bank')
const Rate = require('./model/rate')
const {getBank} = require('./util/util')

if (process.env.NODE_ENV !== 'test') {
    mongoose.Promise = global.Promise
    mongoose.connection.openUri('mongodb://localhost/bank_test')
    const db = mongoose.connection
    db.on('error', console.error.bind(console, '连接错误:'));
    db.once('open', function() {
        console.log('connent to mongo db success')
        console.log(`current node env : ${process.env.NODE_ENV}`)
    })
    
}

// const saveHistoryRates = async () => {
//     const megaBank = await getBank('兆豐商銀','017')
//
// }