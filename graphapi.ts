
import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLNonNull,
    GraphQLFloat,
    GraphQLInt,
    GraphQLInputObjectType,
    GraphQLList,
}
    from 'graphql';
import { Handler, Context, Callback } from 'aws-lambda';
import * as _ from 'lodash';
import * as AWS from 'aws-sdk';
import { read } from 'fs';
import { callbackify } from 'util';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';

// TODO: don't hard code this
AWS.config.update({ region: process.env.REGION });

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
    description: 'Used for creating or updating PriceHistories',
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

const PriceHistoryQueryType = new GraphQLInputObjectType({
    name: 'PriceHistoryQueryType',
    description: 'Used for querying PriceHistories',
    fields: () => ({
        coinPairKey: { type: GraphQLString },
        timeKey: { type: GraphQLString },
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
const priceHistorySchema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'RootQueryType', // an arbitrary name
        description: 'All Queries found here',
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
            // priceHistories: {
            //     args: {

            //     },
            //     type: new GraphQLList(PriceHistoryType),
            //     resolve: (parent, args) => allPriceHistories("BTC")
            // },
            allPriceHistories: {
                description: 'Table scan filtered by a priceHistory object. This is expensive.',
                args: {
                    priceHistory: { type: PriceHistoryQueryType }                  
                },
                type: new GraphQLList(PriceHistoryType),
                resolve: (parent, args) => allPriceHistories(args.priceHistory)
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
        description: 'All Mutations found here',
        fields: {
            upsertPriceHistory: {
                name: 'upsertPriceHistory', // an arbitrary name
                description: 'creates or updates a priceHistory. Returns result of update/create.',
                args: {
                    priceHistory: { type: new GraphQLNonNull(PriceHistoryInputType) }
                },
                type: PriceHistoryType,
                resolve: (parent, args) => upsertPriceHistory(args)
            },
            deletePriceHistory: {
                name: 'deletePriceHistory', // an arbitrary name
                description: 'Deletes a priceHistory given coinPairKey and timeKey. Returns deleted item.',
                args: {
                    coinPairKey: { type: new GraphQLNonNull(GraphQLString) },
                    timeKey: { type: new GraphQLNonNull(GraphQLString) }
                },
                type: PriceHistoryType,
                resolve: (parent, args) => deletePriceHistory(args)
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

const allPriceHistories = (priceHistory) => promisify(callback => {
    
    let filter = _.reduce(priceHistory, (result: any, value, key) => {
        result += ' ' + key + ' = :' + key + ','
        return result;
    }, '');

    let values = _.reduce(priceHistory, (result: any, value, key) => {
        result[':' + key] = value;
        return result;
    }, {});
    
    filter = filter.slice(0,-1);

    return dynamoDb.scan({
        TableName: process.env.DYNAMODB_TABLE,        
        FilterExpression: filter,
        ExpressionAttributeValues: values,
        ReturnConsumedCapacity: "TOTAL",
        Limit: 1000
    }, callback);
})
    .then((result: any) => {
        return result.Items;
    });

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
    var priceHistory = args.priceHistory;
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
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW'
    };
    return dynamoDb.update(params, callback);
}).then((result: DocumentClient.UpdateItemOutput) => {
    console.log('DynamoDB result', result);
    return result.Attributes;
});

const deletePriceHistory = (args) => promisify(callback => {
    let params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: { 'coinPairKey': args.coinPairKey, 'timeKey': args.timeKey },
        ReturnValues: 'ALL_OLD'
    };
    return dynamoDb.delete(params, callback);
}).then((result: DocumentClient.DeleteItemOutput) => {
    return result.Attributes;
});

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
// const graphapi: Handler = (event, context, callback) => {

//     let graphqlQuery: string;
//     if (event.requestContext.httpMethod === "POST") {
//         let body = JSON.parse(event.body);
//         if (!_.isNil(body.query)) {
//             graphqlQuery = body.query;
//         } else {
//             callback(null, {statusCode: 500, body: `ERROR: no query element on request ${event.body}` });  
//         }        
//     } else if (event.requestContext.httpMethod === "GET") {
//         graphqlQuery = event.queryStringParameters.query;
//     } else {
//         let errorString = `ERROR: wrong httpMethod: ${event.requestContext.httpMethod} `
//         console.error(errorString);
//         callback(errorString);
//     }
//     console.log('Calling graphql with request: ', graphqlQuery);
//     return graphql(priceHistorySchema, graphqlQuery)
//         .then(
//         result => {
//             console.log(`returning result:`);
//             console.log(result);
//             return callback(null, { statusCode: 200, body: JSON.stringify(result) })
//         },
//         err => callback(err)
//         );
// }


// export { graphapi };
export { priceHistorySchema };