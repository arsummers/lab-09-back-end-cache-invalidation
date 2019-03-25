DROP TABLE IF EXISTS weathers;
DROP TABLE IF EXISTS meetups;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS yelps; 
DROP TABLE IF EXISTS trails;
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7)
);

CREATE TABLE weathers (
  id SERIAL PRIMARY KEY, 
  forecast VARCHAR(255),
  time VARCHAR(255),
  created_at VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) 
);

CREATE TABLE IF NOT EXISTS meetups (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  name VARCHAR(255),
  creation_date VARCHAR(255),
  host VARCHAR(255),
  created_at VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  released_on VARCHAR(255),
  total_votes VARCHAR(255),
  average_votes VARCHAR(255),
  popularity VARCHAR(255),
  image_url VARCHAR(255),
  overview TEXT,
  created_at VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS yelps (
  id SERIAL PRIMARY KEY, 
  name VARCHAR(255),
  image VARCHAR(255),
  prices  VARCHAR(50),
  rating VARCHAR(50),
  url VARCHAR(244),
  created_at VARCHAR(255),
  location_id INTEGER NOT NULL, 
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS trails (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  location VARCHAR(255),
  length VARCHAR(50),
  stars VARCHAR(50),
  star_votes VARCHAR(50),
  summary TEXT,
  trail_url VARCHAR(255),
  conditions TEXT,
  condition_date VARCHAR(50),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);