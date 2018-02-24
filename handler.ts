import { Handler, Context, Callback } from 'aws-lambda';
import { graphapi } from './graphapi';


// We want to make a GET request with ?query=<graphql query>
// The event properties are specific to AWS. Other providers will differ.
const query: Handler = (...args) => graphapi(...args);

export { query };