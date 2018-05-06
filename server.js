'use strict';

// Application dependencies
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const pg = require('pg');
const superagent = require('superagent');
const bodyparser = require('body-parser');

// Application Setup
const app = express();
const PORT = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL;
const api_key = process.env.API_KEY;


// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// Application Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

//Query API to retrieve the data we want.
app.get('/api/v1/parks/googlemaps/:location', (req, res) => {
  let location = req.params.location;
  if (!location) {
    res.status(404).send('input location');
  }
  superagent.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${api_key}`)
    .then(data => {
      let locationData = [data.body.results[0].address_components[0].long_name, data.body.results[0].geometry.location];
      res.send(locationData);
    })
    .catch(err => {
      console.error('we have an error: ', err);
    });
});

app.get('/api/v1/load_user', (req, res) => {
  client.query(`SELECT * FROM usertable;`)
    .then(results => {
      let tableData = results.rows;
      res.send(tableData);
    });
});

app.get('/api/v1/parks/find', (req, res) => {
  
  let url = 'https://api.inaturalist.org/v1/observations';

  superagent.get(url)
    .query({
      'per_page': '200'
    })
    .query({
      'photos': true
    })
    .query({
      'verifiable': true
    })
    .query({
      'lat': req.query.lat
    })
    .query({
      'lng': req.query.long
    })
    .query({
      'radius': req.query.radius
    })
    .query({
      'order_by': 'id'
    })
    .then(response => {

      response.body.results = response.body.results.filter(obj =>
        (obj.taxon !== null));

      response.body.results = response.body.results.filter(obj =>
        (obj.taxon.default_photo !== null));

      response.body.results = response.body.results.filter(obj =>
        (obj.taxon.iconic_taxon_name !== null || '') && (obj.taxon.preferred_common_name !== null || '') && (obj.observed_on !== null || '') && (obj.taxon.wikipedia_url !== null || '') && (obj.taxon.default_photo.square_url !== null || ''));

      var mammalsArray = response.body.results;
      var birdsArray = response.body.results;
      var insectsArray = response.body.results;
      var plantsArray = response.body.results;

      var mammals = mammalsArray.filter(obj =>
        obj.taxon.iconic_taxon_name === 'Mammalia' || obj.taxon.iconic_taxon_name === 'Reptilia' || obj.taxon.iconic_taxon_name === 'Amphibia');

      var birds = birdsArray.filter(obj1 =>
        obj1.taxon.iconic_taxon_name === 'Aves');

      var insects = insectsArray.filter(obj2 =>
        obj2.taxon.iconic_taxon_name === 'Insecta' || obj2.taxon.iconic_taxon_name === 'Arachnida');

      var plants = plantsArray.filter(obj3 =>
        obj3.taxon.iconic_taxon_name === 'Plantae');

      let numAnimalsDisplayed = 4;

      response.body.animals = [];

      for (var i = 0; i < numAnimalsDisplayed; i++) {
        let animals = [mammals, birds, insects, plants];
        let randInd0 = Math.floor(Math.random() * mammals.length);
        let randInd1 = Math.floor(Math.random() * birds.length);
        let randInd2 = Math.floor(Math.random() * insects.length);
        let randInd3 = Math.floor(Math.random() * plants.length);
        let randInd = [randInd0, randInd1, randInd2, randInd3];
        
        if (animals[i].length === 0) {
          animals[i] = animals[1];
        }

       let ind='a'+i;

        let currObj = {
          park: req.query.index,

          name: animals[i][randInd[i]].taxon.preferred_common_name !== null ? animals[i][randInd[i]].taxon.preferred_common_name : '',
          index: ind,
          observed_on: animals[i][randInd[i]].observed_on !== null ? animals[i][randInd[i]].observed_on : '',
          wiki: animals[i][randInd[i]].taxon.wikipedia_url !== null ? animals[i][randInd[i]].taxon.wikipedia_url : '',
          image: animals[i][randInd[i]].taxon.default_photo.square_url !== null ? animals[i][randInd[i]].taxon.default_photo.square_url : '',
          seen: false,
        };
        response.body.animals.push(currObj);
      }
      return response.body.animals;
    })
    .then(data => {
      res.send(data);
    })
    .catch(console.error);
});

app.post('/api/v1/signin', (req, res) => {
  let {
    username,
    password
  } = req.body;
  client.query(
    'INSERT INTO usertable(username, password) VALUES($1, $2) ON CONFLICT DO NOTHING', [username, password]
  )
    .then(res.sendStatus(201))
    .catch(console.error);
});

app.put('/api/v1/parks/submit', (req, res) => {
  let storedUser = req.body.userName;

  let uniqueSightings = [];

  client.query(`SELECT animals FROM usertable WHERE username='${storedUser}';`)
    .then(x => {
      if (!x.rows[0].animals) {
        x.rows[0].animals = [];
      }
      let allSightings = req.body.animals.concat(x.rows[0].animals);
      uniqueSightings = allSightings.filter(function (item, pos) {
        return allSightings.indexOf(item) === pos;
      });
      return uniqueSightings;

    })
    .then(y => {
      let arrayStr = JSON.stringify(y);
      let formattedArray = arrayStr.replace('[', '{').replace(']', '}');
      client.query(
        `UPDATE usertable
        SET animals = '${formattedArray}' 
        WHERE username='${storedUser}';`
      ).then(
        client.query(`SELECT * FROM usertable WHERE username='${storedUser}';`)
          .then(results => {
            res.send(results.rows[0].animals);
          })
      );
    })
    .catch(console.error);
});


app.get('*', (req, res) => res.redirect(CLIENT_URL));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));



loadDB();

function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    usertable (
      id SERIAL PRIMARY KEY,
      username VARCHAR(25) NOT NULL,
      password VARCHAR(25) NOT NULL,
      animals text[]
    );
  `);
}
