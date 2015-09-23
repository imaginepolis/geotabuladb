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

var pg = require('pg');

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
    }, {
        key: 'query',
        value: function query(queryParams, callback) {
            // ToDo implement code injection check...
            var query = typeof queryParams == 'string' ? queryParams : ParserHelper.genSimpleQueryString(queryParams);
            pg.connect(this._connString, function (err, client, done) {
                GeotabulaDB.handleError(err);

                client.query(query, function (err, result) {
                    GeotabulaDB.handleError(err, client, done);

                    callback(result.rows);
                    done(client);
                });
            });
        }
    }, {
        key: 'geoQuery',
        value: function geoQuery(queryParams, callback) {
            var query = ParserHelper.genGeoQueryString(queryParams);
            pg.connect(this._connString, function (err, client, done) {
                GeotabulaDB.handleError(err);

                client.query(query, function (err, result) {
                    GeotabulaDB.handleError(err, client, done);

                    var columns = [];
                    for (var column in result.fields) {
                        var _name = result.fields[column].name;
                        if (_name != 'wkt') {
                            columns.push(_name);
                        }
                    }

                    var geojson = {
                        "type": "FeatureCollection",
                        "features": []
                    };

                    for (var row in result.rows) {
                        var properties = {};
                        for (var column in columns) {
                            properties[column] = result.rows[row][column];
                        }
                        var geometry = wkt.parse(result.rows[row]['wkt']);
                        var feature = {
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
    }]);

    return GeotabulaDB;
})();

exports['default'] = GeotabulaDB;

var ParserHelper = (function () {
    function ParserHelper() {
        _classCallCheck(this, ParserHelper);
    }

    _createClass(ParserHelper, null, [{
        key: 'genSelectString',
        value: function genSelectString(columnsP) {
            var columns = [];
            if (columnsP == undefined || columnsP == 'all') {
                columns.push('*');
            } else {
                for (var prop in queryParams.properties) {
                    columns.push(queryParams.properties[prop]);
                }
            }

            var query = 'SELECT ';
            for (var col in columns) {
                query += columns[col];
                if (col < columns.length - 1) {
                    query += ', ';
                }
            }
            return query;
        }
    }, {
        key: 'genFromString',
        value: function genFromString(queryParams) {
            var query = ' FROM ' + queryParams.tableName;
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
    }, {
        key: 'genSimpleQueryString',
        value: function genSimpleQueryString(queryParams) {
            var log = '.genSimpleQueryString()';

            var query = ParserHelper.genSelectString(queryParams.properties) + ParserHelper.genFromString(queryParams);

            console.log(logString + log + logOK + query);
            return query;
        }
    }, {
        key: 'genGeoQueryString',
        value: function genGeoQueryString(queryParams) {
            var log = '.genGeoQueryString()';

            var query = ParserHelper.genSelectString(queryParams.properties);
            query += ', ST_AsText(' + queryParams.geomertry + ') AS wkt';
            query += ParserHelper.genFromString(queryParams);

            console.log(logString + log + logOK + query);
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

module.exports = exports['default'];

