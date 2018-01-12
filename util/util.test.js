//third part
const expect = require('expect')
const mongoose = require('mongoose')
const moment = require("moment")
//util
const {getBank} = require('./util')
const {getLatestRate} = require('./util')
const {saveMegaBankHistory} = require('./util')
const {refreshEsunBankData} = require('./util')
const {refreshLandBankData} = require('./util')
const {refreshHuaNanBankData} = require('./util')

const SupportCurrency = require('./supportCurrency')
const cralwer = require('../crawler/crawler')

//model
const Bank = require('../model/bank.js')
const Rate = require('../model/rate.js')


mongoose.Promise = global.Promise

describe.skip('台灣銀行API test',() => {

    before((done) => {
        mongoose.connect('mongodb://localhost/bank_test',{
            useMongoClient: true
        })
        mongoose.connection
            .once('open', () => {
                const {banks, rates} = mongoose.connection.collections
                banks.drop(() => {
                    rates.drop(() => {
                        console.log('remove collections')
                        getBank('台灣銀行','004')
                            .then(() => {
                                done()
                            })

                    })
                })

            })
            .on('error', (error) => {
                console.log('Warning Error', error);
            })
    })

    it('應該會爬到最近六個月台灣銀行資料 並存到資料庫', async () => {
        const currencyArray = SupportCurrency.currencyArrayOf004
        //資料量
        var totalCount = 0
        //拿到銀行
        const taiwanBank = await getBank('台灣銀行','004')

        //爬取每一種貨幣 共19種
        for (let curreny of currencyArray) {
            //爬取結果
            const resultArray = await cralwer.getHistoryResultFromTaiwanBank(curreny)
            totalCount += resultArray.length

            //要是有台灣銀行(一定要有), 存入結果關連
            if (taiwanBank) {
                for (let rate of resultArray) {
                    const rateModel = new Rate(rate)
                    rateModel.bank = taiwanBank
                    taiwanBank.rates.push(rateModel)
                    await taiwanBank.save()
                    await rateModel.save()
                }
            }else {
                console.log('沒有找到台灣銀行')
            }

        }
        //以上執行完後拿到所有台灣銀行資料
        const result = await Rate.find({'bankCode':'004'})
        expect(totalCount).toBe(result.length)
    })

    it('會下載最新19種幣別資料 並更新成功入DB', async () => {
        const resultDict = await cralwer.getRealTimeResultFromTaiwanBank()
        expect(resultDict.resultArray.length).toBe(19)
        const taiwanBank = await Bank.findOneAndUpdate(
            {code:'004'},
            {latestRates:resultDict.resultArray,currencyUpdateTime:resultDict.resultTime},
            {new: true})

        console.log(taiwanBank)
        if (taiwanBank) {
            expect(moment(taiwanBank.currencyUpdateTime).format('YYYY/MM/DD')).toBe(moment(resultDict.resultTime).format('YYYY/MM/DD'))
            expect(taiwanBank.latestRates.length).toBe(resultDict.resultArray.length)
        }else{
            throw new Error('can not find bank for update')
        }


        // if(currentUpdateTime.format('YYYY/MM/DD') === resultDict.resultTime.format('YYYY/MM/DD')) {
        //
        // }

    })


    it('預期資料庫內"台灣銀行"的"最新美元"的資料有在三天內(含假日日期不更新)', async () => {
        const rate = await getLatestRate('004','USD')

        if (rate) {
            expect(rate.bankName).toBe('台灣銀行')
            const lateThreeDay = moment().subtract(4,'days')
            console.log(`三天前的時間:${lateThreeDay.format('YYYY/MM/DD h:mm')}`)
            const rateTime = moment(rate.time)
            console.log(`匯率日期:${rateTime.format('YYYY/MM/DD h:mm')}`)
            expect(lateThreeDay.isBefore(rateTime)).toBe(true)
        }else{
            throw new Error('can not get latest rate')
        }
    })

    it('下載最新的存到兩個地方 要是歷史匯率有在資料庫 就不更新歷史', async () => {

        let resultDict = await cralwer.getRealTimeResultFromTaiwanBank()
        expect(resultDict.resultArray.length).toBe(19)
        const taiwanBank = await Bank.findOneAndUpdate(
            {code:'004'},
            {latestRates:resultDict.resultArray,currencyUpdateTime:resultDict.resultTime},
            {new: true})

        console.log(taiwanBank)
        //更新即時資料
        if (taiwanBank) {
            expect(moment(taiwanBank.currencyUpdateTime).format('YYYY/MM/DD')).toBe(moment(resultDict.resultTime).format('YYYY/MM/DD'))
            expect(taiwanBank.latestRates.length).toBe(resultDict.resultArray.length)
        }else{
            throw new Error('can not find bank for update')
        }
        //將每個幣別關連後存到歷史db

        for (let newRate of resultDict.resultArray) {
            const findResultRate = await Rate.findOne(newRate)
            if (findResultRate) {
                console.log('有找到 不用存~')
            }else {
                console.log('沒找到 存進去吧')
                const latestRate = new Rate(newRate)
                latestRate.bank = taiwanBank
                taiwanBank.rates.push(latestRate)
                const savedTaiwanBank = await taiwanBank.save()
                const savedRate = await latestRate.save()
                // const savedRate = await Rate.create(newRate)

                if (savedRate && savedTaiwanBank) {
                    expect(savedRate.bankName).toBe(newRate.bankName)
                    expect(savedTaiwanBank.name).toBe(taiwanBank.name)
                }else{
                    throw new Error('拿不到存入的rate返回值')
                }
            }
        }

    })

    after((done) => {
        mongoose.disconnect()
        done()
    })
})



describe.skip('兆豐銀行測試存入db', () => {
    
    before((done) => {
        mongoose.connect('mongodb://localhost/bank_test',{
            useMongoClient: true
        })
        mongoose.connection
            .once('open', () => {
                const {banks, rates} = mongoose.connection.collections
                banks.drop(() => {
                    rates.drop(() => {
                        console.log('remove collections')
                        getBank('兆豐商銀','017')
                            .then(() => {
                                done()
                            })
                        
                    })
                })
                
            })
            .on('error', (error) => {
                console.log('Warning Error', error);
            })
    })
    
    it('應該將兆豐銀行歷史資料4600存進資料庫並關連銀行', async () => {
        await saveMegaBankHistory()
        const resultArray = await Rate.find({bankName:'兆豐商銀'})
        expect(resultArray.length).toBe(4600)
        
    })
    
    // it('應該將兆豐銀行歷史資料4600存進資料庫並關連銀行', async () => {
    //     await saveMegaBankHistory()
    //     const resultArray = await Rate.find({bankName:'兆豐商銀'})
    //     expect(resultArray.length).toBe(4600)
    //
    // })
    
    after((done) => {
        mongoose.disconnect()
        done()
    })
    
})


describe.skip('玉山銀行測試存入db', () => {
    
    before((done) => {
        mongoose.connect('mongodb://localhost/bank_test',{
            useMongoClient: true
        })
        mongoose.connection
            .once('open', () => {
                const {banks, rates} = mongoose.connection.collections
                banks.drop(() => {
                    rates.drop(() => {
                        console.log('remove collections')
                        getBank('玉山銀行','808')
                            .then(() => {
                                done()
                            })
                        
                    })
                })
                
            })
            .on('error', (error) => {
                console.log('Warning Error', error);
            })
    })
    
    it('應該要存入玉山銀行最新16種匯率到db', async () => {
        
        await refreshEsunBankData()
        const esunBank = await Bank.findOne({code:'808'})
        console.log(esunBank)
        const latestRatesCount = esunBank.latestRates.length
        expect(latestRatesCount).toBe(15)
    
    })
    
    after((done) => {
        mongoose.disconnect()
        done()
    })
    
})


describe.skip('土地銀行測試即時資料存入db', () => {
    
    before((done) => {
        mongoose.connect('mongodb://localhost/bank_test',{
            useMongoClient: true
        })
        mongoose.connection
            .once('open', () => {
                const {banks, rates} = mongoose.connection.collections
                banks.drop(() => {
                    rates.drop(() => {
                        console.log('remove collections')
                        getBank('土地銀行','005')
                            .then(() => {
                                done()
                            })
                        
                    })
                })
                
            })
            .on('error', (error) => {
                console.log('Warning Error', error);
            })
    })
    
    it('應該要存入土地銀行最新14種匯率到db', async () => {
        
        await refreshLandBankData()
        const landBank = await Bank.findOne({code:'005'})
        console.log(landBank)
        const latestRatesCount = landBank.latestRates.length
        expect(latestRatesCount).toBe(14)
        
    })
    
    after((done) => {
        mongoose.disconnect()
        done()
    })
    
})


describe.skip('華南銀行測試即時資料存入db', () => {
    
    before((done) => {
        mongoose.connect('mongodb://localhost/bank_test',{
            useMongoClient: true
        })
        mongoose.connection
            .once('open', () => {
                const {banks, rates} = mongoose.connection.collections
                banks.drop(() => {
                    rates.drop(() => {
                        console.log('remove collections')
                        getBank('華南銀行','008')
                            .then(() => {
                                done()
                            })
                        
                    })
                })
                
            })
            .on('error', (error) => {
                console.log('Warning Error', error);
            })
    })
    
    it('應該要存入華南銀行最新15種匯率到db', async () => {
        
        await refreshHuaNanBankData()
        const landBank = await Bank.findOne({code:'008'})
        console.log(landBank)
        const latestRatesCount = landBank.latestRates.length
        expect(latestRatesCount).toBe(15)
        
    })
    
    after((done) => {
        mongoose.disconnect()
        done()
    })
    
})




















// const {convertStringToNumberFunction} = require('./publicfuction')
// const publicFuction = require('./publicfuction')
//
// //測試function
// const a = convertStringToNumberFunction('12345678')
// console.log(a)
//
// const b = publicFuction.convertStringToNumberFunction('12345678a')
// console.log(b)

