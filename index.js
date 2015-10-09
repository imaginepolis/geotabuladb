//import * as pg from 'pg';
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _terraformerWktParser = require('terraformer-wkt-parser');

var wkt = _interopRequireWildcard(_terraformerWktParser);

var _crypto = require('crypto');

var crypto = _interopRequireWildcard(_crypto);

var pg = require('pg');

// Geotabula -----------------------------------------------------------------------------------------------------------

var CR_KEY_HOST = 'cr_key_host';
var CR_KEY_USER = 'cr_key_user';
var CR_KEY_PASS = 'cr_key_pass';
var CR_KEY_DB = 'cr_key_db';

var logString = 'GeotabulaDB';
var logOK = ' :: ';
var logERR = ' !! ';

var GeotabulaDB = (function () {
    function GeotabulaDB() {
        _classCallCheck(this, GeotabulaDB);

        this._credentials = new Map();
        this._credentials.set(CR_KEY_HOST, 'localhost');
    }

    // QueryBuilder --------------------------------------------------------------------------------------------------------

    /** Set the credentials to connect to the database.
      credentials :: {}
     |--> .host     :: string :: OPTIONAL (default= localhost) ::
     |--> .user     :: string :: OPTIONAL :: Username to connect to the database
     |--> .password :: string :: OPTIONAL :: Password to connect to the database
     |--> .database :: string :: REQUIRED :: The database name
     */

    _createClass(GeotabulaDB, [{
        key: 'setCredentials',
        value: function setCredentials(credentials) {
            var log = '.setCredentials()';

            if (credentials.host) {
                this._credentials.set(CR_KEY_HOST, credentials.host);
            }
            if (credentials.user) {
                this._credentials.set(CR_KEY_USER, credentials.user);
            }
            if (credentials.password) {
                this._credentials.set(CR_KEY_PASS, credentials.password);
            }
            if (!credentials.database) {
                throw logString + log + logERR + 'credentials.database not defined!';
            }
            this._credentials.set(CR_KEY_DB, credentials.database);

            console.log(logString + log + logOK + 'Credentials set to:');
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._credentials[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var pair = _step.value;

                    console.log(pair);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
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
    }, {
        key: 'query',
        value: function query(queryParams, callback) {
            // ToDo implement code injection check...
            var query = typeof queryParams == 'string' ? queryParams : ParserHelper.genSimpleQueryString(queryParams);
            var hash = GeotabulaDB.genHash(query + Math.random());

            pg.connect(this._connString, function (err, client, done) {
                GeotabulaDB.handleError(err);

                client.query(query, function (err, result) {
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
    }, {
        key: 'geoQuery',
        value: function geoQuery(queryParams, callback) {
            var query = ParserHelper.genGeoQueryString(queryParams);
            var hash = GeotabulaDB.genHash(query + Math.random());
            //console.log('query hash: '+hash);

            pg.connect(this._connString, function (err, client, done) {
                GeotabulaDB.handleError(err);

                client.query(query, function (err, result) {
                    GeotabulaDB.handleError(err, client, done);
                    var geojson = GeotabulaDB.genGeoJSON(queryParams.geometry, result);

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
    }, {
        key: 'spatialObjectsAtRadius',
        value: function spatialObjectsAtRadius(queryParams, callback) {
            var query = ParserHelper.genSpObjsAtRadiusString(queryParams);
            var hash = GeotabulaDB.genHash(query + Math.random());
            //console.log('query hash: '+hash);

            pg.connect(this._connString, function (err, client, done) {
                GeotabulaDB.handleError(err);

                client.query(query, function (err, result) {
                    GeotabulaDB.handleError(err, client, done);
                    var geojson = GeotabulaDB.genGeoJSON(queryParams.geometry, result);

                    //console.log('callback for query '+hash);
                    callback(geojson, hash);
                    done(client);
                });
            });
            return hash;
        }
    }], [{
        key: 'handleError',
        value: function handleError(err, client, done) {
            if (!err) return;
            if (client) {
                done(client);
            }
            console.dir(err);
            throw logString + logERR + ' could not execute query!';
        }
    }, {
        key: 'genHash',
        value: function genHash(string) {
            var hash = crypto.createHash('sha1');
            hash.update(string);
            return hash.digest('hex');
        }
    }, {
        key: 'genGeoJSON',
        value: function genGeoJSON(geometryColumnName, result) {
            var columns = [];
            for (var column in result.fields) {
                var _name = result.fields[column].name;
                if (_name != 'wkt' && _name != geometryColumnName) {
                    columns.push(_name);
                }
            }

            var geojson = {
                "type": "FeatureCollection",
                "features": []
            };

            for (var row in result.rows) {
                var properties = {};
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = columns[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var column = _step2.value;

                        properties[column] = result.rows[row][column];
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                var geometry = wkt.parse(result.rows[row]['wkt']);
                var feature = {
                    'type': 'Feature',
                    'geometry': geometry,
                    'properties': properties
                };
                geojson.features.push(feature);
            }

            return geojson;
        }
    }]);

    return GeotabulaDB;
})();

exports['default'] = GeotabulaDB;
var PK = ' SERIAL PRIMARY KEY';
exports.PK = PK;
var STRING = ' TEXT';
exports.STRING = STRING;
var INT = ' INT';
exports.INT = INT;
var FLOAT = ' FLOAT';
exports.FLOAT = FLOAT;
var TIMESTAMP = ' TIMESTAMP';

exports.TIMESTAMP = TIMESTAMP;

var QueryBuilder = (function () {
    function QueryBuilder() {
        _classCallCheck(this, QueryBuilder);
    }

    // ParserHelper --------------------------------------------------------------------------------------------------------

    _createClass(QueryBuilder, null, [{
        key: 'dropTable',

        /** Generates the SQL query string to drop a table in the database.
          tableName :: string
          RETURN 'DROP TABLE IF EXISTS tableName;'
         */
        value: function dropTable(tableName) {
            return 'DROP TABLE IF EXISTS ' + tableName + ';';
        }

        /** Generates the SQL query string to create a table in the database.
          tableName :: string
         columns   :: [[]]
          let tableName = 'myTable';
         let columns = [
            ['id', PK],
            ['col1', STRING],
            ['col2', INT],
         ]
          RETURN 'CREATE TABLE myTable(id SERIAL PRIMARY KEY, col1 TEXT, col2 INT);'
         */
    }, {
        key: 'createTable',
        value: function createTable(tableName, columns) {
            var query = 'CREATE TABLE ' + tableName + '(';
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = columns[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var column = _step3.value;

                    query += column[0] + ' ' + column[1] + ',';
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                        _iterator3['return']();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            query = query.slice(0, -1) + ');';

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
    }, {
        key: 'insertInto',
        value: function insertInto(tableName, columns, values) {
            var query = 'INSERT INTO ' + tableName + '(';
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = columns[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var column = _step4.value;

                    query += column + ',';
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                        _iterator4['return']();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            query = query.slice(0, -1) + ') VALUES ';

            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = values[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var value = _step5.value;

                    query += '(';
                    var _iteratorNormalCompletion6 = true;
                    var _didIteratorError6 = false;
                    var _iteratorError6 = undefined;

                    try {
                        for (var _iterator6 = value[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var item = _step6.value;

                            query += item + ',';
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6['return']) {
                                _iterator6['return']();
                            }
                        } finally {
                            if (_didIteratorError6) {
                                throw _iteratorError6;
                            }
                        }
                    }

                    query = query.slice(0, -1) + '),';
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                        _iterator5['return']();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            query = query.slice(0, -1) + ';';

            //console.log(query);
            return query;
        }

        /**  Creates a new table from a query.
          outTable    :: string
          queryParams :: {} ::
         |--> .properties :: []     :: OPTIONAL :: SQL SELECT (Columns to be retrieved)
         |--> .tableName  :: string :: REQUIRED :: SQL FROM (Database table name)
         |--> .where      :: string :: OPTIONAL :: SQL WHERE
         |--> .limit      :: string :: OPTIONAL :: SQL LIMIT
         |--> .groupby    :: string :: OPTIONAL :: SQL GROUP BY
          let newTable = 'myNewTable';
         let queryParams = {
            tableName: 'myTable',
            properties: ['col2'],
            where: "col1 = 'ML*'"
         };
          RETURN "CREATE TABLE myNewTable AS(SELECT col2 FROM myTable WHERE col1 = 'ML*');"
          */
    }, {
        key: 'copyTable',
        value: function copyTable(outTable, queryParams) {
            var query = 'CREATE TABLE ' + outTable + ' AS(';

            query += ParserHelper.genSimpleQueryString(queryParams);
            query = query.slice(0, -1);
            query += ');';

            return query;
        }

        /** Generates the SQL query string to add columns to an existing table in the database.
          tableName :: string
         columns   :: [[]]
          let tableName = 'myTable';
         let columns = [
             ['newCol1', STRING],
             ['newCol2', INT],
         ]
          RETURN 'ALTER TABLE myTable ADD COLUMN newCol1 TEXT,ADD COLUMN newCol2 INT;'
         */
    }, {
        key: 'addColumns',
        value: function addColumns(tableName, columns) {
            var query = 'ALTER TABLE ' + tableName + ' ';
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = columns[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var column = _step7.value;

                    query += 'ADD COLUMN ' + column[0] + ' ' + column[1] + ',';
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7['return']) {
                        _iterator7['return']();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }

            query = query.slice(0, -1) + ';';

            //console.log(query);
            return query;
        }

        /** Generates the SQL query string to update the values of columns in some table in the database.
          queryParams :: {} ::
         |--> .tableName  :: string :: REQUIRED :: SQL UPDATE (Database table name)
         |--> .values     :: [[]]   :: REQUIRED :: SQL SET
         |--> .where      :: string :: OPTIONAL :: SQL WHERE
          let newValues = [
            ['col1', 'W'],
            ['col2', 909],
         ]
          let queryParams = {
            tableName: 'myTable',
            values: newValues,
            where: 'id=2'
         }
          RETURN 'UPDATE myTable SET col1="W",col2=909 WHERE id=2;'
         */
    }, {
        key: 'update',
        value: function update(queryParams) {
            var query = 'UPDATE ' + queryParams.tableName + ' SET ';
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                for (var _iterator8 = queryParams.values[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    var value = _step8.value;

                    query += value[0] + '=' + (typeof value[1] == 'string' ? '"' + value[1] + '"' : value[1]) + ',';
                }
            } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion8 && _iterator8['return']) {
                        _iterator8['return']();
                    }
                } finally {
                    if (_didIteratorError8) {
                        throw _iteratorError8;
                    }
                }
            }

            query = query.slice(0, -1);
            query += ' WHERE ' + queryParams.where + ';';

            //console.log(query);
            return query;
        }
    }]);

    return QueryBuilder;
})();

exports.QueryBuilder = QueryBuilder;

var ParserHelper = (function () {
    function ParserHelper() {
        _classCallCheck(this, ParserHelper);
    }

    _createClass(ParserHelper, null, [{
        key: 'genSimpleQueryString',
        value: function genSimpleQueryString(queryParams) {
            var log = '.genSimpleQueryString()';

            var query = ParserHelper.genSelectString(queryParams) + ParserHelper.genFromString(queryParams);

            //console.log(logString+log+logOK+query);
            return query;
        }
    }, {
        key: 'genGeoQueryString',
        value: function genGeoQueryString(queryParams) {
            var log = '.genGeoQueryString()';

            var query = ParserHelper.genSelectString(queryParams);
            query += ', ST_AsText(' + queryParams.geometry + ') AS wkt';
            query += ParserHelper.genFromString(queryParams);

            //console.log(logString+log+logOK+query);
            return query;
        }
    }, {
        key: 'genSpObjsAtRadiusString',
        value: function genSpObjsAtRadiusString(queryParams) {
            var log = '.genSpObjsAtRadiusString()';

            var query = ParserHelper.genSelectString(queryParams);
            query += ', ST_AsText(' + queryParams.geometry + ') AS wkt';
            query += ' FROM ' + queryParams.tableName;
            query += ' WHERE ST_DWithin(' + queryParams.geometry + ", ST_GeomFromEWKT('" + queryParams.spObj + "')," + queryParams.radius + ')';

            if (queryParams.where != undefined) {
                query += ' AND (' + queryParams.where + ')';
            }

            query += ParserHelper.genLimitGroupByString(queryParams);

            //console.log(logString+log+logOK+query);
            return query;
        }
    }, {
        key: 'genSelectString',
        value: function genSelectString(queryParams) {
            var columns = [];
            if (queryParams.properties == undefined || queryParams.properties == 'all') {
                columns.push('*');
            } else {
                for (var prop in queryParams.properties) {
                    columns.push(queryParams.properties[prop]);
                }
            }

            var query = 'SELECT ';
            for (var col in columns) {
                query += columns[col] + ',';
            }
            query = query.slice(0, -1);

            return query;
        }
    }, {
        key: 'genFromString',
        value: function genFromString(queryParams) {
            var query = ' FROM ' + queryParams.tableName;
            if (queryParams.where != undefined) {
                query += ' WHERE ' + queryParams.where;
            }
            query += ParserHelper.genLimitGroupByString(queryParams);
            return query;
        }
    }, {
        key: 'genLimitGroupByString',
        value: function genLimitGroupByString(queryParams) {
            var query = '';
            if (queryParams.limit != undefined) {
                query += ' LIMIT ' + queryParams.limit;
            }
            if (queryParams.groupby != undefined) {
                query += ' GROUP BY ' + queryParams.groupby;
            }
            query += ';';
            return query;
        }
    }, {
        key: 'genConnString',
        value: function genConnString(credentials) {
            var log = '.connectToDB()';

            var connectString = 'postgres://';
            if (credentials.get(CR_KEY_USER) !== undefined) {
                connectString += credentials.get(CR_KEY_USER);
                if (credentials.get(CR_KEY_PASS) !== undefined) {
                    connectString += ':' + credentials.get(CR_KEY_PASS);
                }
                connectString += '@';
            }
            connectString += credentials.get(CR_KEY_HOST);
            connectString += '/' + credentials.get(CR_KEY_DB);

            console.log(logString + log + logOK + connectString);
            return connectString;
        }
    }]);

    return ParserHelper;
})();

