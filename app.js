
const {saveLastestRateToFirebase, removeToFireBasePromise, crawlAndSaveYahooMovieToFirebase, crawlerAndSaveBeautyArticleToPGDB} = require('./util/util')
const schedule = require('node-schedule')

//const {getHistoryRateFromTaiwanBank} = require('./crawler/crawler.js')

//'*/4 * * * *'  每4分鐘


// 每x分
schedule.scheduleJob('*/4 * * * *', () => {
    console.log('--------開始匯率排程程式碼-----------')
    console.log(new Date())

    removeToFireBasePromise()
        .then((result) => {
            console.log(result)
            cawlerStart()
        }).catch(e => {
        console.log(e.message)
        cawlerStart()
    })

    console.log('--------結束匯率排程程式碼-----------')
})


// 每x分
schedule.scheduleJob('*/10 * * * *', () => {
  
  console.log('--------開始表特文章排程程式碼-----------')
  crawlerAndSaveBeautyArticleToPGDB()
      .then(resultArray => {
          console.log(resultArray)
      }).catch(e => {
          console.log(e.message)
  })
  console.log('--------結束表特文章排程程式碼-----------')
})



schedule.scheduleJob('0 */1 * * *', () => {
    console.log('--------開始電影排程程式碼-----------')
    crawlAndSaveYahooMovieToFirebase()
        .then((result) => {
            console.log(result)
        }).catch(e => {
        console.log(e.message)
    })
    console.log('--------結束電影排程程式碼-----------')

})


//每x秒
// schedule.scheduleJob('*/30 * * * * *', () => {
//     console.log('--------開始排程程式碼-----------')
//     console.log(new Date())
//
//     // refreshEsunBankData()
//     //     .then((result) => {
//     //         console.log(result)
//     //     }).catch((e) => {
//     //     console.log(e)
//     // })
//
//
//     console.log('--------結束排程程式碼-----------')
// })


const cawlerStart = () => {
    saveLastestRateToFirebase('004')
        .then((result) => {
            console.log(`'004' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('808')
        .then((result) => {
            console.log(`'808' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('008')
        .then((result) => {
            console.log(`'008' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('009')
        .then((result) => {
            console.log(`'009' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('012')
        .then((result) => {
            console.log(`'012' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('021')
        .then((result) => {
            console.log(`'021' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('081')
        .then((result) => {
            console.log(`'081' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('816')
        .then((result) => {
            console.log(`'816' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('815')
        .then((result) => {
            console.log(`'815' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('812')
        .then((result) => {
            console.log(`'812' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('810')
        .then((result) => {
            console.log(`'810' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('809')
        .then((result) => {
            console.log(`'809' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('806')
        .then((result) => {
            console.log(`'806' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('805')
        .then((result) => {
            console.log(`'805' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('803')
        .then((result) => {
            console.log(`'803' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })
    saveLastestRateToFirebase('118')
        .then((result) => {
            console.log(`'118' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })
    saveLastestRateToFirebase('108')
        .then((result) => {
            console.log(`'108' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })
    saveLastestRateToFirebase('050')
        .then((result) => {
            console.log(`'050' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })
    saveLastestRateToFirebase('016')
        .then((result) => {
            console.log(`'016' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })
    saveLastestRateToFirebase('052')
        .then((result) => {
            console.log(`'052' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('007')
        .then((result) => {
            console.log(`'007' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })

    saveLastestRateToFirebase('006')
        .then((result) => {
            console.log(`'006' save to firebase result:${result}`)
        }).catch((e) => {
        console.log(e)
    })
}
