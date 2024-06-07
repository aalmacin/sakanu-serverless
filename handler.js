'use strict'
const AWS = require('aws-sdk');
const OpenAI = require("openai");
const instructions = require('./instructions.json');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.home = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Welcome to the Sumelu API",
        }),
        headers: {
            "Access-Control-Allow-Origin" : "https://sumelu.com",
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
                "Access-Control-Allow-Origin" : "https://sumelu.com",
            },
        };
    }

    const term = event.pathParameters.term;

    const params = {
        TableName: process.env.TERMS_TABLE_NAME,
        Key: {
            term: term
        }
    };

    let data = await dynamoDb.get(params).promise();
    if (data.Item) {
        // If the term exists in DynamoDB, return it
        return {
            statusCode: 200,
            body: data.Item.info,
        };
    } else {
        const completion = await openai.chat.completions.create({
            messages: [{role: "system", content: instructions.instructions}, {role: "user", content: term}],
            model: "gpt-4o",
        });

        // Store the result from OpenAI in DynamoDB
        const putParams = {
            TableName: process.env.TERMS_TABLE_NAME,
            Item: {
                term: term,
                info: completion.choices[0].message.content
            }
        };

        await dynamoDb.put(putParams).promise();

        return {
            statusCode: 200,
            body: completion.choices[0].message.content,
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
            "Access-Control-Allow-Origin" : "https://sumelu.com",
        },
    };
};
