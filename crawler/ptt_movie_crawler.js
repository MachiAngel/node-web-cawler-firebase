const axios = require('axios');
const cheerio = require('cheerio');
const {replaceCHNumToNumAndlowerCase} = require('../util/publicfuction')


//獲取Movie前幾頁的urls
const getMoviePageLink = async (pageCount = 3) => {
    try{
        const firstPage = 'https://www.ptt.cc/bbs/Movie/index.html'
        const response = await axios.get(firstPage)
        const $ = cheerio.load(response.data)
        const prev = $('.btn-group-paging a').eq(1).attr('href').match(/\d+/)[0]
        
        const pages = []
        for (var  i = 0; i < pageCount; i++ ) {
            if (i === 0) {
                pages.push(firstPage)
            }else {
                pages.push(`https://www.ptt.cc/bbs/Movie/index${prev - i + 1}.html`)
            }
            
        }
        return pages
    }catch (e){
        console.log(e.message)
        throw new Error(`can not beauty ptt pages`)
    }
}


//獲取符合有雷的所有文章 url
const getMoviePageArticles = async (pages) => {
    // const pagesPromises = pages.map(pageUrl => {
    //     return axios.get(pageUrl)
    // })
    try{
        let totalArticle = []
        const allPagesHtmlResponse = []
        for (let pageUrl of pages ) {
            try {
                const result = await axios.get(pageUrl)
                allPagesHtmlResponse.push(result)
            }catch (e) {
                console.log(e.message)
            }
        }
        //const allPagesHtmlResponse = await Promise.all(pagesPromises)
        
        allPagesHtmlResponse.forEach((response,i) => {
            const $ = cheerio.load(response.data)
            const resultArray = getMovieTallyArticlesOfPage($)
            totalArticle = totalArticle.concat(resultArray)
        })
        // console.log(totalArticle)
        return totalArticle
    }catch (e){
        console.log(e.message)
        throw new Error(`can not beauty ptt pages`)
    }
}


const getMovieTallyArticlesOfPage = ($)=> {
    const articles = $('.r-ent')
    const tallyArticlesArray = []
    
    articles.each((i,result) => {
        //Filter Value
        // const rateString = $(result).find('.nrec').find('span').text().trim()
       
        //Filter Title
        const title = $(result).find('.title').find('a').text().trim()
        const article_type = title.substring(title.lastIndexOf("[")+1,title.lastIndexOf("]"));
        
        if (!article_type.includes('雷')) { return }
        if (title.includes('Re:')) { return }
        // console.log(rate)
        // console.log(title)
        
        let isGood
        if (article_type.includes('好') || article_type.includes('水')) {
            isGood = true
        }else if (article_type.includes('負') || article_type.includes('怒') || article_type.includes('爛')) {
            isGood = false
        }else {
            isGood = null
        }
        
        const href = $(result).find('.title').find('a').attr('href')
        const article_url = `https://www.ptt.cc` + href
        const timeStamp = article_url.substr(31,10)
        const article_date = new Date(timeStamp * 1000)
        
        const author = $(result).find('.meta').find('.author').text().trim()
        const title_s = replaceCHNumToNumAndlowerCase(title)
        // console.log(author)
        tallyArticlesArray.push({title, title_s, author, article_url, article_type, article_date, isGood})
    })
    return tallyArticlesArray
}



//吃單一電影篇文章
const updateOrInsertMovieArticleToDb = async (tableName = 'ptt_movie_article', article, pgdb) => {
    const {title,title_s , author, article_url , article_type, article_date, isGood} = article
    const haveArticle = await pgdb(tableName).where('article_url', '=', article_url).returning('*')
    if (haveArticle.length) {
        //更新
        return `id:${haveArticle[0].article_id} title:${haveArticle[0].title} -> 有存過 `
    }else {
        try {
            const result = await pgdb(tableName).returning('*')
                .insert({
                title,
                title_s,
                author,
                article_url,
                article_type,
                article_date,
                isgood:isGood,
                create_date: new Date(),
                update_date: new Date()
            })
            console.log(result[0])
            return `${result[0].title} -> 新增成功`
        }catch (e) {
            console.log(e.message)
            return `${title} -> 新增失敗 ${e.message}`
        }
        
    }
}


const getMoviePageResult = async (count = 3) => {
    try {
        const links = await getMoviePageLink(count)
        const articles = await getMoviePageArticles(links)
        return articles
    }catch (e) {
        throw e
    }
}



module.exports = {
    getMoviePageResult,
    updateOrInsertMovieArticleToDb
}




