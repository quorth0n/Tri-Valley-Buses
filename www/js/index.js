"use strict";
//  GLOBALS
var loc = 0; //0: init, 1: set by location, 2: set by bus
var map;
var lIds = [];
var sIds = [];
var pIds = [];

//  FUNCTIONS
var app = {
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
        L.mapbox.accessToken = 'pk.eyJ1Ijoid2hpcmlzaCIsImEiOiJjaXVrcDJpemMwMDB0MnRtMWU4ZXpsaGVwIn0.KKh6diU1GaNmcQPaYDCyfQ';
        map = L.mapbox.map('map', 'mapbox.streets', {
            dragging: true,
            touchZoom: true,
            tap: true,
        });

        app.getR();
    },
    getR: function() {
        $.ajax({
              type: "POST",
              url: 'http://webwatch.lavta.org/tmwebwatch/MultiRoute.aspx/getRouteInfo',
              contentType: "application/json; charset=utf-8",
        }).done(function (msg) {
            if (msg.d == null || msg.d.length == 0) {
                swal('Error', 'No routes found. Try again later.', 'error');
            }
            $('#route').html('');
            for (var i = 0; i < msg.d.length; i++) {
                var ar = msg.d[i];
                $('#route').append('<option value="' + ar.id + '">' + ar.abbr + ': ' + ar.name + '</option>');
            }
            if (localStorage.id !== undefined) {
                $('#route').val(localStorage.id);
                app.getV(localStorage.id);
            } else {
                $('#route').prepend('<option selected disabled>[tap here]</option>');
                map.setView([37.702222, -121.935833], 12);
            }
        }).fail(function () {
            swal('Error', 'An An error has occured.', 'error');
        });
    },
    getV: function(id) {
        $.ajax({
              type: "POST",
              url: 'http://webwatch.lavta.org/tmwebwatch/GoogleMap.aspx/getVehicles',
              contentType: "application/json; charset=utf-8",
              data: JSON.stringify({ routeID: id }),
              dataType: "json",
              statusCode: {
                  500: function() {
                      swal('Error', 'Route not currently running. Try again later.', 'error');
                  }
              }
        }).done(function (msg) {
            if (msg.d == null || msg.d.length == 0) {
                swal('Warning', 'No bus is currently running for this route. Try again later.', 'warning');
            } else {
                for (var i = 0; i < lIds.length; i++) {
                    map.removeLayer(lIds[i]);
                }
            }
            var points = {};
            for (var i = 0; i < msg.d.length; i++) {
                var ar = msg.d[i];
                var geojson = [
                  {
                    type: 'Feature',
                    geometry: {
                      type: 'Point',
                      coordinates: [ar.lon, ar.lat]
                    },
                    properties: {
                      'title': 'Route ' + ar.routeAbbr + ': ' + ar.routeName,
                      'description': 'Next Stop: ' + ar.nextStop + '<br>Vehicle Number: ' + ar.propertyTag + '<br>On time: ' + ((ar.adherence <= 0) ? Math.abs(ar.adherence) + ' minutes late' : ar.adherence + ' minutes early') + '<br>Direction: ' + ar.directionName,
                      'marker-color': '#3ca0d3',
                      'marker-size': 'large',
                      'marker-symbol': 'bus'
                    }
                }];
                var l = L.mapbox.featureLayer().setGeoJSON(geojson).addTo(map);
                lIds.push(l);
                points[l._leaflet_id] = {latitude: ar.lat, longitude: ar.lon};
            }
            //TODO store location as variable
            navigator.geolocation.getCurrentPosition(function (p) {
                console.log(points);
                var c = geolib.findNearest({latitude: p.coords.latitude, longitude: p.coords.longitude}, points, 0);
                map.setView([c.latitude, c.longitude], 13);
            }, function (e) {
                console.log('Error while retrieving location:');
                console.log(e);
                var c = geolib.findNearest({latitude: 37.702222, longitude: -121.935833}, points, 0);
                map.setView([c.latitude, c.longitude], 13);
            }, {timeout: 750});
            app.getStops(id);
        }).fail(function () {
            swal('Error', 'An error has occured.', 'error');
        });
    },
    getStops: function (id) {
        $.ajax({
              type: "POST",
              url: 'http://webwatch.lavta.org/tmwebwatch/GoogleMap.aspx/getStops',
              contentType: "application/json; charset=utf-8",
              data: JSON.stringify({ routeID: id }),
              dataType: "json",
              statusCode: {
                  500: function() {
                      swal('Error', 'Route not currently running. Try again later.', 'error');
                  }
              }
        }).done(function (msg) {
            if (msg.d == null || msg.d.length == 0) {
                swal('Warning', 'No stops found for this route. Try again later.', 'error');
            } else {
                for (var i = 0; i < sIds.length; i++) {
                    map.removeLayer(sIds[i]);
                }
            }
            for (var i = 0; i < msg.d.length; i++) {
                var ar = msg.d[i];
                var geojson = [
                  {
                    type: 'Feature',
                    geometry: {
                      type: 'Point',
                      coordinates: [ar.lon, ar.lat]
                    },
                    properties: {
                      'title': 'Stop #' + ar.stopNumber + ': ' + ar.stopName,
                      'description': 'Direction: ' + ar.directionName,
                      'marker-color': '#d33c3c',
                      'marker-size': 'small',
                      'marker-symbol': 'roadblock',
                    }
                }];
                var l = L.mapbox.featureLayer().setGeoJSON(geojson).addTo(map);
                sIds.push(l);
            }
            app.getTrace(id);
        });
    },
    getTrace: function (id) {
        $.ajax({
              type: "POST",
              url: 'http://webwatch.lavta.org/tmwebwatch/GoogleMap.aspx/getRouteTrace',
              contentType: "application/json; charset=utf-8",
              data: JSON.stringify({ routeID: id }),
              dataType: "json",
              statusCode: {
                  500: function() {
                      swal('Error', 'Route not currently running. Try again later.', 'error');
                  }
              }
        }).done(function (msg) {
            if (msg.d == null || msg.d.length == 0) {
                swal('Warning', 'No trace found for this route. Try again later.', 'error');
            } else {
                for (var i = 0; i < pIds.length; i++) {
                    map.removeLayer(pIds[i]);
                }
            }
            for (var i = 0; i < msg.d.polylines.length; i++) {
                var ar = msg.d.polylines[i];
                var poly = L.polyline(ar, {color: msg.d.penColor}).addTo(map);
                pIds.push(poly);
            }
        });
    }
};
app.initialize();

//  HANDLERS
$('#route').change(function () {
    var i = $('#route option:selected').val();
    localStorage.id = i;
    app.getV(i);
    //TODO add stop times (for v2?)
});

setInterval(app.getR, 20000);
