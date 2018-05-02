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
const TOKEN = process.env.TOKEN; //This would be used for admin password. Likely delete.


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
//TODO: I think we should have dynamic endpoints to represent each park. Like the /:id kinda thing.
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


      //We have to select some random animals here. Should we parse out the data here on the server side? Or send the big thing over to the client model and do it there? Does it matter? We'll do server side for now...

      // console.log(response.body.results[0]);

      //In case we want to allow user to choose number of animals displayed, we can modify the next line of code to make dynamic.
      let numAnimalsDisplayed = 5;

      //Can we just create a new object property in the response.body like this?
      response.body.animals = [];

      //Loop through results to select 5 sightings and choose the properties we want from the API data.
      for (var i = 0; i < numAnimalsDisplayed; i++) {

        //Generate random index
        let randInd = Math.floor(Math.random() * response.body.results.length);


        // console.log(response.body.results[randInd].taxon.preferred_common_name);

        //TODO: Specify what we're grabbing from the API here. Maybe include some logic to elimate possibility of repeats. I think the chance of repeats is so small we might be able to ignore it.

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

    // .then(response => console.log(response.body.results[1].species_guess)

    .then(data => {
      console.log(data);
      res.send(data);
    })
    .catch(console.error);
});


app.get('*', (req, res) => res.redirect(CLIENT_URL));



app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

//////////
//TODO: Below here, we should do our psql database setup. Grab some sample code from previous labs that create tables if they don't exist and setup column names. This will be for user data. Something like primary key, username, password, number animals spotted, other stuff?


function loadBooks() {


  console.log('loadBooks function called');
  client.query('SELECT COUNT(*) FROM books')
    .then(result => {

      if (!parseInt(result.rows[0].count)) {
        fs.readFile('../client/data/books.json', 'utf8', (err, fd) => {
          JSON.parse(fd).forEach(ele => {
            client.query(`
              INSERT INTO
              books(title, author, isbn, image_url, description)
              VALUES ($1, $2, $3, $4, $5);
            `, [ele.title, ele.author, ele.isbn, ele.image_url, ele.description])
          })
        })
      }
    })
}

function loadDB() {

  console.log('loadDB function called');
  client.query(`
    CREATE TABLE IF NOT EXISTS books (
      book_id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) NOT NULL,
      isbn VARCHAR (255) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      description TEXT);`)
    .then(() => {
      loadBooks();
    })
    .catch(err => {
      console.error(err);
    });
}