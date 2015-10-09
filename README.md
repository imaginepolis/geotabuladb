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

## QueryBuilder
This class provides some static methods to generate query strings. You can execute this queries using the Geotabula *query* method.
```javascript
import GeotabulaDB from 'geotabuladb'
import * as geoHelpers from 'geotabuladb'

let geo = new GeotabulaDB();
geo.setCredentials({
    host: 'localhost',
    user: 'USER',
    password: 'PASSWORD',
    database: 'DATABASE_NAME'
});

let columns = [
    ['id', geoHelpers.PK],
    ['spO_gid', geoHelpers.INT], ['spD_gid', geoHelpers.INT],
    ['time', geoHelpers.TIMESTAMP]
];

let query = geoHelpers.QueryBuilder.createTable('NEW_TABLE_NAME', columns);
geo.query(query, function(result, hash) {
    console.log('Table created!');
});
```
### Provided Constants
```javascript
export const PK = ' SERIAL PRIMARY KEY';
export const STRING = ' TEXT';
export const INT = ' INT';
export const FLOAT = ' FLOAT';
export const TIMESTAMP = ' TIMESTAMP';
```

### dropTable
Generates the SQL query string to drop a table in the database.
```javascript
let tableName = 'oldTable';

console.log( geoHelpers.QueryBuilder.dropTable(tableName) );

    'DROP TABLE IF EXISTS oldTable;'
```

### createTable
Generates the SQL query string to create a table in the database.
```javascript
let tableName = 'myTable';
let columns = [
    ['id', Geotabuladb.PK],
    ['col1', Geotabuladb.STRING],
    ['col2', Geotabuladb.INT]
];

console.log( geoHelpers.QueryBuilder.createTable(tableName, columns) );

    'CREATE TABLE myTable(id SERIAL PRIMARY KEY, col1 TEXT, col2 INT);'
```

### insertInto
Generates the SQL query string to insert rows in a table in the database.
```javascript
let tableName = 'myTable';
let columns = ['col1', 'col2'];
let values = [
    ['ML', 001],
    ['ML', 725]
];

console.log( geoHelpers.QueryBuilder.insertInto(tableName, columns, values) );

     'INSERT INTO myTable(col1,col2) VALUES (ML,001),(ML,725);'
```

### copyTable
Generates the SQL query string to create a new table in the database from the results of a query.
```
 outTable    :: string

 queryParams ::
 |--> string :: Plain SQL query to be executed in the database
 |--> {}     ::
 |--> .properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
 |--> .tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
 |--> .where      :: string :: OPTIONAL :: SQL WHERE
 |--> .limit      :: string :: OPTIONAL :: SQL LIMIT
 |--> .groupby    :: string :: OPTIONAL :: SQL GROUP BY
```
```javascript
let outTable = 'myNewTable';
let queryParams = {
    tableName: 'myTable',
    properties: ['col2'],
    where: "col1 = 'ML*'"
};

console.log( geoHelpers.QueryBuilder.copyTable(outTable, queryParams) );

     "CREATE TABLE myNewTable AS(SELECT col2 FROM myTable WHERE col1 = 'ML*');"
```