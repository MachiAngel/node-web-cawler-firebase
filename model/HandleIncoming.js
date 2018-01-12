const {currencyETCDict, currencyETFDict, bankNameToBankCodeDict} = require('../util/constant')
const { MESSAGE_TYPE_BANK_RATE, MESSAGE_TYPE_BEST_RATE, MESSAGE_TYPE_PASS, MESSAGE_TYPE_WORNG_COMMAND, MESSAGE_TYPE_NO_MATCH} = require('../util/constant')
const haveFristSlash = (text) => {
    
    if (text.substring(0,1) == '/') {
        return true
    }else{
        return false
    }
}


const switchIncomingType = (string) => {
    
    if (!haveFristSlash(string)) {
        return {type:MESSAGE_TYPE_PASS,value:string}
    }
    const removeSlashString = string.substring(1,string.length)
    const array = removeSlashString.split(' ')
    const firstElement = array[0]
    const secondElement = array[1]
    
    //檢查是否查詢最佳匯率 是的話直接回傳 "幣別名稱"
    if (firstElement === 'best') {
        
        if (secondElement == undefined) {
            return {type:MESSAGE_TYPE_WORNG_COMMAND, value:'請輸入條件'}
        }
        
        if (currencyETCDict[secondElement.toUpperCase()] !== undefined ) {
            return {type:MESSAGE_TYPE_BEST_RATE, value:secondElement.toUpperCase()}
        }else{
            return {type:MESSAGE_TYPE_WORNG_COMMAND, value:secondElement}
        }
    }
    
    //檢查是否直接查詢 銀行資料 是的話直接回傳 "銀行代碼"
    if (bankNameToBankCodeDict[firstElement] !== undefined) {
        return {type:MESSAGE_TYPE_BANK_RATE, value:bankNameToBankCodeDict[firstElement]}
    }
    
    //剩下的...
    return {type:MESSAGE_TYPE_NO_MATCH, value:removeSlashString}
    
}


//firebase  /BANK/{bankcode} 底下字典 轉 string to dict
const bankResultDictToString = ({bankName,bankCode,rateList,rateTime}) => {
    let resultString = `⭐${bankCode} ${bankName} 最新匯率⭐`
    resultString += '\n'
    Object.keys(rateList).map((key,index) =>{
        const {cashBuying, cashSelling, spotBuying, spotSelling} = rateList[key]
        const currencyChineseName = currencyETCDict[key]
        const currencyFlag = currencyETFDict[key]
        
        resultString += `${currencyFlag}-${currencyChineseName}\n`
        if (cashBuying !== 0 && cashSelling !== 0) {
            // resultString += `現金買入:${cashBuying}\n現金賣出:${cashSelling}\n`
            resultString += '💰💰現金交易\n'
            resultString += `買入:${cashBuying} 賣出:${cashSelling}\n`
        }
        if (spotBuying !== 0 && spotSelling !== 0) {
            resultString += '📖📖即期交易\n'
            resultString += `買入:${spotBuying} 賣出:${spotSelling}\n`
        }
        resultString += '-----------------\n'
        //🔥
    })
    resultString += '\n'
    resultString += rateTime
    return resultString
    
}

//最佳匯率
const bestRateResultDictToString = (currencyName,{cashBuying,cashSelling,spotBuying,spotSelling}) => {
    const currencyChineseName = currencyETCDict[currencyName]
    let resultString = `⭐${currencyChineseName} 最佳換匯銀行⭐\n`
    resultString += `---------------------\n`
    resultString += `🔥現金交易🔥\n`
    resultString += `---------------------\n`
    resultString += `買入${currencyChineseName}最佳銀行👉${cashSelling.bankName}\n`
    resultString += `匯率:${cashSelling.cashSelling}\n`
    resultString += `1${currencyChineseName}=${cashSelling.cashSelling}台幣\n`
    resultString += `牌告時間:${cashSelling.rateTime}\n`
    resultString += `---------------------\n`
    resultString += `賣出${currencyChineseName}最佳銀行👉${cashBuying.bankName}\n`
    resultString += `匯率:${cashBuying.cashBuying}\n`
    resultString += `1${currencyChineseName}=${cashBuying.cashBuying}台幣\n`
    resultString += `牌告時間:${cashBuying.rateTime}\n`
    resultString += `---------------------\n`
    resultString += `🔥即期交易🔥\n`
    resultString += `---------------------\n`
    resultString += `買入${currencyChineseName}最佳👉${spotSelling.bankName}\n`
    resultString += `匯率:${spotSelling.spotSelling}\n`
    resultString += `1${currencyChineseName}=${spotSelling.spotSelling}台幣\n`
    resultString += `牌告時間:${spotSelling.rateTime}\n`
    resultString += `---------------------\n`
    resultString += `賣出${currencyChineseName}最佳👉${cashBuying.bankName}\n`
    resultString += `匯率:${spotBuying.spotBuying}\n`
    resultString += `1${currencyChineseName}=${spotBuying.spotBuying}新台幣\n`
    resultString += `牌告時間:${spotBuying.rateTime}\n`
    resultString += `----------------\n`
    return resultString
    
}


module.exports.haveFristSlash = haveFristSlash
module.exports.bankResultDictToString = bankResultDictToString
module.exports.switchIncomingType = switchIncomingType
module.exports.bestRateResultDictToString = bestRateResultDictToString

