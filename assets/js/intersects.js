"use strict";

let dipp, da, dot;

// Check session storage for saved values, if not, save defaults
if (sessionStorage.getItem('dipp')) {
    dipp = JSON.parse(sessionStorage.getItem('dipp'));
} else {
    dipp = [
        ["25%", 25, 1.1],
        ["50%", 25, 3.1],
        ["75%", 25, 5.8],
        ["95%", 20, 18.3],
        ["100%", 5, 20]
    ];
    sessionStorage.setItem('dipp', JSON.stringify(dipp));
}

if (sessionStorage.getItem('da')) {
    da = JSON.parse(sessionStorage.getItem('da'));
} else {
    da = [
        ["25%", 25, 2],
        ["50%", 25, 23],
        ["75%", 25, 64],
        ["95%", 20, 132],
        ["100%", 5, 360]
    ];
    sessionStorage.setItem('da', JSON.stringify(da));
}

if (sessionStorage.getItem('dot')) {
    dot = JSON.parse(sessionStorage.getItem('dot'));
} else {
    dot = 90;
    sessionStorage.setItem('dot', JSON.stringify(dot));
}


// After document loads...
document.addEventListener('DOMContentLoaded', (event) => {

    let dynamicArea = document.getElementById('dynamicArea');
    let openFileButton = document.getElementById('openFile');
    const buttonAreaDiv = document.getElementById('buttonArea')

    dynamicArea.style.display = 'none';

    // Populate the statistics tables with the default values
    for (let i = 0; i < dipp.length; i++) {
        let cell = 'dipp' + dipp[i][0];
        document.getElementById(cell).value = dipp[i][2];
    }

    for (let i = 0; i < da.length; i++) {
        let cell = 'da' + da[i][0];
        document.getElementById(cell).value = da[i][2];
    }

    document.getElementById('dot').value = dot;
    
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
            buttonAreaDiv.innerHTML = '<button type="button" class="startover" onclick="location.reload()">Start Over</button>';
        }
        
        console.log(geoObj);

        // Validate the file
        if (!eval_file(geoObj)){
            alert("The file you uploaded is not a valid IPP file. Please try again.")
            location.reload()
            throw new Error('Invalid file');
        }
        
        // Extract IPP 
        let ipp = extract_ipp(geoObj);
        console.log(ipp);

        dynamicArea.style.display = 'block';
        dynamicArea.innerHTML = `valid file`;

        loadMap(ipp);
    
    }
});


function eval_file(geoObj) {
    // Check if the file contains a marker labeled 'IPP' and at least one shape.
    // Args: geoObj - a GeoJSON object
    // Returns: boolean - true if the file is valid, false otherwise
    const features = geoObj.features;
    let ipp, shp = false;
    for (let idx in features) {
        if (features[idx].properties.title.toUpperCase() == 'IPP' ) {
            if (ipp) {
                // There should only be ONE ipp
                return false;
            }
            ipp = true;
        } else if (features[idx].properties.class == 'Shape') {
            shp = true;
        }
    }
    if (ipp && shp) {
        return true;
    } else {
        return false;
    }
}

function extract_ipp(geoObj) {
    const features = geoObj.features;
    let ipp;
    for (let idx in features) {
        if (features[idx].properties.title.toUpperCase() == 'IPP' ) {
            return features[idx];
        }
    }
}

function toggleinstructions() {
    var x = document.getElementById("instructions");
    if (x.style.display == "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }

    let toggleImg = document.getElementById('toggle');
    
    if (toggleImg.src.includes('down.svg')) {
        toggleImg.src = './assets/images/up.svg';
    } else {
        toggleImg.src = './assets/images/down.svg';
    }
} 



function changeVal(table, row, event) {
    let val = parseInt(event.target.value);
    if (table == 'dot') {
        if (val > event.target.max) {
            alert('Value must be less than or equal to ' + event.target.max);
            event.target.value = '';
            event.target.focus();
            event.target.style.backgroundColor = '#FF7777';
        } else if (val < event.target.min) {
            alert('Value must be greater than or equal to ' + event.target.min);
            event.target.value = '';
            event.target.focus();
            event.target.style.backgroundColor = '#FF7777';
        } else {
            dot = val;
            sessionStorage.setItem('dot', JSON.stringify(dot));
            event.target.style.backgroundColor = '#FFF';
        }
    } else if (table == 'dipp') {
        if (val < event.target.min) {
            alert('Value must be greater than or equal to ' + event.target.min);
            event.target.value = '';
            event.target.focus();
            event.target.style.backgroundColor = '#FF7777';
        } else {
            dipp[parseInt(row)][2] = val;
            sessionStorage.setItem('dipp', JSON.stringify(dipp));
            event.target.style.backgroundColor = '#FFF';
        }
    } else if (table == 'da') {
        if (val > event.target.max) {
            alert('Value must be less than or equal to ' + event.target.max);
            event.target.value = '';
            event.target.focus();
            event.target.style.backgroundColor = '#FF7777';
        } else if (val < event.target.min) {
            alert('Value must be greater than or equal to ' + event.target.min);
            event.target.value = '';
            event.target.focus();
            event.target.style.backgroundColor = '#FF7777';
        } else {
            da[parseInt(row)][2] = val;
            sessionStorage.setItem('da', JSON.stringify(da));
            event.target.style.backgroundColor = '#FFF';
        }
    }
}

function loadMap(ipp) {;
    const map = new maplibregl.Map({
        container: 'map', // container id
        style: 'https://demotiles.maplibre.org/style.json', // style URL
        center: [0, 0], // starting position [lng, lat]
        zoom: 1, // starting zoom
        maplibreLogo: true
    });

    // After the map loads
    map.on('load', function() {
        document.getElementById('map').style.display = 'block';

        
        
        new maplibregl.Marker().setLngLat([ipp.geometry.coordinates[0], ipp.geometry.coordinates[1]]).addTo(map);

        // Center the map on the IPP and zoom
        map.setCenter({lng: ipp.geometry.coordinates[0], lat: ipp.geometry.coordinates[1]});
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