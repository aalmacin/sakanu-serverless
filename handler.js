'use strict'
const AWS = require('aws-sdk');
const OpenAI = require("openai");
const taskGenerator = require('./taskGenerator.js');
const shaGenerator = require('./generateSearchSha.js');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.home = async (event) => {
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
    const searchSha = shaGenerator.generateSearchTermSha({
        term,
        domain
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
        const putParams = {
            TableName: process.env.TERMS_TABLE_NAME,
            Item: {
                searchSha: searchSha,
                info: JSON.stringify(termResponse)
            }
        };

        await dynamoDb.put(putParams).promise();

        return {
            statusCode: 200,
            body: termResponse,
            headers: {
                "Access-Control-Allow-Origin": "https://sumelu.com",
            },
        };
    }
};

exports.globalDomains = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Global Domains",
        }),
        headers: {
            "Access-Control-Allow-Origin": "https://sumelu.com",
        },
    };
};
