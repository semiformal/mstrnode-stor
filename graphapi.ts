
import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLNonNull,
    GraphQLFloat,
    GraphQLInt,
    GraphQLInputObjectType,
}
    from 'graphql';
import { Handler, Context, Callback } from 'aws-lambda';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
import { read } from 'fs';
import { callbackify } from 'util';


// TODO: don't hard code this
AWS.config.update({ region: 'us-east-1' });

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const PriceHistoryType = new GraphQLObjectType({
    name: 'PriceHistory',
    description: 'The history of coin price compared across multiple trades.',
    fields: () => ({
        coinPairKey: { type: new GraphQLNonNull(GraphQLString) },
        timeKey: { type: new GraphQLNonNull(GraphQLString) },
        exchange: { type: GraphQLString },
        finalPrice: { type: GraphQLFloat },
        volume24hr: { type: GraphQLFloat },
        marketSize: { type: GraphQLFloat },
        orderType: { type: GraphQLString },
        startCoin: { type: GraphQLString },
        endCoin: { type: GraphQLString }
    })
});

const PriceHistoryInputType = new GraphQLInputObjectType({
    name: 'PriceHistoryInput',
    description: 'Used for creating new PriceHistories',
    fields: () => ({
        coinPairKey: { type: new GraphQLNonNull(GraphQLString) },
        timeKey: { type: new GraphQLNonNull(GraphQLString) },
        exchange: { type: GraphQLString },
        finalPrice: { type: GraphQLFloat },
        volume24hr: { type: GraphQLFloat },
        marketSize: { type: GraphQLFloat },
        orderType: { type: GraphQLString },
        startCoin: { type: GraphQLString },
        endCoin: { type: GraphQLString }
    })
});


// Here we declare the schema and resolvers for the query
const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'RootQueryType', // an arbitrary name
        fields: {
            // the query has a field called 'greeting'
            getPriceHistory: {
                args: {
                    coinPairKey: { type: new GraphQLNonNull(GraphQLString) },
                    timeKey: { type: new GraphQLNonNull(GraphQLString) }
                },
                type: PriceHistoryType,
                resolve: (parent, args) => getPriceHistory(args.coinPairKey, args.timeKey)
            },
            getLatestPriceHistory: {
                args: {
                    coinPairKey: { type: new GraphQLNonNull(GraphQLString) }
                },
                type: PriceHistoryType,
                resolve: (parent, args) => getLatestPriceHistory(args.coinPairKey)
            }
        }
    }),
    mutation: new GraphQLObjectType({
        name: 'RootMutationType', // an arbitrary name
        fields: {
            upsertPriceHistory: {
                args: {
                    priceHistory: { type: PriceHistoryInputType }
                },
                type: PriceHistoryType,
                resolve: (parent, args) => upsertPriceHistory(args)
            }
        }
    })
});

const getPriceHistory = (coinPairKey, timeKey) => promisify(callback =>
    dynamoDb.get({
        TableName: process.env.DYNAMODB_TABLE,
        Key: { 'coinPairKey': coinPairKey, 'timeKey': timeKey },
    }, callback))
    .then((result: any) => result.Item);

const getLatestPriceHistory = (coinPairKey) => promisify(callback =>
    dynamoDb.query({
        TableName: process.env.DYNAMODB_TABLE,
        KeyConditionExpression: '#cpk = :cpk',
        ExpressionAttributeNames: {
            '#cpk': 'coinPairKey'
        },
        ExpressionAttributeValues: {
            ':cpk': coinPairKey
        },
        Limit: 1,
        ScanIndexForward: false
    }, callback))
    .then((result: any) => {
        return result.Items[0];
    });

const upsertPriceHistory = (args) => promisify(callback => {
    let priceHistory = args.priceHistory;
    let priceHistoryNoKeys = _.omit(priceHistory, ['coinPairKey', 'timeKey']);

    let update = _.reduce(priceHistoryNoKeys, (result: any, value, key) => {
        result += ' ' + key + ' = :' + key + ','
        return result;
    }, 'SET');

    let values = _.reduce(priceHistoryNoKeys, (result: any, value, key) => {
        result[':' + key] = value;
        return result;
    }, {});

    update = update.slice(0, -1);
    let params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: { 'coinPairKey': priceHistory.coinPairKey, 'timeKey': priceHistory.timeKey },
        UpdateExpression: update,
        ExpressionAttributeValues: values
    };
    return dynamoDb.update(params, callback);
}).then((priceHistory) => {
    return priceHistory;
});
// const changeNickname = (firstName, nickname) => promisify(callback =>
//     dynamoDb.update({
//         TableName: process.env.DYNAMODB_TABLE,
//         Key: { firstName },
//         UpdateExpression: 'SET nickname = :nickname',
//         ExpressionAttributeValues: {
//             ':nickname': nickname
//         }
//     }, callback))
//     .then(() => nickname);


const promisify = foo => new Promise((resolve, reject) => {
    foo((error, result) => {
        if (error) {
            reject(error)
        } else {
            resolve(result)
        }
    })
})

// We want to make a GET request with ?query=<graphql query>
// Or a POST request with body = <graphql query>
// The event properties are specific to AWS. Other providers will differ.
const graphapi: Handler = (event, context, callback) => {

    let graphqlQuery: string;
    if (event.requestContext.httpMethod === "POST") {
        let body = JSON.parse(event.body);
        if (!_.isNil(body.query)) {
            graphqlQuery = body.query;
        } else {
            callback(null, {statusCode: 500, body: `ERROR: no query element on request ${event.body}` });  
        }        
    } else if (event.requestContext.httpMethod === "GET") {
        graphqlQuery = event.queryStringParameters.query;
    } else {
        let errorString = `ERROR: wrong httpMethod: ${event.requestContext.httpMethod} `
        console.error(errorString);
        callback(errorString);
    }
    console.log('Calling graphql with request: ', graphqlQuery);
    return graphql(schema, graphqlQuery)
        .then(
        result => {
            console.log(`returning result:`);
            console.log(result);
            return callback(null, { statusCode: 200, body: JSON.stringify(result) })
        },
        err => callback(err)
        );
}


export { graphapi };