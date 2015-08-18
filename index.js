/**
 * GeoTabulaDB: A library to query geodatabases
 * @author Juan Camilo Ibarra
 * @version 0.0.0
 * @date July 2015
 */

/**
 * Module requires 
 */
var mysql = require('mysql');
var pg = require('pg');
var wkt = require('terraformer-wkt-parser');

/**
 * Credentials for the databas 
 */
var credentials = {
	'type' : 'default',
	'host' : 'localhost',
	'user' : 'anonymous',
	'password' : '',
	'database' : ''
};

var connection;

/**
 * 
 * Sets the credentials for the connection 
 * @param {Object} pCredentials
*/
var setCredentials = function(pCredentials) {
	credentials.type = pCredentials.type ? pCredentials.type : 'mysql';
	credentials.host = pCredentials.host ? pCredentials.host : 'localhost';
	credentials.user = pCredentials.user ? pCredentials.user : 'anonymous';
	credentials.password = pCredentials.password ? pCredentials.password : '';
	credentials.database = pCredentials.database ? pCredentials.database : '';
};
/**
 * Returns a String with the credentials 
 */
var logCredentials = function() {
	var output = '';
	for (each in credentials) {
		output += each + ": " + credentials[each] + "\n";
	}
	return output;
}; 

/**
 * Connects to DB depending on the current credentials 
 */
var connectToDb = function() {
	if (credentials.type === 'mysql') {
		console.log("connection to mysql database.\n" + logCredentials());
		connection = mysql.createConnection({
			host     : credentials.host,
			user     : credentials.user,
			password : credentials.password,
			database : credentials.database
		});
		connection.connect(function(err){
			if(err)
			{
				console.error('error connecting: ' + err.stack);
				return;
			}
			console.log('connected!');
		});
	} else if (credentials.type === 'postgis') {
		///*
		console.log("connection to postgis database.\n" + logCredentials());
		var connectString = 'postgres://' 
						+ credentials.user 
						+ ':'
						+ credentials.password
						+ '@' 
						+ credentials.host
						+ '/'
						+ credentials.database;
		console.log(connectString);
		connection = new pg.Client(connectString);
		connection.connect(function(err){
			if(err)
			{
				console.log(err.stack);
				return console.error('could not connect to postgres', err);

			}
			console.log('connected');
		});
		//*/
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
}; 
/**
 * End current connection 
 */
var endConnection = function(){
	if (credentials.type === 'mysql') {
		connection.end(function(err){
				
		});
	}
	else if(credentials.type == 'postgis')
	{
		connection.end();
	}
	else
	{
		throw "there is no valid db type. [type] = " + credentials.type;
	}
}

/**
 * Creates a geojson 
 * @param {Object} geometryColumn
 * @param {Object} tableName
 */
var geoQuery = function(queryParams, callback) {
	var geojson = {
			"type" : "FeatureCollection",
			"features" : []
		};
	var columns = [];
	if(queryParams.properties.constructor === Array )
	{
		columns = queryParams.properties;
	}
	//Mysql query
	if (credentials.type === 'mysql') {
		var query = 'SELECT *, AsWKT(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;
		var queryCon = connection.query(query);
		queryCon
			.on('result', function(row){
				var geometry = wkt.parse(row.wkt);
				var properties = {};
				for(i in columns)
				{
					var col = columns[i];
					properties[col] = row[col];
				}
				var feature = {
					"type" : "Feature",
					"geometry" : geometry,
					"properties" : properties
				};
				geojson.features.push(feature);
			})
			.on('fields', function(fields){
				if(queryParams.properties == 'all')
				{
					for (i in fields) {
						var name = fields[i].name;
						if (name != queryParams.geometry && name != 'wkt')
							columns.push(fields[i].name);
					}
				}
				//console.log(columns);
			})
			.on('end', function(){
				//console.log('se acabo...');
				//console.log(geojson);
				callback(geojson);
			});
	} else if(credentials.type === 'postgis'){

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		console.log("Query to PostGis");
		console.log(connectString);
		connection = new pg.Client(connectString);
		connection.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);

			}
			console.log('connected');
			var query = 'SELECT *, ST_AsText(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName + ' LIMIT 10';
			console.log("PostGIS query");
			console.log(query);
			connection.query(query, function(err, data) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				console.log(data);
				callback(data);
			});
		});
		
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
}

var testFunction = function(){
	
}

module.exports = {
	
	setCredentials : setCredentials,
	logCredentials : logCredentials,
	connectToDb : connectToDb,
	//endConnection : endConnection,
	geoQuery : geoQuery,
	testFunction : testFunction
}
