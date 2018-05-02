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
app.get('/signin/:user', (req, res) => {
  let userInfo = req.params.id;
  console.log('in app.get');
  console.log(userInfo);
});


app.get('api/v1/map_test/:location', (req, res) => {
  console.log('in app.get');

  superagent.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${userLocation}&key=${api_key}`)
    .then(data => {
      console.log(data.body);
      res.send('success', res.body);
    })
    .catch(err => {
      console.error('we have an error: ', err);
    });
});

app.get('/api/v1/parks/find', (req, res) => {
  console.log('we hit the server');

  console.log(req.query);

  let url = 'https://api.inaturalist.org/v1/observations';

  superagent.get(url)
    .query({
      'photos': true
    })
    .query({
      'quality_grade': 'research'
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
    .then(response => {

      console.log(response.body.results);
      console.log(req.query.index);


      //In case we want to allow user to choose number of animals displayed, we can modify the next line of code to make dynamic.
      let numAnimalsDisplayed = 5;

      //Can we just create a new object property in the response.body like this
      response.body.animals = [];

      for (var i = 0; i < numAnimalsDisplayed; i++) {

        let randInd = Math.floor(Math.random() * response.body.results.length);

        let currObj = {
          park: req.query.index,
          name: response.body.results[randInd].taxon.preferred_common_name !== null ? response.body.results[randInd].taxon.preferred_common_name : '',
          observed_on: response.body.results[randInd].observed_on !== null ? response.body.results[randInd].observed_on : '',
          wiki: response.body.results[randInd].taxon.wikipedia_url !== null ? response.body.results[randInd].taxon.wikipedia_url : '',
          image: response.body.results[randInd].taxon.default_photo.square_url !== null ? response.body.results[randInd].taxon.default_photo.square_url : '',
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


app.get('*', (req, res) => res.redirect(CLIENT_URL));

app.post('/usersub', (req, res) => {
  client.query(
    `INSERT INTO usertable(username, password) VALUES($1, $2)
    ON CONFLICT DO NOTHING,`
    [request.body.username, request.body.password],
  )
    .catch(console.error)
    .then(queryTwo());

  function queryTwo() {
    client.query('INSERT INTO highscores(username, animals_spotted) VALUES($1, $2) ONCONFLICT DO NOTHING'
    [request.body.username, 0])
  }
});

app.put('/scorechange', (req, res) => {
  client.query('UPDATE highscores SET animals_spotted=$1 WHERE username=$2;'
  [/* this is the length of the array with animals checked by the user */ request.body.username])
});

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

//////////
//TODO: Below here, we should do our psql database setup. Grab some sample code from previous labs that create tables if they don't exist and setup column names. This will be for user data. Something like primary key, username, password, number animals spotted, other stuff?
function loadUsers() {
  // leaving what is in quotes blank
  fs.readFile('', 'utf8', (err, fd) => {
    JSON.parse(fd).forEach(elem => {
      client.query(
        'INSERT INTO usertable(username, password) VALUES($1, $2) ON CONFLICT DO NOTHING',
        [elem.username, elem.password]
      )
        .catch(console.error);
    });
  });
}

function loadUsers() {
  // leaving what is in quotes blank
  fs.readFile('', 'utf8', (err, fd) => {
    JSON.parse(fd).forEach(elem => {
      client.query(
        'INSERT INTO usertable(username, password) VALUES($1, $2) ON CONFLICT DO NOTHING',
        [elem.username, elem.password]
      )
        .catch(console.error);
    });
  });
}

function loadScores() {
  client.query('SELECT * FROM highscores')
    .then(result => {
      if (!parseint(result.rows[0].count)) {
        // leaving what is in quotes blank again.
        fs.readFile('', 'utf8', (err, fd) => {
          JSON.parse(fd).forEach(elem => {
            client.query(`
            INSERT INTO
            highscores(user_id, username, animals_spotted)
            SELECT user_id, $1, $2
            FROM usertable
            WHERE id=$1;
            `,
            [elem.user_id, elem.username, elem.animal_spotted]
            )
              .catch(console.error);
          });
        });
      }
    });
}

function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    usertable (
      id SERIAL PRIMARY KEY,
      username VARCHAR(25) NOT NULL,
      password VARCHAR(25) NOT NULL,
    );
  `)
    .then(loadUsers)
    .catch(console.error);

  client.query(`
  CREATE TABLE IF NOT EXISTS
  highscores (
    highscore_id SERIAL PRIMARY KEY,
    animals_spotted INTEGER,
    user_id INTEGER NOT NULL REFERENCES usertable(id)
    );`
  )
    .then(loadScores)
    .catch(console.error);

  client.query(`
    CREATE TABLE IF NOT EXISTS
    locations(
      user_id INTEGER NOT NULL REFERENCES usertable(id),
      location TEXT NOT NULL
    );`
  )
}
