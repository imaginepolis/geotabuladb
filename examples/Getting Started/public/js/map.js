// ------------------------------------------------------
// Variables
// ------------------------------------------------------
var map;								// The map we are going to visualize...
var layersControl = L.control.layers(); // Variable to handle the layers in the map...
var info = L.control();                 // Variable to show additional information about the selected spatial object

// ------------------------------------------------------
// Script --> Initialization
// ------------------------------------------------------

// This function creates the DIV in the web page DOM to display the additional attributes of the selected spatial object
info.onAdd = function(map) { // --> onAdd means this function is going to be called once a new layer is added to the map
    this._div = L.DomUtil.create('div', 'info'); // --> info refers to the CSS style to apply to the new object
    this.update();
    return this._div;
};

// This function updates the DIV when the selected spatial object changes
info.update = function(props) {
    var infoString = '<h4> Data </h4>';
    for (item in props){
        if (isNaN(props[item])){
            infoString += '<b>'+ item +'</b> ' + props[item] + '</b> <br />';
        } else {
            infoString += '<b>'+ item +'</b> ' + props[item] + '</b> <br />';
        }
    }
    this._div.innerHTML = infoString; //
};

// ------------------------------------------------------
// Functions
// ------------------------------------------------------
function createMap() {
    map = L.map('map').setView([4.66198, -74.09866], 11);  				// Posición inical del mapa (lat, long, zoom)    
    map.addLayer(new L.TileLayer.provider('Esri.WorldGrayCanvas'));     // El mapa base que se va a utilizar (debe importarse la librería correspondiente en index.html)   
    map._layersMaxZoom=16;												// Definie el máximo zoom del mapa
	map._layersMinZoom=10;

    L.control.scale({				// Maneja la escala
        position : 'bottomleft',	// .. donde aparece
        imperial : false			// .. sistema métrico
    }).addTo(map);
    
    info.addTo(map);
}


