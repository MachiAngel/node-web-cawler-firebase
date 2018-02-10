const axios = require('axios');
const cheerio = require('cheerio');


//獲取前幾頁的urls
const getBeautyPageLink = async (pageCount = 3) => {
    try{
        const firstPage = 'https://www.ptt.cc/bbs/Beauty/index.html'
        const response = await axios.get(firstPage)
        const $ = cheerio.load(response.data)
        const prev = $('.btn-group-paging a').eq(1).attr('href').match(/\d+/)[0]
        
        const pages = []
        for (var  i = 0; i < pageCount; i++ ) {
            if (i === 0) {
                pages.push(firstPage)
            }else {
                pages.push(`https://www.ptt.cc/bbs/Beauty/index${prev - i + 1}.html`)
            }
            
        }
        return pages
        
        // return [firstPage,`https://www.ptt.cc/bbs/Beauty/index${prev}.html`,`https://www.ptt.cc/bbs/Beauty/index${prev - 1}.html`]
    }catch (e){
        console.log(e.message)
        throw new Error(`can not beauty ptt pages`)
    }
}


//獲取前三頁符合的所有文章 url
const getBeautyPageArticles = async (pages) => {
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
            const resultArray = getTallyArticlesOfPage($)
            totalArticle = totalArticle.concat(resultArray)
        })
        // console.log(totalArticle)
        return totalArticle
    }catch (e){
        console.log(e.message)
        throw new Error(`can not beauty ptt pages`)
    }
}

const getTallyArticlesOfPage = ($)=> {
    const articles = $('.r-ent')
    const tallyArticlesArray = []
    
    articles.each((i,result) => {
        //Filter Value
        const rateString = $(result).find('.nrec').find('span').text().trim()
        if (rateString !== '爆') {
            if (isNaN(rateString)) { return }
        }
        let rate
        if (rateString === '爆') {
            rate = 100
        }else {
            rate = Number(rateString)
        }
        if (rate < 30) { return }
        //Filter Title
        const title = $(result).find('.title').find('a').text().trim()
        if (!title.includes('[正妹]') && !title.includes('[神人]')) { return }
        // console.log(rate)
        // console.log(title)
        const href = $(result).find('.title').find('a').attr('href')
        const articleLink = `https://www.ptt.cc` + href
        // console.log(articleLink)
        
        const timeStamp = articleLink.substr(32,10)
        const article_date = new Date(timeStamp * 1000)
        
        const date = $(result).find('.meta').find('.date').text().trim()
        // console.log(date)
        const author = $(result).find('.meta').find('.author').text().trim()
        // console.log(author)
        tallyArticlesArray.push({title, date, author, articleLink , rate, article_date})
    })
    return tallyArticlesArray
}

const getDetailsOfArticles = async (articles) => {
    //const {title, date, author, articleLink , rate} = Articles
    let finalImageDetailArray = []
    for (let article of articles) {
        const {title, date, author, articleLink , rate,article_date} = article
        try {
            const response = await axios.get(articleLink)
            //直接解析body 符合正則
            const mactchArray = response.data.match(/imgur.com\/[0-9a-zA-Z]{7}/g)
            //去掉重複
            const partImagesUrls = [ ...new Set(mactchArray) ]
            //組成final object array
            const imageUrls = partImagesUrls.map(partUrl => {
                //const imageUrl = 'https://' + partUrl + '.jpg'
                return 'https://' + partUrl + '.jpg'
            })
            
            finalImageDetailArray.push({title, date, author, articleLink , rate, imageUrls,article_date})
            
        }catch (e){
            console.log(`cant get response:${articleLink}`);
            console.log(e.message)
            // throw new Error(`cant get response:${articleLink}`)
        }
        
    }
    
    return finalImageDetailArray
}


const getBeautyPageResult = async (count = 3) => {
    try {
        const links = await getBeautyPageLink(count)
        const articlesLinks = await getBeautyPageArticles(links)
        const finalResultArray = await getDetailsOfArticles(articlesLinks)
        return finalResultArray
    }catch (e) {
        throw e
    }
}

//吃單一篇文章
const updateOrInsertArticleToDb = async (tableName, article, pgdb) => {
    const {title , author, articleLink , rate, imageUrls, article_date} = article
    const haveArticle = await pgdb(tableName).where('article_url', '=', article.articleLink).returning('*')
    if (haveArticle.length) {
        //更新
        const updateResult = await  pgdb(tableName).update({rate,update_date:new Date()}).where('article_id', '=', haveArticle[0].article_id).returning('*')
        if (!updateResult.length) {
            throw new Error(`update article ${haveArticle[0].title} fail`)
        }
        
        return `id:${updateResult[0].article_id} title:${updateResult[0].title} 更新成功 `
        
    }else {
        //創一個transaction變數 使用 await ,變數結果會利用 function回傳 最後再用 async 丟出去
        //要是throw error 自然也用不到這個變數了
        const transactionResult = await pgdb.transaction(trx => {
            trx.insert({
                title,
                author,
                rate,
                article_url: articleLink,
                create_date:new Date(),
                update_date:new Date(),
                article_date
            })
                .into(tableName)
                .returning(['article_id','article_url'])
                .then(article => {
                    const imageArray = imageUrls.map(image_url => {
                        return {
                            image_url,
                            article_id: article[0].article_id,
                            article_url:article[0].article_url,
                            create_date: new Date(),
                            update_date: new Date()
                        }
                    })
                    return pgdb('ptt_beauty_image')
                        .returning('*')
                        .insert(imageArray)
                })
                .then(trx.commit)
                .catch(trx.rollback)
            
        }).then(result => {
            //回傳transation成功 return結果給transactionResult 變數
            return result
        }).catch(e => {
            ///回傳transation失敗
            console.log(e.message)
            throw new Error(`transation article: ${title} fail`)
        })
        //async await 最後吐回去的return
        return transactionResult
    }
}

const crawlerAndSaveBeautyArticleToPGDB = async () => {
    try {
        const resultArray = await getBeautyPageResult(3)
        const savedResults = []
        for (let aritcle of resultArray) {
            try {
                const savedResult = await updateOrInsertArticleToDb('ptt_beauty_article',aritcle, pgdb)
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






module.exports = {
    getBeautyPageResult,
    updateOrInsertArticleToDb
}

//getBeautyTop3PageResult().then((resultArray) => console.log(resultArray))

// console.log($('#main-content').clone().children().remove().end().text().trim())
