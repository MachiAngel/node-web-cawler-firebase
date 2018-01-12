const mongoose = require('mongoose')
const Schema = mongoose.Schema
const LatestRateSchema = require('./latestRateSchema')
const BankSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    code:{
        type: String,
        required:true
    },
    rates: [{
        type:Schema.Types.ObjectId,
        ref:'rate'
    }],
    latestRates:{
        type: [LatestRateSchema],
        default: []
    },
    currencyUpdateTime:{
        type: Date,
        default: new Date()
    }
})

const Bank = mongoose.model('bank', BankSchema)

module.exports = Bank