# SAR-Tools
Various Search and Rescue related tools

# Installation
Simply download the files to your drive and run index.html

# Goals
SAR events do not always happen where there is internet.  Also, interoperability means working users that may have the ability to install or run certain things due to their agency IT polices. With those thoughts in mind, this toolkit is designed with the following goals:
* Does not require installing software.
* Does not require running an executable.
* Available for distribution using offline media.
* Uses an offline-first priority.  Online features are non-critical.

# Limitations
Because of the goals, there has to be trade-offs.  Currently, these tools are limited to running in Chrome-based browsers.

# load_geojson.js
This script takes a geojson file containing region/segment polygons and track lines.  The tool removes portions of the track lines that fall outside of the region/segments.

# Attribution
This file relies heavily on two libraries:
[Turf.js](https://turfjs.org/)
[MapLibre](https://maplibre.org)

And is designed to work with created by:
[SAR Topo](https://sartopo.com)


# Disclaimer
This software has very limited testing and no field testing.  Use at your own risk.  I make no statements regarding accuracy of the data.  The software is distributed AS IS and is subject to the license as defined in the Github repo. 

# Requests 
Please credit [Osajus Services](www.osajus.com) and share if this tool was of use to you.
If you have the ability to help develop or maintain, please contact us.

