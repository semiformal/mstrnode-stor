import { Handler, Context, Callback } from 'aws-lambda';
import { priceHistorySchema } from './graphapi';
import * as server from 'apollo-server-lambda';
import * as rql from 'rql/query';
import * as rqlJS from 'rql/js-array';
import * as _ from 'lodash';

// We want to make a GET request with ?query=<graphql query>
// The event properties are specific to AWS. Other providers will differ.
//const query: Handler = (...args) => graphapi(...args);

// const graphqlHandler = server.graphqlLambda({ schema: priceHistorySchema });

const CORS_ORIGIN = "https://example.com";

const formatResponse = (response, { variables }) => {
  let data = response.data;
  let debug = variables && variables.debug === true;

  // Filter
  if (_.has(variables, 'rql')) {
    _.mapKeys(data, (item, key) => {
      if (_.isArray(item)) {
        console.log('Applying rql filter', variables.rql);
        console.log('On Data', item);
        let query = rql.Query(variables.rql)
        data[key] = rqlJS.query(query, {}, item);
      }
    });
  }

  if (debug) {
    console.log('Returning response', response);
  }
  return response;
  // return _.assign({}, response, { data: data });
};

const graphqlHandler = function (event, context, callback) {
  const requestOrigin = event.headers.origin;
  const callbackFilter = function (error, output) {
    if (requestOrigin === CORS_ORIGIN) {
      output.headers['Access-Control-Allow-Origin'] = CORS_ORIGIN;
      output.headers['Access-Control-Allow-Credentials'] = 'true';
    }
    callback(error, output);
  };
  // const callbackFilter = function (error, output) {
  //   output.headers['Access-Control-Allow-Origin'] = '*';
  //   callback(error, output);
  // };

  const handler = server.graphqlLambda((event, context) => {
    const headers = event.headers,
      functionName = context.functionName;

    return {
      schema: priceHistorySchema,
      context: {
        headers,
        functionName,
        event,
        context
      },
      formatResponse: formatResponse            

    };
  });

  return handler(event, context, callbackFilter);
};

// const graphiqlHandler = server.graphiqlLambda({ schema: schema });
const graphiqlHandler = server.graphiqlLambda({
  endpointURL: `/${process.env.STAGE}/graphql`
});


export { graphqlHandler, graphiqlHandler };