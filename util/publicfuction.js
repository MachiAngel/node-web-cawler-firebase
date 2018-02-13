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


const replaceCHNumToNumAndlowerCase = (str) => {
    const chnNumChar = {'零':'0', '一':'1', '二':'2', '三':'3', '四':'4', '五':'5', '六':'6', '七':'7', '八':'8', '九':'9'}
    let repalceStr = str
    for (var x in chnNumChar) {
        repalceStr = repalceStr.replace(new RegExp(x, 'g'), chnNumChar[x]);
    }
    return repalceStr.toLowerCase().replace(/\s+/g, '').replace('：',':');
}

module.exports.convertStringToNumberFunction = convertStringToNumberFunction
module.exports.checkTime = checkTime
module.exports.getCurrentHourTime = getCurrentHourTime
module.exports.replaceCHNumToNumAndlowerCase = replaceCHNumToNumAndlowerCase