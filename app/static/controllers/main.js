var myApp = angular.module('myApp', ['ui.bootstrap', 'chart.js', 'rzModule']);

myApp.controller('MainController', function MainController($scope, $http, $compile){
    $scope.mymap = L.map('mapid').setView([36.7783, -119.4179], 3);
    $scope.lcoeIn = {
        size_kw: 1000,
        esc: 0.02,
        yield_yr1: 1600,
        lifespan: 35,
        degredation: 0.0025,
        soiling_yield_impact: 0.10,
        coating_yield_impact: 0.04,
        coating_om_impact: 0.3,
        coating_cost_per_m2: 5.00,
        coating_year: 4,
        module_watts: 300.0,
        module_area: 1.64007472
    }
    $scope.lcoeOut = {};
    $scope.regions = null;
    $scope.region_info = null;

    $scope.onSlider = function(sliderId, modelValue, highValue, pointerType){
        updateLCOE();
    }

    L.tileLayer(
        'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYXVzdGVuNTIwIiwiYSI6ImNqMHg2M3VjYTAwNnAyd3FkbnVkb3JoMm4ifQ.p3t6Jx6BXlGlaHZWPn8Scg',
        {}).addTo($scope.mymap);


    // Add carto map
    cartodb.createLayer($scope.mymap, 'https://amarinusha.carto.com/api/v2/viz/93bc65c4-1cb7-11e7-b095-0e98b61680bf/viz.json')
        .addTo($scope.mymap)
        .on('done', function(layer) {
            $scope.layerControl.addBaseLayer(layer, "Climate Zones")
            layer.setInteraction(true);
            layer.on('featureOver', function(e, latlng, pos, data) {
                // cartodb.log.log(e, latlng, pos, data);
            });
            layer.on('error', function(err) {
                cartodb.log.log('error: ' + err);
            });
        })
        .on('error', function(err) {
            cartodb.log.log("some error occurred");
        });

    cartodb.createLayer($scope.mymap, 'https://amarinusha.carto.com/api/v2/viz/e7531484-1cbd-11e7-94b5-0e3ebc282e83/viz.json')
        .addTo($scope.mymap)
        .on('done', function(layer) {
            $scope.layerControl.addBaseLayer(layer, " Daily Soiling Loss %")
            layer.setInteraction(true);
            layer.on('featureOver', function(e, latlng, pos, data) {
                // cartodb.log.log(e, latlng, pos, data);
            });
            layer.on('error', function(err) {
                cartodb.log.log('error: ' + err);
            });
        })
        .on('error', function(err) {
            cartodb.log.log("some error occurred");
        });

    cartodb.createLayer($scope.mymap, 'https://amarinusha.carto.com/api/v2/viz/4171e4b8-1cbe-11e7-8be9-0e3ff518bd15/viz.json')
        .addTo($scope.mymap)
        .on('done', function(layer) {
            $scope.layerControl.addBaseLayer(layer, "Solar Yield")
            layer.setInteraction(true);
            layer.on('featureOver', function(e, latlng, pos, data) {
                // cartodb.log.log(e, latlng, pos, data);
            });
            layer.on('error', function(err) {
                cartodb.log.log('error: ' + err);
            });
        })
        .on('error', function(err) {
            cartodb.log.log("some error occurred");
        });

    //
    // Create info overlay box
    $scope.info_overlay = L.control();
    $scope.layerControl = L.control.layers(null, {}, {'position': 'topleft'});
    $scope.layerControl.addTo($scope.mymap);

    $scope.info_overlay.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    $scope.info_overlay.update = function (props) {
        var text = '<h4>Hover over a region</h4>';
        if (props){
            // Generate HTML from data in props
        }

        this._div.innerHTML = text;
    };

    // $scope.info_overlay.addTo($scope.mymap); // add info overlay box to map

    function highlightRegion(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        $scope.info_overlay.update(layer.feature.properties);
    }

    function addRegionPopup(feature, layer) {
        // Create "details" popup
        var detailsPopupHTML = "\
        <div id='details-popup' class='panel panel-info'>\
            <div class='panel-heading'>\
            <h3 class='panel-title'>Details</h3>\
            </div>\
            <div ng-repeat='(title, subprop) in properties'>\
                <h3 style='margin-left: 5px'>{{title}}</h3>\
                <table class='table'>\
                    <tr ng-repeat='(key, value) in subprop'>\
                        <td><strong>{{key}}</strong></td><td>{{value}}</td>\
                    </tr>\
                </table>\
            </div>\
            <div class='panel-body'>\
        </div>\
        </div>\
        "

        var detailsPopupHTML = detailsPopupHTML;
        var linkFunction = $compile(angular.element(detailsPopupHTML));
        var newScope = $scope.$new();

        var props = feature.properties;

        newScope.properties = {}
        newScope.properties["Placeholder"] = {}

        layer.bindPopup(linkFunction(newScope)[0]);
    }

    function onEachRegionFeature(geojson_name) {
        var resetHighlight = function(e) {
            $scope[geojson_name].resetStyle(e.target);
            $scope.info_overlay.update();
        }

        var f = function(feature, layer){
            layer.on({
                mouseover: highlightRegion,
                mouseout: resetHighlight
            });
        }

        return f;
    }


    function style_region(feature) {
        var props = feature.properties;
        var rural_density = (props.rural_pop_density - props.min_rural_pop_density)/(props.max_rural_pop_density - props.min_rural_pop_density);

        var r = parseInt(255-rural_density*255);
        var g = parseInt(255-rural_density*255);
        var b = parseInt(255-rural_density*102);
        if(_.isNaN(rural_density)){
            return {
                opacity: 0.0,
                fillColor: 'rgb('+255+','+255+','+255+')',
                weight: 0,
                fillOpacity: 0
            }
        }
        return {
            fillColor: 'rgb('+r+','+g+','+b+')',
            weight: 2,
            opacity: 1,
            color: '#C0C0C0',
            //dashArray: '3',
            fillOpacity: 0.65
        };
    }

    function load(){
        var columns = [];
        var regions_promise = $http.get("/api/regions/shapes").then(function(region_shapes){
            var data = region_shapes.data;

            $scope.regions = L.geoJSON(data, {
                style: style_region,
                onEachFeature: function(feature, layer){ onEachRegionFeature('regions')(feature, layer); addPopup(feature, layer); }
            });

            $scope.regions.addTo($scope.mymap);
            $scope.layerControl.addBaseLayer($scope.regions, "Regions");
        });

        var columns_promise = $http.get("/api/regions/data/"+columns.join("+")).then(function(region_data){
            $scope.region_info = region_data.data;

            function round(value, decimals) {
                return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
            }
        });
    }

    function updateLCOE(){

        $http.post("/api/lcoe", $scope.lcoeIn).then(function(result){
            // Copy results to scope and fix precision
            function fixPrecision(value, key, collection){
                if (_.isObject(value)){
                    _.forEach(value, fixPrecision);
                }else{
                    collection[key] = value.toFixed(4);
                }
            }
            _.forEach(result.data, fixPrecision);
            $scope.lcoeOut = result.data;
        });
        
    }

    updateLCOE();
    //load();
});
