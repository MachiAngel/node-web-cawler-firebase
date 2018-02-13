const axios = require('axios')
const cheerio = require("cheerio")



module.exports = class YahooMovieCrawler {
    //internal method
     async getYahooTopMovieLinkList () {
        try{
            const response = await axios.get('https://movies.yahoo.com.tw/')

            const $ = cheerio.load(response.data)
            const urlListArray = this.parseYahooMoviePage($)

            return urlListArray
        }catch (e){
            console.log(e.message)
            throw new Error(`can not get $ from ${url}`)
        }
    }



    //internal method  解析movie首頁的 top10 url
     parseYahooMoviePage ($){
        const list = $('#list1 .ranking_list_r').find('a')
        console.log(list.length)
        let listUrlArray = []
        list.each((i,object) => {
            listUrlArray.push($(object).attr('href'))
        })
        return listUrlArray
    }
    //internal method
     async downloadAllYahooPage (urlArray) {
        // urls to promise objects
        const promiseOfPages = urlArray.map(url => {
            const promise = axios.get(url)
            return promise
        })

        try {
            const results = await Promise.all(promiseOfPages)
            return results
        }catch (e) {
            throw new Error('cant not get yahoo movie pages')
        }

    }

    //internal
    parseYahooMoviePages(cheerioObjectArray) {
         const resultArray = cheerioObjectArray.map(($) => {
             const infos = $('.movie_intro_info_r').find('span')
             const movie_name_ch = $('.movie_intro_info_r').find('h1').text()
             const movie_name_en = $('.movie_intro_info_r').find('h3').text()

             // console.log('------------------------')
             // console.log(movie_name_ch)
             // console.log(movie_name_en)

             const yahoo_rate = $('.score_num').text()
             // console.log(yahoo_rate)

             const yahoo_rate_count = $('.starbox2').find('span').text()
             // console.log(yahoo_rate_count)

             const movieTime_url = $('.btn_s_time').attr('href')
             // console.log(movieTime_url)

             const poster_url = $('.movie_intro_foto').find('img').attr('src')
             // console.log(poster_url)

             
             const release_date = $(infos[0]).text().trim()
             // console.log(release_date)

             const movie_length = $(infos[1]).text()
             // console.log(movie_length)

             let imdb_rate
             let temp_imdb_rate = $(infos[3]).text()
             if (!temp_imdb_rate.includes('IMDb分數：')) {
               imdb_rate = '無'
             }else {
               imdb_rate = temp_imdb_rate.replace('IMDb分數：','')
             }
             // console.log(imdb_rate)
             // console.log('------------------------')
             
             return {
                 movie_name_ch,
                 movie_name_en,
                 yahoo_rate,
                 yahoo_rate_count,
                 movieTime_url,
                 poster_url,
                 release_date,
                 movie_length,
                 imdb_rate
             }

         })

         return resultArray
    }

    async getFinalYahooTopMovieData () {
        try {
            const urlArray = await this.getYahooTopMovieLinkList()
            const responseArray = await this.downloadAllYahooPage(urlArray)

            const cheerioObjectArray = responseArray.map((response) => {
                return cheerio.load(response.data)
            })
            console.log(cheerioObjectArray.length)
            const resultArray = this.parseYahooMoviePages(cheerioObjectArray)
            return resultArray
        }catch (e) {
            throw e
        }

    }
    
    async getRecentMovieUrlArray()  {
        const url = 'https://movies.yahoo.com.tw/api/v1/movie_in_theater_all'
        const authorization = '21835b082e15b91a69b3851eec7b31b82ce82afb'
        try {
            const result = await axios.request({url:url,method:'get',headers:{'mv-authorization':authorization}})
            if (result.status !== 200) {
                return undefined
            }
            
            const sortedDateAndSliceArray = result.data.sort((a,b) => {
                let aDate = new Date(a.release_date)
                let bDate = new Date(b.release_date)
                return bDate - aDate
            }).slice(0,20).map((movieObejct) => {
                return `https://movies.yahoo.com.tw/movieinfo_main.html/id=${movieObejct.movie_id}`
            })
            
            return sortedDateAndSliceArray
        }catch (e) {
            return undefined
        }
    }
    
    async getRecentYahooMovieData() {
        try {
            const urlArray = await this.getRecentMovieUrlArray()
            if (urlArray === undefined) {
                return undefined
            }
            const responseArray = await this.downloadAllYahooPage(urlArray)
            
            const cheerioObjectArray = responseArray.map((response) => {
                return cheerio.load(response.data)
            })
            console.log(cheerioObjectArray.length)
            const resultArray = this.parseYahooMoviePages(cheerioObjectArray)
            return resultArray
        }catch (e) {
            throw e
        }
        
    }
}




