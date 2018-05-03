'use strict';

// Application dependencies
//require('dotenv').congfig();
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
const api_key = 'AIzaSyCoXYAtJ8tWx1VDuinGJgoUb0bO5KIPz-A';


// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// Application Middleware
app.use(cors());
app.use(express.json());
app.use(bodyparser.urlencoded({
  extended: true
}));

//Query API to retrieve the data we want.
app.get('/api/v1/parks/googlemaps/:location', (req, res) => {
  let location = req.params.location;
  if (!location) {
    res.status(404).send('input location')
  };
  superagent.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${api_key}`)
    .then(data => {
      console.log(data.body.results[0].formatted_address, data.body.results[0].geometry.location);
      let locationData = [data.body.results[0].address_components[0].long_name, data.body.results[0].geometry.location];
      res.send(locationData);
    })
    .catch(err => {
      console.error('we have an error: ', err);
    });
});


app.get('/api/v1/parks/find', (req, res) => {
  console.log('we hit the server');

  console.log(req.query.lat);

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

      console.log(response.body.results.length);

      response.body.results = response.body.results.filter(obj =>
        (obj.taxon !== null));

      response.body.results = response.body.results.filter(obj =>
        (obj.taxon.default_photo !== null));



      console.log(response.body.results.length);

      response.body.results = response.body.results.filter(obj =>
        (obj.taxon.iconic_taxon_name !== null || '') && (obj.taxon.preferred_common_name !== null || '') && (obj.observed_on !== null || '') && (obj.taxon.wikipedia_url !== null || '') && (obj.taxon.default_photo.square_url !== null || ''));



      console.log(response.body.results.length);

      var mammalsArray = response.body.results;
      var birdsArray = response.body.results;
      var insectsArray = response.body.results;
      var plantsArray = response.body.results;

      var mammals = mammalsArray.filter(obj =>
        obj.taxon.iconic_taxon_name === 'Mammalia' || obj.taxon.iconic_taxon_name === 'Reptilia' || obj.taxon.iconic_taxon_name === 'Amphibia');

      // console.log('Mammals: ', mammals[0].taxon.preferred_common_name);

      console.log(mammals.length);

      var birds = birdsArray.filter(obj1 =>
        obj1.taxon.iconic_taxon_name === 'Aves');

      // console.log('Birdies ', birds[0].taxon.preferred_common_name);

      console.log(birds.length);

      var insects = insectsArray.filter(obj2 =>
        obj2.taxon.iconic_taxon_name === 'Insecta' || obj2.taxon.iconic_taxon_name === 'Arachnida');

      console.log(insects.length);

      // console.log('Buggers: ', insects[0].taxon.preferred_common_name);

      var plants = plantsArray.filter(obj3 =>
        obj3.taxon.iconic_taxon_name === 'Plantae');

      console.log(plants.length);


      // console.log('Plants: ', plants[0].taxon.preferred_common_name);

      //In case we want to allow user to choose number of animals displayed, we can modify the next line of code to make dynamic.
      let numAnimalsDisplayed = 4;

      //Can we just create a new object property in the response.body like this
      response.body.animals = [];


      //Loop through results to select 5 sightings and choose the properties we want from the API data.



      for (var i = 0; i < numAnimalsDisplayed; i++) {

        //Generate random index
        let animals = [mammals, birds, insects, plants];
        let randInd0 = Math.floor(Math.random() * mammals.length);
        let randInd1 = Math.floor(Math.random() * birds.length);
        let randInd2 = Math.floor(Math.random() * insects.length);
        let randInd3 = Math.floor(Math.random() * plants.length);
        let randInd = [randInd0, randInd1, randInd2, randInd3];

        console.log(randInd);

        console.log(animals[i].length);

        if (animals[i].length === 0) {
          animals[i] = animals[1];
        }

        let currObj = {
          park: req.query.index,

          name: animals[i][randInd[i]].taxon.preferred_common_name !== null ? animals[i][randInd[i]].taxon.preferred_common_name : '',
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
      console.log(data);
      res.send(data);
    })
    .catch(console.error);
});

app.post('/api/v1/signin', (req, res) => {
  let {username, password} = req.body;
  console.log('app.post');
  client.query(
    'INSERT INTO usertable(username, password) VALUES($1, $2) ON CONFLICT DO NOTHING',
    [username, password]
  )
    .then(res.sendStatus(201))
    .catch(console.error);
});

app.get('*', (req, res) => res.redirect(CLIENT_URL));





// app.put('/scorechange', (req, res) => {
//   client.query('UPDATE highscores SET animals_spotted=$1 WHERE username=$2;'
//   [/* this is the length of the array with animals checked by the user */ request.body.username])
// });

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// function loadUsers() {
//   // leaving what is in quotes blank
//   fs.readFile('', 'utf8', (err, fd) => {
//     JSON.parse(fd).forEach(elem => {
//       client.query(
//         'INSERT INTO usertable(username, password) VALUES($1, $2) ON CONFLICT DO NOTHING',
//         [elem.username, elem.password]
//       )
//         .catch(console.error);
//     });
//   })
// }

// function loadScores() {
//   client.query('SELECT * FROM highscores')
//     .then(result => {
//       if (!parseint(result.rows[0].count)) {
//         // leaving what is in quotes blank again.
//         fs.readFile('', 'utf8', (err, fd) => {
//           JSON.parse(fd).forEach(elem => {
//             client.query(`
//             INSERT INTO
//             highscores(user_id, username, animals_spotted)
//             SELECT user_id, $1, $2
//             FROM usertable
//             WHERE id=$1;
//             `,
//               [elem.user_id, elem.username, elem.animal_spotted]
//             )
//               .catch(console.error);
//           })
//         })
//       }
//     })
// }

loadDB();

function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    usertable (
      id SERIAL PRIMARY KEY,
      username VARCHAR(25) NOT NULL,
      password VARCHAR(25) NOT NULL
    );
  `)
    
  client.query(`
  CREATE TABLE IF NOT EXISTS
  highscores (
    highscore_id SERIAL PRIMARY KEY,
    animals_spotted INTEGER,
    user_id INTEGER NOT NULL REFERENCES usertable(id)
    );`
  )
}


// loadDB();

// function loadDB() {
//   client.query(`
//     CREATE TABLE IF NOT EXISTS
//     usertable (
//       id SERIAL PRIMARY KEY,
//       username VARCHAR(25) NOT NULL,
//       password VARCHAR(25) NOT NULL,
//     );
//   `)
//     // .then(loadUsers)
//     // .catch(console.error);

//   client.query(`
//   CREATE TABLE IF NOT EXISTS
//   highscores (
//     highscore_id SERIAL PRIMARY KEY,
//     animals_spotted INTEGER,
//     user_id INTEGER NOT NULL REFERENCES usertable(id)
//     );`
//   )
    // .then(loadScores)
    // .catch(console.error);
// }

//   client.query(`
//     CREATE TABLE IF NOT EXISTS
//     locations(
//       user_id INTEGER NOT NULL REFERENCES usertable(id),
//       location TEXT NOT NULL
//     );`
//   )
// }