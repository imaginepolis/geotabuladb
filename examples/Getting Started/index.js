// ------------------------------------------------------
// Imports
// ------------------------------------------------------
var app = require('express')();			// WEB Server
var http = require('http').Server(app);  
var express = require('express');

var io = require('socket.io')(http);    // WebSockets handling
var geo = require('geotabuladb');		// Database operation

var glbs = require('./public/js/globals.js');	// With this we made the client and server shared variables available to the server

// ------------------------------------------------------
// Variables
// ------------------------------------------------------
var clients = {}; // Dictionary to storage client's sessions

// ------------------------------------------------------
// Script --> Initialization
// ------------------------------------------------------
geo.setCredentials({
	type: 'postgis',
	host: 'localhost',
	user: 'geotabula',
	password: 'geotabula',
	database: 'geotabula'
});

// Web server initialization...
app.use(express.static(__dirname + '/public')); // Setting up the public folder...

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html'); 		// Setting up the server root file...
});

http.listen(8080, function(){ 					// Setting ip the server port...
  console.log('Server ready and listening on port:8080');
});

// ------------------------------------------------------
// Event Management
// ------------------------------------------------------
// When socket.io receives a connection...
io.on('connection', function(socket){
	console.log(': Socket connection from client '+socket.id);

	// Standard socket administration methods:
    if(!clients[socket.id]){				// If there is a new connection we should save the client id...
    	console.log(':! This is a new connection request... ');
        clients[socket.id] = socket;
    }
    socket.on('disconnect', function(){		// If we receive a disconnection request we should remove the client id...
    	console.log(':! This is a disconnection request...');
        delete clients[socket.id];
    });
    
    // App specific methods:
    socket.on(glbs.GET_MAP, function(msg){
        console.log(':: This is a '+glbs.GET_MAP+' request...');
        getMap(socket.id,msg);
    });
});

// ------------------------------------------------------
// Functions
// ------------------------------------------------------
function getMap(socketId, msg) {

	var parameters = {
		tableName : 'barrios_catastrales_wgs84',	// The name of the table we are going to query
		geometry : 'geom', 							// The name of the column who has the geometry
		properties : 'all'							// Additional columns we want to recover --> For specific columns you have to pass columns' names as an Array
		//limit: 10									// Optional if you want to limit the number of results
	};

	geo.geoQuery(parameters,function(json) {
		clients[socketId].emit(glbs.DRAW_MAP, json); // Sending to the client the new event...
	});
}
