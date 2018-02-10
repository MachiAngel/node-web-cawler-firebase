
const knex = require('knex')
// const pgdb = knex({
//     client: 'pg',
//     connection: {
//         host : 'ec2-54-83-203-198.compute-1.amazonaws.com',
//         user : 'spkfebjqmgsbtd',
//         password : 'b929ae136b2aa1437fdbd0e6657870da7cd907e89a84ede0a0d780044fbd0e13',
//         database : 'd3olfud0tedaau',
//         ssl: true
//     }
// })


const url = 'postgres://izphwmbnwhbhbr:b77f2483ad1fe298be80d5a2cf6813781a16404ea0207553977cae61df721c48@ec2-54-243-59-122.compute-1.amazonaws.com:5432/d3p4pg7cohkuo4'
const pgdb = knex({
    client: 'pg',
    connection: url + '?ssl=true'
})


module.exports.pgdb = pgdb