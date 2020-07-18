const express = require('express');
const app = express();

import { parseCSV } from './csv-parse';

let data = []
parseCSV().then((vals) => {
    data = vals.sort((a, b) => {
        return a.date - b.date;
      });
    data = data.sort((a, b) => {
        return a.date - b.date;
    });
});

app.use(express.static(__dirname + '/app'))

// Sets up an endpoint to return csv data from get request to /data endpoint
app.get('/data', (req, res) => {
    res.send(data);
})

app.listen(3030, function(){
    console.log('Server running on 3030...');
});
