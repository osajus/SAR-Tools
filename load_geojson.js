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
        
        // I didn't need to do this, and it added a step later.  Don't do it again.
        let features = geoObj.features;

        // Intersect tracks with polygons
        let lines = intersect_track(features);

        // sort the lines by parent
        // This is stupid.  Why cant sort() just have a case insensitivity flag? 
        lines.sort((a, b) => (a.properties.parent > b.properties.parent) ? 1 : -1);
        
        // Loop through each track in 'lines', and calculate the total length of each track segment, grouping by track 'parent'
        fileContent.innerHTML = '<h2>Track Lengths Inside Region/Segments</h2> <ul>';
        
        fileContent.innerHTML += get_stats(lines);

        fileContent.innerHTML += '</ul>';

        // Display the map on the webpage
        loadMap(features, lines);

        // Convert the lines back to a geojson        
        // This is the extra step I was talking about earlier when I stepped into .features
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

function get_stats(lines) {
    // WTF, Javascript?  You can't give an easy way to aggregate data?
    let polygons_array = [];
    
    // Pull all the polygon names
    let polygons = lines.filter(element => element.properties.segment != null).map(element => element.properties.segment);
    // Remove duplicate names
    polygons = [...new Set(polygons)];
    
    for (let polygon in polygons) {
        let polygon_obj = {
            segment_name: polygons[polygon],
            parts: []
        }
        for (let line in lines) {
            if (lines[line].properties.segment == polygons[polygon]) {
                // if lines[line].properties.parent is not in polygon_obj.parts, add it
                let found = false;
                for (let part in polygon_obj.parts) {
                    if (polygon_obj.parts[part].track_name == lines[line].properties.parent) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    polygon_obj.parts.push({
                        track_name: lines[line].properties.parent,
                        length: turf.length(lines[line], {units: 'meters'})
                    });
                } 
                // if not, add the length to the existing part
                else {
                    for (let part in polygon_obj.parts) {
                        if (polygon_obj.parts[part].track_name == lines[line].properties.parent) {
                            polygon_obj.parts[part].length += turf.length(lines[line], {units: 'meters'});
                        }
                    }
                }
            }
        }   
        polygons_array.push(polygon_obj);
    }
    console.log(polygons_array);

    let linestats = '';
    for (let polygon in polygons_array) {
        linestats += '<li>' + polygons_array[polygon].segment_name + '<ul>';
        for (let part in polygons_array[polygon].parts) {
            linestats += '<li>' + polygons_array[polygon].parts[part].track_name + ': ' + polygons_array[polygon].parts[part].length.toFixed(2) + ' meters</li>';
        }
        linestats += '</ul></li>';
    }
    
    return linestats;
}

function intersect_track(features) {
    // Determine which portion of the tracks reside inside polygons

    // Filter the features into tracks and polygons
    let track = features.filter(element => element.geometry.type === 'LineString');
    let polygons = features.filter(element => element.geometry.type === 'Polygon');
    let lines = [];
    // Loop through each polygon
    for (let i = 0; i < polygons.length; i++) {
        // create a random color hex code for the track display
        let trackColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        // Loop through each track
        for (let j = 0; j < track.length; j++) {
            // linesplit the track with the polygon
            let split = turf.lineSplit(track[j], polygons[i]);
            // Create an incrementing segment number to append to each track segment to make unique
            let segNum = 1;
            // Loop through each split segment
            for (let k = 0; k < split.features.length; k++) {
                // If the split segment is inside the polygon, create a line feature
                if (turf.booleanContains(polygons[i], split.features[k])) {
                let line = {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: split.features[k].geometry.coordinates
                        },
                        properties: {
                            "title": track[j].properties.title + "-" + polygons[i].properties.title + "-seg"+ segNum++,
                            "parent": track[j].properties.title,
                            "segment": polygons[i].properties.title,
                            "stroke": trackColor,
                            "stroke-opacity": 1,
                            "pattern": "solid"
                        }
                    };
                    // My cat is being annoying right now and wants you to know this.
                    // Add the line feature to the lines array
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
    // After the map loads
    map.on('load', function() {
        // Create a variable to store the last polygon mapped
        let last_poly = null;

        // Add the original features to the map
        for (let i = 0; i < features.length; i++) {
            // Add Polygons to the map
            if (features[i].geometry.type === 'Polygon') {
                map.addSource(features[i].properties.title, {
                    type : 'geojson',
                    data : features[i]
                });
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
            // Add the original tracks to the map
            if (features[i].geometry.type === 'LineString') {
                map.addSource(features[i].properties.title, {
                    type : 'geojson',
                    data : features[i]
                });
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

        // Add the new bisected tracks to the map
        for (let i = 0; i < lines.length; i++) {
            map.addSource(lines[i].properties.title + ' bisected', {
                type : 'geojson',
                data : lines[i]
            });
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

        // Center the map on the last mapped polygon and zoom
        if (last_poly) {
            map.setCenter(last_poly.geometry.coordinates[0][0]);
        }
        map.setZoom(11);
    });

    // Display the coordinates of the mouse pointer
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

