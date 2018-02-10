const axios = require('axios');
const cheerio = require('cheerio');
const {pgdb} = require('../db/pgdb')


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
        // console.log(author)
        tallyArticlesArray.push({title, author, article_url,article_type , article_date,isGood})
    })
    return tallyArticlesArray
}



//吃單一電影篇文章
const updateOrInsertMovieArticleToDb = async (tableName = 'ptt_movie_article', article, pgdb) => {
    const {title , author, article_url , article_type, article_date, isGood} = article
    const haveArticle = await pgdb(tableName).where('article_url', '=', article_url).returning('*')
    if (haveArticle.length) {
        //更新
        return `id:${haveArticle[0].article_id} title:${haveArticle[0].title} -> 有存過 `
    }else {
        try {
            const result = await pgdb(tableName).returning('*')
                .insert({
                title,
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


//吃全部
const insertMovieArticlesToDb = async (tableName = 'ptt_movie_article', articles, pgdb) => {
    const {title , author, article_url , article_type, article_date, isGood} = articles
    const finalArray = articles.map(article => {
        const {title , author, article_url , article_type, article_date, isGood} = article
        return {
            title,
            author,
            article_url,
            article_type,
            article_date,
            isgood:isGood,
            create_date: new Date(),
            update_date: new Date()
        }
    })
    try {
        const result = await pgdb(tableName).returning('*')
            .insert(finalArray)
        console.log(result)
        return `${result.length}筆資料 -> 新增成功`
    }catch (e) {
        console.log(e.message)
        return `${title} -> 新增失敗 ${e.message}`
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


const crawlerAndSaveMovieArticleToPGDB = async () => {
    try {
        const resultArray = await getMoviePageResult(3)
        const savedResults = []
        for (let aritcle of resultArray) {
            try {
                const savedResult = await updateOrInsertMovieArticleToDb('ptt_movie_article',aritcle, pgdb)
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

// const getOnePageResult = async (id) => {
//     try {
//         const results = await getMoviePageArticles([`https://www.ptt.cc/bbs/Movie/index${id}.html`])
//         return results
//     }catch (e) {
//         throw e
//     }
// }

const getOnePageResult = async (id) => {
    
    const urlArray = [`https://www.ptt.cc/bbs/Movie/index${id}.html`,`https://www.ptt.cc/bbs/Movie/index${id-1}.html`,`https://www.ptt.cc/bbs/Movie/index${id-2}.html`,]
    try {
        const results = await getMoviePageArticles(urlArray)
        return results
    }catch (e) {
        throw e
    }
}


const crawlerAllBeautyArticleToPGDB = async () => {
    //let number = 2396
    const savedResults = []
    
    //6356
    //5513
    //4396
    for(let i = 4000;i >= 3; i = i - 3) {
        try {
            const resultArray = await getOnePageResult(i)
    
            try {
                const savedResult = await insertMovieArticlesToDb('ptt_movie_article',resultArray, pgdb)
                savedResults.push(savedResult)
            }catch (e) {
                savedResults.push(e.message)
            }
            
            console.log(`finsih ${i} page`)
        }catch (e) {
            console.log(`page ${i}  with error`)
            
        }
        
    }
    return savedResults
    
}

// crawlerAndSaveMovieArticleToPGDB().then(results => {
//     console.log(results)
// }).catch(e => {
//     console.log(e.message)
// })
crawlerAllBeautyArticleToPGDB().then(results => {
    console.log(results)
}).catch(e => {
    console.log(e.message)
})

