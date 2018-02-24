# mstrnode-stor

```
npm install -g serverless
yarn
serverless config credentials
```

```
serverless deploy
```
replace url below from deployed url
```
$ curl -G 'https://9qdmq5nvql.execute-api.us-east-1.amazonaws.com/dev/query' --data-urlencode 'query=mutation {changeNickname(firstName:
 "Jeremy", nickname: "Jer")}'
$ curl -G 'https://9qdmq5nvql.execute-api.us-east-1.amazonaws.com/dev/query' --data-urlencode 'query={greeting(firstName: "Jeremy")}'
# {"data":{"greeting":"Hello, Jer."}}
```
