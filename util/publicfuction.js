const moment = require("moment")
const tz = require("moment-timezone")

const convertStringToNumberFunction = (str) => {
    return /^\d+\.?\d*$/.test(str) ? Number(str) : 0
}

const checkTime = () => {
    const nowMoment = moment()
    const nowHour = nowMoment.tz('Asia/Taipei').format('H')
    
    // const checkNumberRe = /(^[0-9]([.][0-9]{1,2})?$)|(^1[0-9]([.][0-9]{1,2})?$)|(^2[0-3]([.][0-9]{1,2})?$)|(^24([.]0{1,2})?$)/;
    // if (checkNumberRe(nowHour)) {
    //     return true
    // }else {
    //
    // }
    
    console.log(`現在台北時間小時:${nowHour}`)
    if (nowHour > 8 && nowHour < 21) {
        return true
    }else {
        return false
    }
}

const getCurrentHourTime = () => {
    const nowMoment = moment()
    const nowHour = nowMoment.tz('Asia/Taipei').format('H')
    
    return nowHour
}

module.exports.convertStringToNumberFunction = convertStringToNumberFunction
module.exports.checkTime = checkTime
module.exports.getCurrentHourTime = getCurrentHourTime