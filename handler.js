'use strict'
const AWS = require('aws-sdk');
const OpenAI = require("openai");
const taskGenerator = require('./taskGenerator.js');
const shaGenerator = require('./generateSearchSha.js');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const learn = async ({domain, term, user = "global"}) => {
    const searchSha = shaGenerator.generateSearchTermSha({
        term,
        domain,
        user
    })

    const params = {
        TableName: process.env.TERMS_TABLE_NAME,
        Key: {
            searchSha: searchSha
        }
    };

    let data = await dynamoDb.get(params).promise();
    if (data.Item) {
        // If the term exists in DynamoDB, return it
        return {
            statusCode: 200,
            body: data.Item.info,
            headers: {
                "Access-Control-Allow-Origin": "https://sumelu.com",
            },
        };
    } else {
        const completion = await openai.chat.completions.create({
            messages: [{
                role: "system",
                content: taskGenerator.generate(domain !== 'General' ? domain : `most appropriate domain or topic for ${term}`)
            }, {role: "user", content: term}],
            model: "gpt-4o",
        });

        const termResponse = JSON.parse(completion.choices[0].message.content);

        if (!termResponse.domain) {
            if (termResponse.categories && termResponse.categories.length > 0) {
                termResponse.domain = termResponse.categories[0];
            } else {
                termResponse.domain = "General";
            }
        }

        // Store the result from OpenAI in DynamoDB
        const putTermParams = {
            TableName: process.env.TERMS_TABLE_NAME,
            Item: {
                searchSha: searchSha,
                info: JSON.stringify(termResponse)
            }
        };

        await dynamoDb.put(putTermParams).promise();

        return {
            statusCode: 200,
            body: termResponse,
            headers: {
                "Access-Control-Allow-Origin": "https://sumelu.com",
            },
        };
    }
}

exports.home = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Welcome to the Sumelu API",
        }),
        headers: {
            "Access-Control-Allow-Origin": "https://sumelu.com",
        },
    };
}

exports.authLearn = async (event) => {
    if (!event.pathParameters || !event.pathParameters.term) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Please provide a term",
            }),
            headers: {
                "Access-Control-Allow-Origin": "https://sumelu.com",
            },
        };
    }

    if (event.headers && event.headers.Authorization) {
        const token = event.headers.Authorization.split(' ')[1];
        const client = jwksClient({
            jwksUri: `${process.env.OKTA_OAUTH2_ISSUER}.well-known/jwks.json`
        });

        const header = jwt.decode(token, {complete: true}).header;

        const key = await new Promise((resolve, reject) => {
            client.getSigningKey(header.kid, (err, key) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(key);
                }
            });
        });

        const signingKey = key.publicKey || key.rsaPublicKey;

        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, signingKey, {
                audience: process.env.OKTA_OAUTH2_AUDIENCE,
                issuer: process.env.OKTA_OAUTH2_ISSUER,
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });

        const term = event.pathParameters.term;
        const domain = (event.queryStringParameters && event.queryStringParameters.domain) ? event.queryStringParameters.domain : "General";
        return learn({domain, term, user: decoded.sub});
    }
    return {
        statusCode: 500,
        body: JSON.stringify({
            message: "Something went wrong. Please try again."
        }),
        headers: {
            "Access-Control-Allow-Origin": "https://sumelu.com",
        },
    }
}

exports.globalLearn = async (event) => {
    if (!event.pathParameters || !event.pathParameters.term) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Please provide a term",
            }),
            headers: {
                "Access-Control-Allow-Origin": "https://sumelu.com",
            },
        };
    }

    const term = event.pathParameters.term;
    const domain = (event.queryStringParameters && event.queryStringParameters.domain) ? event.queryStringParameters.domain : "General";
    return learn({domain, term});
};

exports.globalDomains = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify([
            "General",
            "Art",
            "Business",
            "Education",
            "Entertainment",
            "Health",
            "Science",
            "Sports",
            "Technology"
        ]),
        headers: {
            "Access-Control-Allow-Origin": "https://sumelu.com",
        },
    };
};
