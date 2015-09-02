# Project Setup
## Prerequisites
```
### Create project folder
mkdir -p [pathToProjectFolder]
cd [pathToProjectFolder]
### Install NodeJS Modules
npm install geotabuladb express socket.io
```
If you prefer to install NodeJS modules globally, so they are available for all the projects you can use the npm '-g' option:
```
npm install -g geotabuladb express socket.io
```
Then you can link specific modules to your project or define the NODE_PATH environment variable:
```
# To link specific modules:
npm link geotabuladb express socket.io

# To set the NODE_PATH environment variable for the current user:
export NODE_PATH='/usr/local/lib/node_modules'

# To permanently set the NODE_PATH environment variable:
echo "export NODE_PATH='/usr/local/lib/node_modules'" >> ~/.bashrc
```
## Database
For this example we are going to use the barrios_catrastales shape available at https://sites.google.com/site/seriescol/shapes. The file available in the data folder has been transformed to use the WGS84 coordinate system.
To import the shape file to the database:
```
unzip barrios_catastrales_wgs84.zip
shp2pgsql barrios_catastrales_wgs84.shp > barrios_catastrales.sql
psql -U geotabula -d geotabula -f barrios_catastrales.sql
```
## Project Template
A basic NodeJS application has two files and two folders:
- *index.js:* This file contains the NodeJS code that runs in the server.
- *index.html:* This is the html file served to the client.
- *public folder:* The files in this folder are available to the client. This is the place to put client-side JavaScript and CSS files.
- *node_modules folder:* This folder contains the NodeJS npm locally installed or linked modules.
To manage the client-side application we have three additional JavaScript files and one CSS file:
- public/js/*actions.js*: This file contains the functions/commands to manage the client-server socket communication.
- public/js/*map.js*: This file contains the map interaction functions.
- public/js/*globals.js*: This file contains the global variables used by both server and client.
- public/css/*viewer.css*: This file contains the CSS styles that will be applied to the objects by the JavaScript events.