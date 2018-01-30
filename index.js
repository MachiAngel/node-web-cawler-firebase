const {bankNameToBankCodeDict} = require('./util/constant')
const {getFireBaseDataByBankCode, getFireBaseBestRateByCurrency} = require('./util/util')
const { MESSAGE_TYPE_BANK_RATE, MESSAGE_TYPE_BEST_RATE, MESSAGE_TYPE_PASS, MESSAGE_TYPE_WORNG_COMMAND, MESSAGE_TYPE_NO_MATCH} = require('./util/constant')

const linebot = require('linebot')
const express = require('express')

const HandleIncoming = require('./model/HandleIncoming')

const bot = linebot({
    channelId: '1533402623',
    channelSecret: '2538033a97c555c83c3c69b7c5d23c9d',
    channelAccessToken: '3/3u9eaUXuum5u3pfmQ1LYIoE+030PJgcDK/bSA5VT5dE1tCSLMD1JR1Jb4O3rRaUxeOJjVzY24G9l2Xtp6Kg/BNd6rMPpx0O7YmWL6qiizW3dT5cv6XUbAgRed6lLm6B2bsTB9Qql/Yb2M9c6CpwAdB04t89/1O/w1cDnyilFU='
});

const linebotParser = bot.parser()
const app = express()


bot.on('message', function(event) {
    // 把收到訊息的 event 印出來
    console.log(event)
    switch (event.message.type) {
        case 'text':
            const originalString = event.message.text
            const messageObject = HandleIncoming.switchIncomingType(originalString)
    
            switch (messageObject.type) {
                case MESSAGE_TYPE_BANK_RATE:
                    //TODO收尋條件 maybe
            
                    //拿資料回傳
                    getFireBaseDataByBankCode(messageObject.value)
                        .then((result)=>{
                            console.log(result)
                            const resultString = HandleIncoming.bankResultDictToString(result)
                            replayTextMessage(event, resultString)
                        }).catch((e) => {
                        replayTextMessage(event, e.message)
                
                    })
                    break
                case MESSAGE_TYPE_BEST_RATE:
            
                    getFireBaseBestRateByCurrency(messageObject.value)
                        .then((result) => {
                            const resultString = HandleIncoming.bestRateResultDictToString(messageObject.value,result)
                            replayTextMessage(event, resultString)
                        }).catch(e => {
                        replayTextMessage(event, e.message)
                    })
            
                    break
                case MESSAGE_TYPE_WORNG_COMMAND:
                    event.reply('此條件查無此資料，更多使用方式請輸入/help').then((data) => {
                
                    }).catch((error) => {
                
                    });
                    break
                case MESSAGE_TYPE_PASS:
                    //不處理
                    event.reply({
                        "type": "imagemap",
                        "baseUrl": "https://us.123rf.com/450wm/gar1984/gar19841707/gar1984170700191/82754968-beautiful-young-woman-with-black-hat-carries-brown-vintage-suitcase-in-the-field-road-during-summer-.jpg?ver=6",
                        "altText": "This is an imagemap",
                        "baseSize": {
                            "height": 1040,
                            "width": 1040
                        },
                        "actions": [
                            {
                                "type": "uri",
                                "linkUri": "https://www.fotor.com/images2/features/crop/crop_2.jpg",
                                "area": {
                                    "x": 0,
                                    "y": 0,
                                    "width": 520,
                                    "height": 1040
                                }
                            },
                            {
                                "type": "message",
                                "text": "Hello",
                                "area": {
                                    "x": 520,
                                    "y": 0,
                                    "width": 520,
                                    "height": 1040
                                }
                            }
                        ]
                    })
                    break
                case MESSAGE_TYPE_NO_MATCH:
                    break
            }
            break
        case 'location':
            event.reply(['That\'s a good location!', 'Lat:' + event.message.latitude, 'Long:' + event.message.longitude]);
            event.reply(['That\'s a good location!', 'Lat:' + event.message.latitude, 'Long:' + event.message.longitude]);
            break;
        case 'sticker':
            event.reply({
                type: 'sticker',
                packageId: 1,
                stickerId: 1
            });
            break
        default:
            event.reply('Unknow message: ' + JSON.stringify(event));
            break;
    }


});

const replayTextMessage = (event,text) => {
    event.reply(text).then((data) => {

    }).catch((error) => {

    })
}


const replayImageMessage = (event,text) => {
    event.reply(text).then((data) => {

    }).catch((error) => {

    })
}

bot.on('follow', function (event) {
    event.reply('follow: ' + event.source.userId);
});

bot.on('unfollow', function (event) {
    event.reply('unfollow: ' + event.source.userId);
});

bot.on('join', function (event) {
    event.reply('join: ' + event.source.groupId);
});

bot.on('leave', function (event) {
    event.reply('leave: ' + event.source.groupId);
});

//按鈕回傳 使用者不用再打字
bot.on('postback', function (event) {
    console.log(event);
    event.reply('postback: ' + event.postback.data);
});

bot.on('beacon', function (event) {
    event.reply('beacon: ' + event.beacon.hwid);
});



app.post('/webhook', linebotParser);

// 在 localhost 走 8080 port
let server = app.listen(process.env.PORT || 8080, function() {
    let port = server.address().port;
    console.log("My Line bot App running on port", port);
});
