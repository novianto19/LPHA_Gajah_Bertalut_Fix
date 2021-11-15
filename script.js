var data = {};
var groups = {};
var map;

/*
 * Given a string `str`, replaces whitespaces with dashes,
 * and removes nonalphanumeric characters. Used in URL hash.
 */
var slugify = function(str) {
  return str.replace(/[^\w ]+/g,'').replace(/ +/g,'-');
}

/*
 * Resets map view to originally defined `mapCenter` and `mapZoom` in settings.js
 */
var resetView = function() {
  map.flyTo( mapCenter, mapZoom );
  resetSidebar();
}

/*
 * Resets sidebar, clearing out place info and leaving title+footer only
 */
var resetSidebar = function() {
    // Make the map title original color
    $('header').removeClass('black-50');

    // Clear placeInfo containers
    $('#placeInfo').addClass('dn');
    $('#placeInfo h2, #placeInfo h3').html('');
    $('#placeInfo div').html('');
    $('#googleMaps').addClass('dn').removeClass('dt');

    // Reset hash
    location.hash = '';
}

/*
 * Given a `marker` with data bound to it, update text and images in sidebar
 */
var updateSidebar = function(marker) {

  // Get data bound to the marker
  var d = marker.options.placeInfo;

  if (L.DomUtil.hasClass(marker._icon, 'markerActive')) {
    // Deselect current icon
    L.DomUtil.removeClass(marker._icon, 'markerActive');
    resetSidebar();
  } else {
    location.hash = d.slug;

    // Dim map's title
    $('header').addClass('black-50');
    $('#placeInfo').removeClass('dn');

    // Clear out active markers from all markers
    $('.markerActive').removeClass('markerActive');

    // Make clicked marker the new active marker
    L.DomUtil.addClass(marker._icon, 'markerActive');

    // Populate place information into the sidebar
    $('#placeInfo').animate({opacity: 0.5}, 300).promise().done(function() {
      $('#placeInfo h2').html(d.kode_pohon);
      $('#placeInfo h3').html(d.nama_lokal+' ( <i>'+d.nama_latin+ '</i> )');
      $('#description').html(
        '<table>\
          <tr>\
            <th scope="row">Status IUCN</th>\
            <td>'+d.status_iucn+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Latitude</th>\
            <td>'+d.Latitude+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Longitude</th>\
            <td>'+d.Longitude+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Perhutanan Sosial</th>\
            <td>'+d.unit_PS+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Nama Khas Wilayah</th>\
            <td>'+d.nama_khas_wilayah+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Jenis Lahan</th>\
            <td>'+d.jenis_lahan+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Diameter</th>\
            <td>'+d.diameter+' cm </td>\
          </tr>\
          <tr>\
            <th scope="row">Tinggi</th>\
            <td>'+d.tinggi+' m </td>\
          </tr>\
          <tr>\
            <th scope="row">Jarak Permukiman</th>\
            <td>'+d.jarak_permukiman+' km </td>\
          </tr>\
          <tr>\
            <th scope="row">Status Adopsi</th>\
            <td>'+d.status_adopsi+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Nama Pengadopsi</th>\
            <td>'+d.nama_pengadopsi+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Masa Berlaku</th>\
            <td>'+d.masa_berlaku+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Nama Surveyor</th>\
            <td>'+d.nama_surveyor+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Waktu Survei</th>\
            <td>'+d.waktu_survei+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Harga Adopsi</th>\
            <td> Rp '+d.harga_adopsi+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Serapan Karbon</th>\
            <td>'+d.serapan_karbon+' Kg </td>\
          </tr>\
          <tr>\
            <th scope="row">Penyedia Bibit</th>\
            <td>'+d.penyedia_bibit+'</td>\
          </tr>\
          <tr>\
            <th scope="row">Metode Perhitungan Karbon</th>\
            <td>'+d.metode_karbon+'</td>\
          </tr>\
        </table>'
      );
    
      if (d.chart_link) {
        $('#googleMaps').removeClass('dn').addClass('dt').attr('href', d.chart_link);
      } else {
        $('#googleMaps').addClass('dn').removeClass('dt');
      }

      $('#gallery').html('');
      $('#galleryIcon').hide();

      // Load up to 5 images
      for (var i = 1; i <= 5; i++) {
        var idx = 'Image' + i;

        if (d[idx]) {

          // var source = "<em class='normal'>" + d[idx + 'Source'] + '</em>';

          // if (source && d[idx + 'SourceLink']) {
          //   source = "<a href='" + d[idx + 'SourceLink'] + "' target='_blank'>" + source + "</a>";
          // }

          var a = $('<a/>', {
            href: d[idx],
            'data-lightbox': 'gallery',
            //'data-title': ( d[idx + 'Caption'] + ' ' + source )  || '',
            'data-alt': d.kode_pohon,
            'class': i === 1 ? '' : 'dn'
          });

          var img = $('<img/>', { src: d[idx], alt: d.kode_pohon, class: 'dim br1' });
          $('#gallery').append( a.append(img) );

          if (i === 1) {
            $('#gallery').append(
              $('<p/>', { class: 'f6 black-50 mt1', html: d[idx + 'Caption'] + ' ' + source })
            );
          }

          if (i === 2) {
            $('#gallery > a:first-child').append('<span class="material-icons arrow arrow-right white-90">navigate_next</span>')
            $('#gallery > a:first-child').append('<span class="material-icons arrow arrow-left white-90">navigate_before</span>')
          }

        } else {
          break;
        }
      }

      $('#placeInfo').animate({ opacity: 1 }, 300);

      // Scroll sidebar to focus on the place's title
      $('#sidebar').animate({
        scrollTop: $('header').height() + 20
      }, 800);
    })
  }
}



/*
 * Main function that generates Leaflet markers from read CSV data
 */
var addMarkers = function(data) {

  var activeMarker;
  var hashName = decodeURIComponent( location.hash.substr(1) );

  for (var i in data) {
    var d = data[i];

    // Create a slug for URL hash, and add to marker data
    d['slug'] = slugify(d.id);

    // Add an empty group if doesn't yet exist
    if (!groups[d.Group]) { groups[d.Group] = []; }

    // Create a new place marker
    var m = L.marker(
      [d.Latitude, d.Longitude],
      {  
        icon: L.icon({
          iconUrl: d.Icon,
          iconSize: [ iconWidth, iconHeight ],
          iconAnchor: [ iconWidth/2, 0 ], // middle of icon represents point center
          className: 'br1',
        }),
        // Pass place data
        placeInfo: d
      },
    ).on('click', function(e) {
      map.flyTo(this._latlng, 20);
      updateSidebar(this);
    });


    // Add this new place marker to an appropriate group
    groups[d.Group].push(m);

    if (d.slug === hashName) { activeMarker = m; }
  }

  // Transform each array of markers into layerGroup
  for (var g in groups) {
    groups[g] = L.layerGroup(groups[g]);

    // By default, show all markers
    groups[g].addTo(map);
  }
  
  L.control.layers({}, groups, {collapsed: true, position: 'bottomright'}).addTo(map);
  //$('.leaflet-control-layers-overlays').prepend('<h3 class="mt0 mb1 f5 black-30">Legend</h3>');

  // If name in hash, activate it
  if (activeMarker) { activeMarker.fire('click') }

}

/*
 * Loads and parses data from a CSV (either local, or published
 * from Google Sheets) using PapaParse
 */
var loadData = function(loc) {

  Papa.parse(loc, {
    header: true,
    download: true,
    complete: function(results) {
      addMarkers(results.data);
    }
  });

}

/*
 * Add home button
 */
var addHomeButton = function() {

  var homeControl = L.Control.extend({
    options: {
      position: 'bottomright'
    },

    onAdd: function(map) {
      var container = L.DomUtil.create('span');
      container.className = 'db material-icons home-button black-80';
      container.innerText = 'map';
      container.onclick = function() {
        resetView();
      }

      return container;
    }
  })

  map.addControl(new homeControl);

}

/*
 * Main function to initialize the map, add baselayer, and add markers
 */
var initMap = function() {


  // Initial Map
  map = L.map('map', {
    center: mapCenter,
    zoom: mapZoom,
    tap: false, // to avoid issues in Safari, disable tap
    zoomControl: false,
  });


  // Add Basemaps
  // Add OSM Standard Basemap  
  map.createPane('pane_OSMStandard_0');
  map.getPane('pane_OSMStandard_0').style.zIndex = 5;
  var layer_OSMStandard_0 = L.tileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    pane: 'pane_OSMStandard_0',
    opacity: 1.0,
    attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors, CC-BY-SA</a>',
    minZoom: 1,
    maxZoom: 28,
    minNativeZoom:0,
    maxNativeZoom:19
  });

  // Add Google Terrain Basemap  
  map.createPane('pane_GoogleTerrain_1');
  map.getPane('pane_GoogleTerrain_1').style.zIndex = 6;
  var layer_GoogleTerrain_1 = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    pane: 'pane_GoogleTerrain_1',
    opacity: 1.0,
    attribution: '<a href="https://www.google.at/permissions/geoguidelines/attr-guide.html">Map data ©2015 Google</a>',
    minZoom: 1,
    maxZoom: 28,
    minNativeZoom: 0,
    maxNativeZoom: 20
  });

  //Add Google Satellite Basemaps  
  map.createPane('pane_GoogleSatellite_2');
  map.getPane('pane_GoogleSatellite_2').style.zIndex = 4;
  var layer_GoogleSatellite_2 = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    pane: 'pane_GoogleSatellite_2',
    opacity: 1.0,
    attribution: '<a href="https://www.google.at/permissions/geoguidelines/attr-guide.html">Map data ©2015 Google</a>',
    minZoom: 1,
    maxZoom: 28,
    minNativeZoom:0,
    maxNativeZoom: 20
  });
  layer_GoogleSatellite_2;
  map.addLayer(layer_GoogleSatellite_2)

// styling, and event listener to layer_BatasKawasan
 var layer_BatasKawasan;

  function style_bataskawasan(feature) {
    return {
      opacity: 1,
      color: 'rgba(35,35,35,1.0)',
      dashArray: '',
      lineCap: 'butt',
      lineJoin: 'miter',
      weight: 1.0,
      fill: true,
      fillOpacity: 1,
      fillColor: 'rgba(135,116,158,0.2)',
      interactive: true,
    }
  }
//style when hovered
function highlightFeature(e) {
   var layer = e.target;

   layer.setStyle({
      opacity: 1,
      color: 'rgba(35,35,35,1.0)',
      dashArray: '',
      lineCap: 'butt',
      lineJoin: 'miter',
      weight: 3.0,
      fill: true,
      fillOpacity: 1,
      fillColor: 'rgba(135,116,158,0.3)',
      interactive: true,
   });

   if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
   }
   info.update(layer.feature.properties); 
}
//reset hover state
function resetHighlight(e) {
   layer_BatasKawasan.resetStyle(e.target);
   info.update(); 
}
//zoom while clicking
function zoomToFeature(e) {
   map.fitBounds(e.target.getBounds());
}
// event listener package
function onEachFeature(feature, layer) {
   layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
   });
}

  map.createPane('pane_PohonAdopsiMinastahura_4');
  map.getPane('pane_PohonAdopsiMinastahura_4').style.zIndex = 1;
  map.getPane('pane_PohonAdopsiMinastahura_4').style['mix-blend-mode'] = 'normal';

  layer_BatasKawasan = L.geoJson(json_BatasKawasanTahuraSultanSyarifQasim_3,{
    attribution: '',
    interactive: true,
    dataVar: 'json_BatasKawasanTahuraSultanSyarifQasim_3',
    layerName: 'layer_BatasKawasanTahuraSultanSyarifQasim_3',
    style: style_bataskawasan,
    onEachFeature: onEachFeature,
    //pane: 'pane_PohonAdopsiMinastahura_4'
  });
  map.addLayer(layer_BatasKawasan);

//Get "kabupat" from Geojsonfile for area information when hovered
var info = L.control();
info.onAdd = function (map) {
   this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
   this.update();
   return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
   this._div.innerHTML = '<h4>Daerah</h4>' + (props ?
      props.kabupat
      : '');
};
info.addTo(map);

  //group basemaps
  basemaps= {
    "Peta Dasar (OSM Standard)":layer_OSMStandard_0,
    "Peta Dasar (Google Terrain)": layer_GoogleTerrain_1,
    "Peta Dasar (Google Satellite)": layer_GoogleSatellite_2
  };

  // Add to map all basemaps
  L.control.layers(
    basemaps,{} ,{
    position:'bottomright',
    collapsed:false
  }).addTo(map);
  setBounds();


  // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  //   attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  //   subdomains: 'abcd',
  //   maxZoom: 19
  // }).addTo(map);

  loadData(dataLocation);

  // Add data & GitHub links
  map.attributionControl.setPrefix('Download <a href="'
    + dataLocation + '" target="_blank">data</a> or \
    view <a href="https://github.com/Simarmata12Soni/webmap_adopsipohon1_" target="_blank">code on\
    GitHub</a> | created with <a href="http://leafletjs.com" title="A JS library\
    for interactive maps">Leaflet</a>');

  // Add custom `home` control
  addHomeButton({
    position:'bottomright'
  });

  // Add zoom control to the bottom-right corner
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  $('#closeButton').on('click', resetView);
}

// When DOM is loaded, initialize the map
$('document').ready(initMap);