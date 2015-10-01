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

## Credentials
Set the credentials to connect to the database.
```
 credentials :: {}
 |--> credentials.host     :: string :: OPTIONAL (default= localhost) ::
 |--> credentials.user     :: string :: OPTIONAL :: Username to connect to the database
 |--> credentials.password :: string :: OPTIONAL :: Password to connect to the database
 |--> credentials.database :: string :: REQUIRED :: The database name

setCredentials(credentials) {
...
}
```

## Queries
### query
Run an asynchronous query in the database. Returns a hash string to identify the query. The callback function will be called on database response.
```
 RETURN :: string :: queryHash

 queryParams ::
 |--> string :: Plain SQL query to be executed in the database
 |--> {}     ::
     |--> queryParams.properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
     |--> queryParams.tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
     |--> queryParams.where      :: string :: OPTIONAL :: SQL WHERE
     |--> queryParams.limit      :: string :: OPTIONAL :: SQL LIMIT
     |--> queryParams.groupby    :: string :: OPTIONAL :: SQL GROUP BY

 callback :: function(result, hash) ::
 |--> result :: [][]    :: Matrix with query results [row][column]
 |--> hash   :: string  :: queryHash

query(queryParams, callback) {
...
}
```

### geoQuery
```javascript
/**  Run an asynchronous geoQuery in the database. Returns a hash string to identify the geoQuery. The callback
     function will be called on database response.

     RETURN :: string :: queryHash

     queryParams :: {} ::
     |--> queryParams.properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
     |--> queryParams.tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
     |--> queryParams.geometry   :: string :: REQUIRED :: WKT (Geometry's column name)
     |--> queryParams.where      :: string :: OPTIONAL :: SQL WHERE
     |--> queryParams.limit      :: string :: OPTIONAL :: SQL LIMIT
     |--> queryParams.groupby    :: string :: OPTIONAL :: SQL GROUP BY

     callback :: function(result, hash) ::
     |--> result :: {{}}    :: Query result in geoJSON format
     |--> hash   :: string  :: queryHash
     */
    geoQuery(queryParams, callback) {
    ...
    }
```

### spatialObjectsAtRadius
```javascript
/**  Run an asynchronous query in the database, looking for the objects located at the specified radius from the
     given spatial object. Returns a hash string to identify the query. The callback function will be called
     on database response.

     RETURN :: string :: queryHash

     queryParams :: {} ::
     |--> queryParams.properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
     |--> queryParams.tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
     |--> queryParams.geometry   :: string :: REQUIRED :: WKT (Geometry's column name)
     |--> queryParams.spObj      :: string :: REQUIRED :: Spatial object geometry IN Extended Well-Known Text representation (EWKT)
     |--> queryParams.radius     :: string :: REQUIRED :: Radius to look at (in meters)
     |--> queryParams.limit      :: string :: OPTIONAL :: SQL LIMIT
     |--> queryParams.groupby    :: string :: OPTIONAL :: SQL GROUP BY

     callback :: function(result, hash) ::
     |--> result :: {{}}    :: Query result in geoJSON format
     |--> hash   :: string  :: queryHash
     */
    spatialObjectsAtRadius (queryParams, callback) {
    ...
    }
```