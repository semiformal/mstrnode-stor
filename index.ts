//import { graphapi } from './graphapi';
import * as moment from 'moment';
import { graphqlHandler } from './handler';

let now = moment().utc().format();

//let now = "2018-02-25T06:00:00Z";

let batchCreate = `
        mutation 
        {
            a1: upsertPriceHistory(
                priceHistory: {
                    coinPairKey: "BTC"
                    timeKey: "2017-02-22T02:00:00Z"
                    exchange: "GDAX"
                    finalPrice: 29
                }
            ) { coinPairKey }
            a2: upsertPriceHistory(
                priceHistory: {
                    coinPairKey: "BTC"
                    timeKey: "${now}"
                    exchange: "GDAX"
                    finalPrice: 55
                }
            ) { coinPairKey }
        }
        `;

let simpleCreateQuery = `
        mutation 
        {
            upsertPriceHistory(                
                priceHistory: {
                    coinPairKey: "BTC"
                    timeKey: "${now}"                    
                    exchange: "GDAX"
                    finalPrice: 2
                }
            ) { coinPairKey }
        }
        `;

let get = `
       query 
        {
            getPriceHistory(
                coinPairKey: \"BTC\"
                timeKey: \"${now}\"
            ) { 
                coinPairKey
                finalPrice
             }
        }
        `;

let getLatestQuery = `
        query 
        {
            a1: getLatestPriceHistory {coinPairKey exchange finalPrice}
            a2: getLatestPriceHistory {coinPairKey exchange finalPrice}
        }
        `;

let typeName = `{ __typename }`;

let testQuery = `
        mutation 
        {
            a1: upsertPriceHistory(                
                priceHistory: {
                    coinPairKey: "BTC"
                    timeKey: "2017-08-08T08:08:08Z"                    
                    exchange: "GDAX"
                    finalPrice: 8
                }
            ) { coinPairKey timeKey }
            a2: deletePriceHistory(
                coinPairKey: "BTC"
                timeKey: "2017-08-08T08:08:08Z"       
            ){coinPairKey timeKey exchange}
        }
        `;

let allItems = `
        query 
        {
            allPriceHistories(priceHistory:{finalPrice: 2}){ coinPairKey timeKey exchange finalPrice }         
        }
        `;

let allAll = `
        query 
        {
            allPriceHistories{ coinPairKey timeKey exchange finalPrice }         
        }
        `;

let filterQuery = `
query
{
  priceHistories
  {
    coinPairKey
    timeKey
    finalPrice
  }
}
`;

let variables = { rql: 'finalPrice=2' };

process.env.DYNAMODB_TABLE = 'pricehistory-dev';
process.env.REGION = 'us-east-1';


const body = {
    query: getLatestQuery,
    variables: undefined,
}

const event = {
    httpMethod: 'POST',
    body: body,
    headers: {}
};

const context = {};
const cb = (err, result) => {
    console.log(err);
    console.log(result);
    let body;
    let errors;
    if (Boolean(result)) {
        body = JSON.parse(result.body);
        errors = body.errors;
        if (!!errors) {
            console.log(errors);
        }
    }
}


import * as pg from 'pg';

process.env.PGDATABASE = 'pacprice';
process.env.PGPORT = '5432';
process.env.PGUSER = 'pacprice';
process.env.PGHOST = 'pacprice.cynsn8lti9x1.us-east-1.rds.amazonaws.com';

var dbConfig = {
    user: 'pacprice',
    password: 'zGp_JXxc8oW`KW}4{hG9uyWC',
    database: 'pacprice',
    host: 'pacprice.cynsn8lti9x1.us-east-1.rds.amazonaws.com',
    port: 5432
};
// var client = new pg.Client(dbConfig);
// client.connect();

// client.query(`
//     SELECT
//     id, exchange, (price * usd_conversion_rate) as converted_price
//     FROM prices 
//     WHERE timestamp < $1
//     ORDER BY timestamp, converted_price DESC
//     LIMIT 1`,
//     ['Now()'],
//     (err, res) => {

//         console.log(err ? err.stack : res.rows[0]) // Hello World!
//         client.end()
//     })


// const res = await client.query('SELECT $1::text as message', ['Hello world!'])
// console.log(res.rows[0].message) // Hello world!
// await client.end()
// client.end();

//TODO: fake out parameters so can actually test using debugger
graphqlHandler(event, context, cb);