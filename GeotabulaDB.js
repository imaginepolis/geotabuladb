//import * as pg from 'pg';
import * as wkt from 'terraformer-wkt-parser'
import * as crypto from 'crypto'
var pg = require('pg');

// Geotabula -----------------------------------------------------------------------------------------------------------

const CR_KEY_HOST = 'cr_key_host';
const CR_KEY_USER = 'cr_key_user';
const CR_KEY_PASS = 'cr_key_pass';
const CR_KEY_DB   = 'cr_key_db';

const logString = 'GeotabulaDB';
const logOK  = ' :: ';
const logERR = ' !! ';

export default class GeotabulaDB {
    constructor() {
        this._credentials = new Map();
        this._credentials.set(CR_KEY_HOST,'localhost');
    }

    /** Set the credentials to connect to the database.

     credentials :: {}
     |--> .host     :: string :: OPTIONAL (default= localhost) ::
     |--> .user     :: string :: OPTIONAL :: Username to connect to the database
     |--> .password :: string :: OPTIONAL :: Password to connect to the database
     |--> .database :: string :: REQUIRED :: The database name
     */
    setCredentials(credentials) {
        let log = '.setCredentials()';

        if (credentials.host) {
            this._credentials.set(CR_KEY_HOST,credentials.host);
        }
        if (credentials.user) {
            this._credentials.set(CR_KEY_USER,credentials.user);
        }
        if (credentials.password) {
            this._credentials.set(CR_KEY_PASS,credentials.password);
        }
        if (!credentials.database) {
            throw logString+log+logERR+'credentials.database not defined!';
        }
        this._credentials.set(CR_KEY_DB,credentials.database);

        console.log(logString+log+logOK+'Credentials set to:');
        for (let pair of this._credentials) {
            console.log(pair);
        }

        this._connString = ParserHelper.genConnString(this._credentials);
    }

    /**  Run an asynchronous query in the database. Returns a hash string to identify the query. The callback function
     will be called on database response.

     RETURN :: string :: queryHash

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
     */
    query(queryParams, callback) {
        // ToDo implement code injection check...
        let query = typeof queryParams == 'string' ? queryParams : ParserHelper.genSimpleQueryString(queryParams);
        let hash = GeotabulaDB.genHash(query+Math.random());

        pg.connect(this._connString, function(err, client, done) {
            GeotabulaDB.handleError(err);

            client.query(query, function(err, result) {
                GeotabulaDB.handleError(err, client, done);

                callback(result.rows, hash);
                done(client);
            });
        });
        return hash;
    }

    /**  Run an asynchronous query in the database. Returns a hash string to identify the query. The callback
     function will be called on database response.

     RETURN :: string :: queryHash

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
     */
    geoQuery(queryParams, callback) {
        let query = ParserHelper.genGeoQueryString(queryParams);
        let hash = GeotabulaDB.genHash(query+Math.random());
        //console.log('query hash: '+hash);

        pg.connect(this._connString, function(err, client, done) {
            GeotabulaDB.handleError(err);

            client.query(query, function(err, result) {
                GeotabulaDB.handleError(err, client, done);
                let geojson = GeotabulaDB.genGeoJSON(queryParams.geometry, result);

                //console.log('callback for query '+hash);
                callback(geojson, hash);
                done(client);
            });
        });
        return hash;
    }

    /**  Run an asynchronous query in the database, looking for the objects located at the specified radius from the
     given spatial object. Returns a hash string to identify the query. The callback function will be called
     on database response.

     RETURN :: string :: queryHash

     queryParams :: {} ::
     |--> .properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
     |--> .tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
     |--> .geometry   :: string :: REQUIRED :: WKT (Geometry's column name)
     |--> .spObj      :: string :: REQUIRED :: Spatial object geometry IN Extended Well-Known Text representation (EWKT)
     |--> .radius     :: string :: REQUIRED :: Radius to look at (in meters)
     |--> .where      :: string :: OPTIONAL :: SQL WHERE
     |--> .limit      :: string :: OPTIONAL :: SQL LIMIT
     |--> .groupby    :: string :: OPTIONAL :: SQL GROUP BY

     callback :: function(result, hash) ::
     |--> result :: {{}}    :: Query result in geoJSON format (geometry encoded in EWKT format)
     |--> hash   :: string  :: queryHash
     */
    spatialObjectsAtRadius (queryParams, callback) {
        let query = ParserHelper.genSpObjsAtRadiusString(queryParams);
        let hash = GeotabulaDB.genHash(query+Math.random());
        //console.log('query hash: '+hash);

        pg.connect(this._connString, function(err, client, done) {
            GeotabulaDB.handleError(err);

            client.query(query, function(err, result) {
                GeotabulaDB.handleError(err, client, done);
                let geojson = GeotabulaDB.genGeoJSON(queryParams.geometry, result);

                //console.log('callback for query '+hash);
                callback(geojson, hash);
                done(client);
            });
        });
        return hash;
    }

    static handleError(err, client, done) {
        if (!err) return;
        if (client) {
            done(client);
        }
        console.dir(err);
        throw logString+logERR+' could not execute query!'
    }

    static genHash(string) {
        let hash = crypto.createHash('sha1');
        hash.update(string);
        return hash.digest('hex');
    }

    static genGeoJSON(geometryColumnName, result) {
        let columns = [];
        for (let column in result.fields) {
            let name = result.fields[column].name;
            if (name != 'wkt' && name != geometryColumnName) {
                columns.push(name);
            }
        }

        let geojson = {
            "type" : "FeatureCollection",
            "features" : []
        };

        for (let row in result.rows) {
            let properties = {};
            for (let column of columns) {
                properties[column] = result.rows[row][column];
            }
            let geometry = wkt.parse(result.rows[row]['wkt']);
            let feature = {
                'type': 'Feature',
                'geometry': geometry,
                'properties': properties
            };
            geojson.features.push(feature);
        }

        return geojson;
    }
}

// QueryBuilder --------------------------------------------------------------------------------------------------------

export const PK = ' SERIAL PRIMARY KEY';
export const STRING = ' TEXT';
export const INT = ' INT';
export const FLOAT = ' FLOAT';
export const TIMESTAMP = ' TIMESTAMP';

export class QueryBuilder {
    /** Generates the SQL query string to drop a table in the database.

     tableName :: string

     RETURN 'DROP TABLE IF EXISTS tableName;'
     */
    static dropTable(tableName) {
        return 'DROP TABLE IF EXISTS '+tableName+';'
    }

    /** Generates the SQL query string to create a table in the database.

     tableName :: string
     columns   :: [[]]

     let tableName = 'myTable';
     let columns = [
        ['id', Geotabuladb.PK],
        ['col1', Geotabuladb.STRING],
        ['col2', Geotabuladb.INT],
     ]

     RETURN 'CREATE TABLE myTable(id SERIAL PRIMARY KEY, col1 TEXT, col2 INT);'
     */
    static createTable(tableName, columns) {
        let query = 'CREATE TABLE '+tableName+'(';
        for (let column of columns) {
            query += column[0]+' '+column[1]+','
        }
        query = query.slice(0,-1)+');';

        //console.log(query);
        return query;
    }

    /** Generates the SQL query string to insert rows in a table in the database.

     tableName :: string
     columns   :: []
     values    :: [[]]

     let tableName = 'myTable';
     let columns = ['col1', 'col2'];
     let values = [
        ['ML', 001],
        ['ML', 725]
     ];

     RETURN 'INSERT INTO myTable(col1,col2) VALUES (ML,001),(ML,725);'
     */
    static insertInto(tableName, columns, values) {
        let query = 'INSERT INTO '+tableName+'(';
        for (let column of columns) {
            query += column+',';
        }
        query = query.slice(0,-1)+') VALUES ';

        for (let value of values) {
            query += '(';
            for (let item of value) {
                query += item+',';
            }
            query = query.slice(0,-1)+'),';
        }
        query = query.slice(0,-1)+';';

        //console.log(query);
        return query;
    }

    static copyTable(inTable, outTable, columns) {
        let query = 'CREATE TABLE '+outTable+' AS('
    }
}

// ParserHelper --------------------------------------------------------------------------------------------------------

class ParserHelper {
    static genSimpleQueryString(queryParams) {
        let log = '.genSimpleQueryString()';

        let query = ParserHelper.genSelectString(queryParams) + ParserHelper.genFromString(queryParams);

        //console.log(logString+log+logOK+query);
        return query;
    }

    static genGeoQueryString(queryParams) {
        let log = '.genGeoQueryString()';

        let query = ParserHelper.genSelectString(queryParams);
        query += ', ST_AsText('+queryParams.geometry+') AS wkt';
        query += ParserHelper.genFromString(queryParams);

        //console.log(logString+log+logOK+query);
        return query;
    }

    static genSpObjsAtRadiusString(queryParams) {
        let log = '.genSpObjsAtRadiusString()';

        let query = ParserHelper.genSelectString(queryParams);
        query += ', ST_AsText('+queryParams.geometry+') AS wkt';
        query += ' FROM ' + queryParams.tableName;
        query += ' WHERE ST_DWithin('+queryParams.geometry+", ST_GeomFromEWKT('"+queryParams.spObj+"'),"+queryParams.radius+')';

        if (queryParams.where != undefined) {
            query += ' AND ('+queryParams.where+')';
        }

        query += ParserHelper.genLimitGroupByString(queryParams);

        //console.log(logString+log+logOK+query);
        return query;
    }

    static genSelectString(queryParams) {
        let columns = [];
        if (queryParams.properties == undefined || queryParams.properties == 'all') {
            columns.push('*');
        } else {
            for (let prop in queryParams.properties) {
                columns.push(queryParams.properties[prop]);
            }
        }

        let query = 'SELECT ';
        for (let col in columns) {
            query += columns[col];
            if (col < columns.length - 1) {
                query += ', ';
            }
        }
        return query;
    }

    static genFromString(queryParams) {
        let query = ' FROM ' + queryParams.tableName;
        if (queryParams.where != undefined) {
            query += ' WHERE ' + queryParams.where;
        }
        query += ParserHelper.genLimitGroupByString(queryParams);
        return query;
    }

    static genLimitGroupByString(queryParams) {
        let query = '';
        if (queryParams.limit != undefined) {
            query += ' LIMIT ' + queryParams.limit;
        }
        if (queryParams.groupby != undefined) {
            query += ' GROUP BY ' + queryParams.groupby;
        }
        query += ';';
        return query;
    }

    static genConnString(credentials) {
        let log = '.connectToDB()';

        let connectString = 'postgres://';
        if (credentials.get(CR_KEY_USER) !== undefined) {
            connectString += credentials.get(CR_KEY_USER);
            if (credentials.get(CR_KEY_PASS) !== undefined) {
                connectString += ':' + credentials.get(CR_KEY_PASS);
            }
            connectString += '@';
        }
        connectString += credentials.get(CR_KEY_HOST);
        connectString += '/'+credentials.get(CR_KEY_DB);

        console.log(logString+log+logOK+connectString);
        return connectString;
    }
}