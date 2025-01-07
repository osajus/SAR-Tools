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
            buttonAreaDiv.innerHTML = '<button type="button" class="startover" onclick="location.reload()">Start Over</button><br /><br />';
        }
        
        // I didn't need to do this, and it added a step later.  Don't do it again.
        let features = geoObj.features;

        // Intersect tracks with polygons
        let lines = intersect_track(features);

        // sort the lines by parent
        // This is stupid.  Why cant sort() just have a case insensitivity flag? 
        lines.sort((a, b) => (a.properties.parent > b.properties.parent) ? 1 : -1);
        
        // Loop through each track in 'lines', and calculate the total length of each track segment, grouping by track 'parent'
        fileContent.innerHTML = '<h2>Track Lengths Inside Region/Segments</h2>';
        
        fileContent.innerHTML += get_stats(lines);

        buttonAreaDiv.innerHTML += '<p><button type="button" class="download_xls" onclick="export_to_excel()">Export Data as Excel</button></p>';


        // Display the map on the webpage
        loadMap(features, lines);

        // Convert the lines back to a geojson        
        // This is the extra step I was talking about earlier when I stepped into .features
        lines = "{ \"type\": \"FeatureCollection\", \"features\": " + JSON.stringify(lines) + "}";

        // Unhide the PostExec div
        PostExecDiv.style.display = 'block';

        // Create a button to download the file
        let b = document.createElement('button');
        b.innerText = 'Download modified file';
        b.className = 'download_geojson';
        b.onclick = () => {
            let a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([lines], {type: 'application/json'}));
            a.download = 'modified.geojson';
            a.innerText = 'Download modified geoJson';
            a.display = 'block';
            a.click();
            document.body.removeChild
        }
        buttonAreaDiv.appendChild(b);
    }
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
                        length: turf.length(lines[line], {units: 'meters'}),
                        segment_area: lines[line].properties.segment_area
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

    // Default values
    let searchers = '0';
    let esw = '0';
    let linestats = `
    <form id="trackStats">
    <table>
        <tr>
            <th class="firstCol"></th>
            <th>Track Length</th>
            <th>Searchers</th>
            <th>Estimated Sweep Width</th>
            <th>Total Track Length</th>
            <th>Area Effectively Searched</th>
            <th>Segment Area</th>
            <th>Coverage</th>
        </tr>
        <tr>
            <td class="subh"></th>
            <td class="subh">(TL)</th>
            <td class="subh">(S)</th>
            <td class="subh">(ESW)</th>
            <td class="subh">(TTL) or (Z)</th>
            <td class="subh">(AES)</th>
            <td class="subh">(A)</th>
            <td class="subh">(C)</th>
        </tr>
        <tr>
            <td class="subh"></td>
            <td class="subh">meters</td>
            <td class="subh"></td>
            <td class="subh">meters</td>
            <td class="subh">meters</td>
            <td class="subh">meters\u00B2</td>
            <td class="subh">meters\u00B2</td>
            <td class="subh"></td>
        </tr>
    
    `;
    let rownum = 0;
    for (let polygon in polygons_array) {
        linestats += `<tr><td class="firstCol"><b>Segment: ${polygons_array[polygon].segment_name}</b></td><td colspan=7></td></tr>`;
        for (let part in polygons_array[polygon].parts) {
            let tl = polygons_array[polygon].parts[part].length;
            let segmentArea = polygons_array[polygon].parts[part].segment_area;
            let ttl = tl * searchers;
            let aes = ttl * esw;
            let coverage = aes / segmentArea;
            linestats += `
            <tr id="row_${rownum}">
                <td class="firstCol">${polygons_array[polygon].parts[part].track_name}</td>
                <td><input type="number" name="TL" value="${tl.toFixed(2)}" readonly></td>
                <td><input type="number" name="Searchers" value="${searchers}" onchange="calculate_coverage('row_${rownum}')"></td>
                <td><input type="number" name="ESW" value="${esw}" onchange="calculate_coverage('row_${rownum}')"></td>
                <td><input type="number" name="TTL" value="${ttl.toFixed(2)}" readonly></td>
                <td><input type="number" name="AES" value="${aes.toFixed(2)}" readonly></td>
                <td><input type="number" name="SegmentArea" value="${segmentArea.toFixed(2)}" readonly></td>
                <td><input type="number" name="Coverage" value="${coverage.toFixed(2)}" readonly></td>
            </tr>`;
            rownum++;
        }
    }
    linestats += '</table>';
    return linestats;
}

function calculate_coverage(row) {
    var thisRow = document.getElementById(row);

    let searchers = thisRow.querySelectorAll('[name=Searchers]')[0].value;
    let esw = thisRow.querySelectorAll('[name=ESW]')[0].value;
    let tl = thisRow.querySelectorAll('[name=TL]')[0].value;
    let segmentArea = thisRow.querySelectorAll('[name=SegmentArea]')[0].value;

    let ttl = thisRow.querySelectorAll('[name=TTL]')[0];
    let aes = thisRow.querySelectorAll('[name=AES]')[0];
    let coverage = thisRow.querySelectorAll('[name=Coverage]')[0];
    
    ttl.value = (tl * searchers).toFixed(2);
    aes.value = (ttl.value  * esw).toFixed(2);
    coverage.value = (aes.value / segmentArea).toFixed(2);
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
                            "segment_area": turf.area(polygons[i]),
                            "stroke": trackColor,
                            "stroke-opacity": 1,
                            "pattern": "solid",
                            "description": track[j].properties.title
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
                    },
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

function export_to_excel() {
    // Gather form data
    const form = document.getElementById('trackStats');
    const rows = form.querySelectorAll('tr');
    const data = [];
    
    // Iterate through each row and collect data
    rows.forEach(row => {
        const rowData = {};
        const firstCol = row.querySelector('.firstCol');
        if (firstCol) {
            rowData['Segment/Track'] = firstCol.innerText;
        }
        row.querySelectorAll('input').forEach(input => {
            rowData[input.name] = input.value;
        });
        if (Object.keys(rowData).length > 1) {
            data.push(rowData);
        }
    });

    console.log(data);
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
  
    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Form Data');
  
    // Export the workbook to an Excel file
    XLSX.writeFile(workbook, 'form_data.xlsx');
  }