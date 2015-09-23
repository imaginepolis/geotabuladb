//import * as pg from 'pg';
import * as wkt from 'terraformer-wkt-parser';
var pg = require('pg');

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

    query(queryParams, callback) {
        // ToDo implement code injection check...
        let query = typeof queryParams == 'string' ? queryParams : ParserHelper.genSimpleQueryString(queryParams);
        pg.connect(this._connString, function(err, client, done) {
            GeotabulaDB.handleError(err);

            client.query(query, function(err, result) {
                GeotabulaDB.handleError(err, client, done);

                callback(result.rows);
                done(client);
            });
        });
    }

    geoQuery(queryParams, callback) {
        let query = ParserHelper.genGeoQueryString(queryParams);
        pg.connect(this._connString, function(err, client, done) {
            GeotabulaDB.handleError(err);

            client.query(query, function(err, result) {
                GeotabulaDB.handleError(err, client, done);

                let columns = [];
                for (let column in result.fields) {
                    let name = result.fields[column].name;
                    if (name != 'wkt') {
                        columns.push(name);
                    }
                }

                let geojson = {
                    "type" : "FeatureCollection",
                    "features" : []
                };

                for (let row in result.rows) {
                    let properties = {};
                    for (let column in columns) {
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
                callback(geojson);
                done(client);
            });
        });
    }

    static handleError(err, client, done) {
        if (!err) return;
        if (client) {
            done(client);
        }
        console.dir(err);
        throw logString+logERR+' could not execute query!'
    }
}

class ParserHelper {
    static genSelectString(columnsP) {
        let columns = [];
        if (columnsP == undefined || columnsP == 'all') {
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
        if (queryParams.limit != undefined) {
            query += ' LIMIT ' + queryParams.limit;
        }
        if (queryParams.groupby != undefined) {
            query += ' GROUP BY ' + queryParams.groupby;
        }
        query += ';';
        return query;
    }

    static genSimpleQueryString(queryParams) {
        let log = '.genSimpleQueryString()';

        let query = ParserHelper.genSelectString(queryParams.properties) + ParserHelper.genFromString(queryParams);

        console.log(logString+log+logOK+query);
        return query;
    }

    static genGeoQueryString(queryParams) {
        let log = '.genGeoQueryString()';

        let query = ParserHelper.genSelectString(queryParams.properties);
        query += ', ST_AsText('+queryParams.geomertry+') AS wkt';
        query += ParserHelper.genFromString(queryParams);

        console.log(logString+log+logOK+query);
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