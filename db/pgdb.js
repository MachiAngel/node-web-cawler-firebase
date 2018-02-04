
const knex = require('knex')
const pgdb = knex({
    client: 'pg',
    connection: {
        host : 'ec2-54-83-203-198.compute-1.amazonaws.com',
        user : 'spkfebjqmgsbtd',
        password : 'b929ae136b2aa1437fdbd0e6657870da7cd907e89a84ede0a0d780044fbd0e13',
        database : 'd3olfud0tedaau',
        ssl: true
    }
})
module.exports.pgdb = pgdb