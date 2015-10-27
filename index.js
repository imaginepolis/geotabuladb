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
var dt = 4.5;

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

	//var client;
	if (credentials.type === 'mysql') {
		console.log("connection to mysql database.\n" + logCredentials());
		connection = mysql.createConnection({
			host : credentials.host,
			user : credentials.user,
			password : credentials.password,
			database : credentials.database
		});
		connection.connect(function(err) {
			if (err) {
				console.error('error connecting: ' + err.stack);
				return;
			}
			console.log('connected!');
		});
	} else if (credentials.type === 'postgis') {
		//if(connection==undefined){
		///*
		//console.log("connection to postgis database.\n" + logCredentials());
		console.log("connection to postgis database.");
		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;

		//var conString = "postgres://vafuser:1234@localhost/tappsiDB";
		//console.log(conString);
		//console.log(connectString);

		connection = new pg.Client(connectString);
		connection.connect(function(err) {
			if (err) {
				//console.log(err.stack);X
				return console.error('could not connect to postgres', err);
			}
		});

		console.log('connected');
		//}
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
};
/**
 * End current connection
 */
/*var endConnection = function(){
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
 return done;
 }*/

var query = function(queryParams, callback) {

	var columns = [];
	var resultRows = [];
	if (queryParams.properties != undefined) {
		if (queryParams.properties.constructor === Array) {
			for (prop in queryParams.properties) {
				columns.push(queryParams.properties[prop]);
			}
		} else if (queryParams.properties == 'all') {
			columns.push('*');
		}

	} else {
		columns.push('*');
	}

	//Mysql query
	if (credentials.type === 'mysql') {
		//TODO implemetn this fucntion for mysql db
		console.error("Method NOT IMPLEMENTED for MySql DB");
	} else if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		//console.log("Simple query to PostGis");

		var connection = new pg.Client(connectString);
		connection.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			//console.log('connected');

			var query = 'SELECT ';
			for (col in columns) {
				query += columns[col];
				console.log(' -- col: '+col);
				if (col < columns.length - 1) {
					query += ', ';
				}
			}
			query += ' FROM ' + queryParams.tableName;

			if (queryParams.where != undefined) {
				query += ' WHERE ' + queryParams.where;
				if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
					query += ' AND ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
				}
			}else if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}
			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			query += ';';
			console.log(query);

			connection.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				if (queryParams.userData == undefined) {
					callback(result.rows);
					connection.end();
				} else {
					callback({
						'result': result.rows,
						'userData': queryParams.userData
					});
					connection.end();
				}
				/*if (queryParams.properties == undefined || queryParams.properties == 'all') {
					for (field in result.fields) {
						columns.push(result.fields[field].name);
					}
				}

				if (result != undefined) {
					for (each in result.rows) {
						var item = {};
						for (i in columns) {
							var col = columns[i];
							item[col] = result.rows[each][col];
						}
						resultRows.push(item);
					}
					connection.end();
					callback(resultRows);
				}*/
				//connection.end();
			});
			/*connection.on('end', function(){
			 connection.end();
			 });*/
		});

	} else {
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
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}
	//Mysql query
	if (credentials.type === 'mysql') {
		var query = 'SELECT *, AsWKT(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;
		if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
			query += ' WHERE ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
		}
		if (queryParams.limit != undefined) {
			query += ' LIMIT ' + queryParams.limit;
		}
		var queryCon = connection.query(query);
		queryCon.on('result', function(row) {
			var geometry = wkt.parse(row.wkt);
			var properties = {};
			for (i in columns) {
				var col = columns[i];
				properties[col] = row[col];
			}
			var feature = {
				"type" : "Feature",
				"geometry" : geometry,
				"properties" : properties
			};
			geojson.features.push(feature);
		}).on('fields', function(fields) {
			if (queryParams.properties == 'all') {
				for (i in fields) {
					var name = fields[i].name;
					if (name != queryParams.geometry && name != 'wkt')
						columns.push(fields[i].name);
				}
			}
			//console.log(columns);
		}).on('end', function() {
			//console.log('se acabo...');
			//console.log(geojson);
			callback(geojson);
		});
	} else if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		//console.log("Query to PostGis");
		//console.log(connectString);
		var connection = new pg.Client(connectString);
		connection.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			//console.log('connected');

			//var query = 'SELECT *, ST_AsText(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;
			var query = 'SELECT *, ST_AsText(';

			if (queryParams.geometryOptions != undefined) {
				if (queryParams.geometryOptions == 'startPoint') {
					query += ' ST_StartPoint( ' + queryParams.geometry + ' ) ';
				} else if (queryParams.geometryOptions == 'endPoint') {
					query += ' ST_EndPoint( ' + queryParams.geometry + ' ) ';
				} else {
					query += queryParams.geometry;
				}
			} else {
				query += queryParams.geometry;
			}
			query += ') AS wkt FROM ' + queryParams.tableName;

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}
			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			console.log(query);
			connection.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				if (result != undefined) {
					if (queryParams.properties == 'all') {
						for (field in result.fields) {
							var name = result.fields[field].name;
							if (name != queryParams.geometry && name != 'wkt')
								columns.push(result.fields[field].name);
						}
					}

					for (each in result.rows) {
						var properties = {};
						for (i in columns) {
							var col = columns[i];
							properties[col] = result.rows[each][col];
						}
						var Terraformer = require('terraformer');
						var WKT = require('terraformer-wkt-parser');
						var geometry = WKT.parse(result.rows[each].wkt);
						var feature = {
							"type" : "Feature",
							"geometry" : geometry,
							"properties" : properties
						};
						geojson.features.push(feature);
					}
				}
				connection.end();
				callback(geojson);
				//console.log(data);
				//callback(data);

			});
			/*connection.on('end', function(){
			 client.end();
			 });*/
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
}
/**
 * This method is applicable only to linestrings.
 * Creates a geojson with segments of line.
 * Additionally the distance (distance) and velocity (segmentVelocity) of each segment are estimated.
 * @param {Object} geometryColumn
 * @param {Object} tableName
 */
var getLineSegments = function(queryParams, callback) {

	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}
	//Mysql query
	if (credentials.type === 'mysql') {
		console.log("getLineSegments NOT IMPLEMENTED for mysql db");

		/*var query = 'SELECT *, AsWKT(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;
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
		 });*/

	} else if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		console.log("Query to PostGis");
		//console.log(connectString);
		connection = new pg.Client(connectString);
		connection.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			console.log('connected');

			//var query = 'SELECT *, ST_AsText(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName + ' LIMIT ' + queryParams.limit;
			var query = 'SELECT *, ST_AsText(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}

			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}

			console.log("PostGIS query");
			//console.log(query);
			connection.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				if (queryParams.properties == 'all') {
					for (field in result.fields) {
						var name = result.fields[field].name;
						if (name != queryParams.geometry && name != 'wkt')
							columns.push(result.fields[field].name);
					}
				}
				//console.log("PostGIS query executed! " + result.rows.length);
				var totalDistance = 0;
				for (each in result.rows) {

					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var geometry = WKT.parse(result.rows[each].wkt);
					var numOfSegments = geometry.coordinates.length - 1;

					for (var coordinate = 0; coordinate < numOfSegments; coordinate++) {
						var properties = {};
						for (i in columns) {
							var col = columns[i];
							properties[col] = result.rows[each][col];
						}
						var segmentDistance = getDistance(geometry.coordinates[coordinate], geometry.coordinates[coordinate + 1]);
						var segment = new Terraformer.LineString([geometry.coordinates[coordinate], geometry.coordinates[coordinate + 1]]);
						properties["segmentLength"] = segmentDistance;
						properties["segmentVelocity"] = (segmentDistance / 1000) / (dt / 3600);
						totalDistance += segmentDistance;
						var feature = {
							"type" : "Feature",
							"geometry" : segment,
							"properties" : properties
						};
						geojson.features.push(feature);
					}
				}
				callback(geojson);
			});
			//connection.end();
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}
//queryParams.limit
//queryParams.geometryTable			redprimariawgs84_lite_buffer
//queryParams.geometryColumn			wkb_geometry
//queryParams.geometryIdColumn		ogc_fid
//queryParams.geometryId				1
//queryParams.linestringTable			routes
//queryParams.linestringColumn		trajectory
//queryParams.linestringProperties	id

/**
 * This method join two tables in a database, at least one of the tables has to have linestrings.
 * Output: Creates a geojson with segments of line.
 * Additionally the distance (distance) and velocity (segmentVelocity) of each segment are estimated.
 * @param {Object} geometryColumn
 * @param {Object} linestringColumn
 * @param {Object} tableName
 */
var getIntersectingSegments = function(queryParams, callback) {
	console.log("executing getIntersectingSegments ");
	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}
	//Mysql query
	if (credentials.type === 'mysql') {
		console.log("getLineSegments NOT IMPLEMENTED for mysql db");

		/*var query = 'SELECT *, AsWKT(' + queryParams.geometry + ') AS wkt FROM ' + queryParams.tableName;
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
		 });*/

	} else if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		console.log("Query to PostGis");

		var geometry = {};
		var columns = [];
		var connection4geometry = new pg.Client(connectString);
		connection4geometry.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres 0', err);
			}
			//console.log('connected to get the geometry');

			var query4geometry = 'SELECT *, ST_AsText(' + queryParams.geometryColumn + ') AS wkt FROM ' + queryParams.geometryTable + ' WHERE ' + queryParams.geometryIdColumn + '=' + queryParams.geometryId + ';';
			//console.log(query4geometry);
			connection4geometry.query(query4geometry, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				for (each in result.rows) {
					//var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					geometry = WKT.parse(result.rows[each].wkt);
				}
			});
		});
		//connection4geometry.end();

		var connection4linestring = new pg.Client(connectString);
		connection4linestring.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			//console.log('connected to get the linestring');
			var query = 'SELECT DISTINCT ';
			if (queryParams.linestringProperties != undefined) {
				columns = queryParams.linestringProperties;
				for (property in queryParams.linestringProperties) {
					query += queryParams.linestringTable + '.' + queryParams.linestringProperties[property] + ', ';
				}
			}
			query += 'ST_AsText(' + queryParams.linestringTable + '.' + queryParams.linestringColumn + ') AS wkt FROM ' + queryParams.geometryTable + ', ' + queryParams.linestringTable;

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.linestringTable + '.' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}
			//' WHERE (routes.time_stamp BETWEEN '2004-01-07 07:00:00' AND '2004-01-07 07:59:59')
			query += ' AND ' + queryParams.geometryTable + '.' + queryParams.geometryIdColumn + '=' + queryParams.geometryId + ' AND (ST_Crosses(' + queryParams.linestringTable + '.' + queryParams.linestringColumn + ', ' + queryParams.geometryTable + '.' + queryParams.geometryColumn + '))';

			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			//console.log("PostGIS query");
			//console.log(query);
			connection4linestring.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				/*if(queryParams.properties == 'all')
				 {
				 for(field in result.fields){
				 var name = result.fields[field].name;
				 if (name != queryParams.geometry && name != 'wkt')
				 columns.push(result.fields[field].name);
				 }
				 }*/
				var totalDistance = 0;
				for (each in result.rows) {
					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var linestring = WKT.parse(result.rows[each].wkt);
					var numOfSegments = linestring.coordinates.length - 1;

					for (var coordinate = 0; coordinate < numOfSegments; coordinate++) {
						var properties = {};
						for (i in columns) {
							var col = columns[i];
							properties[col] = result.rows[each][col];
						}
						var segment = new Terraformer.LineString([linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]]);

						Geometry0 = new Terraformer.Primitive(geometry);
						Segment = new Terraformer.Primitive(segment);

						if (Geometry0.contains(Segment)) {//contains or intersects

							var segmentDistance = getDistance(linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]);
							properties["segmentLength"] = segmentDistance;
							properties["segmentVelocity"] = (segmentDistance / 1000) / (dt / 3600);
							var feature = {
								"type" : "Feature",
								"geometry" : segment,
								"properties" : properties
							};
							geojson.features.push(feature);
						}
					}
				}
				callback(geojson);
			});
			//connection4linestring.end();
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}



var getElementsFromCircles = function(queryParams, callback) {
	console.log("executing getElementsFromCircles ");
	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}
	if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;

		var connection = new pg.Client(connectString);
		connection.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}

			var query = 'SELECT *, ST_AsText(';
			query += queryParams.geometry;

			query += ') AS wkt FROM ' + queryParams.tableName;

			if (queryParams.centers != undefined && queryParams.radii != undefined) {
				//query += ' WHERE ST_Crosses(  ST_Buffer( ST_AsText(ST_SetSRID(ST_MakePoint(-74.04098510742188, 4.734516689109568)),4326), 500 ),'+ queryParams.geometry + ');';
				//query += " WHERE ST_Crosses(  ST_Buffer( ST_GeomFromText('POINT(-74.04098510742188 4.734516689109568)', 4326), 500) ,"+ queryParams.geometry + ");";
				query += " WHERE ST_Intersects( ST_Buffer( CAST( ST_SetSRID( ST_GeomFromText( 'POINT(" + queryParams.centers[0][0] + " " + queryParams.centers[0][1] + ")'), 4326) AS geography), "+ queryParams.radii[0]+"), ST_StartPoint(trajectory))";
				query += "AND ST_Intersects( ST_Buffer( CAST( ST_SetSRID( ST_GeomFromText( 'POINT("+ queryParams.centers[1][0] +" "+ queryParams.centers[1][1] +")'), 4326) AS geography), " + queryParams.radii[1] + "), ST_EndPoint(trajectory));";
				/*query += "WHERE ST_Crosses(  ST_Buffer( ST_GeomFromText() , r ), geom2 );
				ST_GeomFromText( 'SRID=4326; " + queryParams.point + "'))*/
			}


			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			console.log(query);

			//query = "SELECT *, ST_AsText(trajectory) AS wkt FROM routes WHERE ST_Intersects( ST_Buffer( ST_GeomFromText('POINT(-74.04098510742188 4.734516689109568)', 4326), 0.000500), trajectory) LIMIT 10;";
			//query = "SELECT *, ST_AsText(trajectory) AS wkt FROM routes WHERE ST_Intersects( ST_Buffer( CAST( ST_SetSRID( ST_GeomFromText( 'POINT(-74.04098510742188 4.734516689109568)'), 4326) AS geography), 500), trajectory) AND ST_Intersects( ST_Buffer( CAST( ST_SetSRID( ST_GeomFromText( 'POINT(-74.08973693847656 4.663687765941434)'), 4326) AS geography), 500), trajectory);";



			connection.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				//console.log(result);
				if (result != undefined) {
					if (queryParams.properties == 'all') {
						for (field in result.fields) {
							var name = result.fields[field].name;
							if (name != queryParams.geometry && name != 'wkt')
								columns.push(result.fields[field].name);
						}
					}

					for (each in result.rows) {
						var properties = {};
						for (i in columns) {
							var col = columns[i];
							properties[col] = result.rows[each][col];
						}
						var Terraformer = require('terraformer');
						var WKT = require('terraformer-wkt-parser');
						var geometry = WKT.parse(result.rows[each].wkt);
						var feature = {
							"type" : "Feature",
							"geometry" : geometry,
							"properties" : properties
						};
						geojson.features.push(feature);
					}
				}
				connection.end();
				callback(geojson);
				//console.log(data);
				//callback(data);

			});
			/*connection.on('end', function(){
			 client.end();
			 });*/
		});



	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}



/**
 * This method join two tables in a database, at least one of the tables has to have linestrings.
 * Output: Creates a geojson with segments of line.
 * Additionally the distance (distance) and velocity (segmentVelocity) of each segment are estimated.
 * @param {Object} geometryColumn
 * @param {Object} linestringColumn
 * @param {Object} tableName
 */
var intersectRoadAndRoutes = function(queryParams, callback) {
	console.log("executing getIntersectingSegments ");
	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}
	if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		console.log("Query to PostGis");

		var buffer = {};
		var columns = [];
		connection4road = new pg.Client(connectString);
		connection4road.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres 0', err);
			}
			//console.log('connected to get the geometry');

			var query4road = 'SELECT *, ST_AsText(' + queryParams.roadColumn + ') AS wkt, ST_AsText( ST_Buffer(' + queryParams.roadColumn + ', ' + queryParams.buferSize + ') ) as wkt_buffer FROM ' + queryParams.roadTable + ' WHERE ' + queryParams.roadIdColumn + '=' + queryParams.roadId + ';';
			//console.log(query4geometry);
			connection4road.query(query4road, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				for (each in result.rows) {
					//var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					buffer = WKT.parse(result.rows[each].wkt_buffer);
				}
			});
		});

		connection4routes = new pg.Client(connectString);
		connection4routes.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			var query = 'SELECT DISTINCT ';
			if (queryParams.routesProperties != undefined) {
				columns = queryParams.routesProperties;
				for (property in queryParams.routesProperties) {
					query += queryParams.routesTable + '.' + queryParams.routesProperties[property] + ', ';
				}
			}
			query += 'ST_AsText(' + queryParams.routesTable + '.' + queryParams.routesColumn + ') AS wkt FROM ' + queryParams.roadTable + ', ' + queryParams.routesTable;

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.routesTable + '.' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}

			query += ' AND ' + queryParams.roadTable + '.' + queryParams.roadIdColumn + ' = ' + queryParams.roadId + ' AND (ST_Crosses(' + queryParams.routesTable + '.' + queryParams.routesColumn + ', ST_Buffer(' + queryParams.roadTable + '.' + queryParams.roadColumn + ', ' + queryParams.buferSize + ')' + '))';

			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			query += ';';
			//console.log("PostGIS query");
			//console.log(query);
			connection4routes.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				if (queryParams.properties == 'all') {
					for (field in result.fields) {
						var name = result.fields[field].name;
						if (name != queryParams.geometry && name != 'wkt')
							columns.push(result.fields[field].name);
					}
				}

				for (each in result.rows) {
					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var route = WKT.parse(result.rows[each].wkt);
					var properties = {};
					for (i in columns) {
						var col = columns[i];
						properties[col] = result.rows[each][col];
					}

					var feature = {
						"type" : "Feature",
						"geometry" : route,
						"properties" : properties
					};
					geojson.features.push(feature);

				}
				callback(geojson);
			});
			//connection.end();
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}
/**
 * This method join two tables in a database, at least one of the tables has to have linestrings.
 * Output: Creates a geojson with segments of line.
 * Additionally the distance (distance) and velocity (segmentVelocity) of each segment are estimated.
 * @param {Object} geometryColumn
 * @param {Object} linestringColumn
 * @param {Object} tableName
 */
var intersectRoadAndSegments = function(queryParams, callback) {
	console.log("executing getIntersectingSegments ");
	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}
	if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		console.log("Query to PostGis");

		var road = {};
		var buffer = {};
		var columns = [];
		connection4road = new pg.Client(connectString);
		connection4road.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres 0', err);
			}
			//console.log('connected to get the geometry');

			var query4road = 'SELECT *, ST_AsText(' + queryParams.roadColumn + ') AS wkt, ST_AsText( ST_Buffer(' + queryParams.roadColumn + ', ' + queryParams.buferSize + ') ) as wkt_buffer FROM ' + queryParams.roadTable + ' WHERE ' + queryParams.roadIdColumn + '=' + queryParams.roadId + ';';
			//console.log(query4geometry);
			connection4road.query(query4road, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				for (each in result.rows) {
					//var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					road = WKT.parse(result.rows[each].wkt);
					buffer = WKT.parse(result.rows[each].wkt_buffer);
				}
			});
		});

		connection4routes = new pg.Client(connectString);
		connection4routes.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			//console.log('connected to get the linestring');
			var query = 'SELECT DISTINCT ';
			if (queryParams.routesProperties != undefined) {
				columns = queryParams.routesProperties;
				for (property in queryParams.routesProperties) {
					query += queryParams.routesTable + '.' + queryParams.routesProperties[property] + ', ';
				}
			}
			query += 'ST_AsText(' + queryParams.routesTable + '.' + queryParams.routesColumn + ') AS wkt FROM ' + queryParams.roadTable + ', ' + queryParams.routesTable;

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.routesTable + '.' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}
			//' WHERE (routes.time_stamp BETWEEN '2004-01-07 07:00:00' AND '2004-01-07 07:59:59')
			//query += ' AND '+queryParams.roadTable+'.'+queryParams.roadIdColumn+' = '+queryParams.roadId+' AND (ST_Crosses('+queryParams.routesTable+'.'+queryParams.routesColumn+', '+queryParams.roadTable+'.'+queryParams.roadColumn+'))';
			query += ' AND ' + queryParams.roadTable + '.' + queryParams.roadIdColumn + ' = ' + queryParams.roadId + ' AND (ST_Crosses(' + queryParams.routesTable + '.' + queryParams.routesColumn + ', ST_Buffer(' + queryParams.roadTable + '.' + queryParams.roadColumn + ', ' + queryParams.buferSize + ')' + '))';

			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			console.log("PostGIS query");
			console.log(query);
			connection4routes.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				/*if(queryParams.properties == 'all')
				{
				for(field in result.fields){
				var name = result.fields[field].name;
				if (name != queryParams.geometry && name != 'wkt')
				columns.push(result.fields[field].name);
				}
				}*/
				//var totalDistance = 0;
				for (each in result.rows) {
					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var linestring = WKT.parse(result.rows[each].wkt);
					var numOfSegments = linestring.coordinates.length - 1;

					for (var coordinate = 0; coordinate < numOfSegments; coordinate++) {
						var properties = {};
						for (i in columns) {
							var col = columns[i];
							properties[col] = result.rows[each][col];
						}
						var segment = new Terraformer.LineString([linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]]);

						Geometry = new Terraformer.Primitive(buffer);
						Segment = new Terraformer.Primitive(segment);

						if (Geometry.intersects(Segment)) {//contains or intersects

							//console.log(road);
							var l1 = {
								x1 : road.coordinates[0][0],
								y1 : road.coordinates[0][1],
								x2 : road.coordinates[1][0],
								y2 : road.coordinates[1][1]
							};
							var l2 = {
								x1 : segment.coordinates[0][0],
								y1 : segment.coordinates[0][1],
								x2 : segment.coordinates[1][0],
								y2 : segment.coordinates[1][1]
							};

							var angle = getAngle(l1, l2);
							console.log(angle);

							var segmentDistance = getDistance(linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]);
							properties["segmentLength"] = segmentDistance;
							properties["segmentVelocity"] = (segmentDistance / 1000) / (dt / 3600);
							properties["deltaAngle"] = angle;
							var feature = {
								"type" : "Feature",
								"geometry" : segment,
								"properties" : properties
							};
							geojson.features.push(feature);
						}
					}
				}
				callback(geojson);
			});
			//connection.end();
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}


var getSpatialAccuracyPhenomena1 = function(queryParams, callback) {
	console.log("executing getSpatialAccuracyPhenomena1 ");

	if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		console.log("Query to PostGis");

		var columns = [];

		connection4routes = new pg.Client(connectString);
		connection4routes.connect(function (err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			//console.log('connected to get the linestring');
			var query = 'SELECT trajectory, ';
			if (queryParams.routesProperties != undefined) {
				columns = queryParams.routesProperties;
				for (property in queryParams.routesProperties) {
					query += queryParams.routesTable + '.' + queryParams.routesProperties[property] + ', ';
				}
			}
			query += 'ST_AsText(' + queryParams.routesColumn + ') AS wkt FROM ' + queryParams.routesTable;

			//query += ' WHERE distance>22000;';
			//query += ' WHERE distance > 18000 AND distance <= 22000;';
			//query += ' WHERE distance > 15000 AND distance <= 18000;';
			//query += ' WHERE distance > 12000 AND distance <= 15000;';
			//query += ' WHERE distance > 10000 AND distance <= 12000;';
			//query += ' WHERE distance > 8000 AND distance <= 10000;';
			//query += ' WHERE distance > 6000 AND distance <= 8000;';
			//query += ' WHERE distance > 4000 AND distance <= 6000;';
			//query += ' WHERE distance > 2000 AND distance <= 4000;';
			query += ' WHERE distance > 0 AND distance <= 2000;';

			console.log("PostGIS query");
			console.log(query);
			connection4routes.query(query, function (err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				var numOfNonAccurateRoutes = 0;
				var counter = 0;
				var total = result.rows.length;
				console.log(' query with '+total +' elements');

				for (each in result.rows) {
					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var linestring = WKT.parse(result.rows[each].wkt);

					var numOfSegments = linestring.coordinates.length - 1;
					var found = false;
					for (var coordinate = 0; coordinate < numOfSegments && !found; coordinate++) {
						var segment = new Terraformer.LineString([linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]]);

							var l2 = {
								x1: segment.coordinates[0][0],
								y1: segment.coordinates[0][1],
								x2: segment.coordinates[1][0],
								y2: segment.coordinates[1][1]
							};
							var segmentDistance = getDistance(linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]);
							//console.log('segment '+ coordinate + ' : ' + segmentDistance);
							if(segmentDistance > 1500){
								console.log('segment found : '+ segmentDistance);
								numOfNonAccurateRoutes++;
								found =true;
							}

					}
					//console.log(' route '+each+' / '+total);
					if (counter > 100){
						console.log(' route '+each+' / '+total);
						counter =0;
					}
					counter++;
				}
				console.log('numOfNonAccurateRoutes : ' + numOfNonAccurateRoutes)
				console.log('Done!');
				callback(numOfNonAccurateRoutes);
			});
			//connection.end();
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
}

/**
 * This method join two tables in a database, at least one of the tables has to have linestrings.
 * Output: Creates a geojson with segments of line.
 * Additionally the distance (distance) and velocity (segmentVelocity) of each segment are estimated.
 * @param {Object} geometryColumn
 * @param {Object} linestringColumn
 * @param {Object} tableName
 */
var getRoadVelocityFromRoutes = function(queryParams, callback) {
	console.log("executing getIntersectingSegments ");
	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];
	if (queryParams.properties.constructor === Array) {
		columns = queryParams.properties;
	}

	if (credentials.type === 'postgis') {

		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		//console.log("Query to PostGis");

		var road = {};
		var buffer = {};
		var columns = [];
		var properties = {};
		var numOfRoutesInside = 0;
		var connection4road = new pg.Client(connectString);
		connection4road.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres 0', err);
			}

			var query4road = 'SELECT *, ST_AsText(' + queryParams.roadColumn + ') AS wkt, ST_AsText( ST_Buffer(' + queryParams.roadColumn + ', ' + queryParams.buferSize + ') ) as wkt_buffer FROM ' + queryParams.roadTable + ' WHERE ' + queryParams.roadIdColumn + '=' + queryParams.roadId + ';';

			//console.log(query4geometry);
			connection4road.query(query4road, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				if (queryParams.properties != undefined && queryParams.properties == 'all') {
					for (field in result.fields) {
						var name = result.fields[field].name;
						if (name != queryParams.geometry && name != 'wkt' && name != 'wkt_buffer' && name != 'wkb_geometry')
							columns.push(result.fields[field].name);
					}
				} else if (queryParams.properties != undefined && queryParams.properties.constructor === Array) {
					for (prop in queryParams.properties) {
						columns.push(queryParams.properties[prop]);
					}
				}

				for (each in result.rows) {
					numOfRoutesInside++;
					var WKT = require('terraformer-wkt-parser');
					road = WKT.parse(result.rows[each].wkt);
					buffer = WKT.parse(result.rows[each].wkt_buffer);
					for (i in columns) {
						var col = columns[i];
						properties[col] = result.rows[each][col];
					}
				}
				connection4road.end();
			});
			//connection4road.end();
		});
		//connection4road.end();

		var connection4routes = new pg.Client(connectString);
		connection4routes.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			//console.log('connected to get the linestring');
			var query = 'SELECT DISTINCT ';
			if (queryParams.routesProperties != undefined) {
				columns = queryParams.routesProperties;
				for (property in queryParams.routesProperties) {
					query += queryParams.routesTable + '.' + queryParams.routesProperties[property] + ', ';
				}
			}
			query += 'ST_AsText(' + queryParams.routesTable + '.' + queryParams.routesColumn + ') AS wkt FROM ' + queryParams.roadTable + ', ' + queryParams.routesTable;

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.routesTable + '.' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}
			//' WHERE (routes.time_stamp BETWEEN '2004-01-07 07:00:00' AND '2004-01-07 07:59:59')
			//query += ' AND '+queryParams.roadTable+'.'+queryParams.roadIdColumn+' = '+queryParams.roadId+' AND (ST_Crosses('+queryParams.routesTable+'.'+queryParams.routesColumn+', '+queryParams.roadTable+'.'+queryParams.roadColumn+'))';
			query += ' AND ' + queryParams.roadTable + '.' + queryParams.roadIdColumn + ' = ' + queryParams.roadId + ' AND (ST_Crosses(' + queryParams.routesTable + '.' + queryParams.routesColumn + ', ST_Buffer(' + queryParams.roadTable + '.' + queryParams.roadColumn + ', ' + queryParams.buferSize + ')' + '))';

			if (queryParams.limit != undefined) {
				query += ' LIMIT ' + queryParams.limit;
			}
			//console.log("PostGIS query");
			//console.log(query);
			connection4routes.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				/*if(queryParams.properties == 'all')
				{
				for(field in result.fields){
				var name = result.fields[field].name;
				if (name != queryParams.geometry && name != 'wkt')
				columns.push(result.fields[field].name);
				}
				}*/
				//var totalDistance = 0;
				var numOfSegmentsInside = 0;
				var velocity = 0;
				for (each in result.rows) {
					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var linestring = WKT.parse(result.rows[each].wkt);
					var numOfSegments = linestring.coordinates.length - 1;
					//console.log("numOfSegments: " + numOfSegments);

					for (var coordinate = 0; coordinate < numOfSegments; coordinate++) {

						/*for(i in columns){
						 var col = columns[i];
						 properties[col] = result.rows[each][col];
						 }	*/
						var segment = new Terraformer.LineString([linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]]);

						Geometry = new Terraformer.Primitive(buffer);
						Segment = new Terraformer.Primitive(segment);

						if (Geometry.intersects(Segment)) {//contains or intersects

							//console.log(road);
							var l1 = {
								x1 : road.coordinates[0][0],
								y1 : road.coordinates[0][1],
								x2 : road.coordinates[1][0],
								y2 : road.coordinates[1][1]
							};
							var l2 = {
								x1 : segment.coordinates[0][0],
								y1 : segment.coordinates[0][1],
								x2 : segment.coordinates[1][0],
								y2 : segment.coordinates[1][1]
							};
							var angle = getAngle(l1, l2);
							//console.log(angle);
							if (angle < 30) {
								numOfSegmentsInside++;
								var segmentDistance = getDistance(linestring.coordinates[coordinate], linestring.coordinates[coordinate + 1]);
								//properties["segmentLength"] = segmentDistance;
								//properties["segmentVelocity"] = (segmentDistance/1000) / (dt/3600);
								velocity += (segmentDistance / 1000) / (dt / 3600);
								//properties["deltaAngle"] = angle;
								//console.log(" segment in the road buffer found! ");
								//console.log(numOfSegmentsInside);
							}

							/*var feature = {
							 "type" : "Feature",
							 "geometry" : segment,
							 "properties" : properties
							 };
							 geojson.features.push(feature);*/
						}
					}
				}
				velocity /= numOfSegmentsInside;
				properties["velocity"] = velocity;
				properties["numOfRoutes4Velocity"] = numOfRoutesInside;
				properties["numOfSegments4Velocity"] = numOfSegmentsInside;

				var feature = {
					"type" : "Feature",
					"geometry" : road,
					"properties" : properties
				};
				geojson.features.push(feature);
				connection4routes.end();
				callback(geojson);
			});
		});
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}
/**
 * This method join two tables in a database.
 * The reference Table
 * The target table is the source of resulting elements
 * Output: Set of objetcs in the target Layer.
 * @param {Object} referenceTableName
 * @param {Object} referenceColumn
 * @param {Object} referenceId
 * @param {Object} referenceIdColumn
 * @param {Object} targetTableName
 * @param {Object} targetColumn
 */
var intersectLayers = function(queryParams, callback) {
	var geojson = {
		"type" : "FeatureCollection",
		"features" : []
	};
	var columns = [];

	if (credentials.type === 'postgis') {
		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		//console.log("Query to PostGis");
		var reference = {};
		var referenceId;
		var numOfStartingRoutes = 0;
		var properties = {};

		if (connection == undefined) {
			connectToDb();
		}

		connection4reference = new pg.Client(connectString);
		connection4target = new pg.Client(connectString);

		connection4reference.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres ', err);
			}

			var query4reference = 'SELECT *, ST_AsText(' + queryParams.referenceColumn + ') AS wkt FROM ' + queryParams.referenceTableName + ' WHERE ' + queryParams.referenceIdColumn + ' = ' + queryParams.referenceId + ';';

			//console.log(query4reference);//TODO comment
			connection4reference.query(query4reference, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}

				for (each in result.rows) {
					var WKT = require('terraformer-wkt-parser');
					reference = WKT.parse(result.rows[each].wkt);
					referenceId = result.rows[each][queryParams.referenceId];
				}

				connection4target.connect(function(err) {
					//connection.connect(function(err) {
					if (err) {
						return console.error('could not connect to postgres', err);
					}

					var query4target = 'SELECT DISTINCT ';

					if (queryParams.properties != undefined && queryParams.properties.constructor === Array) {
						columns = queryParams.properties;
						for (property in queryParams.properties) {
							query4target += queryParams.targetTableName + '.' + queryParams.properties[property] + ', ';
						}
					} else {
						query4target += '*';
					}

					query4target += 'ST_AsText(' + queryParams.targetTableName + '.' + queryParams.targetColumn + ') AS wkt FROM ' + queryParams.referenceTableName + ', ' + queryParams.targetTableName;

					if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
						query4target += ' WHERE ' + queryParams.targetTableName + '.' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
					}

					query4target += ' AND ' + queryParams.referenceTableName + '.' + queryParams.referenceIdColumn + ' = ' + queryParams.referenceId + ' AND (ST_Crosses(' + queryParams.targetTableName + '.' + queryParams.targetColumn + ', ' + queryParams.referenceTableName + '.' + queryParams.referenceColumn + '))';

					if (queryParams.limit != undefined) {
						query4target += ' LIMIT ' + queryParams.limit;
					}

					//console.log("PostGIS query");
					//console.log(query4target);
					connection4target.query(query4target, function(err, result) {
						//connection.query(query4target, function(err, result) {
						if (err) {
							console.log('error')
							console.log(err.stack);
						}

						for (each in result.rows) {
							var Terraformer = require('terraformer');
							var WKT = require('terraformer-wkt-parser');
							var route = WKT.parse(result.rows[each].wkt);

							for (i in columns) {
								var col = columns[i];
								properties[col] = result.rows[each][col];
							}

							var feature = {
								"type" : "Feature",
								"geometry" : route,
								"properties" : properties
							};
							geojson.features.push(feature);

						}
						callback(geojson);
						//callback(numOfStartingRoutes);
					});
					//connection.end();
				});

				//callback(zone);
			});
		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}
/**
 * This method join two tables in a database, at least one of the tables has to have polygons.
 * The idea is that one table has the zone and the otherone the routes (origin point and destination point)
 * Output: Creates a json with Origin Destination Matrix.
 * Additionally the number of starting and ending routes of are estimated.
 * @param {Object} zonesTableName
 * @param {Object} zonesColumn
 * @param {Object} zonesId
 * @param {Object} routesTableName
 * @param {Object} routesColumn ; it can be the column with a geometry or an array with 4 elements in the following way: 
 * [ 'lat0', 'long0', 'lat1', long1' ], where the origin is given by (lat0, long0) and the destination by (lat1, long1)
 * @param {Object} dateColumn
 * @param {Object} dateRange
 */
var generateOD_MAtrix = function(queryParams, callback) {
	console.log("executing getOD_MAtrix ");

	if (credentials.type === 'postgis') {
		
		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;		
		
		var connection4routes = new pg.Client(connectString);
		//connection4routes.defaults.poolSize = 50;
		connection4routes.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres', err);
			}
			
			var query = 'SELECT ';			
			
			if(queryParams.routesColumn != undefined && queryParams.routesColumn.constructor === Array){
				query += 'ST_AsText(ST_MakePoint(' + queryParams.routesTableName + '.' + queryParams.routesColumn[0] +', '+ queryParams.routesTableName + '.' + queryParams.routesColumn[1] +')) AS initial_wkt, ST_AsText(ST_MakePoint(' + queryParams.routesTableName + '.' + queryParams.routesColumn[2] +', '+ queryParams.routesTableName + '.' + queryParams.routesColumn[3] +')) AS final_wkt FROM ' + queryParams.routesTableName;
			}else{			
				query += 'ST_AsText(ST_StartPoint(' + queryParams.routesTableName + '.' + queryParams.routesColumn + ')) AS initial_wkt, ST_AsText(ST_EndPoint(' + queryParams.routesTableName + '.' + queryParams.routesColumn + ')) AS final_wkt FROM ' + queryParams.routesTableName;
			}

			if (queryParams.dateColumn != undefined && queryParams.dateRange != undefined) {
				query += ' WHERE ' + queryParams.routesTableName + '.' + queryParams.dateColumn + ' BETWEEN ' + queryParams.dateRange;
			}			

			/*if(queryParams.limit != undefined){
			 query += ' LIMIT ' + queryParams.limit;
			 }*/
			query += ';';			
			console.log(query);
			
			connection4routes.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}				
				//console.log(' result with ');
				//console.log(' result with '+result.rows.length+' elements');

				var numOfRoutes = result.rows.length;
				var numOfRoute = 0;
				
				var origins = [];
				var destinations = [];
				var originsReady = false;
				var destinationsReady = false;
				for(var i=0; i<numOfRoutes; i++){
					origins.push(-1);
					destinations.push(-1);
				}
				console.log('result with '+numOfRoutes+' routes');
				for (each in result.rows) {
					//console.log(' -each ' + each);
					getIdZone({												
						TableName : queryParams.zonesTableName,
						geometryColum : queryParams.zonesColumn,
						idColum : queryParams.zonesIdColumn,
						point : result.rows[each].initial_wkt,
						userData : each												
					}, function(originResult) {
						//console.log(' origin found : [' + originResult.userData + ' ] ' + originResult.id );	
						origins[originResult.userData]=originResult.id;
						
						// Is the origin vector ready?						
						var nfOrigin = false;
						for(var org in origins){							
							if(origins[org] == -1){
								nfOrigin = true;								
								break;					
							}
						}
						if(!nfOrigin){
							originsReady = true;
						}
						
						
						if (originsReady && destinationsReady){
							//console.log('MATRIX ready, origins last');
							//console.log('origins      '+origins);
							//console.log('destinations '+destinations);
							var matrix = {};
							for(var r=0; r<numOfRoutes; r++){
								var origin = origins[r];
								var destination = destinations[r];

								if(!matrix[origin]){
									matrix[origin] = {};
								}							
								if(!matrix[origin][destination]){
									matrix[origin][destination] = 0;
								}
								matrix[origin][destination]++;
							}
							console.log('od matrix done!');
							connection4routes.end();
							console.log(matrix);
							callback(matrix);
						}
																							
					});
										
					getIdZone({												
						TableName : queryParams.zonesTableName,
						geometryColum : queryParams.zonesColumn,
						idColum : queryParams.zonesIdColumn,
						point : result.rows[each].final_wkt,
						userData : each
					}, function ( destinationResult){
						//console.log(' destination found : [' + destinationResult.userData + ' ] ' + destinationResult.id );	
						destinations[destinationResult.userData]=destinationResult.id;
						
						//Is the destination matrix ready?
						var nfDestination = false;
						for(dst in destinations){
							if(destinations[dst] == -1){
								nfDestination = true;
								break;
							}
						}
						if(!nfDestination){
							destinationsReady = true;
						}
						
						
						if (originsReady && destinationsReady){
							//console.log('MATRIX ready, destinations last');
							//console.log('origins      '+origins);
							//console.log('destinations '+destinations);
							var matrix = {};
							for(var r=0; r<numOfRoutes; r++){
								var origin = origins[r];
								var destination = destinations[r];

								if(!matrix[origin]){
									matrix[origin] = {};
								}							
								if(!matrix[origin][destination]){
									matrix[origin][destination] = 0;
								}
								matrix[origin][destination]++;
							}
							console.log('od matrix done!!');
							connection4routes.end();
							console.log(matrix);
							callback(matrix);
						}
					
														
					});
					
				}
				//connection4routes.end();
			});

		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}


var getIdZone = function(queryParams, callback) {
	//console.log("executing getIdZone ");
	var id = -1;

	if (credentials.type === 'postgis') {
		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		//console.log("Query to PostGis");
		
		var connection4zone = new pg.Client(connectString);
		//connection4zone.defaults.poolSize = 50;
		connection4zone.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres ', err);
			}
			//console.log('connected to get the zone');

			//var query4zone = 'SELECT *, ST_AsText('+queryParams.roadColumn+') AS wkt, ST_AsText( ST_Buffer('+queryParams.roadColumn+', '+queryParams.buferSize+') ) as wkt_buffer FROM '+queryParams.roadTable+ ' WHERE '+queryParams.roadIdColumn+'='+queryParams.roadId+';';
			//var query4zone = 'SELECT '+queryParams.zonesColumn+ ', ST_AsText('+queryParams.zonesColumn+') AS wkt FROM '+queryParams.zonesTableName+';';
			//var query4zone = 'SELECT id FROM '+queryParams.TableName +' WHERE + ST_CONTAINS( '+ queryParams.point +', '+ queryParams.geometryColum +');' ;
			//var query4zone = 'SELECT gid FROM '+queryParams.TableName +' WHERE ST_CONTAINS( '+ queryParams.geometryColum +', '+ queryParams.point +');' ;
			//var query4zone = 'SELECT gid FROM '+queryParams.TableName +' WHERE ST_CONTAINS( '+ queryParams.geometryColum +', ST_GeomFromText( "SRID=4326; '+ queryParams.point +'"));' ;
			//TODO generalize to every SRID
			var query4zone = "SELECT " + queryParams.idColum + " FROM " + queryParams.TableName + " WHERE ST_CONTAINS( " + queryParams.geometryColum + ", ST_GeomFromText( 'SRID=4326; " + queryParams.point + "'));";
			//console.log(query4zone);

			connection4zone.query(query4zone, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				//console.log(" -getIdZone+ " + result.rows.length);


					for (each in result.rows) {
						id = result.rows[each][queryParams.idColum];
						//console.log('id ' + id);
					}

					if (queryParams.userData == undefined) {
						connection4zone.end();
						callback(id);

					} else {
						connection4zone.end();
						callback({
							'id': id,
							'userData': queryParams.userData
						});
						//connection4zone.end();
					}

				//connection4zone.end();
			});
			//console.log('id after conection: ' + id);

		});

	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}
	//console.log('id before return: ' + id);
	return id;

}
/**
 * This method calculates a buffer of an element in a postgis database
 * Without inclucing any property
 * @param {Object} tableName
 * @param {Object} geometryColumn
 * @param {Object} query
 * @param {Object} bufferValue
 */
var getBuffer = function(queryParams, callback) {

	if (credentials.type === 'postgis') {
		var connectString = 'postgres://' + credentials.user + ':' + credentials.password + '@' + credentials.host + '/' + credentials.database;
		//console.log("Query to PostGis");
		//var geometry ={};
		var geojson = {
			"type" : "FeatureCollection",
			"features" : []
		};

		connection4geometry = new pg.Client(connectString);
		connection4geometry.connect(function(err) {
			if (err) {
				return console.error('could not connect to postgres 0', err);
			}

			//SELECT *, ST_AsText( ST_Buffer(wkb_geometry, 10) ) FROM redprimariawgs84_lite WHERE ogc_fid=1
			var query = 'SELECT ST_AsText( ST_Buffer(' + queryParams.geometryColumn + ', ' + queryParams.bufferValue + ') ) AS wkt FROM ' + queryParams.tableName + ' WHERE ' + queryParams.query;
			//var query = 'SELECT ST_AsText( '+queryParams.geometryColumn+' ) AS wkt FROM '+queryParams.tableName+ ' WHERE '+queryParams.query+';';

			connection4geometry.query(query, function(err, result) {
				if (err) {
					console.log('error')
					console.log(err.stack);
				}
				for (each in result.rows) {
					var properties = {};
					var Terraformer = require('terraformer');
					var WKT = require('terraformer-wkt-parser');
					var geometry = WKT.parse(result.rows[each].wkt);

					var feature = {
						"type" : "Feature",
						"geometry" : geometry,
						"properties" : properties
					};
					geojson.features.push(feature);
				}

				callback(geojson);
			});
		});
	} else {
		throw "there is no valid db type. [type] = " + credentials.type;
	}

}
/**
 * Calculates the distance of two points in meters.
 * The point must be in lattitude and longitude.
 * @param {Object} latlng1 : point 1
 * @param {Object} latlng2 : point 2
 * @return the distance in meters
 */
var getDistance = function(latlng1, latlng2) {
	var radius = 6378137;
	var rad = Math.PI / 180;
	var lat1 = latlng1[0] * rad;
	var lat2 = latlng2[0] * rad;
	var a = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2[1] - latlng1[1]) * rad);
	return radius * Math.acos(Math.min(a, 1));
}
/**
 * Calculates the angle between of two vectors.
 * @param {Object} vecA : vector A vecA = {x1: value, y1 : value, x2: value, y2: value};
 * @param {Object} vecB : vector B
 * @return
 */
var getAngle = function(vecA, vecB) {

	mA = (vecA.y1 - vecA.y2) / (vecA.x1 - vecA.x2);
	mB = (vecB.y1 - vecB.y2) / (vecB.x1 - vecB.x2);

	return Math.abs((Math.atan((mA - mB) / (1 - (mA * mB)))) * 360 / (2 * 3.1416));
}
/*var testFunction = function(){

 }*/

module.exports = {
	setCredentials : setCredentials,
	logCredentials : logCredentials,
	connectToDb : connectToDb,
	//endConnection : endConnection,
	query : query,
	geoQuery : geoQuery,
	intersectLayers : intersectLayers,
	//geoQueryLimited : geoQueryLimited,
	getLineSegments : getLineSegments,
	getIntersectingSegments : getIntersectingSegments,
	intersectRoadAndRoutes : intersectRoadAndRoutes,
	intersectRoadAndSegments : intersectRoadAndSegments,
	getRoadVelocityFromRoutes : getRoadVelocityFromRoutes,
	generateOD_MAtrix : generateOD_MAtrix,
	getElementsFromCircles:getElementsFromCircles,
	getIdZone : getIdZone,
	getBuffer : getBuffer,
	getDistance : getDistance,
	getAngle : getAngle,
	getSpatialAccuracyPhenomena1 : getSpatialAccuracyPhenomena1
	//testFunction : testFunction
}
