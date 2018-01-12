

//轉換
const chineseToEnglishDict = {
    '美金':'USD',
    '美元':'USD',
    '歐元':'EUR',
    '日圓':'JPY',
    '日幣':'JPY',
    '日元':'JPY',
    '英鎊':'GBP',
    '港幣':'HKD',
    '澳幣':'AUD',
    '澳洲幣':'AUD',
    '加拿大幣':'CAD',
    '加幣':'CAD',
    '新加坡幣':'SGD',
    '瑞士法郎':'CHF',
    '瑞典幣':'SEK',
    '南非幣':'ZAR',
    '泰幣':'THB',
    '泰銖':'THB',
    '紐西蘭幣':'NZD',
    '紐幣':'NZD',
    '歐元':'EUR',
    '人民幣':'CNY'
}


// const chineseToEnglishDict = {
//     '美金':'USD',
//     '日圓':'JPY',
//     '英鎊':'GBP',
//     '港幣':'HKD',
//     '澳幣':'AUD',
//     '加拿大幣':'CAD',
//     '新加坡幣':'SGD',
//     '瑞士法郎':'CHF',
//     '瑞典幣':'SEK',
//     '南非幣':'ZAR',
//     '泰幣':'THB',
//     '紐西蘭幣':'NZD',
//     '歐元':'EUR',
//     '人民幣':'CNY'
// }

//台灣銀行 004
const currencyArrayOf004 = ['USD',
    'HKD',
    'AUD',
    'GBP',
    'CAD',
    'SGD',
    'CHF',
    'JPY',
    'ZAR',
    'SEK',
    'NZD',
    'THB',
    'PHP',
    'IDR',
    'EUR',
    'KRW',
    'VND',
    'MYR',
    'CNY']

//兆豐商銀
const currencyArrayOf017 = [ 'USD',
    'HKD',
    'GBP',
    'JPY',
    'AUD',
    'CAD',
    'SGD',
    'ZAR',
    'SEK',
    'CHF',
    'THB',
    'NZD',
    'EUR',
    'KRW',
    'MYR',
    'IDR',
    'PHP',
    'MOP',
    'VND',
    'CNY' ]

//玉山銀行
const currencyArrayOf808 = [ 'USD',
    'CNY',
    'HKD',
    'JPY',
    'EUR',
    'AUD',
    'CAD',
    'GBP',
    'ZAR',
    'NZD',
    'CHF',
    'SEK',
    'SGD',
    'MXN',
    'THB' ]

//永豐銀行
const currencyArrayOf807 = [ 'USD',
    'JPY',
    'HKD',
    'EUR',
    'GBP',
    'CHF',
    'AUD',
    'SGD',
    'SEK',
    'CAD',
    'THB',
    'ZAR',
    'NZD',
    'MOP',
    'CNY',
    'CNH' ]

//土地銀行 005
const currencyArrayOf005 = [ 'USD',
    'JPY',
    'GBP',
    'HKD',
    'AUD',
    'CAD',
    'SGD',
    'CHF',
    'SEK',
    'ZAR',
    'THB',
    'NZD',
    'EUR',
    'CNY' ]

//華南銀行 008
const currencyArrayOf008 = [ 'USD',
    'HKD',
    'GBP',
    'NZD',
    'AUD',
    'SGD',
    'CHF',
    'CAD',
    'JPY',
    'SEK',
    'ZAR',
    'THP',
    'EUR',
    'CNY',
    'KRW' ]

//彰化銀行 009

const currencyArrayOf009 = [ 'USD',
    'GBP',
    'AUD',
    'HKD',
    'SGD',
    'CAD',
    'CHF',
    'ZAR',
    'SEK',
    'JPY',
    'THB',
    'EUR',
    'NZD',
    'CNY' ]

//富邦銀行 012
const currencyArrayOf012 = [ 'USD',
    'CNY',
    'JPY',
    'EUR',
    'HKD',
    'AUD',
    'ZAR',
    'CAD',
    'GBP',
    'SGD',
    'CHF',
    'NZD',
    'SEK',
    'THB' ]

//103 新光銀行
const currencyArrayOf103 = [ 'USD',
    'JPY',
    'AUD',
    'NZD',
    'HKD',
    'SGD',
    'THB',
    'EUR',
    'GBP',
    'CHF',
    'CAD',
    'SEK',
    'ZAR',
    'CNY',
    'TRY',
    'MXN' ]

// 013 國泰世華
const currencyArrayOf013 = [ 'USD',
    'CNY',
    'HKD',
    'GBP',
    'CHF',
    'AUD',
    'SGD',
    'CAD',
    'SEK',
    'ZAR',
    'JPY',
    'DKK',
    'THB',
    'NZD',
    'EUR',
    'TRY' ]

// 021 花旗銀行
const currencyArrayOf021 = [ 'USD',
    'GBP',
    'CHF',
    'JPY',
    'AUD',
    'EUR',
    'CAD',
    'HKD',
    'SGD',
    'SEK',
    'NZD',
    'THB',
    'ZAR',
    'CNY' ]

//081 滙豐銀行
const currencyArrayOf081 = [ 'USD',
    'EUR',
    'GBP',
    'AUD',
    'NZD',
    'HKD',
    'CAD',
    'SGD',
    'CHF',
    'JPY',
    'SEK',
    'ZAR',
    'CNY' ]

//822 中國信託
const currencyArrayOf822 = [ 'USD',
    'JPY',
    'CNY',
    'HKD',
    'EUR',
    'AUD',
    'GBP',
    'CAD',
    'NZD',
    'ZAR',
    'SGD',
    'CHF',
    'SEK',
    'THB',
    'IDR',
    'INR',
    'MYR',
    'PHP',
    'VND',
    'KRW' ]

//816 安泰銀行
const currencyArrayOf816 = [ 'USD',
    'JPY',
    'HKD',
    'EUR',
    'CNY',
    'AUD',
    'CAD',
    'CHF',
    'GBP',
    'NZD',
    'SEK',
    'SGD',
    'ZAR' ]

//815 日盛銀行
const currencyArrayOf815 = [ 'USD',
    'EUR',
    'HKD',
    'GBP',
    'JPY',
    'AUD',
    'CAD',
    'SGD',
    'CHF',
    'NZD',
    'SEK',
    'ZAR',
    'CNY' ]


//814 大眾銀行
const currencyArrayOf814 = [ 'USD',
    'JPY',
    'HKD',
    'EUR',
    'CNY',
    'AUD',
    'CAD',
    'CHF',
    'GBP',
    'MYR',
    'NZD',
    'SEK',
    'SGD',
    'THB',
    'ZAR' ]



const currencyArrayOf812 = [ 'AUD',
    'CAD',
    'CHF',
    'CNY',
    'EUR',
    'GBP',
    'HKD',
    'JPY',
    'NZD',
    'SEK',
    'SGD',
    'THB',
    'USD',
    'ZAR' ]

const currencyArrayOf810 = [ 'USD',
    'HKD',
    'GBP',
    'AUD',
    'CAD',
    'SGD',
    'CHF',
    'JPY',
    'THB',
    'NZD',
    'CNY',
    'EUR',
    'SEK' ]


const currencyArrayOf809 = [ 'USD',
    'HKD',
    'JPY',
    'EUR',
    'GBP',
    'AUD',
    'CAD',
    'CHF',
    'NZD',
    'SEK',
    'SGD',
    'CNH',
    'THB',
    'ZAR' ]


const currencyArrayOf806 = [ 'USD',
    'CNY',
    'JPY',
    'EUR',
    'HKD',
    'AUD',
    'NZD',
    'ZAR',
    'CAD',
    'GBP',
    'SGD',
    'CHF',
    'SEK',
    'THB' ]

const currencyArrayOf805 = [ 'USD',
    'GBP',
    'HKD',
    'CHF',
    'AUD',
    'SGD',
    'JPY',
    'CAD',
    'THB',
    'EUR',
    'NZD',
    'CNY',
    'ZAR' ]

const currencyArrayOf803 = [ 'USD',
    'JPY',
    'GBP',
    'AUD',
    'HKD',
    'CAD',
    'CNY',
    'SGD',
    'ZAR',
    'CHF',
    'NZD',
    'EUR' ]

const currencyArrayOf147 = ['USD', 'JPY', 'CNY', 'HKD', 'EUR', 'GBP', 'CAD', 'CHF', 'AUD', 'NZD', 'ZAR']


const currencyArrayOf118 = [ 'USD',
    'JPY',
    'CHF',
    'HKD',
    'GBP',
    'CAD',
    'SGD',
    'AUD',
    'CNY',
    'ZAR',
    'NZD',
    'EUR' ]

const currencyArrayOf108 = [ 'USD',
    'HKD',
    'JPY',
    'SGD',
    'THB',
    'NZD',
    'AUD',
    'GBP',
    'CHF',
    'EUR',
    'CAD',
    'CNY',
    'ZAR' ]


const currencyArrayOf053 = [ 'USD',
    'HKD',
    'GBP',
    'AUD',
    'CAD',
    'SGD',
    'CHF',
    'JPY',
    'ZAR',
    'SEK',
    'NZD',
    'EUR',
    'CNY' ]


const currencyArrayOf050 = [ 'USD',
    'AUD',
    'CAD',
    'HKD',
    'GBP',
    'SGD',
    'ZAR',
    'SEK',
    'CHF',
    'JPY',
    'THB',
    'EUR',
    'NZD',
    'CNY' ]

const currencyArrayOf016 = [ 'USD',
    'GBP',
    'HKD',
    'AUD',
    'SGD',
    'CHF',
    'CAD',
    'JPY',
    'CNY',
    'ZAR',
    'SEK',
    'KRW',
    'EUR',
    'NZD' ]

const currencyArrayOf052 = [ 'USD',
    'HKD',
    'GBP',
    'AUD',
    'CAD',
    'SGD',
    'CHF',
    'JPY',
    'THB',
    'EUR',
    'NZD',
    'ZAR',
    'SEK',
    'CNY' ]


const currencyArrayOf007 = [ 'USD',
    'GBP',
    'HKD',
    'AUD',
    'SGD',
    'CHF',
    'CAD',
    'JPY',
    'ZAR',
    'SEK',
    'THB',
    'NZD',
    'EUR',
    'CNY',
    'TRY' ]

const currencyArrayOf006 = [ 'USD',
    'HKD',
    'GBP',
    'AUD',
    'SGD',
    'CHF',
    'CAD',
    'JPY',
    'SEK',
    'EUR',
    'NZD',
    'THB',
    'ZAR',
    'CNY' ]

// const testName = 'USD'
// if (currencyArrayOf017.includes(testName)){
//     console.log('yes')
// }else{
//     console.log('no')
// }

module.exports.currencyArrayOf004 = currencyArrayOf004
module.exports.currencyArrayOf017 = currencyArrayOf017
module.exports.currencyArrayOf808 = currencyArrayOf808
module.exports.currencyArrayOf807 = currencyArrayOf807
module.exports.currencyArrayOf005 = currencyArrayOf005
module.exports.currencyArrayOf008 = currencyArrayOf008
module.exports.currencyArrayOf009 = currencyArrayOf009
module.exports.currencyArrayOf012 = currencyArrayOf012
module.exports.currencyArrayOf103 = currencyArrayOf103
module.exports.currencyArrayOf013 = currencyArrayOf013
module.exports.currencyArrayOf021 = currencyArrayOf021
module.exports.currencyArrayOf081 = currencyArrayOf081
module.exports.currencyArrayOf822 = currencyArrayOf822
module.exports.currencyArrayOf816 = currencyArrayOf816
module.exports.currencyArrayOf815 = currencyArrayOf815
module.exports.currencyArrayOf814 = currencyArrayOf814
module.exports.currencyArrayOf812 = currencyArrayOf812
module.exports.currencyArrayOf810 = currencyArrayOf810
module.exports.currencyArrayOf809 = currencyArrayOf809
module.exports.currencyArrayOf806 = currencyArrayOf806
module.exports.currencyArrayOf805 = currencyArrayOf805
module.exports.currencyArrayOf803 = currencyArrayOf803
module.exports.currencyArrayOf147 = currencyArrayOf147
module.exports.currencyArrayOf118 = currencyArrayOf118
module.exports.currencyArrayOf108 = currencyArrayOf108
module.exports.currencyArrayOf053 = currencyArrayOf053
module.exports.currencyArrayOf050 = currencyArrayOf050
module.exports.currencyArrayOf016 = currencyArrayOf016
module.exports.currencyArrayOf052 = currencyArrayOf052
module.exports.currencyArrayOf007 = currencyArrayOf007
module.exports.currencyArrayOf006 = currencyArrayOf006

module.exports.chineseToEnglishDict = chineseToEnglishDict


