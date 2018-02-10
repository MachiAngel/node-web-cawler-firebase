
//const
const path = require('path')
//model
const moment = require('moment')
const Bank = require('../model/bank.js')
const Rate = require('../model/rate.js')

//db
const {FirebaseDb} = require('../db/firebaseDb')
const {pgdb} = require('../db/pgdb')


//util and crawler

const cralwer = require('../crawler/crawler')
const YahooMovieCrawler = require('../crawler/yahoo_movie_crawler')
const yahooCrawler = new YahooMovieCrawler()
const beautyCrawler = require('../crawler/ptt_beauty_crawler')


const crawlerAndSaveBeautyArticleToPGDB = async () => {
    
    try {
        const resultArray = await beautyCrawler.getBeautyPageResult(3)
        const savedResults = []
        for (let aritcle of resultArray) {
            try {
                const savedResult = await beautyCrawler.updateOrInsertArticleToDb('ptt_beauty_article',aritcle, pgdb)
                savedResults.push(savedResult)
            }catch (e) {
                savedResults.push(e.message)
            }
        }
        return savedResults
    }catch (e) {
        return e.message
    }
    
}


const crawlAndSaveYahooMovieToFirebase = async () => {

  try {
    const resultArray = await yahooCrawler.getFinalYahooTopMovieData()

    const finalDict = {}
    finalDict[`/YahooTopMovie/`] = resultArray
    const savedResult = await saveToFireBasePromise(finalDict)
    return savedResult
  }catch (e) {
    return e.message
  }
  
}

//公用function firebase
const saveLastestRateToFirebase = async (bankCode) => {
    const bankInfo = bankInfoDict[bankCode]
    const finalDict = {}

    if (bankInfo === undefined) {
        throw new Error(`沒有${bankCode}的bankInfo資料`)
    }
    const resultDict = await bankInfo.bankCawler()
    const momentResultTime = resultDict.resultTime

    //轉換後資料
    const resultTimeString = momentResultTime.format('YYYY/MM/DD HH:mm')
    const newResultDict = parseMomentTimeToStringAndSort(resultDict)


    //Bank路徑 銀行儲存字典
    const dataDict = {
        bankName:bankInfo.bankName,
        bankCode:bankCode,
        rateTime:resultTimeString,
        rateList:newResultDict}

    //幣別儲存字典
    Object.keys(newResultDict).map((key,index) => {
        const rateDict = newResultDict[key]
        rateDict['rateTime'] = resultTimeString
        rateDict['bankName'] = bankInfo.bankName
        rateDict['bankCode'] = bankCode
        finalDict[`/LatestRate/${key}/${bankCode}`] = rateDict
    })

    //上傳
    finalDict[`/Bank/${bankInfo.bankCode}/`] = dataDict
    const savedResult = await saveToFireBasePromise(finalDict)

    checkBestRate(dataDict)

    if (savedResult != 'success') {
        return undefined
    }
    return savedResult
}

const checkBestRate = ({bankName, bankCode, rateTime, rateList} ) => {

    Object.keys(rateList).map((key,index) => {

        const rateDict = rateList[key]
        const {cashBuying, cashSelling, spotBuying, spotSelling} = rateDict

        FirebaseDb.ref(`/BestRate/${key}`).transaction((currentValue) => {
            if (currentValue == null) {
                const dict = {
                    cashBuying: {cashBuying, bankName, bankCode, rateTime},
                    cashSelling: {cashSelling, bankName, bankCode, rateTime},
                    spotBuying: {spotBuying, bankName, bankCode, rateTime},
                    spotSelling: {spotSelling, bankName, bankCode, rateTime}
                }

                return dict
            }
            const penddingValue = currentValue
            //銀行買越大越好
            if (penddingValue.cashBuying.cashBuying < cashBuying) {
                penddingValue.cashBuying = {cashBuying, bankName, bankCode, rateTime}
            }
            //銀行賣越小越好
            if (penddingValue.cashSelling.cashSelling > cashSelling) {
                penddingValue.cashSelling = {cashSelling, bankName, bankCode, rateTime}
            }
            if (penddingValue.spotBuying.spotBuying < spotBuying) {
                penddingValue.spotBuying = {spotBuying, bankName, bankCode, rateTime}
            }
            if (penddingValue.spotSelling.spotSelling > spotSelling) {
                penddingValue.spotSelling = {spotSelling, bankName, bankCode, rateTime}
            }
            return penddingValue
        })

    })


}

//連路徑都包在dict裡面上傳到firebase
const saveToFireBasePromise = (dict) => {
    return new Promise((resolve,reject) => {
        const ref = FirebaseDb.ref('/')
        ref.update(dict, (error) => {
            if (error) {
                reject(`${dict.bankName}儲存到firebase失敗`)
            }
            resolve('success')
        })
    })
}

const removeToFireBasePromise = () => {
    return new Promise((resolve,reject) => {
        const ref = FirebaseDb.ref('/BestRate')
        ref.set('', (error) => {
            if (error) {
                reject(`remove path /BestRate fail`)
            }
            resolve('remove path /BestRate success')
        })
    })
}



//拿個間銀行資料
const getFireBaseDataByBankCode = async (bankCode) => {
    const snapshot = await FirebaseDb.ref(`/Bank/${bankCode}`).once('value')
    const resultDict = snapshot.val()
    if (resultDict == null) {
        throw new Error('server error')
    }
    return resultDict
}


//
const getFireBaseBestRateByCurrency = async (currency) => {
    const snapshot = await FirebaseDb.ref(`/BestRate/${currency}`).once('value')
    const resultDict = snapshot.val()
    if (resultDict == null) {
        throw new Error('server error')
    }
    return resultDict
}


//將爬重資料整理成自己firebase設計的儲存格式
const parseMomentTimeToStringAndSort = (resultDict) => {
    const oldResultArray = resultDict.resultArray
    const newResultArray = oldResultArray.map(each => {
        each.time = each.time.format('YYYY/MM/DD HH:mm')
        return each
    })

    const rateDict = {}

    newResultArray.forEach(({currencyName,cashBuying,cashSelling,spotBuying,spotSelling}) => {
        rateDict[currencyName] = {cashBuying, cashSelling, spotBuying, spotSelling}
    })
    return rateDict
}

// getFireBaseBestRateByCurrency('CNY')
//     .then((result) => {
//         console.log(result)
//     }).catch((e) => {
//
// })

//公用function 非 firebase
const refreshBankDataFor = async (bankCode) => {
    const bankInfo = bankInfoDict[bankCode]
    if (bankInfo === undefined) {
        throw new Error(`沒有${bankCode}的bankInfo資料`)
    }
    const resultDict = await bankInfo.bankCawler()
    if(resultDict === undefined) {
        throw new Error(`${bankInfo.bankName}即時資料 undefined`)
    }
    //更新即時資料
    const bank = await Bank.findOneAndUpdate(
        {code:bankInfo.bankCode},
        {latestRates:resultDict.resultArray,currencyUpdateTime:resultDict.resultTime},
        {new: true})

    if(bank) {
        console.log(`更新${bankInfo.bankName}-即時匯率成功`)
    }
    //將每個幣別關連後存到歷史db
    for (let newRate of resultDict.resultArray) {
        const findResultRate = await Rate.findOne(newRate)
        if (findResultRate) {
            console.log(`有找到${bankInfo.bankName}的${findResultRate.currencyName}歷史資料 不用存`)
        }else {
            const latestRate = new Rate(newRate)
            latestRate.bank = bank
            bank.rates.push(latestRate)
            const savedBank = await bank.save()
            const savedRate = await latestRate.save()
            // const savedRate = await Rate.create(newRate)
            if (savedRate && savedBank) {
                console.log(`新增${bankInfo.bankName}的(${savedRate.currencyName})歷史資料成功,匯率時間:${savedRate.time}`)
            }else{
                console.log(`沒有${bankInfo.bankName}資料歷史資料-存入時也失敗`)
            }
        }
    }
    return `更新 ${bankInfo.bankCode} ${bankInfo.bankName} 完成`
}

const bankInfoDict = {
    '004':{
        bankName:'台灣銀行',
        bankCode:'004',
        bankCawler:cralwer.getRealTimeResultFromTaiwanBank
    },
    '017':{
        bankName:'兆豐商銀',
        bankCode:'017',
        bankCawler:cralwer.getRealTimeResultFromMegaBank
    },
    '808':{
        bankName:'玉山銀行',
        bankCode:'808',
        bankCawler:cralwer.getRealTimeResultFromEsunBank
    },
    '807':{
        bankName:'永豐銀行',
        bankCode:'807',
        bankCawler:cralwer.getRealTimeResultFromSinopacBank
    },
    '005':{
        bankName:'土地銀行',
        bankCode:'005',
        bankCawler:cralwer.getRealTimeResultFromLandBank
    },
    '008':{
        bankName:'華南銀行',
        bankCode:'008',
        bankCawler:cralwer.getRealTimeResultFromHuaNanBank
    },
    '009':{
        bankName:'彰化銀行',
        bankCode:'009',
        bankCawler:cralwer.getRealTimeResultFromChanghuaBank
    },
    '012':{
        bankName:'富邦銀行',
        bankCode:'012',
        bankCawler:cralwer.getRealTimeResultFromFubonBank
    },
    '103':{
        bankName:'新光銀行',
        bankCode:'103',
        bankCawler:cralwer.getRealTimeResultFromSkBank
    },
    '013':{
        bankName:'國泰世華',
        bankCode:'103',
        bankCawler:cralwer.getRealTimeResultFromCathayBank
    },
    '021':{
        bankName:'花旗銀行',
        bankCode:'021',
        bankCawler:cralwer.getRealTimeResultFromCitiBank
    },
    '081':{
        bankName:'滙豐銀行',
        bankCode:'081',
        bankCawler:cralwer.getRealTimeResultFromHSBank
    },
    '822':{
        bankName:'中國信託',
        bankCode:'822',
        bankCawler:cralwer.getRealTimeResultFromCTBCBank
    },
    '816':{
        bankName:'安泰銀行',
        bankCode:'816',
        bankCawler:cralwer.getRealTimeResultFromEntieBank
    },
    '815':{
        bankName:'日盛銀行',
        bankCode:'815',
        bankCawler:cralwer.getRealTimeResultFromjihSunBank
    },
    '814':{
        bankName:'大眾銀行',
        bankCode:'814',
        bankCawler:cralwer.getRealTimeResultFromTCBank
    },
    '812':{
        bankName:'台新銀行',
        bankCode:'812',
        bankCawler:cralwer.getRealTimeResultFromTaishinBank
    },
    '810':{
        bankName:'星展銀行',
        bankCode:'810',
        bankCawler:cralwer.getRealTimeResultFromDBSBank
    },
    '809':{
        bankName:'凱基銀行',
        bankCode:'809',
        bankCawler:cralwer.getRealTimeResultFromKgiBank
    },
    '806':{
        bankName:'元大銀行',
        bankCode:'806',
        bankCawler:cralwer.getRealTimeResultFromYuantaBank
    },
    '805':{
        bankName:'遠東銀行',
        bankCode:'805',
        bankCawler:cralwer.getRealTimeResultFromFarEastBank
    },
    '803':{
        bankName:'聯邦銀行',
        bankCode:'803',
        bankCawler:cralwer.getRealTimeResultFromUBOTBank
    },
    '147':{
        bankName:'三信銀行',
        bankCode:'147',
        bankCawler:cralwer.getRealTimeResultFromCotaBank
    },
    '118':{
        bankName:'板信銀行',
        bankCode:'118',
        bankCawler:cralwer.getRealTimeResultFromBOPBank
    },
    '108':{
        bankName:'陽信銀行',
        bankCode:'108',
        bankCawler:cralwer.getRealTimeResultFromSunnyBank
    },
    '053':{
        bankName:'台中銀行',
        bankCode:'053',
        bankCawler:cralwer.getRealTimeResultFromTaichungBank
    },
    '050':{
        bankName:'台灣企銀',
        bankCode:'050',
        bankCawler:cralwer.getRealTimeResultFromTbbBank
    },
    '016':{
        bankName:'高雄銀行',
        bankCode:'016',
        bankCawler:cralwer.getRealTimeResultFromKaoHsiungBank
    },
    '052':{
        bankName:'渣打銀行',
        bankCode:'052',
        bankCawler:cralwer.getRealTimeResultFromCharterBank
    },
    '007':{
        bankName:'第一銀行',
        bankCode:'007',
        bankCawler:cralwer.getRealTimeResultFromFirstBank
    },
    '006':{
        bankName:'合作金庫',
        bankCode:'006',
        bankCawler:cralwer.getRealTimeResultFromCooperativeBank
    }
}






module.exports = {
    refreshBankDataFor,
    saveLastestRateToFirebase,
    getFireBaseDataByBankCode,
    removeToFireBasePromise,
    getFireBaseBestRateByCurrency,
    crawlAndSaveYahooMovieToFirebase,
    crawlerAndSaveBeautyArticleToPGDB
}
