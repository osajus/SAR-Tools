"use strict";

// Wait for the document to fully load
document.addEventListener('DOMContentLoaded', (event) => {
    let openFileButton = document.getElementById('openFile');
    let fileContent = document.getElementById('fileContent');
    const buttonAreaDiv = document.getElementById('buttonArea')

    // Hide the PostExec div containing file contents
    const PostExecDiv = document.getElementById('PostExec')
    PostExecDiv.style.display = 'none';
    
    // When the button is clicked, open the file picker for GeoJSON files
    openFileButton.onclick = async () => {
        const options = {
            types: [
                {
                    description: 'GeoJSON Files',
                    accept: {
                        'application/json': ['.json'],
                        'application/json': ['.geojson'],
                    },
                },
            ],
            startIn: 'downloads',
            multiple: false,
            excludeAcceptAllOption: false,
        }

        // Open the file picker
        const [fileHandle] = await showOpenFilePicker(options);

        // Get the file contents as a stream
        const file = await fileHandle.getFile();

        // Read the stream as text
        const contents = await file.text();

        // Parse the JSON into a javascript object
        let geoObj = JSON.parse(contents);

        // Hide the open file button if a file has been loaded
        if (geoObj != null) {
            openFileButton.style.display = 'none';
            // display a button in the buttonAreDiv that refreshes the page
            buttonAreaDiv.innerHTML = '<button onclick="location.reload()">Start Over</button><br /><br />';
        }
        
        // Display the contents of the file
        let features = geoObj.features;
        fileContent.innerHTML = '<ul>';
        for (let i = 0; i < features.length; i++) {
            fileContent.innerHTML += '<li>' + features[i].properties.title + '</li>';
        }
        fileContent.innerHTML += '</ul>';

        let lines = intersect_track(features);

        loadMap(features, lines);

        // Convert the geoObj back to a geojson string
        geoObj = JSON.stringify(geoObj);
        lines = "{ \"type\": \"FeatureCollection\", \"features\": " + JSON.stringify(lines) + "}";

        // Unhide the PostExec div
        PostExecDiv.style.display = 'block';

        // Create a hyperlink to download the file
        let a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([lines], {type: 'application/json'}));
        a.download = 'modified.geojson';
        a.innerText = 'Download modified file';
        a.display = 'block';
        buttonAreaDiv.appendChild(a);}
});

function intersect_track(features) {
    let track = features.filter(element => element.geometry.type === 'LineString');
    let polygons = features.filter(element => element.geometry.type === 'Polygon');
    let lines = [];
    for (let i = 0; i < polygons.length; i++) {
        // create a random color hex code
        let trackColor = '#' + Math.floor(Math.random()*16777215).toString(16);

        for (let j = 0; j < track.length; j++) {
            // linesplit the track with the polygon
            let split = turf.lineSplit(track[j], polygons[i]);
            let segNum = 1;
            for (let k = 0; k < split.features.length; k++) {
                if (turf.booleanContains(polygons[i], split.features[k])) {
                let line = {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: split.features[k].geometry.coordinates
                        },
                        properties: {
                            "title": track[j].properties.title + "-" + polygons[i].properties.title + "-seg"+ segNum++,
                            "stroke": trackColor,
                            "stroke-opacity": 1,
                            "pattern": "solid"
                        }
                    };
                    lines.push(line);
                }
            }
        }
    }
    return lines;

}


function loadMap(features, lines) {
    const map = new maplibregl.Map({
        container: 'map', // container id
        style: 'https://demotiles.maplibre.org/style.json', // style URL
        center: [0, 0], // starting position [lng, lat]
        zoom: 1, // starting zoom
        maplibreLogo: true
    });

    map.on('load', function() {
        let last_poly = null;
        
        
            // Add the features to the map
        for (let i = 0; i < features.length; i++) {
            if (features[i].geometry.type === 'Polygon') {
                map.addSource(features[i].properties.title, {
                    type : 'geojson',
                    data : features[i]
                })

                // Map the polygons
                
                    map.addLayer({
                        id : features[i].properties.title,
                        source : features[i].properties.title,
                        type : 'fill',
                        paint : {
                            'fill-color' : '#333',
                            'fill-opacity' : 0.2
                        }
                    });

                    last_poly = features[i];
            }             
            
            if (features[i].geometry.type === 'LineString') {
                map.addSource(features[i].properties.title, {
                    type : 'geojson',
                    data : features[i]
                })

                // Map the tracks
                
                    map.addLayer({
                        id : features[i].properties.title,
                        source : features[i].properties.title,
                        type : 'line',
                        paint : {
                            'line-color' : '#bbb',
                            'line-opacity' : 0.5,
                            'line-width' : 5
                        }
                    });
            } 
        }

        for (let i = 0; i < lines.length; i++) {
            map.addSource(lines[i].properties.title + ' bisected', {
                type : 'geojson',
                data : lines[i]
            })
            map.addLayer({
                id : lines[i].properties.title + ' bisected',
                source : lines[i].properties.title + ' bisected',
                type : 'line',
                paint : {
                    'line-color' : '#000',
                    'line-width' : 1
                }
            });
        }


        // Center the map on the last mapped polygon
        if (last_poly) {
            map.setCenter(last_poly.geometry.coordinates[0][0]);
        }

        //center the map on the first polygon
        map.setZoom(11);
    });

    map.on('mousemove', (e) => {
        document.getElementById('info').innerHTML =
            // e.point is the x, y coordinates of the mousemove event relative
            // to the top-left corner of the map
            `${JSON.stringify(e.point)
            }<br />${
                // e.lngLat is the longitude, latitude geographical position of the event
                JSON.stringify(e.lngLat.wrap())}`;
    });
}


























function loadMap_old(features) {
    const map = new maplibregl.Map({
        container: 'map', // container id
        style: 'https://demotiles.maplibre.org/style.json', // style URL
        center: [0, 0], // starting position [lng, lat]
        zoom: 1, // starting zoom
        maplibreLogo: true
    });

    map.on('load', function() {
        let last_poly = null;
        // Add the features to the map
        for (let i = 0; i < features.length; i++) {
            map.addSource(features[i].properties.title, {
                type : 'geojson',
                data : features[i]
            })

            // Map the polygons
            if (features[i].geometry.type === 'Polygon') {
                map.addLayer({
                    id : features[i].properties.title,
                    source : features[i].properties.title,
                    type : 'fill',
                    paint : {
                        'fill-color' : '#333',
                        'fill-opacity' : 0.2
                    }
                });
                last_poly = features[i];
            } 

            // Map the tracks
            if (features[i].geometry.type === 'LineString') {
                map.addLayer({
                    id : features[i].properties.title,
                    source : features[i].properties.title,
                    type : 'line',
                    paint : {
                        'line-color' : '#000',
                        'line-width' : 1
                    }
                });
            }
        }
        // Center the map on the last mapped polygon
        if (last_poly) {
            map.setCenter(last_poly.geometry.coordinates[0][0]);
        }
        //center the map on the first polygon
        map.setZoom(10);
    });
}

