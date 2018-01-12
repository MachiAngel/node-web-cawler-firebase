const {checkTime} = require('./util/publicfuction')
const {getCurrentHourTime} = require('./util/publicfuction')
//先載入DB
const {mongoose} = require('./db/mongoose.js')

const schedule = require('node-schedule')

const {refreshBankDataFor} = require('./util/util')
const {saveLastestRateToFirebase} = require('./util/util')


// const rule = new schedule.RecurrenceRule()
// rule.minute = [0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57,60]

schedule.scheduleJob('*/4 * * * *', () => {
    console.log('--------開始排程程式碼-----------')
    console.log(new Date())

    const shouldReFlesh = checkTime()
    
    if (!shouldReFlesh) {
        const hourString = getCurrentHourTime()
        console.log(`沒有更新所有銀行 現在小時:${hourString}`)
        return
    }
    
    //#1 004 台灣銀行
    refreshBankDataFor('004')
        .then((result) => {
        console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#2 017 兆豐商銀
    refreshBankDataFor('017')
        .then((result) => {
        console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#3 808 玉山銀行
    refreshBankDataFor('808')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#4 807 永豐銀行
    refreshBankDataFor('807')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#5 005 土地銀行
    refreshBankDataFor('005')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#6 008 華南銀行
    refreshBankDataFor('008')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#7 009 彰化銀行
    refreshBankDataFor('009')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#8 012 富邦銀行
    refreshBankDataFor('012')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#9 103 新光銀行
    refreshBankDataFor('103')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#10 013 國泰世華
    refreshBankDataFor('013')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#11 021 花旗銀行
    if (shouldReFlesh) {
        refreshBankDataFor('021')
            .then((result) => {
                const hourString = getCurrentHourTime()
                console.log(`有更新花旗銀行 現在小時:${hourString}`)
                console.log(result)
            }).catch((e) => {
            console.log(e)
        })
    }else {
        const hourString = getCurrentHourTime()
        console.log(`沒有更新花旗銀行 現在小時:${hourString}`)
    }


    //#12 081 滙豐銀行
    refreshBankDataFor('081')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#13 822 中國信託
    refreshBankDataFor('822')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#14 816 安泰銀行
    refreshBankDataFor('816')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#15 815 日盛銀行
    refreshBankDataFor('815')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#16 814 大眾銀行
    refreshBankDataFor('814')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#17 812 台新銀行
    refreshBankDataFor('812')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#18 810 星展銀行
    refreshBankDataFor('810')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#19 809 凱基銀行
    refreshBankDataFor('809')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#20 806 元大銀行
    refreshBankDataFor('806')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#21 805 遠東銀行
    if (shouldReFlesh) {
        refreshBankDataFor('805')
            .then((result) => {
                const hourString = getCurrentHourTime()
                console.log(`有更新遠東銀行 現在小時:${hourString}`)
                console.log(result)
            }).catch((e) => {
            console.log(e)
        })
    }else {
        const hourString = getCurrentHourTime()
        console.log(`沒有更新遠東銀行 現在小時:${hourString}`)
    }

    //#22 803 聯邦銀行
    if (shouldReFlesh) {
        refreshBankDataFor('803')
            .then((result) => {
                const hourString = getCurrentHourTime()
                console.log(`有更新聯邦銀行 現在小時:${hourString}`)
                console.log(result)
            }).catch((e) => {
            console.log(e)
        })
    }else {
        const hourString = getCurrentHourTime()
        console.log(`沒有更新聯邦銀行 現在小時:${hourString}`)
    }


    //#23 147 三信銀行
    refreshBankDataFor('803')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#24 118 板信銀行
    refreshBankDataFor('118')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#25 陽信銀行
    refreshBankDataFor('108')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#26 053 台中銀行
    if (shouldReFlesh) {
        refreshBankDataFor('053')
            .then((result) => {
                const hourString = getCurrentHourTime()
                console.log(`有更新台中銀行 現在小時:${hourString}`)
                console.log(result)
            }).catch((e) => {
            console.log(e)
        })
    }else {
        const hourString = getCurrentHourTime()
        console.log(`沒有更新台中銀行 現在小時:${hourString}`)
    }

    //#27 台灣企銀
    refreshBankDataFor('050')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#28 高雄銀行
    refreshBankDataFor('016')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    //#29 渣打銀行
    refreshBankDataFor('052')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    //#30 第一銀行
    refreshBankDataFor('007')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })
    
    //#31 合作金庫
    refreshBankDataFor('006')
        .then((result) => {
            console.log(result)
        }).catch((e) => {
        console.log(e)
    })

    console.log('--------執行程式碼結束..等待異步-----------')
})
