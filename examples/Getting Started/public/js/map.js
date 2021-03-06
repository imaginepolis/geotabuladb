// ------------------------------------------------------
// Variables
// ------------------------------------------------------
var map;								// The map we are going to visualize...
var layersControl = L.control.layers(); // Variable to handle the layers in the map...
var info = L.control();                 // Variable to show additional information about the selected spatial object.

// ------------------------------------------------------
// Functions
// ------------------------------------------------------
function createMap() {
    map = L.map('map').setView([4.66198, -74.09866], 11);  				// Initial position in the map (lat, long, zoom)
    map.addLayer(new L.TileLayer.provider('Esri.WorldGrayCanvas'));     // The map provider we are going to use --> You must import the corresponding library in index.html
    map._layersMaxZoom=16;												// Define the maximum zoom in the map
	map._layersMinZoom=10;

    L.control.scale({				// Manage the scale:
        position : 'bottomleft',	// .. where is it located
        imperial : false			// .. use the metric system (default is imperial)
    }).addTo(map);
    
    info.addTo(map);                // Here we add the info DIV to the map itself
}

function addLayer(msg) {
    var layer = L.geoJson(msg,{ // L refers to LeafLet and is available after import leaflet.js in index.html
        // These are the events that the spatial objects are going to handle...
        style:css['.layer'], // The 'css' object was created by the support.js script!
        onEachFeature : function(feature, layer) {  // The event for each one of the  dictionary elements --> Each feature is one spatial object
            layer.on({ // When this layer is active (this is a leaflet-provided method)
                mouseover : function() { // Here we are going to change the color and show the attributes of the object that is under the mouse...
                    info.update(feature.properties); // --> Update the info <div>
                    layer.setStyle(css['.focusedobject']); // --> and change the style...
                },
                mouseout : function() { // When the mouse leaves...
                    info.update(); // --> Clear the info <div>
                    layer.setStyle(css['.layer']); // --> and set the original style...
                },
                click : function(e){
                    map.fitBounds(e.target.getBounds()); // On click we are going to center the object in the view...
                }
            });
        }
    });
    layer.addTo(map);
    layer.bringToBack();
}

// This function creates the DIV to display the additional attributes of the selected spatial object
info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info'); // --> info refers to the CSS style to apply to the new object
    this.update();
    return this._div;
};

// This function updates the DIV when the selected spatial object changes
info.update = function(props) {
    var infoString = '<h4> Data </h4>';
    for (item in props){
        infoString += '<b>'+ item +'</b> ' + props[item] + '</b> <br />';
    }

    this._div.innerHTML = infoString;
};