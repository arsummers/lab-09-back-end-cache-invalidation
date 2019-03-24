'use strict';

// TODO: Cache invalidation for all tables.
//TODO: add function searchYelp: GET https://api.yelp.com/v3/businesses/search
//NOTE: constructor needs this.name, this.image, this.price, this.rateing, this.url
//NOTE: will need to set http auth headders and bearers
//TODO: add function searchTrails
//NOTE: constructor needs this.name, this.location, this.length, this.stars, this.summary, this.conditions, this.condition_date, this.condition_time
//TODO: dry query handler: LOTS of ``

//dependencies

//environment variables
require('dotenv').config();
const superagent = require('superagent');

//package dependencies
const express = require('express');
const cors = require('cors');
const pg = require('pg');

//app setup
const PORT = process.env.PORT;
const app = express();
app.use(cors());

//connection to the client
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));
//to error is human, to err is machine


//API routes will go here
//location API route
app.get('/location', searchToLatLong)
app.get('/weather', searchWeather)
app.get('/meetups', searchMeetup)
app.get('/movies', searchMovies);
app.get('/yelp', searchYelp);
//app.get('/trails', searchTrails);



//turn the server on so it will listen
app.listen(PORT, () => console.log(`City Explorer Backend listening on PORT ${PORT}`));

//error handler - it is called and attached to the function for each route
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('⚠︎ So terriably sorry, something has gone very wrong and you should turn back. Now! ⚠');
}



//TEST ROUTE - makes sure server is up
app.get('/testing', (request, response) => {
  console.log('hit the test route');
  let testObject = { name: 'test route' }
  response.json(testObject);
})


//Helper functions

function searchToLatLong(request, response) {
  let query = request.query.data;

  let sql = `SELECT * FROM locations WHERE search_query=$1;`
  let values = [query];

  client.query(sql, values)
    .then(result => {
      if (result.rowCount > 0) {
        response.send(result.rows[0]);

      } else {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

        superagent.get(url)

          .then(data => {
            if (!data.body.results.length) { throw 'NO DATA' }

            else {
              let location = new Location(query, data.body.results[0]);
              let newSql = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) RETURNING id;`;

              let newValues = Object.values(location);
              client.query(newSql, newValues)

                .then(result => {
                  location.id = result.rows[0].id;

                  response.send(location);
                })
            }
          })
          .catch(error => handleError(error, response));
      }
    })
}

//constructor for location. Takes in query and location, accesses it inside the google maps data object and pulls out info
function Location(query, location) {
  this.search_query = query;
  this.formatted_query = location.formatted_address;
  this.latitude = location.geometry.location.lat;
  this.longitude = location.geometry.location.lng;
}

//Refactoring weather to use array.maps. Callback function for the /weather path
//and SQL

function searchWeather(request, response) {
  let query = request.query.data.id;

  let sql = `SELECT * FROM weathers WHERE location_id=$1`

  let values = [query];

  client.query(sql, values)
    .then(result => {
      if (result.rowCount > 0) {
        response.send(result.rows);
      } else {
        const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
        superagent.get(url)
          .then(weatherResults => {
            if (!weatherResults.body.daily.data.length) { throw 'NO DATA' }
            else {
              const weatherSummaries = weatherResults.body.daily.data.map(day => {
                let summary = new Weather(day);
                summary.id = query;

                let newSql = `INSERT INTO weathers (forecast, time, location_id) VALUES($1, $2, $3);`;
                let newValues = Object.values(summary);
                client.query(newSql, newValues);

                return summary;
              });

              response.send(weatherSummaries);

            }
          })
      }
    })
    .catch(error => handleError(error, response));
}

//constructor for weather. Turns the milliseconds from the original weather data into userfriendly output
function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}


//A function called searchMeetup. Callback function for /meetup path and corresponding constructor function using same structure as search weather function
//not fully working yet, but we think we're on the right track. Need to figure out what parameters to pass to the group_url to make it access the location

function searchMeetup(request, response) {
  let query = request.query.data;
  let sql = `SELECT * FROM meetups WHERE location_id=$1`
  let values = [query.id];

  client.query(sql, values)
    .then(result=>{
      if (result.rowCount > 0){
        response.send(result.rows);
      } else {
        const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&lon=${request.query.data.longitude}&page=20&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`

        superagent.get(url)
          .then(meetupResults => {
            if (!meetupResults.body.events.length) { throw 'NO DATA' }
            else {
              const meetupSummaries = meetupResults.body.events.map(daily => {
                let newMeetup = new Meetup(daily);
                newMeetup.id = query.id;

                let newSql = `INSERT INTO meetups (link, name, creation_date, host, location_id) VALUES($1, $2, $3, $4, $5);`;
                let newValues = Object.values(newMeetup);
                client.query(newSql, newValues);

                return newMeetup;
              });
              response.send(meetupSummaries);
            }
          })
      }
    })
    .catch(error => handleError(error, response));
}


function Meetup(data) {
  this.link = data.link;
  this.name = data.name;
  this.creation_date = new Date(data.created).toString().slice(0, 15);
  this.host = data.group.name;
}

//moviedb API
//searchMovies function

function searchMovies(request, response) {

  let query = request.query.data;
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&language=en-US&query=${query.search_query}&page=1&include_adult=false`;

  return superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(moviesResults => {

      const movieSummaries = moviesResults.body.results.map(film => {
        let newMovie = new Movie(film);
        newMovie.id = query.id;
        return newMovie;
      })
      response.send(movieSummaries);
    })
    .catch(error => handleError(error, response));
}

function Movie(data) {
  this.title = data.title;
  this.released_on = data.release_date;
  this.total_votes = data.vote_count;
  this.average_votes = data.vote_average;
  this.popularity = data.popularity;
  this.image_url = 'https://image.tmdb.org/t/p/w500' + data.poster_path;
  this.overview = data.overview;
}


function searchYelp(request, response) {
  let query = request.query.data.id;


  const url= `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;
  superagent.get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(yelpResults => {
      const yelpSummaries = yelpResults.body.businesses.map(business =>{
        let newBusiness = new Yelp(business);
        newBusiness.location_id = query;
        return newBusiness;
      })
      response.send(yelpSummaries)
    })
    .catch(error => handleError(error, response));
}


function Yelp(data){
  this.name = data.name;
  this.image = data.image_url;
  this.prices = data.price;
  this.rating = data.rating;
  this.url = data.url;
}
