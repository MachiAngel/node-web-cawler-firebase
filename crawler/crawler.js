const cheerio = require("cheerio")
const moment = require("moment")
const axios = require('axios')
const phantom = require('phantom')
const request = require('request')
const iconv = require('iconv-lite')


// '211.21.120.163', '8080'

const supportCurrency = require('../util/supportCurrency')
const {convertStringToNumberFunction} = require('../util/publicfuction')


function waitUntil(asyncTest) {
    return new Promise(function(resolve, reject) {
        function wait() {
            console.log('loop...')
            asyncTest().then(function(value) {
                console.log('value', value)
                if (value === true) {
                    resolve();
                } else {
                    setTimeout(wait, 100);
                }
            }).catch(function(e) {
                console.log('Error found. Rejecting.', e);
                reject();
            });
        }
        wait();
    });
}


const lateTime = async (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        },time)
    })
}

// const requestPage$ = async (url) => {
//     const config = {
//         url: "https://ebank.landbank.com.tw/infor/infor.aspx?eventtarget=querycurrency",
//         method: "GET"
//     }
//     request(config, function(error, response, body) {
//         if (error || !body) {
//             console.log(error.message)
//             return
//         }else{
//
//             // 爬完網頁後要做的事情
//             console.log(body)
//         }
//     })
//
// }
// requestPage$()

const getPage$ = async (url) => {
    try{
        const response = await axios.get(url)
        
        const $ = cheerio.load(response.data)
        //console.log(response.data)
        return $
    }catch (e){
        console.log(e.message)
        throw new Error(`can not get $ from ${url}`)
    }
}

const getPageTest$ = async (url) => {
    try{
        const response = await axios.get(url)
        
        const $ = cheerio.load(response.data)
        console.log(response.data)
        return $
    }catch (e){
        console.log(e.message)
        throw new Error(`can not get $ from ${url}`)
    }
}

//for 008華南  816安泰  803聯邦 108陽信銀行 052 渣打銀行
const getBig5Page$ = async (url) => {
    try{
        const response = await axios.get(url,{ responseType: 'arraybuffer' })
        const body = iconv.decode(response.data, 'BIG5')
        // console.log(body)
        const $ = cheerio.load(body)
        return $
    }catch (e){
        console.log(e.message)
        throw new Error(`can not get $ from ${url}`)
    }
}

const getDynamicPage$ = async (url,proxy) => {
    //取得instance
    const instance = await phantom.create()
    try{
        const page = await instance.createPage()
        // page.setting('resourceTimeout',50000)
        await page.on('onResourceTimeout', function(requestData) {
            console.info('Requesting', requestData);
        })
        if (proxy !== undefined) {
            console.log(`網址:${url} 使用proxy:${proxy}`)
            page.setProxy(proxy)
        }
        //打開網頁
        const status = await page.open(url)
        if (status !== 'success') {
            throw new Error()
        }
        //等待3秒 html的js才會加載完畢
        await lateTime(3000)
        //獲取網頁
        const content = await page.property('content')
        //page.render('bank.jpeg', {format: 'jpeg', quality: '100'})//
        await instance.exit()
        const $ = cheerio.load(content)
        return $
    }catch (e){
        await instance.exit()
        throw new Error(`can not get $ from ${url}`)
    }
}

//050 合作金庫即時資料 - 民國轉西元
const parseCooperativeBankDate = (str) => {
    //不包含 查詢日期： 查詢時間： 直接treturn
    if (!(str.includes('查詢日期：') && str.includes('查詢時間：'))) {
        return ''
    }
    
    const replaceString = str.replace('查詢日期：', '').replace('查詢時間：', '')
    const yearString = replaceString.substr(0,3)
    const yearNumber = convertStringToNumberFunction(yearString)
    if (yearNumber === 0) {
        return ''
    }
    const replaceString2 = replaceString.replace(yearString, `${yearNumber + 1911}`)
    return replaceString2
}

//006 合作金庫即時資料 - get data
const getRealTimeResultFromCooperativeBank = async () => {
    const url = `https://www.tcb-bank.com.tw/finance_info/Pages/foreign_spot_rate.aspx`
    const $ = await getPage$(url)
    
    const timeString = $('#ctl00_PlaceHolderEmptyMain_PlaceHolderMain_fecurrentid_lblDate').text().trim()
    if (timeString === '') {
        console.log('拿不到合作金庫即時時間')
        return undefined
    }
    const latestDateString = parseCooperativeBankDate(timeString)
    if (latestDateString === ''){
        return undefined
    }
    
    const dateObj = moment(latestDateString, 'YYYY/MM/DD h:mm')
    

    const resultArray = parseRealTimeRateForCooperativeBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}

//006 合作金庫即時資料 - parse html
const parseRealTimeRateForCooperativeBank = ($, dateObj) => {
    const trs = $('#ctl00_PlaceHolderEmptyMain_PlaceHolderMain_fecurrentid_gvResult').find('tr')
    
    if (trs.length !== 29) {
        console.log('合作金庫 tr數量不是29個')
        return []
    }
    const resultArray = []
    
    var dict = {}
    
    trs.each((i,tr) => {
        dict['bankName'] = '合作金庫'
        dict['bankCode'] = '006'
        dict['time'] = dateObj
        if (i === 0 ) {
            return
        }
        const tds = $(tr).find('td')
        //美金
        if (i === 1 || i === 2) {
            dict['currencyName'] = 'USD'
            if (i === 1) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
                
            }
            if (i === 2) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 3 || i === 4) {
            dict['currencyName'] = 'HKD'
            if (i === 3) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 4) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 5 || i === 6) {
            dict['currencyName'] = 'GBP'
            if (i === 5) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 6) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 7 || i === 8) {
            dict['currencyName'] = 'AUD'
            if (i === 7) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 8) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 9 || i === 10) {
            dict['currencyName'] = 'SGD'
            if (i === 9) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 10) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 11 || i === 12) {
            dict['currencyName'] = 'CHF'
            if (i === 11) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 12) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 13 || i === 14) {
            dict['currencyName'] = 'CAD'
            if (i === 13) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 14) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 15 || i === 16) {
            dict['currencyName'] = 'JPY'
            if (i === 15) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 16) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 17 || i === 18) {
            dict['currencyName'] = 'SEK'
            if (i === 17) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 18) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 19 || i === 20) {
            dict['currencyName'] = 'EUR'
            if (i === 19) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 20) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 21 || i === 22) {
            dict['currencyName'] = 'NZD'
            if (i === 21) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 22) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 23 || i === 24) {
            dict['currencyName'] = 'THB'
            if (i === 23) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 24) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 25 || i === 26) {
            dict['currencyName'] = 'ZAR'
            if (i === 25) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 26) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 27 || i === 28) {
            dict['currencyName'] = 'CNY'
            if (i === 27) {
                //即期買入
                const spotBuying = $(tds[2]).text().trim()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                //現金買入
                const cashBuying = $(tds[3]).text().trim()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
            
            }
            if (i === 28) {
                //即期賣匯
                const spotSelling = $(tds[2]).text().trim()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                //現金賣匯
                const cashSelling = $(tds[3]).text().trim()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf006.length) {
        return []
    }
    return resultArray
}

// getRealTimeResultFromCooperativeBank()

//007 第一銀行即時資料 - get data
const getRealTimeResultFromFirstBank = async () => {
    const url = `https://ibank.firstbank.com.tw/NetBank/7/0201.html?sh=none`
    const $ = await getPage$(url)
    const timeString = $('.locator2').text().trim()
    if (timeString === '') {
        console.log('拿不到第一銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    const resultArray = parseRealTimeRateForFirstBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//007 第一銀行即時資料 - parse html
const parseRealTimeRateForFirstBank = ($, dateObj) => {
    const trs = $('#table1').find('tr')
    
    const firstBankDict = {}
    
    trs.each((i,tr) => {
        if( i === 0 || i === 24) {
            return
        }
        
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        let sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        if (sliceName === 'CN') {
            sliceName = 'CNY'
        }
        const type = $(tds[1]).text().trim()
        // console.log(type)
        if (type === 'Spot') {
            const currencyDict = firstBankDict[sliceName]
            if (currencyDict === undefined) {

                const newDict = {
                    bankName:'第一銀行',
                    bankCode:'007',
                    time:dateObj,
                    currencyName:sliceName,
                    spotBuying:convertStringToNumberFunction($(tds[2]).text().trim()),
                    spotSelling:convertStringToNumberFunction($(tds[3]).text().trim()),
                    cashBuying:0,
                    cashSelling:0
                }
                firstBankDict[sliceName] = newDict

            } else {
                currencyDict['spotBuying'] = convertStringToNumberFunction($(tds[2]).text().trim())
                currencyDict['spotSelling'] = convertStringToNumberFunction($(tds[3]).text().trim())
            }

        }else if (type === 'Cash') {
            const currencyDict = firstBankDict[sliceName]
            if (currencyDict === undefined) {

                const newDict = {
                    bankName:'第一銀行',
                    bankCode:'007',
                    time:dateObj,
                    currencyName:sliceName,
                    spotBuying:0,
                    spotSelling:0,
                    cashBuying:convertStringToNumberFunction($(tds[2]).text().trim()),
                    cashSelling:convertStringToNumberFunction($(tds[3]).text().trim())
                }
                firstBankDict[sliceName] = newDict

            } else {
                currencyDict['cashBuying'] = convertStringToNumberFunction($(tds[2]).text().trim())
                currencyDict['cashSelling'] = convertStringToNumberFunction($(tds[3]).text().trim())
            }
        }else {
            return
        }
        
    })
    const resultArray = Object.values(firstBankDict)
    if (resultArray.length != supportCurrency.currencyArrayOf007.length) {
        return []
    }
    return resultArray
}

//052 渣打銀行即時資料 - get data
const getRealTimeResultFromCharterBank = async () => {
    const url = `http://www.standardchartered.com.tw/check/inquiry-rate-foreign-exchange.asp`
    const $ = await getBig5Page$(url)
    const timeString = $('#dotline').next().text().trim()
    
    if (timeString === '') {
        console.log('拿不到渣打銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = parseRealTimeRateForCharterBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}

//052 渣打銀行即時資料 - parse html
const parseRealTimeRateForCharterBank = ($, dateObj) => {
    const trs = $('#innertable').find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if (i === 0) return
        const dict = {}
        dict['bankName'] = '渣打銀行'
        dict['bankCode'] = '052'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tr).find('th').text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        if (!supportCurrency.currencyArrayOf052.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[2]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[3]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[0]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[1]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
    
        resultArray.push(dict)
    })
    // console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf052.length) {
        return []
    }
    return resultArray
}



//016 高雄銀行即時資料 - get data
const getRealTimeResultFromKaoHsiungBank = async () => {
    const url = `https://ibank.bok.com.tw/PIB/ca/ca02102/CA02102_HOME.xhtml`
    const $ = await getPage$(url)
    const timeString = $('.tb_date').text().trim()
    if (timeString === '') {
        console.log('拿不到高雄銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    const resultArray = parseRealTimeRateForKaoHsisungBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//016 高雄銀行即時資料 - parse html
const parseRealTimeRateForKaoHsisungBank = ($, dateObj) => {
    const trs = $('.tb_mul').find('tbody tr')
    const resultArray = []
    trs.each((i,tr) => {
        const dict = {}
        dict['bankName'] = '高雄銀行'
        dict['bankCode'] = '016'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(0,3)
        
        if (!supportCurrency.currencyArrayOf016.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf016.length) {
        return []
    }
    return resultArray
}

//050 台灣企銀 - 民國轉西元
const parseTbbBankDate = (str) => {
    const indexKey = str.indexOf('掛')
    const sliceString = str.slice(indexKey+5,str.length)
    
    const yearString = sliceString.substr(0,3)
    const yearNumber = convertStringToNumberFunction(yearString)
    if (yearNumber === 0) {
        return ''
    }
    const replaceString = sliceString.replace(yearString, `${yearNumber + 1911}`)
    return replaceString
}
//050 台灣企銀即時資料 - get data
const getRealTimeResultFromTbbBank = async () => {
    const url = `http://rate.tbb.com.tw/N030.jsp`
    const $ = await getPage$(url)
    const originalString = $('.dateinfo').text().trim()
    const timeString = parseTbbBankDate(originalString)
    console.log(timeString)
    if (timeString === '') {
        console.log('拿不到台灣企銀即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    console.log(dateObj)
    
    const resultArray = parseRealTimeRateForTbbBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//050 台灣企銀即時資料 - parse html
const parseRealTimeRateForTbbBank = ($, dateObj) => {
    const trs = $('table tbody tr')
    const tbbDict = {}
    trs.each((i,tr) => {
        if( i === 25 ) {
            return
        }
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const englishName = supportCurrency.chineseToEnglishDict[originCurrencyName]
        const type = $(tds[1]).text().trim()
        
        if (type === '即期') {
           const currencyDict = tbbDict[englishName]
            if (currencyDict === undefined) {
               
               const newDict = {
                   bankName:'台灣企銀',
                   bankCode:'050',
                   time:dateObj,
                   currencyName:englishName,
                   spotBuying:convertStringToNumberFunction($(tds[2]).text().trim()),
                   spotSelling:convertStringToNumberFunction($(tds[3]).text().trim()),
                   cashBuying:0,
                   cashSelling:0
               }
               tbbDict[englishName] = newDict
               
            } else {
                currencyDict['spotBuying'] = convertStringToNumberFunction($(tds[2]).text().trim())
                currencyDict['spotSelling'] = convertStringToNumberFunction($(tds[3]).text().trim())
            }
            
        }else if (type === '現金') {
            const currencyDict = tbbDict[englishName]
            if (currencyDict === undefined) {
        
                const newDict = {
                    bankName:'台灣企銀',
                    bankCode:'050',
                    time:dateObj,
                    currencyName:englishName,
                    spotBuying:0,
                    spotSelling:0,
                    cashBuying:convertStringToNumberFunction($(tds[2]).text().trim()),
                    cashSelling:convertStringToNumberFunction($(tds[3]).text().trim())
                }
                tbbDict[englishName] = newDict
        
            } else {
                currencyDict['cashBuying'] = convertStringToNumberFunction($(tds[2]).text().trim())
                currencyDict['cashSelling'] = convertStringToNumberFunction($(tds[3]).text().trim())
            }
        }else {
            return
        }
        
    })
    const resultArray = Object.values(tbbDict)
    
    if (resultArray.length != supportCurrency.currencyArrayOf050.length) {
        return []
    }
    return resultArray
}


//053 台中銀行即時資料 - get data
const getRealTimeResultFromTaichungBank = async () => {
    const url = `https://ibank.tcbbank.com.tw/PIB/cb5/cb501005/CB501005_01.faces`
    const $ = await getDynamicPage$(url)
    
    const dateObj = moment()
    const resultArray = parseRealTimeRateForTaiChungBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//053 台中銀行即時資料 - parse html
const parseRealTimeRateForTaiChungBank = ($, dateObj) => {
    const trs = $('.tb2').find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0 ) {
            return
        }
        const dict = {}
        dict['bankName'] = '台中銀行'
        dict['bankCode'] = '053'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        
        if (!supportCurrency.currencyArrayOf053.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[3]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[4]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[1]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[2]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    // console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf053.length) {
        return []
    }
    return resultArray
}

//108 陽信銀行即時資料 - get data
const getRealTimeResultFromSunnyBank = async () => {
    const url = `https://www.sunnybank.com.tw/webaccess/Frn2.asp`
    const $ = await getBig5Page$(url)
    
    const timeString = $('.contents_inquiry').find('td').text().trim()
    if (timeString === '') {
        console.log('拿不到星展銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY-MM-DD h:mm')
    const resultArray = parseRealTimeRateForSunnyBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//108 陽信銀行即時資料 - parse html
const parseRealTimeRateForSunnyBank = ($, dateObj) => {
    const trs = $(`.enquiry_screen`).find('tbody tr')
    const resultArray = []
    trs.each((i,tr) => {
        const dict = {}
        dict['bankName'] = '陽信銀行'
        dict['bankCode'] = '108'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const englishName = supportCurrency.chineseToEnglishDict[originCurrencyName]
        
        if (!supportCurrency.currencyArrayOf108.includes(englishName)) {
            return
        }
        dict['currencyName'] = englishName
        //即期買入
        const spotBuying = $(tds[3]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[4]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[1]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[2]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf108.length) {
        return []
    }
    return resultArray
}


//118 板信銀行 - 民國轉西元
const parseBOPBankDate = (str) => {
    
    const yearNumber = convertStringToNumberFunction(str)
    if (yearNumber === 0) {
        return ''
    }
    const replaceString = `${yearNumber + 1911}`
    return replaceString
}
//118 板信銀行即時資料 - get data
const getRealTimeResultFromBOPBank = async () => {
    const url = `http://www.bop.com.tw/bankinfo/BS1003.aspx`
    const $ = await getPage$(url)
    
    const yearString = $('#lblFxRateYear').text().trim()
    const modifyYearString = parseBOPBankDate(yearString)
    if(modifyYearString === '') {
        console.log('板信銀行pasre年份出錯')
        return undefined
    }
    const monthString = $('#lblFxRateMonth').text().trim()
    const dayString = $('#lblFxRateDay').text().trim()
    const hourString = $('#lblFxRateTime').text().trim()
    const timeString = `${modifyYearString}/${monthString}/${dayString} ${hourString}`
    //console.log(timeString)
    
    if (timeString === '') {
        console.log('拿不到板信銀行即時時間')
        return undefined
    }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    // console.log(dateObj)
    
    const resultArray = parseRealTimeRateForBOPBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//118 板信銀行即時資料 - parse html
const parseRealTimeRateForBOPBank = ($, dateObj) => {
    
    const trs = $('#gvFxRate').find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0) {
            return
        }
        const dict = {}
        dict['bankName'] = '板信銀行'
        dict['bankCode'] = '118'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const englishName = supportCurrency.chineseToEnglishDict[originCurrencyName]
        if (!supportCurrency.currencyArrayOf118.includes(englishName)) {
            return
        }
        dict['currencyName'] = englishName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    //console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf118.length) {
        return []
    }
    return resultArray
}


//147 三信銀行 - 除去不必要文字 and 民國轉西元
const parseCotaBankDate = (str) => {
    //不包含 查詢日期： 查詢時間： 直接treturn
    if (!(str.includes('■ 牌告日期：') && str.includes('時間：'))) {
        return ''
    }
    const replaceString = str.replace('■ 牌告日期：', '').replace('時間：', '')
    const yearString = replaceString.substr(0,3)
    const yearNumber = convertStringToNumberFunction(yearString)
    if (yearNumber === 0) {
        return ''
    }
    const replaceString2 = replaceString.replace(yearString, `${yearNumber + 1911}`)
    return replaceString2
}
//147 三信銀行即時資料 - get data
const getRealTimeResultFromCotaBank = async () => {
    const url = `https://www.cotabank.com.tw/web/interest_3`
    const $ = await getDynamicPage$(url)
    
    const originalString = $('#UpTime').text().trim()
    const timeString = parseCotaBankDate(originalString)
    
    if (timeString === '') {
        console.log('拿不到三信銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = parseRealTimeRateForCotaBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//147 三信銀行即時資料 - parse html
const parseRealTimeRateForCotaBank = ($, dateObj) => {
    
    //const dataTable = $('.tb_Box').find('table')[0]
    const trs = $('#T1').find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0 || i === 1) {
            return
        }
        const dict = {}
        dict['bankName'] = '三信銀行'
        dict['bankCode'] = '147'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf147.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf147.length) {
        return []
    }
    return resultArray
}



//803 聯邦銀行即時資料 - get data
const getRealTimeResultFromUBOTBank = async () => {
    const url = `https://mybank.ubot.com.tw/LoadAP/LoadAP?aptype=IBANK&pageid=IP0907300`
    const $ = await getBig5Page$(url)
    // if (timeString === '') {
    //     console.log('拿不到聯邦銀行即時時間')
    //     return undefined
    // }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment()
    const resultArray = parseRealTimeRateForUBOTBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//803 聯邦銀行即時資料 - parse html
const parseRealTimeRateForUBOTBank = ($, dateObj) => {
    const dataTable = $('table')[3]
    const trs = $(dataTable).find('tr')
    //寫死拿哪一個table 多一個判斷
    if (trs.length != 14) {
        return []
    }
    
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0 || i === 1) {
            return
        }
        const dict = {}
        dict['bankName'] = '聯邦銀行'
        dict['bankCode'] = '803'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf803.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    //console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf803.length) {
        return []
    }
    return resultArray
}


//805 遠東銀行即時資料 - get data
const getRealTimeResultFromFarEastBank = async () => {
    const url = `http://accessible.feib.com.tw/financialinfo/exchangerate03.aspx`
    const $ = await getPage$(url)
    
    //const timeString = $('.rates-date-datetime').text().trim()
    // console.log(timeString)
    // if (timeString === '') {
    //     console.log('拿不到星展銀行即時時間')
    //     return undefined
    // }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment()
    console.log(dateObj)
    
    const resultArray = parseRealTimeRateForFarEastBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//805 遠東銀行即時資料 - parse html
const parseRealTimeRateForFarEastBank = ($, dateObj) => {
    const trs = $('.mainTab').find('tbody tr')
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0 || i === 14) {
            return
        }
        const dict = {}
        dict['bankName'] = '遠東銀行'
        dict['bankCode'] = '805'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf805.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    //console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf805.length) {
        return []
    }
    return resultArray
}


//806 元大銀行 - 民國轉西元
const parseYuantaBankDate = (str) => {
    const yearString = str.substr(0,3)
    const yearNumber = convertStringToNumberFunction(yearString)
    if (yearNumber === 0) {
        return ''
    }
    const replaceString = str.replace(yearString, `${yearNumber + 1911}`)
    return replaceString
}
//806 元大銀行即時資料 - get data
const getRealTimeResultFromYuantaBank = async () => {
    const url = `https://www.yuantabank.com.tw/bank/exchangeRate/hostccy.do`
    const $ = await getPage$(url)
    
    const originalStringFirst = $('.info').find('span').first().text().trim()
    const originalStringLast = $('.info').find('span').last().text().trim()
    const chinaTimeString = originalStringFirst + ' ' + originalStringLast
    const timeString = parseYuantaBankDate(chinaTimeString)
    // console.log(timeString)
    if (timeString === '') {
        console.log('拿不到元大銀行即時時間')
        return undefined
    }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = parseRealTimeRateForYuanTaBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//806 元大銀行即時資料 - parse html
const parseRealTimeRateForYuanTaBank = ($, dateObj) => {
    
    const dataTable = $('.tb_Box').find('table')[0]
    const trs = $(dataTable).find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0 || i === 15) {
            return
        }
        const dict = {}
        dict['bankName'] = '元大銀行'
        dict['bankCode'] = '806'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        if (!supportCurrency.currencyArrayOf806.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf806.length) {
        return []
    }
    return resultArray
}


//809 凱基銀行即時資料 - get data
const getRealTimeResultFromKgiBank = async () => {
    const url = `https://www.kgibank.com/T01/T0111/rate03.jsp`
    const $ = await getPage$(url)
    
    const timeString = $('th').text().trim()
    //console.log(timeString)
    if (timeString === '') {
        console.log('拿不到星展銀行即時時間')
        return undefined
    }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = parseRealTimeRateForKgiBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//809 凱基銀行即時資料 - parse html
const parseRealTimeRateForKgiBank = ($, dateObj) => {
    const trs = $('.tb_05').find('tbody tr')
    const resultArray = []
    trs.each((i,tr) => {
        if( i === 0 || i === 1 || i === 16) {
            return
        }
        const dict = {}
        dict['bankName'] = '凱基銀行'
        dict['bankCode'] = '809'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        //const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf809.includes(originCurrencyName)) {
            return
        }
        dict['currencyName'] = originCurrencyName
        //即期買入
        const spotBuying = $(tds[2]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[3]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[4]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[5]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf809.length) {
        return []
    }
    return resultArray
}

//810 星展銀行即時資料 - get data
const getRealTimeResultFromDBSBank = async () => {
    const url = `https://www.dbs.com.tw/personal-zh/rates/foreign-exchange-rates.page`
    const $ = await getPage$(url)
    
    const timeString = $('.rates-date-datetime').text().trim()
    // console.log(timeString)
    if (timeString === '') {
        console.log('拿不到星展銀行即時時間')
        return undefined
    }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm A')
    // console.log(dateObj)
    
    const resultArray = parseRealTimeRateForDBSBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//810 星展銀行即時資料 - parse html
const parseRealTimeRateForDBSBank = ($, dateObj) => {
    const dataTable = $('.rates-fx-currency').find('table tbody')
    const trs = $(dataTable).find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        
        const dict = {}
        dict['bankName'] = '星展銀行'
        dict['bankCode'] = '810'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[1]).text().trim()
        //const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf810.includes(originCurrencyName)) {
            return
        }
        dict['currencyName'] = originCurrencyName
        //即期買入
        const spotBuying = $(tds[3]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[5]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf810.length) {
        return []
    }
    return resultArray
}

//812 台新銀行即時資料 - get data
const getRealTimeResultFromTaishinBank = async () => {
    const url = `https://www.taishinbank.com.tw/TS/TS06/TS0605/TS060502/index.htm?urlPath1=TS02&urlPath2=TS0202`
    const $ = await getPage$(url)
    
    const timeString = $('font').first().text().trim()
    console.log(timeString)
    if (timeString === '') {
        console.log('拿不到台新銀行即時時間')
        return undefined
    }
    //const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    console.log(dateObj)
    
    const resultArray = parseRealTimeRateForTaishinBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//812 台新銀行即時資料 - pasre Html
const parseRealTimeRateForTaishinBank = ($, dateObj) => {
    const dataTable = $('indexcontent').find('table')[3]
    const trs = $(dataTable).find('tr')
    
    const resultArray = []
    trs.each((i,tr) => {
        if (i === 0 ) {
            return
        }
        const dict = {}
        dict['bankName'] = '台新銀行'
        dict['bankCode'] = '812'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf812.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    // console.log(resultArray)
    // if (resultArray.length != supportCurrency.currencyArrayOf814.length) {
    //     return []
    // }
    return resultArray
}

//814 大眾銀行即時資料 - get data
const getRealTimeResultFromTCBank = async () => {
    const url = `http://www.tcbank.com.tw/tw/ExchangeRate/Current`
    const $ = await getPage$(url)
    
    const timeString = $('.activeBox').find('strong').text().trim()
    if (timeString === '') {
        console.log('拿不到大眾銀行即時時間')
        return undefined
    }
    
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = parseRealTimeRateForTCBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//814 大眾銀行即時資料 - pasre Html
const parseRealTimeRateForTCBank = ($, dateObj) => {
    
    const trs = $('.table_typle3').find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if (i === 0 || i === 1) {
            return
        }
        const dict = {}
        dict['bankName'] = '大眾銀行'
        dict['bankCode'] = '814'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[1]).text().trim()
        if (!supportCurrency.currencyArrayOf814.includes(originCurrencyName)) {
            return
        }
        dict['currencyName'] = originCurrencyName
        //即期買入
        const spotBuying = $(tds[4]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[5]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[2]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[3]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf814.length) {
        return []
    }
    return resultArray
}

//815 日盛銀行 - 時間轉換
const parsejihSunBankDate = (str) => {
    //2017/12/15 下午 06:00:00
    //不包含 下午or上午 直接treturn
    var modifyTimeString = ''
    if (str.includes('上午 ')) {
        modifyTimeString = str.replace('上午 ','AM ')
    }else if (str.includes('下午 ')) {
        modifyTimeString = str.replace('下午 ','PM ')
    }
    return modifyTimeString
}

//815 日盛銀行即時資料 - return dict contains time and result array
const getRealTimeResultFromjihSunBank = async () => {
    const url = `http://rate.jihsunbank.com.tw/Rate/ExgRate.htm`
    const $ = await getPage$(url)
    
    const originalTimeString = $('em').text().trim()
    if (originalTimeString === '') {
        console.log('拿不到日盛銀行即時時間')
        return undefined
    }
    const modifiedTimeString = parsejihSunBankDate(originalTimeString)
    if (modifiedTimeString === '') {
        console.log('拿不到日盛銀行Modified後的即時時間')
        return undefined
    }
    const dateObj = moment(modifiedTimeString, 'YYYY/MM/DD A h:mm')
    const resultArray = parseRealTimeRateForjihSunBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}

//815 日盛銀行即時資料 - pasre Html
const parseRealTimeRateForjihSunBank = ($, dateObj) => {
    const dataTable = $('table')[2]
    const trs = $(dataTable).find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if (i === 0) {
            return
        }
        const dict = {}
        dict['bankName'] = '日盛銀行'
        dict['bankCode'] = '815'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const englishName = supportCurrency.chineseToEnglishDict[originCurrencyName]
        if (!supportCurrency.currencyArrayOf815.includes(englishName)) {
            console.log('日盛銀行轉換幣別名字出錯')
            return
        }
        dict['currencyName'] = englishName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf815.length) {
        return []
    }
    return resultArray
}

//816 安泰銀行 - 民國轉西元
const parseEntieBankDate = (str) => {
    //不包含 查詢日期： 查詢時間： 直接treturn
    if (!str.includes('更新日期時間: ')) {
        return ''
    }
    const replaceString = str.replace('更新日期時間: ','')
    const yearString = replaceString.substr(0,3)
    const yearNumber = convertStringToNumberFunction(yearString)
    if (yearNumber === 0) {
        return ''
    }
    const replaceString2 = replaceString.replace(yearString, `${yearNumber + 1911}`)
    return replaceString2
}
//816 安泰銀行即時資料 - return dict contains time and result array
const getRealTimeResultFromEntieBank = async () => {
    const url = `http://www.entiebank.com.tw/rate/page_host.asp`
    const $ = await getBig5Page$(url)
    
    const originalTimeString = $('font').text().trim()
    const modifyTimeString = parseEntieBankDate(originalTimeString)
    
    if (modifyTimeString === '') {
        console.log('拿不到安泰銀行即時時間')
        return undefined
    }
    const dateObj = moment(modifyTimeString, 'YYYY/MM/DD h:mm')
    const resultArray = parseRealTimeRateForEntieBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//816 安泰銀行即時資料 - pasre Html
const parseRealTimeRateForEntieBank = ($, dateObj) => {
    const dataTable = $('table').last()
    const trs = $(dataTable).find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        if (i === 0) {
            return
        }
        const dict = {}
        dict['bankName'] = '安泰銀行'
        dict['bankCode'] = '816'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        if (!supportCurrency.currencyArrayOf816.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    // console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf816.length) {
        return []
    }
    return resultArray
}


//822 中國信託即時資料 - get data
const getRealTimeResultFromCTBCBank = async () => {
    const url = `https://www.ctbcbank.com/CTCBPortalWeb/toPage?id=TW_RB_CM_ebank_018001`
    
    // 'http://211.21.120.163:8080'
    const $ = await getDynamicPage$(url)
    
    const timeTable = $('#pageForm').find('table').first()
    const timeString = $(timeTable).find('tr').last().text().trim()
    
    if (timeString === '') {
        console.log('拿不到中國信託即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    const resultArray = pasreRealTimeRateForCTBCBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//822 中國信託即時資料 - pasre Html
const pasreRealTimeRateForCTBCBank = ($, dateObj) => {
    // const dataTable = $('#pageForm').find('table').last()
    const trs = $('#mainTable').find('tr')
    
    const resultArray = []
    trs.each((i,tr) => {
        if (i === 0 ) {
            return
        }
        const dict = {}
        dict['bankName'] = '中國信託'
        dict['bankCode'] = '822'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length,originCurrencyName.length-3)
        
        if (!supportCurrency.currencyArrayOf822.includes(sliceName)) {
            return undefined
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[3]).text().trim()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[4]).text().trim()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[1]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[2]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf822.length) {
        return []
    }
    return resultArray
}

// getRealTimeResultFromCTBCBank().catch((e) => {
//     console.log(e.message)
// })

//081 滙豐銀行即時資料 - get data
const getRealTimeResultFromHSBank = async () => {
    const url = `https://www.hsbc.com.tw/1/2/Misc/popup-tw/currency-calculator`
    const $ = await getPage$(url)
    
    const timeString = $('.ForTime01').text().trim()
    if (timeString === '') {
        console.log('拿不到滙豐銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    const resultArray = pasreRealTimeRateForHSBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//081 滙豐銀行即時資料 - pasre Html
const pasreRealTimeRateForHSBank = ($, dateObj) => {
    const dataTable = $('.hsbcTableStyleForRates02').first()
    const trs = $(dataTable).find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        
        if (i === 0 || i === 1 || i === 2) {
            return
        }
        const dict = {}
        dict['bankName'] = '滙豐銀行'
        dict['bankCode'] = '081'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        
        if (!supportCurrency.currencyArrayOf081.includes(sliceName)) {
            return undefined
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf081.length) {
        return []
    }
    return resultArray
}


//021 花旗銀行即時資料 - get data
const getRealTimeResultFromCitiBank = async () => {
    const url = 'https://www.citibank.com.tw/TWGCB/apba/fxrts/InitializeSubApp.do?TTC=29&selectedBCC=TWD'
    const $ = await getPage$(url)
    const crawlerDateObj = moment()
    
    const resultArray = pasreRealTimeRateForCitiBank($, crawlerDateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:crawlerDateObj, resultArray:resultArray}
}
//021 花旗銀行 -  pasre html
const pasreRealTimeRateForCitiBank = ($, dateObj) => {
    const dataTable = $('#f1').find('table').last()
    const trs = $(dataTable).find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        
        if (i === 0 || i === 1) {
            return
        }
        const dict = {}
        dict['bankName'] = '花旗銀行'
        dict['bankCode'] = '021'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const currencyName = $(tds[1]).text().trim()
        if (!supportCurrency.currencyArrayOf021.includes(currencyName)) {
            return undefined
        }
        dict['currencyName'] = currencyName
        //即期買入
        const spotBuying = $(tds[3]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //即期賣匯
        const spotSelling = $(tds[2]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[5]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf021.length) {
        return []
    }
    return resultArray
}

//013 國泰世華即時資料 - get data
const getRealTimeResultFromCathayBank = async () => {
    const url = 'https://www.cathaybk.com.tw/cathaybk/personal/exchange/product/currency-billboard/'
    const $ = await getPage$(url)
    
    const originTimeString = $('#layout_0_rightcontent_1_firsttab01_1_tab_rate_realtime').find('p').text().trim()
    if (originTimeString === '') {
        console.log('拿不到國泰世華即時時間')
        return undefined
    }
    const dateObj = moment(originTimeString, 'YYYY年MM月DD日h時mm分')
    
    const resultArray = pasreRealTimeRateForCathayBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}

//013 國泰世華即時資料 - pasre Html
const pasreRealTimeRateForCathayBank = ($, dateObj) => {
    const trs = $('#layout_0_rightcontent_1_firsttab01_1_tab_rate_realtime').find('table').find('tbody').find('tr')
    console.log(trs.length)
    if (trs.length !== 21) {
        return []
    }
    const resultArray = []
    var dict = {}
    
    trs.each((i,tr) => {
        dict['bankName'] = '國泰世華'
        dict['bankCode'] = '013'
        dict['time'] = dateObj
        
        const tds = $(tr).find('td')
        //美金
        if (i === 0 || i === 1) {
            dict['currencyName'] = 'USD'
            if (i === 0) {
                //即期買入
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
            if (i === 1) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
                
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        
        if (i === 2 || i === 3) {
            dict['currencyName'] = 'CNY'
            if (i === 2 ) {
                //即期買匯
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
            
            if (i === 3) {
                //現金買入
                const cashBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
                
                //現金賣匯
                const cashSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        
        if (i === 4 || i === 5) {
            dict['currencyName'] = 'HKD'
            if (i === 4 ) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
                
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
            
            if (i === 5) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
                
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        
        if (i === 6) {
            dict['currencyName'] = 'GBP'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 7) {
            dict['currencyName'] = 'CHF'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 8) {
            dict['currencyName'] = 'AUD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 9) {
            dict['currencyName'] = 'SGD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 10) {
            dict['currencyName'] = 'CAD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 11) {
            dict['currencyName'] = 'SEK'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 12) {
            dict['currencyName'] = 'ZAR'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 13 || i === 14) {
            dict['currencyName'] = 'JPY'
            if (i === 13 ) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)

                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }

            if (i === 14) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)

                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 15) {
            dict['currencyName'] = 'DKK'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 16) {
            dict['currencyName'] = 'THB'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 17) {
            dict['currencyName'] = 'NZD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 18 || i === 19) {
            dict['currencyName'] = 'EUR'
            if (i === 17 ) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 18) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        
        if (i === 20) {
            dict['currencyName'] = 'TRY'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf013.length) {
        return []
    }
    return resultArray
}


//103 新光銀行即時資料 - get data
const getRealTimeResultFromSkBank = async () => {
    const url = 'https://rate.skbank.com.tw/SKBank_Accessible/ExchangeRate'
    const $ = await getDynamicPage$(url)
    
    const originTimeString = $('caption').text().trim()
    //console.log(originTimeString)
    
    if (originTimeString === '') {
        console.log('拿不到新光銀行即時時間')
        return undefined
    }
    const dateObj = moment(originTimeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = pasreRealTimeRateForSkBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//103 新光銀行即時資料 - parse html
const pasreRealTimeRateForSkBank = ($, dateObj) => {
    const trs = $('table tbody tr')
    const resultArray = []
    trs.each((i,tr) => {
        const dict = {}
        
        dict['bankName'] = '新光銀行'
        dict['bankCode'] = '103'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const currencyName = $(tds[0]).text().trim()
        if (!supportCurrency.currencyArrayOf103.includes(currencyName)) {
            return undefined
        }
        dict['currencyName'] = currencyName
        //即期買入
        const spotBuying = $(tds[2]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)

        //即期賣匯
        const spotSelling = $(tds[3]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)

        //現金買入
        const cashBuying = $(tds[4]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)

        //現金賣匯
        const cashSelling = $(tds[5]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf103.length) {
        return []
    }
    return resultArray
}


//012 富邦銀行即時資料 - get data
const getRealTimeResultFromFubonBank = async () => {
    // const url = `https://www.fubon.com/banking/personal/deposit/exchange_rate/exchange_rate_tw.htm`
    const url = 'https://www.fubon.com/Fubon_Portal/banking/Personal/deposit/exchange_rate/exchange_rate1.jsp'
    const $ = await getPage$(url)
    
    const originTimeString = $('.ico-date').text().trim()
    console.log(originTimeString)
    if (originTimeString === '') {
        console.log('拿不到富邦銀行即時時間')
        return undefined
    }
    
    const dateObj = moment(originTimeString, 'YYYY/MM/DD h:mm')
    const resultArray = pasreRealTimeRateForFubonBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//012 富邦銀行即時資料 - parse html
const pasreRealTimeRateForFubonBank = ($, dateObj) => {
    const trs = $('.rate-table').find('tbody tr')
    const resultArray = []
    trs.each((i,tr) => {
        const dict = {}
        
        dict['bankName'] = '富邦銀行'
        dict['bankCode'] = '012'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[1]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        
        if (!supportCurrency.currencyArrayOf012.includes(sliceName)) {
            return undefined
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spot = $(tds[3]).text().trim()
        const spotArray = spot.split('        ')
        if (spotArray.length == 2 ) {
            //即期買匯
            dict['spotBuying'] = convertStringToNumberFunction(spotArray[0].trim())
            //即期賣匯
            dict['spotSelling'] = convertStringToNumberFunction(spotArray[1].trim())
        }else {
            dict['spotBuying'] = 0
            dict['spotSelling'] = 0
        }
        const cash = $(tds[4]).text().trim()
        const cashArray = cash.split('       ')
        if (cashArray.length == 2 ) {
            //即期買匯
            dict['cashBuying'] = convertStringToNumberFunction(cashArray[0].trim())
            //即期賣匯
            dict['cashSelling'] = convertStringToNumberFunction(cashArray[1].trim())
        }else if (cashArray.length == 1 ){
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
        }
        
        if (dict.spotBuying === 0 && dict.spotSelling === 0 && dict.cashBuying === 0 && dict.cashSelling === 0 ){
            return
        }
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf012.length) {
        return []
    }
    return resultArray
}





//009 彰化銀行即時資料 - get data
const getRealTimeResultFromChanghuaBank = async () => {
    const url = `https://www.bankchb.com/chb_accessibility/G0100.jsp`
    const $ = await getPage$(url)
    
    const originTimeString = $('div table thead').find('td').last().text().trim()
    
    if (originTimeString === '') {
        console.log('拿不到彰化銀行即時時間')
        return undefined
    }
    const fixedTimeString = originTimeString.replace('資料更新時間: ','')
    
    if (fixedTimeString === '') {
        console.log('拿不到華南銀行即時時間')
        return undefined
    }

    const dateObj = moment(fixedTimeString, 'YYYY/MM/DD  h:mm')
    const resultArray = parseRealTimeRateForChangHuaBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//009 彰化銀行即時資料 - parse html
const parseRealTimeRateForChangHuaBank = ($, dateObj) => {
    const trs = $('div table tbody').find('tr')
    if (trs.length !== 20) {
        return []
    }
    
    const resultArray = []
    
    var dict = {}
    
    trs.each((i,tr) => {
        dict['bankName'] = '彰化銀行'
        dict['bankCode'] = '009'
        dict['time'] = dateObj
        if (i === 0 ) {
            return
        }
        const tds = $(tr).find('td')
        //美金
        if (i === 1 || i === 2) {
            dict['currencyName'] = 'USD'
            if (i === 1) {
                //即期買入
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)

                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
            if (i === 2) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)

                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 3) {
            dict['currencyName'] = 'GBP'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 4) {
            dict['currencyName'] = 'AUD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 5 || i === 6) {
            dict['currencyName'] = 'HKD'
            if (i === 5 ) {
                //即期買匯
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 6) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 7) {
            dict['currencyName'] = 'SGD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 8) {
            dict['currencyName'] = 'CAD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 9) {
            dict['currencyName'] = 'CHF'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 10) {
            dict['currencyName'] = 'ZAR'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 11) {
            dict['currencyName'] = 'SEK'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 12 || i === 13) {
            dict['currencyName'] = 'JPY'
            if (i === 12 ) {
                //即期買匯
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 13) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 14) {
            dict['currencyName'] = 'THB'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 15 || i === 16) {
            dict['currencyName'] = 'EUR'
            if (i === 15 ) {
                //即期買匯
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 16) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        if (i === 17) {
            dict['currencyName'] = 'NZD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 18 || i === 19) {
            dict['currencyName'] = 'CNY'
            if (i === 18 ) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
    
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 19) {
                //即期買匯
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
    
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf009.length) {
        return []
    }
    return resultArray
}


//008 華南銀行即時資料 - get data
const getRealTimeResultFromHuaNanBank = async () => {
    const url = `https://ibank.hncb.com.tw/netbank/pages/jsp/ExtSel/RTExange.html`
    const $ = await getBig5Page$(url)
    
    const originTimeString = $('.formtable_subject15rb').last().text().trim()
    if (originTimeString === '') {
        console.log('拿不到華南銀行即時時間')
        return undefined
    }
    const fixedTimeString = originTimeString.replace('資料生效時間：','')
    if (fixedTimeString === '') {
        console.log('拿不到華南銀行即時時間')
        return undefined
    }
    
    const dateObj = moment(fixedTimeString, 'YYYY/MM/DD  h:mm')
    const resultArray = parseRealTimeRateForHuaNanBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//008 華南銀行即時資料 - parse html
const parseRealTimeRateForHuaNanBank = ($, dateObj) => {
    const tables = $('table')
    const targetTable = tables[3]
    const trs = $(targetTable).find('tr')
    if (trs.length !== 24) {
        return []
    }
    const resultArray = []
    
    var dict = {}
    
    trs.each((i,tr) => {
        dict['bankName'] = '華南銀行'
        dict['bankCode'] = '008'
        dict['time'] = dateObj
        if (i === 0 || i === 24) {
            return
        }
    
        const tds = $(tr).find('td')
        //美金
        if (i === 1 || i === 2) {
            dict['currencyName'] = 'USD'
            if (i === 1) {
                //即期買入
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
    
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
            if (i === 2) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
    
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 3 || i === 4) {
            dict['currencyName'] = 'HKD'
            if (i === 3 ) {
                //即期買匯
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 4) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 5 || i === 6) {
            dict['currencyName'] = 'GBP'
            if (i === 5 ) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 6) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        
        if (i === 7) {
            dict['currencyName'] = 'NZD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
    
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
    
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
    
        if (i === 8 || i === 9) {
            dict['currencyName'] = 'AUD'
            if (i === 8 ) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 9) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 10) {
            dict['currencyName'] = 'SGD'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 11) {
            dict['currencyName'] = 'CHF'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
    
        if (i === 12 || i === 13) {
            dict['currencyName'] = 'CAD'
            if (i === 12) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 13) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 14 || i === 15) {
            dict['currencyName'] = 'JPY'
            if (i === 14) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 15) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 16) {
            dict['currencyName'] = 'SEK'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
    
        if (i === 17) {
            dict['currencyName'] = 'ZAR'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 18) {
            dict['currencyName'] = 'THP'
            //即期買匯
            const spotBuying = $(tds[1]).text()
            dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
            //即期賣匯
            const spotSelling = $(tds[2]).text()
            dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            dict['cashBuying'] = 0
            dict['cashSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        if (i === 19 || i === 20) {
            dict['currencyName'] = 'EUR'
            if (i === 19) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 20) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
        
        if (i === 21 || i === 22) {
            dict['currencyName'] = 'CNY'
            if (i === 21) {
                const spotBuying = $(tds[1]).text()
                dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
            
                //即期賣匯
                const spotSelling = $(tds[2]).text()
                dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
            }
        
            if (i === 22) {
                //現金買入
                const spotBuying = $(tds[1]).text()
                dict['cashBuying'] = convertStringToNumberFunction(spotBuying)
            
                //現金賣匯
                const spotSelling = $(tds[2]).text()
                dict['cashSelling'] = convertStringToNumberFunction(spotSelling)
                resultArray.push(dict)
                dict = {}
                return
            }
        }
    
        if (i === 23) {
            dict['currencyName'] = 'KRW'
            //即期買匯
            const cashBuying = $(tds[1]).text()
            dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
            //即期賣匯
            const cashSelling = $(tds[2]).text()
            dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
            
            dict['spotBuying'] = 0
            dict['spotSelling'] = 0
            resultArray.push(dict)
            dict = {}
            return
        }
        
    })
    
    
    if (resultArray.length != supportCurrency.currencyArrayOf008.length) {
        return []
    }
    return resultArray
}

//005 土地銀行即時資料 - get data
const getRealTimeResultFromLandBank = async () => {
    const url = `https://ebank.landbank.com.tw/infor/infor.aspx?__eventtarget=querycurrency`
    const $ = await getDynamicPage$(url)
    
    const timeString = $('#TbDateTime').text()
    console.log(timeString)
    if (timeString === '') {
        console.log('拿不到玉山銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    console.log(dateObj)
    const resultArray = pasreRealTimeRateForLandBank($, dateObj)

    if (resultArray.length === 0) {
        return undefined
    }
    const resultDict = {resultTime:dateObj, resultArray:resultArray}
    return resultDict
}
//005 土地銀行即時資料 - parse html
const pasreRealTimeRateForLandBank = ($, dateObj) => {
    const trs = $('.disptab').find('tr')
    console.log(trs.length)
    const resultArray = []
    trs.each((i,tr) => {
        //16個tr  只有後面14個是匯率 不加入也行 下面也會判斷
        if (i === 0 || i === 1) {
            return
        }
        const dict = {}
        dict['bankName'] = '土地銀行'
        dict['bankCode'] = '005'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        //貨幣名稱中文轉英文
        const translateName = supportCurrency.chineseToEnglishDict[`${originCurrencyName}`]
        
        //只要發現幣別沒在support裡面,就return換下一個tr
        if (!supportCurrency.currencyArrayOf005.includes(translateName)) {
            return
        }

        dict['currencyName'] = translateName
        //即期買入
        const spotBuying = $(tds[1]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)

        //即期賣匯
        const spotSelling = $(tds[2]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)

        //現金買入
        const cashBuying = $(tds[3]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)

        //現金賣匯
        const cashSelling = $(tds[4]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    
    if (resultArray.length != supportCurrency.currencyArrayOf005.length) {
        return []
    }
    return resultArray
}


//807 永豐銀行即時資料
const getRealTimeResultFromSinopacBank = async () => {
    const url = `https://bank.sinopac.com/MMA8/bank/html/rate/bank_ExchangeRate.html`
    const $ = await getDynamicPage$(url)
    
    const timeString = $('#tab1_date').text().trim()
    if (timeString === '') {
        console.log('拿不到永豐銀行即時時間')
        return undefined
    }
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    const resultArray = pasreRealTimeRateForSinopacBank($, dateObj)
    
    if (resultArray.length !== 16) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
const pasreRealTimeRateForSinopacBank = ($, dateObj) => {
    const trs = $('.data-table1').find('tr')
    const resultArray = []
    trs.each((i,tr) => {
        //18個tr  只有後面16個是匯率 不加入也行 下面也會判斷
        if (i === 0 || i === 1) {
            return
        }
        const dict = {}
        dict['bankName'] = '永豐銀行'
        dict['bankCode'] = '807'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        
        //只要發現幣別沒在support裡面,就return換下一個tr
        if (!supportCurrency.currencyArrayOf807.includes(sliceName)) {
            return
        }
        
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)

        //即期賣匯
        const spotSelling = $(tds[2]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)

        //現金買入
        const cashBuying = $(tds[3]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)

        //現金賣匯
        const cashSelling = $(tds[4]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    //console.log(resultArray)
    if (resultArray.length != supportCurrency.currencyArrayOf807.length) {
        return []
    }
    return resultArray
}

//808 玉山銀行即時資料 - get data
const getRealTimeResultFromEsunBank = async () => {
    const url = `https://www.esunbank.com.tw/bank/personal/deposit/rate/forex/foreign-exchange-rates`
    const $ = await getPage$(url)
    
    const timeString = $('#LbQuoteTime').text().trim()
    console.log(timeString)
    if (timeString === '') {
        console.log('拿不到玉山銀行即時時間')
        return undefined
    }
    
    const dateObj = moment(timeString, 'YYYY年MM月DD日 h:mm')
    //const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    //console.log(dateObj)
    
    const resultArray = pasreRealTimeRateForEsunBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//808 玉山銀行即時資料 - pasre Html
const pasreRealTimeRateForEsunBank = ($, dateObj) => {
    const trs = $('.tableContent-light')
    const resultArray = []
    trs.each((i,tr) => {
        const dict = {}
        
        dict['bankName'] = '玉山銀行'
        dict['bankCode'] = '808'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text().trim()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        if (!supportCurrency.currencyArrayOf808.includes(sliceName)) {
            return undefined
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
    
        //即期賣匯
        const spotSelling = $(tds[2]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        //現金買入
        const cashBuying = $(tds[3]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //現金賣匯
        const cashSelling = $(tds[4]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    if (resultArray.length != supportCurrency.currencyArrayOf808.length) {
        return []
    }
    return resultArray
}


//017 兆豐商銀即時資料 - get data
const getRealTimeResultFromMegaBank = async () => {
    const url = `https://wwwfile.megabank.com.tw/rates/M001/viewF.asp`
    const $ = await getDynamicPage$(url)
    
    const dateDateString = $('#dataDate').text().trim()
    const dateTimeString = $('#dataTime').text().trim()
    
    if (dateDateString === '' || dateTimeString === '') {
        console.log('拿不到兆豐銀行即時時間')
        return undefined
    }
    
    const timeString = `${dateDateString} ${dateTimeString}`
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    const resultArray = pasreRealTimeRateForMegaBank($, dateObj)
    if (resultArray.length === 0) {
        return undefined
    }
    return {resultTime:dateObj, resultArray:resultArray}
}
//017 兆豐商銀即時資料 - pasre Html
const pasreRealTimeRateForMegaBank = ($, dateObj) => {
    const resultArray = []
    
    const trs = $('#contentTbody').find('tr')
    console.log(trs.length)
    trs.each((i,tr) => {
        const dict = {}
        dict['bankName'] = '兆豐商銀'
        dict['bankCode'] = '017'
        dict['time'] = dateObj
        const tds = $(tr).find('td')
        //拿到貨幣名稱
        const originCurrencyName = $(tds[0]).text()
        const sliceName = originCurrencyName.substring(originCurrencyName.length-1,originCurrencyName.length-4)
        if (!supportCurrency.currencyArrayOf017.includes(sliceName)) {
            return
        }
        dict['currencyName'] = sliceName
        //即期買入
        const spotBuying = $(tds[1]).text()
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        
        //現金買入
        const cashBuying = $(tds[2]).text()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        
        //即期賣匯
        const spotSelling = $(tds[3]).text()
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        //現金賣匯
        const cashSelling = $(tds[4]).text()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        resultArray.push(dict)
    })
    return resultArray
}

//004 台灣銀行歷史資料 - 拿到並整理成array
const getHistoryResultFromTaiwanBank = async (currencyName) => {
    
    const url = `http://rate.bot.com.tw/xrt/quote/l6m/${currencyName}`
    const $ = await getPage$(url)
    const resultArray = pasreHistoryRateForTaiwanBank($, currencyName)
    return resultArray
    
}
//004 台灣銀行歷史資料 - 拿到html解析 成各種幣別即時資料組成的array
const pasreHistoryRateForTaiwanBank = ($, currencyName) => {
    //銀行名字
    
    const name = $('.pull-left').text()
    //const sliceName = name.substring(name.length - 1, name.length - 4);
    //拿到半年內每天的資料
    const trs = $('tbody').find('tr')
    console.log(trs.length)
    resultArray = []
    //每個tr 美金都是每日資料
    trs.each((i, tr) => {
        dict = {}
        //1.拿到該記錄時間
        const timeString = $(tr).find('td').first().text()
        const dateObj = moment(timeString, 'YYYY/MM/DD')
        //拿到現金
        const cash = $(tr).find('.rate-content-cash, .text-right .print_table-cell')
        //現金買入
        const cashBuying = cash.first().text()
        //現金賣出
        const cashSelling = cash.last().text()
        // console.log(`現金買入:${cashBuying}`)
        // console.log(`現金賣出:${cashSelling}`)
        //拿到即期
        const spot = $(tr).find('.rate-content-sight, .hidden-phone')
        //即期買入
        const spotBuying = spot.first().text()
        //即期賣出
        const spotSelling = spot.last().text()
        
        // console.log(`即期買入:${spotBuying}`)
        // console.log(`即期賣出:${spotSelling}`)
        // console.log(sliceName)
        
        dict['currencyName'] = currencyName
        dict['bankName'] = '台灣銀行'
        dict['bankCode'] = '004'
        dict['time'] = dateObj
        dict['cashBuying'] = convertStringToNumberFunction(cashBuying)
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        dict['spotBuying'] = convertStringToNumberFunction(spotBuying)
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        
        if (dict['cashBuying'] === 0 &&
            dict['cashSelling'] === 0 &&
            dict['spotBuying'] === 0 &&
            dict['spotSelling'] === 0) {
            
        }else {
            resultArray.push(dict)
        }
        
        //console.log(dict)
    })
    
    return resultArray
}
//004 台灣銀行即時資料 - 返回一個promise array 包含各種幣值的即時報價
const getRealTimeResultFromTaiwanBank = async () => {
    const url = `http://rate.bot.com.tw/xrt?Lang=zh-TW`
    const $ = await getPage$(url)
    const timeString = $('.time').text()
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    
    const resultArray = pasreRealTimeRateForTaiwanBank($)
    
    if (resultArray.length === 0) {
        return undefined
    }
    const resultDict = {resultTime:dateObj, resultArray:resultArray}
    // console.log(resultDict)
    return resultDict
}



//004 台灣銀行即時資料 - 拿到html解析 成各種幣別即時資料組成的array
const pasreRealTimeRateForTaiwanBank = ($) => {
    
    const resultArray = []
    //拿到時間 連時間都沒拿到 直接return
    const timeString = $('.time').text()
    if (timeString === '') {
      return resultArray
    }
    //轉換時間
    const dateObj = moment(timeString, 'YYYY/MM/DD h:mm')
    // console.log(dateObj)
    //拿到19個國家幣值的tr
    const trs = $('tbody').find('tr')
    // console.log(trs.length)
    
    trs.each((i,tr) => {
        // const oneTr = trs[0]
        const dict = {}
        //名字
        const name = $(tr).find('.print_show').text().trim()
        //配合台灣銀行html拿到該幣別資料 ex: 美金 (USD) -> USD
        const sliceName = name.substring(name.length-1,name.length-4);
        
        dict['time'] = dateObj
        dict['currencyName'] = sliceName
    
        const tds = $(tr).find('td')
        //本行現金買入
        const cashBuy = $(tds[1]).text().trim()
        dict['cashBuying'] = convertStringToNumberFunction(cashBuy)
        //"本行現金賣出"
        const cashSelling = $(tds[2]).text().trim()
        dict['cashSelling'] = convertStringToNumberFunction(cashSelling)
        
        //"本行即期買入"
        const spotBuy = $(tds[3]).text().trim()
        
        dict['spotBuying'] = convertStringToNumberFunction(spotBuy)
        //"本行即期賣出"
        const spotSelling = $(tds[4]).text().trim()
        
        dict['spotSelling'] = convertStringToNumberFunction(spotSelling)
        dict['bankName'] = '台灣銀行'
        dict['bankCode'] = '004'
        resultArray.push(dict)
    })
    return resultArray
    
}


//台灣銀行 004
module.exports.getHistoryResultFromTaiwanBank = getHistoryResultFromTaiwanBank
module.exports.getRealTimeResultFromTaiwanBank = getRealTimeResultFromTaiwanBank

//兆豐商銀 017
module.exports.getRealTimeResultFromMegaBank = getRealTimeResultFromMegaBank

//玉山銀行 808
module.exports.getRealTimeResultFromEsunBank = getRealTimeResultFromEsunBank
//永豐銀行 807
module.exports.getRealTimeResultFromSinopacBank = getRealTimeResultFromSinopacBank

//土地銀行 005
module.exports.getRealTimeResultFromLandBank = getRealTimeResultFromLandBank

//華南銀行 008
module.exports.getRealTimeResultFromHuaNanBank = getRealTimeResultFromHuaNanBank

//彰化銀行 009
module.exports.getRealTimeResultFromChanghuaBank = getRealTimeResultFromChanghuaBank

//富邦銀行 012
module.exports.getRealTimeResultFromFubonBank = getRealTimeResultFromFubonBank

//新光銀行 103
module.exports.getRealTimeResultFromSkBank = getRealTimeResultFromSkBank

//國泰世華 013
module.exports.getRealTimeResultFromCathayBank = getRealTimeResultFromCathayBank

//花旗銀行 021
module.exports.getRealTimeResultFromCitiBank = getRealTimeResultFromCitiBank

//滙豐銀行 081
module.exports.getRealTimeResultFromHSBank = getRealTimeResultFromHSBank

//中國信託 822
module.exports.getRealTimeResultFromCTBCBank = getRealTimeResultFromCTBCBank

//安泰銀行 816
module.exports.getRealTimeResultFromEntieBank = getRealTimeResultFromEntieBank

//日盛銀行 815
module.exports.getRealTimeResultFromjihSunBank = getRealTimeResultFromjihSunBank

//大眾銀行 814
module.exports.getRealTimeResultFromTCBank = getRealTimeResultFromTCBank

//台新銀行 812
module.exports.getRealTimeResultFromTaishinBank = getRealTimeResultFromTaishinBank

//星展銀行 810
module.exports.getRealTimeResultFromDBSBank = getRealTimeResultFromDBSBank

//凱基銀行 809
module.exports.getRealTimeResultFromKgiBank = getRealTimeResultFromKgiBank

//元大銀行 806
module.exports.getRealTimeResultFromYuantaBank = getRealTimeResultFromYuantaBank

//遠東銀行 805
module.exports.getRealTimeResultFromFarEastBank = getRealTimeResultFromFarEastBank

//聯邦銀行 803
module.exports.getRealTimeResultFromUBOTBank = getRealTimeResultFromUBOTBank

//三信銀行 147
module.exports.getRealTimeResultFromCotaBank = getRealTimeResultFromCotaBank

//板信銀行 118
module.exports.getRealTimeResultFromBOPBank = getRealTimeResultFromBOPBank

//陽信銀行 108
module.exports.getRealTimeResultFromSunnyBank = getRealTimeResultFromSunnyBank

//台中銀行 053
module.exports.getRealTimeResultFromTaichungBank = getRealTimeResultFromTaichungBank

//台灣企銀 050
module.exports.getRealTimeResultFromTbbBank = getRealTimeResultFromTbbBank

//高雄銀行 016
module.exports.getRealTimeResultFromKaoHsiungBank = getRealTimeResultFromKaoHsiungBank

//渣打銀行 052
module.exports.getRealTimeResultFromCharterBank = getRealTimeResultFromCharterBank

//第一銀行 007
module.exports.getRealTimeResultFromFirstBank = getRealTimeResultFromFirstBank

//合作金庫 006
module.exports.getRealTimeResultFromCooperativeBank = getRealTimeResultFromCooperativeBank

// const rate = new Rate(dict)
// Bank.findOne({name:'台灣銀行'}).then()
//     .then((bank) => {
//         if (bank) {
//             rate.bank = bank
//             bank.rates.push(rate)
//             Promise.all([bank.save(),rate.save()])
//                 .then(() => {
//                     console.log(`save success:${i}`)
//
//                 }).catch((e) => {
//                 console.log(e)
//             })
//         }else {
//         }
//     }).catch((e) => {
//
// })
