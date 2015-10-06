# Welcome to the geotabuladb!
GeoTabulaDB is a library to get geoJSON files from queries to PostGIS. The resulting geoJSON can have just the geometry or the geometry plus a subset of properties or all the properties from the database.

## Usage
Create a folder to hold the project and initialize it.
```bash
$ mkdir my_project
$ cd my_proyect
$ npm init
```

Install the library from npm
```bash
$ npm install geotabuladb --save
```

## Example
```javascript
var Geotabuladb = require('geotabuladb');

var geo = new Geotabuladb();
geo.setCredentials({
    host: 'localhost',
    user: 'USER',
    password: 'PASSWORD',
    database: 'DATABASE_NAME'
});

geo.geoQuery({
	geometry : 'COLUMN_WITH_GEOMETRY',
	tableName : 'TABLE_NAME',
	properties : 'all'
}, function(json) {
	console.log(json);
});
```

### Multiple / Concurrent queries
Due to the asynchronous nature of NodeJS / PostGIS, if you send multiple queries to the database the callback calls will happen in a random order. If you need to know to witch query a given callback corresponds, you can use the hash returned on the query's call:
 ```javascript
 let _queries = new Map(); // --> in this map we are going to save the hash of each query

 // We are going to make 10 queries::
 for (let t = 1; t <= 10; t++) {
     let parameters = {
         tableName: 'TABLE_NAME',	// The name of the table we are going to query
         geometry: 'GEOM_COLUMN',   // The name of the column who has the geometry
         where: 't = '+ t,          // SQL WHERE condition
         properties: 'all'
     };

     let queryHash = _geo.geoQuery(parameters, callBack); // --> the query hash...
     _queries.set(queryHash, t); // --> use the hash as the key and 't' as the value...
 }

 function callBack(geoJSON, queryHash) {
     let t = _queries.get(queryHash); // --> Recovering the 't' that match this callback call
     _queries.delete(queryHash); // --> Removing that entry from the map...

     glbs.GeoTimeJSON.pack(t, geoJSON); // --> do something with the query result
 }
 ```

## Credentials
Set the credentials to connect to the database.
```
 credentials :: {}
 |--> .host     :: string :: OPTIONAL (default= localhost) ::
 |--> .user     :: string :: OPTIONAL :: Username to connect to the database
 |--> .password :: string :: OPTIONAL :: Password to connect to the database
 |--> .database :: string :: REQUIRED :: The database name

setCredentials(credentials) {
...
}
```

## Queries
### query
Run an asynchronous query in the database. Returns a hash string to identify the query. The callback function will be called on database response.
```
 queryParams ::
 |--> string :: Plain SQL query to be executed in the database
 |--> {}     ::
     |--> .properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
     |--> .tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
     |--> .where      :: string :: OPTIONAL :: SQL WHERE
     |--> .limit      :: string :: OPTIONAL :: SQL LIMIT
     |--> .groupby    :: string :: OPTIONAL :: SQL GROUP BY

 callback :: function(result, hash) ::
 |--> result :: [][]    :: Matrix with query results [row][column]
 |--> hash   :: string  :: queryHash

query(queryParams, callback) {
    RETURN :: string :: queryHash
}
```

### geoQuery
Run an asynchronous query in the database. Returns a hash string to identify the query. The callback function will be called on database response.
```
 queryParams :: {} ::
 |--> .properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
 |--> .tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
 |--> .geometry   :: string :: REQUIRED :: WKT (Geometry's column name)
 |--> .where      :: string :: OPTIONAL :: SQL WHERE
 |--> .limit      :: string :: OPTIONAL :: SQL LIMIT
 |--> .groupby    :: string :: OPTIONAL :: SQL GROUP BY

 callback :: function(result, hash) ::
 |--> result :: {{}}    :: Query result in geoJSON format (geometry encoded in EWKT format)
 |--> hash   :: string  :: queryHash

geoQuery(queryParams, callback) {
    RETURN :: string :: queryHash
}
```

### spatialObjectsAtRadius
Run an asynchronous query in the database, looking for the objects located at the specified radius from the given spatial object. Returns a hash string to identify the query. The callback function will be called on database response.
```
 queryParams :: {} ::
 |--> .properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
 |--> .tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
 |--> .geometry   :: string :: REQUIRED :: WKT (Geometry's column name)
 |--> .spObj      :: string :: REQUIRED :: Spatial object geometry in EWKT (Extended Well-Known Text representation)
 |--> .radius     :: string :: REQUIRED :: Radius to look at (in meters)
 |--> .where      :: string :: OPTIONAL :: SQL WHERE
 |--> .limit      :: string :: OPTIONAL :: SQL LIMIT
 |--> .groupby    :: string :: OPTIONAL :: SQL GROUP BY

 callback :: function(result, hash) ::
 |--> result :: {{}}    :: Query result in geoJSON format (geometry encoded in EWKT format)
 |--> hash   :: string  :: queryHash

spatialObjectsAtRadius (queryParams, callback) {
    RETURN :: string :: queryHash
}
```