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
    const pagesPromises = pages.map(pageUrl => {
        return axios.get(pageUrl)
    })
    try{
        let totalArticle = []
        const allPagesHtmlResponse = await Promise.all(pagesPromises)
        
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
        
        const date = $(result).find('.meta').find('.date').text().trim()
        // console.log(date)
        const author = $(result).find('.meta').find('.author').text().trim()
        // console.log(author)
        tallyArticlesArray.push({title, date, author, articleLink , rate})
    })
    return tallyArticlesArray
}

const getDetailsOfArticles = async (articles) => {
    //const {title, date, author, articleLink , rate} = Articles
    let finalImageDetailArray = []
    for (let article of articles) {
        const {title, date, author, articleLink , rate} = article
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
            
            finalImageDetailArray.push({title, date, author, articleLink , rate, imageUrls})
            
        }catch (e){
            throw new Error(`cant get response:${articleLink}`)
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
    const {title, date, author, articleLink , rate, imageUrls} = article
    const haveArticle = await pgdb(tableName).where('article_link', '=', article.articleLink).returning('*')
    if (haveArticle.length) {
        //更新
        const updateResult = await  pgdb(tableName).update({rate,update_date:new Date()}).where('id', '=', haveArticle[0].id).returning('*')
        if (!updateResult.length) {
            throw new Error(`update article ${haveArticle[0].title} fail`)
        }
        
        console.log(`article ${haveArticle[0].title} old rate:${haveArticle[0].rate}`)
        console.log(`article ${haveArticle[0].title} new rate:${updateResult[0].rate}`)
        
        return updateResult[0]
        // console.log('need to update not insert:' + title)
        // console.log(`haveArticle:${haveArticle}`)
        // console.log(`haveArticle[0]:${JSON.stringify(haveArticle[0])}`)
        // console.log(`title:${haveArticle[0].title}`)
        
    }else {
        //創一個transaction變數 使用 await ,變數結果會利用 function回傳 最後再用 async 丟出去
        //要是throw error 自然也用不到這個變數了
        const transactionResult = await pgdb.transaction(trx => {
            trx.insert({
                title:title,
                author:author,
                rate,
                postdate: date,
                article_link: articleLink,
                create_date:new Date(),
                update_date:new Date()
            })
                .into(tableName)
                .returning('article_link')
                .then(article_link => {
                    const imageArray = imageUrls.map(url_link => {
                        return {
                            url_link,
                            article_link: article_link[0],
                            create_date:new Date(),
                            update_date:new Date()
                        }
                    })
                    return pgdb('images')
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
            throw new Error(`transation article: ${title} fail`)
        })
        //async await 最後吐回去的return
        return transactionResult
    }
}


module.exports = {
    getBeautyPageResult,
    updateOrInsertArticleToDb
}

//getBeautyTop3PageResult().then((resultArray) => console.log(resultArray))

// console.log($('#main-content').clone().children().remove().end().text().trim())