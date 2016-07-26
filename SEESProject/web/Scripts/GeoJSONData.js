/**
 * Created by alvar_000 on 7/19/2016.
 */

/* -------------------------------- declare variables -------------------------------- */
var map = L.map("map").setView([31.4, -99.9018], 6);
L.esri.basemapLayer("Topographic").addTo(map);
L.MakiMarkers.accessToken = "pk.eyJ1IjoiZ2FiZWFsdmFyZXoxMSIsImEiOiJjaXFzaHgybzQwMGozdDBuaGNja2Z0bWFqIn0.QqIwNZJzNdqZEqiJPp6ZuQ";

var gaugeDataLayer;
var qpeDataLayer = L.layerGroup();
var qpeRasterLayer;

/* -------------------------------- gauge data -------------------------------- */

//query and add gauge data to map
$.getJSON({
    dataType: "json",
    url: "http://magic.csr.utexas.edu/public/views/gauges",
    success: function(data){
        //console.log(JSON.stringify(data));

        gaugeDataLayer = L.geoJson(data, {
            pointToLayer: function(feature, latlng){
                var iconOfChoice = decideIcon(feature.properties.status);

                return L.marker(latlng, {icon: iconOfChoice});
            },
            onEachFeature: function (feature, layer) {
                var label = "<span><b>River: </b>" + feature.properties.waterbody +
                    "<br><b>Location: </b>" + feature.properties.location +
                    "<br><b>Flood Status: </b>" + feature.properties.status +
                    "<br><b>Gauge ID: </b>" + "<a href = ' "+ feature.properties.url + "'>" + feature.properties.gaugelid + "</a>" +
                    "<br><b>Stage Report: </b>" + feature.properties.observed + " ft" +
                    "<br><b>Report Time: </b>" + feature.properties.obstime +
                    "<br><img src='" + getURL(feature) + "' alt='Hydrograph' width='400px'>" +
                    "</span>";

                var popupOptions =
                {
                    'maxWidth': '400px'
                };

                layer.bindPopup(label, popupOptions);
            }
        }).addTo(map);
    }
});

//return URL for gauge hydrograph
function getURL(feature) {
    return "http://water.weather.gov/resources/hydrographs/" + feature.properties.gaugelid.toLowerCase() + "_hg.png";
}

//icons for gauge data
function decideIcon(val){
    switch(val){
        case "action": return L.MakiMarkers.icon({icon: "circle", color: "#ff0", size: "m"});
            break;
        case "minor": return L.MakiMarkers.icon({icon: "circle", color: "f80", size: "m"});
            break;
        case "moderate": return L.MakiMarkers.icon({icon: "circle", color: "#f00", size: "m"});
            break;
        case "major": return L.MakiMarkers.icon({icon: "circle", color: "#f0f", size: "m"});
            break;
        default: return L.MakiMarkers.icon({icon: "circle", color: "#080", size: "m"});
    }
}

/* -------------------------------- QPE data -------------------------------- */

//query QPE by Globvalue, would replace map.on, onMapClick(e), and getQPEJSON calls
/*$.getJSON({
 dataType: "json",
 url: "http://129.114.8.204:6080/arcgis/rest/services/QPE/QPE_QueryPoints_20160419/MapServer/0/query?where=Globvalue" +
 "+%3E+3.0&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRel" +
 "Intersects&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&returnIds" +
 "Only=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&return" +
 "M=false&gdbVersion=&returnDistinctValues=false&f=json",
 success: function(data){
 var transformedQPE = transformToJSON(data);
 //console.log(JSON.stringify(transformedQPE));

 qpeDataToMap(transformedQPE);
 }
 });*/

//respond to map click
map.on('click', onMapClick);

//pass lat long to query function
function onMapClick(e) {
    var clickLat = e.latlng.lat;
    var clickLong = e.latlng.lng;

    console.log(e.latlng);
    getQPEJSON(clickLat, clickLong);
}

//query QPE data based on lat long, pass unformatted JSON to mapping function, receive formatted JSON and pass to mapping function
function getQPEJSON(lat, long){
    var minLat = lat - 0.5;
    var maxLat = lat + 0.5;
    var minLong = long - 0.5;
    var maxLong = long + 0.5;

    var formattedURL = "http://129.114.8.204:6080/arcgis/rest/services/QPE/QPE_QueryPoints_20160419/MapServer/0/query?where=lat%3E" +
        minLat + "+AND+lat%3C" + maxLat + "+AND+lon%3E" + minLong + "AND+lon%3C" + maxLong +
        "&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam" +
        "=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly" +
        "=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&return" +
        "DistinctValues=false&f=pjson";
    console.log(formattedURL);
    $.getJSON({
        dataType: "json",
        url: formattedURL,
        success: function (data) {
            var transformedQPE = transformToJSON(data);

            //console.log(JSON.stringify(transformedQPE));

            var popup = L.popup();

            if(transformedQPE.features.length == 0){
                var latLng = {"lat": lat, "lon": long};
                console.log(latLng);
                popup
                    .setLatLng(latLng)
                    .setContent("No rain here!")
                    .openOn(map);
            }
            qpeDataToMap(transformedQPE);
        }
    });
}

//format JSON into Leaflet-readable form
function transformToJSON(data){
    var output = {
        "type": "FeatureCollection",
        "features": []
    };

    for(var i=0; i < data.features.length; i++){
        var newData = new Feature();
        newData.geometry = {
            "type": "Point",
            "coordinates": [data.features[i].geometry.y, data.features[i].geometry.x]
        };
        newData.properties = {
            "Globvalue": data.features[i].attributes.Globvalue,
            "lat": data.features[i].attributes.Lat,
            "lon": data.features[i].attributes.Lon
        };
        output.features.push(newData);
    }

    return output;
}

//helper function for transformToJSON()
function Feature(){
    this.type = 'Feature';
    this.geometry = new Object;
    this.properties = new Object;
}

//add QPE data to map
function qpeDataToMap(data){
    var circleList = [];
    for(var i = 0; i < data.features.length; i++){
        var circle = L.circle(data.features[i].geometry.coordinates, 1300, {
            color: decideColorVal(data.features[i].properties.Globvalue),
            fillColor: decideColorVal(data.features[i].properties.Globvalue),
            fillOpacity: 0.45
        });

        var popup = L.popup();
        var content = "<span><b>Location: </b>" + data.features[i].properties.lat + ", " + data.features[i].properties.lon +
            "<br><b>Quantitative Precipitation Estimation: </b>" + data.features[i].properties.Globvalue + " in</span>";

        circle.bindPopup(content);
        circleList.push(circle);

    }

    var queryLayer = L.layerGroup(circleList);
    queryLayer.addTo(qpeDataLayer);
    showLayer(qpeDataLayer);
}

//decide color of QPE cirlces
function decideColorVal(rainfallVal){
    if(rainfallVal > 10){
        return "#ffffff";
    }
    if(rainfallVal > 8){
        return "#770081";
    }
    if(rainfallVal > 6){
        return "#CA00DB";
    }
    if(rainfallVal > 5){
        return "#BB0000";
    }
    if(rainfallVal > 4){
        return "#FD1616";
    }
    if(rainfallVal > 3){
        return "#FC8181";
    }
    if(rainfallVal > 2.5){
        return "#FE7100";
    }
    if(rainfallVal > 2){
        return "#FEAC00";
    }
    if(rainfallVal > 1.5){
        return "#FFFF00";
    }
    if(rainfallVal > 1){
        return "#018100";
    }
    if(rainfallVal > 0.75){
        return "#73FFDF";
    }
    if(rainfallVal > 0.5){
        return "#B4FE00";
    }
    if(rainfallVal > 0.25){
        return "#0000FF";
    }
    if(rainfallVal > 0.1){
        return "#14A4AB";
    }
    else{
        return "#00FFFF";
    }
}

//load and display raster QPE data
qpeRasterData = L.esri.tiledMapLayer({
    url: "http://129.114.8.204:6080/arcgis/rest/services/QPE/QPE_RasterTile_20160419/MapServer",
    maxZoom: 12,
    minZoom: 6,
    bounds: [[24.557116164309626,-91.461181640625],[37.16469418870222,-109.05029296875001]],
    opacity: 0.45
}).addTo(map);

/* -------------------------------- event listeners for toggle -------------------------------- */
$("#toggleGaugeLayer" ).on( "click", function() {
    if(map.hasLayer(gaugeDataLayer)){
        hideLayer(gaugeDataLayer);
    }
    else{
        showLayer(gaugeDataLayer);
    }
});

$("#toggleQPELayer" ).on( "click", function() {
    if(map.hasLayer(qpeDataLayer)){
        hideLayer(qpeDataLayer);
        hideLayer(qpeRasterData);

    }
    else{
        showLayer(qpeDataLayer);
        showLayer(qpeRasterData);
    }
});

$("#resetQPELayer" ).on( "click", function() {
    clearLayers(qpeDataLayer);
});

/* ------------------ layers control ------------ */
function hideLayer(layer){
    layer.removeFrom(map);
}

function showLayer(layer){
    layer.addTo(map);
}

function clearLayers(layerGroup){
    layerGroup.clearLayers();
}