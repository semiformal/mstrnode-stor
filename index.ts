import { graphapi } from './graphapi';
import * as moment from 'moment';

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

let now = moment().utc().format();

//let now = "2018-02-25T06:00:00Z";

let createQuery = `
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
                    timeKey: "2018-02-22T02:00:00Z"
                    exchange: "GDAX"
                    finalPrice: 29
                }
            ) { coinPairKey }
        }
        `;

let get = {
    'queryStringParameters': {
        'query': `
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
        `
    }
};

let getLatestQuery = `
        query 
        {
            getLatestPriceHistory(coinPairKey: \"BTC\") {coinPairKey exchange finalPrice}
        }
        `;

let typeName = `{ __typename }`;

let event = {
    'requestContext': {
        'httpMethod': 'POST'
    },
    'body': {
        'query': typeName
    }
};

let context = null;
process.env.DYNAMODB_TABLE = 'pricehistory-dev';
process.env.REGION = 'us-east-1';

//TODO: fake out parameters so can actually test using debugger
graphapi(event, context, cb);