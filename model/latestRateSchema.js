const mongoose = require('mongoose')
const Schema = mongoose.Schema

const LatesRatetSchema = new Schema({
    currencyName:{
        type:String,
        required:true
    },
    bankName: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        required: true
    },
    cashBuying:{
        type:Number,
        default:0
    },
    cashSelling:{
        type:Number,
        default:0
    },
    spotBuying:{
        type:Number,
        default:0
    },
    spotSelling:{
        type:Number,
        default:0
    },
    bankCode:{
        type:String,
        required: true
    }
})
module.exports = LatesRatetSchema