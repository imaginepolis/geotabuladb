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

var version = process.version.substring(1,2);
var pool = undefined;



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

	if(version >= 6)
	{
		console.log(version);
		console.log(credentials);
		pool = new pg.Pool(credentials);
	}
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


var createQuery = function(queryParams)
{
	var query;
	if (queryParams.querystring) {
		
		if(queryParams.forced != undefined)
		{
			query = queryParams.querystring;
		}
		else if(queryParams.querystring.indexOf(';') != -1)
		{
			console.log("ERROR: Possible code injection: " + queryParams.querystring);
		}
		else
		{
			query = queryParams.querystring;
		}
		
	} else {
		query = 'SELECT ';
		for (col in columns) {
			query += columns[col];
			if (col < columns.length - 1) {
				query += ', ';
			}
		}

		query += ' FROM ' + queryParams.tableName;

		if (queryParams.where != undefined) {
			query += ' WHERE ' + queryParams.where;
		}
		if (queryParams.limit != undefined) {
			query += ' LIMIT ' + queryParams.limit;
		}
		if (queryParams.groupby != undefined) {
			query += ' GROUP BY ' + queryParams.groupby;
		}
		query += ';';
		
	}	
	if (queryParams.debug)
		console.log(query);
	return query;
}

var createGeoQuery = function(columns, queryParams)
{
	var query;
	if (queryParams.querystring) {
					
		if(queryParams.forced != undefined)
		{
			query = queryParams.querystring;
		}
		else if(queryParams.querystring.indexOf(';') != -1)
		{
			console.log("ERROR: Possible code injection: " + queryParams.querystring);
		}
		else
		{
			query = queryParams.querystring;
		}
	}
	else
	{
		query = 'SELECT ';
		for (col in columns) {
			query += columns[col];
			// if (col < columns.length - 1) {
				query += ', ';
			// }
		}
		
		query += ' ST_AsText(' + queryParams.geometry + ') AS wkt ';

		query += ' FROM ' + queryParams.tableName;
		if(queryParams.dateColumn != undefined && queryParams.dateRange != undefined){ 
		query += ' WHERE ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
		if (queryParams.where != undefined) {
			query += ' AND '+queryParams.where;
		}
		}else if (queryParams.where != undefined) {
				query += ' WHERE ' + queryParams.where;
		}
		if(queryParams.order != undefined){
			query += ' ORDER BY ' + queryParams.order;
		}
		if(queryParams.limit != undefined){
			query += ' LIMIT ' + queryParams.limit;
		}
		query += ';';
	}
	if (queryParams.debug)
		console.log(query);
	return query;
}

var createJson = function(queryParams, columns, result)
{
	var geojson = {
			"type" : "FeatureCollection",
			"features" : []
		};
	if(queryParams.properties == 'all')
	{
		for(field in result.fields){
			var name = result.fields[field].name;
			if (name != queryParams.geometry && name != 'wkt')
				columns.push(result.fields[field].name);
		}
	}

	for (each in result.rows) {
		var properties = {};
		for(i in columns){
			var col = columns[i];
			properties[col] = result.rows[each][col];
		}
		var Terraformer = require('terraformer');
		var WKT = require('terraformer-wkt-parser');	
		if(result.rows[each].wkt == null || result.rows[each].wkt == undefined)
			continue;		
		var geometry = WKT.parse(result.rows[each].wkt);
		var feature = {
			"type" : "Feature",
			"geometry" : geometry,
			"properties" : properties
		};
		geojson.features.push(feature);
	}

	return geojson;
}
/**
 * Returns an object with the attributes
 * @param {Object} object with query parameters:<br>
 * <ul>
 * 		<li> <b>limit: </b>  How many rows are going to be inside query
		<li> <b>where: </b> 
		<li> <b>properties: </b> How are the properties going to be created (all, array with properties' names)
		</ul>
 * @param {Object} callback function
 */
var query = function(queryParams, callback) {
	
	var columns = [];
	var resultRows = [];
	var connection;
	if(queryParams.properties != undefined )
	{
		if(queryParams.properties.constructor === Array){
			for (prop in queryParams.properties){
				columns.push(queryParams.properties[prop]);	
			}
		}else if(queryParams.properties == 'all' ){
			columns.push('*');
		}
		
	} else{
		columns.push('*');
	}
	
	//Mysql query
	if (credentials.type === 'mysql') {
		//TODO implemetn this fucntion for mysql db
		console.error("Method NOT IMPLEMENTED for MySql DB");
	} else if(credentials.type === 'postgis'){
		if(version < 6)
		{
			var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
			connection = new pg.Client(connectString);
			connection.connect(function(err) {
				if (err) {
					return console.error('could not connect to postgres', err);
				}
				//console.log('connected');
				if (queryParams.debug)
				{
					console.log("Connected!");
					console.log(connectString);
				}
					
				var query = createQuery(queryParams);
				
				
				connection.query(query, function(err, result) {
					if (err) {
						console.log('error');
						console.log(err.stack);
					}
					connection.end();
					callback(result.rows);
				});
				connection.on('end', function(){
					if(queryParams.debug)		
						console.log("Connection ended");
				});				
			});
		}
		else if (version >= 6)
		{
			var query = createQuery(queryParams);

			pool.query(query, [], function(err, result){
				if (err) {
						console.log('error');
						console.log(err.stack);
					}
				callback(result.rows);
			})
		}
		
		
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

};


/**
 * Creates a geojson 
 * @param {Object} object with query parameters:<br>
 * <ul>
 * 		<li> <b>geometry: </b>  column name that contains the geometry
		<li> <b>tableName: </b> table from the database
		<li> <b>properties: </b> How are the properties going to be created (all, none, array with properties' names)
		</ul>
 * @param {Object} callback function
 */
var geoQuery = function(queryParams, callback) {
	var connection;
	
	var columns = [];
	if(queryParams.properties != undefined )
	{
		if(queryParams.properties.constructor === Array){
			for (prop in queryParams.properties){
				columns.push(queryParams.properties[prop]);	
			}
		}else if(queryParams.properties == 'all' ){
			columns.push('*');
		}
		
	} 
	// else{
		// columns.push('*');
	// }
	//Mysql query
	if (credentials.type === 'mysql') {
		// var query = 'SELECT *, AsWKT(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;		
		// if(queryParams.dateColumn != undefined && queryParams.dateRange != undefined){ 
		// 	query += ' WHERE ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;			
		// }			
		// if(queryParams.limit != undefined){
		// 	query += ' LIMIT ' + queryParams.limit;
		// }
		// var queryCon = connection.query(query);
		// queryCon
		// 	.on('result', function(row){
		// 		var geometry = wkt.parse(row.wkt);
		// 		var properties = {};
		// 		for(i in columns)
		// 		{
		// 			var col = columns[i];
		// 			properties[col] = row[col];
		// 		}
		// 		var feature = {
		// 			"type" : "Feature",
		// 			"geometry" : geometry,
		// 			"properties" : properties
		// 		};
		// 		geojson.features.push(feature);
		// 	})
		// 	.on('fields', function(fields){
		// 		if(queryParams.properties == 'all')
		// 		{
		// 			for (i in fields) {
		// 				var name = fields[i].name;
		// 				if (name != queryParams.geometry && name != 'wkt')
		// 					columns.push(fields[i].name);
		// 			}
		// 		}
		// 		//console.log(columns);
		// 	})
		// 	.on('end', function(){
		// 		//console.log('se acabo...');
		// 		//console.log(geojson);
		// 		callback(geojson);
		// 	});
	} else if(credentials.type === 'postgis'){

		if(version < 6)
		{
			var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
			connection = new pg.Client(connectString);
			connection.connect(function(err) {
				if (err) {
					return console.error('could not connect to postgres', err);
				}
				
				var query = createGeoQuery(columns, queryParams);
				
				connection.query(query, function(err, result) {
					if (err) {
						console.log('error');
						console.log(err.stack);
					}

					var geojson = createJson(queryParams, columns, result);
					callback(geojson);
					connection.end();
				});			
			});
		}
		else if(version >= 6)
		{
			var query = createGeoQuery(columns, queryParams);
			pool.query(query, [], function(err, result)
			{
				if (err) {
					console.log('error');
					console.log(err.stack);
				}

				var geojson = createJson(queryParams, columns, result);
				callback(geojson);
			})
		}
		
		
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
};


/**
 * Test Function 
 */
var testFunction = function(){
	console.log("It´s working!");
};

module.exports = {
	
	setCredentials : setCredentials,
	logCredentials : logCredentials,
	geoQuery : geoQuery,
	query : query,
	testFunction : testFunction
};

