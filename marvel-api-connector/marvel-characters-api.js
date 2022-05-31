const express = require("express");
const request = require('request');
const crypto = require('crypto');
const app = express();
app.use(express.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', async (req, res) => {
    request(generateURL('http://gateway.marvel.com', '/v1/public/characters'), function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let data = JSON.parse(body);
            let names = data.data.results.map(charachter =>
                ({
                    name: charachter.name,
                    thumbnail: charachter.thumbnail.path + '.' +  charachter.thumbnail.extension
                }));
            res.send(names);
        }
    });
});

function generateURL(host, path) {
    let timestamp = Date.now();
    let publicKey = process.env.PUBLIC_KEY;
    if (!publicKey) throw new Error('FATAL ERROR: PUBLIC_KEY variable not set.');

    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('FATAL ERROR: PRIVATE_KEY variable not set.');

    let hash = crypto.createHash('md5')
        .update(timestamp + privateKey + publicKey)
        .digest('hex');

    return host + path + '?limit=100&ts=' + timestamp +
        '&apikey=' + publicKey + '&hash=' + hash;

}

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
    console.log(`Listening on port ${port}...`)
);
module.exports = server;
