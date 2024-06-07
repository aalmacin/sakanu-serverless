'use strict'
const OpenAI = require("openai");
const instructions = require('./instructions.json');

const openai = new OpenAI(process.env.OPENAI_API_KEY);
exports.home = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Welcome to the Sumelu API",
        }),
    };
}

exports.globalLearn = async (event) => {
    if (!event.pathParameters || !event.pathParameters.term) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: "Please provide a term",
            }),
        };
    }

    const term = event.pathParameters.term;

    const completion = await openai.chat.completions.create({
        messages: [{role: "system", content: instructions.instructions}, {role: "user", content: term}],
        model: "gpt-4o",
    });

    return {
        statusCode: 200,
        body: completion.choices[0].message.content,
    };
};

exports.globalDomains = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Global Domains",
        }),
    };
};
