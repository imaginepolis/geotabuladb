**Welcome to the geotabuladb wiki!**

GeoTabulaDB is a library to get geojson files from queries to different geodatabases. Currently, geotabuladb supports MySQL and PostgreSQL. The resulting geojson can have only geometry or geometry plus all properties or a subset of properties from the database. 

**Usage**  
Create a folder to hold the project and initialize it.
```
$ mkdir my_project
$ cd my_proyect
$ npm init
```
Install the library from npm
```
$ npm install geotabuladb
```

**Example**
```
var geo = require('geotabuladb');
geo.setCredentials({
    type: 'mysql',
    host: 'localhost',
    user: 'USER',
    password: 'PASSWORD',
    database: 'DATABASE_NAME'
});
geo.connectToDb();
geo.geoQuery({
	geometry : 'COLUMN_WITH_GEOMETRY',
	tableName : 'TABLE_NAME',
	properties : 'all'
}, function(json) {
	console.log(json);
});
```

**Credentials**  
To create a connection, first a user must set the credentials. The method `setCredentials()` receives as parameter an object with the following keys:  
* type: type of database. ('mysql', postgis')
* host: address of the host
* user: user
* password: password for the user
* database: database name  


**Queries**  
For a simple query, the method `geoQuery()` receives an object with the following keys:
* tableName: name of the table inside the database
* geometry: name of the column that has the geometry
* properties: the properties that will be added to the geojson ('none', 'all', array). If an array is provided, the geojson will have only the properties set inside the array


