'use strict';

//dependencies

//environment variables
require('dotenv').config();
const superagent = require('superagent');

//package dependencies
const express = require('express');
const cors = require('cors');
const pg = require('pg');

//app setup
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

//connection to the client
const client= new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));
//to error is human, to err is machine


//API routes will go here
//location API route
app.get('/location', searchToLatLong)
app.get('/weather', searchWeather)
app.get('/meetups', searchMeetup);


//turn the server on so it will listen
app.listen(PORT, () =>console.log(`listening on PORT ${PORT}`));

//error handler - it is called and attached to the function for each route
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('⚠︎ So terriably sorry, something has gone very wrong and you should turn back. Now. ⚠');
}

//TEST ROUTE - makes sure server is up
app.get('/testing', (request, response) =>{
  console.log('hit the test route');
  let testObject = {name: 'test route'}
  response.json(testObject);
})


//Helper functions

function searchToLatLong(request, response){
  let query = request.query.data;

  let sql = `SELECT * FROM locations WHERE search_query=$1;`
  let values = [query];

  client.query(sql, values)
    .then(result => {
      if (result.rowCount > 0){
        console.log('👹LOCATION FROM SQL');
        response.send(result.rows[0]);

      }else{
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

        superagent.get(url)

          .then(data =>{
            console.log('💩LOCATION FROM API');

            if(!data.body.results.length){throw 'NO DATA'}

            else{
              let location = new Location( query, data.body.results[0]);
              let newSql = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) RETURNING id;`;

              let newValues = Object.values(location);
              console.log('💀line', newValues);
              client.query(newSql, newValues)
              
                .then( result => {
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
  console.log('👿 line 96', query);
  this.search_query = query;
  this.formatted_query = location.formatted_address;
  this.latitude = location.geometry.location.lat;
  this.longitude = location.geometry.location.lng;
}

//Refactoring weather to use array.maps. Callback function for the /weather path
//and SQL

function searchWeather(request, response){
  let query = request.query.data.id;

  let sql = `SELECT * FROM weathers WHERE location_id=$1`

  let values = [query];

  client.query(sql, values)
    .then(result =>{
      if(result.rowCount > 0){
        response.send(result.rows);
      }else{
        const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

        superagent.get(url)
          .then(weatherResults => {
            if(!weatherResults.body.daily.data.length){ throw 'NO DATA'}
            else{
              const weatherSummaries = weatherResults.body.daily.data.map(day =>{
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
function Weather(day){
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}


//A function called searchMeetup. Callback function for /meetup path and corresponding constructor function using same structure as search weather function
//not fully working yet, but we think we're on the right track. Need to figure out what parameters to pass to the group_url to make it access the location
function searchMeetup(request, response) {
  console.log('You have reached the searchMeetup function')
  const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&lon=${request.query.data.longitude}&page=20&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`
  return superagent.get(url)
    .then(meetupResults =>{
      console.log('THIS IS THE NAME OF THE MEETUP', meetupResults.body.events[0].name)
      const meetupSummaries = meetupResults.body.events.map(daily => {
        let newMeetup = new Meetup(daily);
        console.log('THIS IS A NEW MEEETUP', newMeetup)
        return newMeetup;
      })
      response.send(meetupSummaries);
    })
    .catch(error => handleError(error, response));
}


function Meetup(data){
  this.link = data.link;
  this.name = data.name;
  this.creation_date = new Date(data.created).toString().slice(0, 15);
  this.host = data.group.name;
}