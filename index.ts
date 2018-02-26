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
            getLatestPriceHistory(coinPairKey: \"BTC\") {coinPairKey exchange finalPrice}
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
    query: testQuery,
    variables: variables,
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


//TODO: fake out parameters so can actually test using debugger
graphqlHandler(event, context, cb);