const mongoose = require('mongoose')
const Bank = require('./model/bank')

if (process.env.NODE_ENV !== 'test') {
    mongoose.Promise = global.Promise
    mongoose.connection.openUri('mongodb://localhost/bank')
    const db = mongoose.connection
    db.on('error', console.error.bind(console, '连接错误:'));
    db.once('open', function() {
        console.log('connent to mongo db success')
        console.log(`current node env : ${process.env.NODE_ENV}`)
    })
    
    const taiwanBank = new Bank({name:'土地銀行',code:'005'})
    taiwanBank.save()
        .then((bank) => {
            console.log(`success save : ${bank}`)
        }).catch((e) => {
        console.log(e)
    })
}

// const getBank = async (bankName,bankCode) => {
//     try {
//         const bank = await Bank.findOne({code:bankCode})
//         if(bank){
//             return bank
//         }else{
//             const bank = new Bank({name:bankName,code:bankCode})
//             const savedBank = await bank.save()
//             if (savedBank) {
//                 return savedBank
//             }else{
//                 throw new Error()
//             }
//
//         }
//     }catch (e) {
//         throw new Error('can not find or create bank')
//     }
// }