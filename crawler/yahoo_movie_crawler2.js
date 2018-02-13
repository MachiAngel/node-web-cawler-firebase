// const axios = require('axios')
// const cheerio = require("cheerio")
//
// const YahooCrawler = require('./yahoo_movie_crawler')



// const getRecentMovieUrlArray = async () => {
//     const url = 'https://movies.yahoo.com.tw/api/v1/movie_in_theater_all'
//     const authorization = '21835b082e15b91a69b3851eec7b31b82ce82afb'
//     try {
//         const result = await axios.request({url:url,method:'get',headers:{'mv-authorization':authorization}})
//         if (result.status !== 200) {
//             return undefined
//         }
//
//         const sortedDateAndSliceArray = result.data.sort((a,b) => {
//             let aDate = new Date(a.release_date)
//             let bDate = new Date(b.release_date)
//             return bDate - aDate
//         }).slice(0,20).map((movieObejct) => {
//             return `https://movies.yahoo.com.tw/movieinfo_main.html/id=${movieObejct.movie_id}`
//         })
//
//         return sortedDateAndSliceArray
//     }catch (e) {
//         return undefined
//     }
// }

// getRecentMovieUrlArray().then(result => {
//     console.log(result)
//     // for (let [index, obejct] of result.entries()) {
//     //     console.log(index + ' ' +obejct.release_date + ' ' + obejct.title_ch)
//     //
//     // }
// }).catch(e => {
//     console.log(e.message)
// })