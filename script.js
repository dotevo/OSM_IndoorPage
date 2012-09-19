var map;	/* map */
var buildings;	/* buildings layer */
var mp;		/* projection */
var select;	/* Control: selection feature */

/**************************************
		jQuery
**************************************/

$.ui.autocomplete.prototype._renderMenu = function( ul, items ) {
   var self = this;
   $.each( items, function( index, item ) {
      if (index < 5) // here we define how many results to show
         {self._renderItem( ul, item );}
      });
}


/**************************************
		INDOOR
**************************************/

//Variables
var floors=null;	/* Building */
var indoorLayer=null;		/* Indoor layer */


//BUILDING STYLE
var styleIndoor = new OpenLayers.Style({
                label: "", labelSize: "2px2px"},{
                rules: [
                new OpenLayers.Rule({
                        evaluate: function(feature){return feature.attributes.type=='shell';},
                        symbolizer: {
                                strokeColor: "#AAAAAA",fillOpacity: 1, fillColor: "#AAAAAA", graphicZIndex: 4
                        }
                }),
		new OpenLayers.Rule({
                        evaluate: function(feature){return feature.attributes.tags.buildingpart=='corridor';},
                        symbolizer: {
                                strokeColor: "#BBBBBB",fillOpacity: 1, fillColor: "#BBBBBB", graphicZIndex: 5
                        }
                }),
		new OpenLayers.Rule({
                        evaluate: function(feature){return feature.attributes.tags.buildingpart=='verticalpassage';},
                        symbolizer: {
                                strokeColor: "#BB3333",fillOpacity: 1, fillColor: "#BB3333", graphicZIndex: 7
                        }
                }),

                new OpenLayers.Rule({
                        elseFilter: true,
                        symbolizer: {
                                fillOpacity: 1 , strokeColor: "#235599", fillColor: "#3477BB", graphicZIndex:  6
                        }
                } )]} );


var selectStyleIndoor = new OpenLayers.Style({
                label: "${name}", labelSize: "2px"},{
                rules: [
                new OpenLayers.Rule({
                        evaluate: function(feature){return feature.attributes.type=='shell';},
                        symbolizer: {
                                strokeColor: "#AAAAAA",fillOpacity: 1, fillColor: "#AAAAAA", graphicZIndex: 4
                        }
                }),
		new OpenLayers.Rule({
                        evaluate: function(feature){return feature.attributes.tags.buildingpart=='corridor';},
                        symbolizer: {
                                strokeColor: "#BBBBBB",fillOpacity: 1, fillColor: "#BBBBBB", graphicZIndex: 5
                        }
                }),
		new OpenLayers.Rule({
                        evaluate: function(feature){return feature.attributes.tags.buildingpart=='verticalpassage';},
                        symbolizer: {
                                strokeColor: "#BB3333",fillOpacity: 1, fillColor: "#BB3333", graphicZIndex: 7
                        }
                }),
                new OpenLayers.Rule({
                        elseFilter: true,
                        symbolizer: {
                                fillOpacity: 1 , strokeColor: "#235599", fillColor: "#7720BB", graphicZIndex:  6
                        }
                } )]} );


//Change building on layer
function setIndoorLayer(floor){
        if(floors==null) return;

	indoorLayer.removeAllFeatures();

        var geojson_format = new OpenLayers.Format.GeoJSON();
	indoorLayer.addFeatures(geojson_format.read(floor));
}

//Get index of floor
function getFloorsNameIdx(){
        if(floors==null) return;
        var ret=[];
        for(var i=0;i<floors.length;i++){
                var n=floors[i].name.split("_");
                ret.push({"id":i, "floor": n[1]});
        }
        ret.sort(function(a,b){return a.floor-b.floor});
        return ret;
}


//--- AUTOCOMPLITE ---///

function buildIndoorAutocomplit(){
	$( "#search" ).autocomplete('destroy');
	var tags=[];
	$.each(floors,function() {
                        var ths = this;                        
                        for(var i=0;i<this.features.length;i++){
                                if(typeof this.features[i].properties.name=="string" && this.features[i].properties.name.length>3){
                                        tags.push(this.features[i].properties.name);
                                }
                        }
 	});
	$( "#search" ).autocomplete({
                        source: tags,
			search: function(event,ui){ 
				buildIndoorList();
			}
        });
}

function clearSearch(){
	$("#search").val('');
	buildIndoorList();
}

//--- ACCORDION --//

function buildIndoorList(){
	$('#listBox').accordion('destroy');
        $('#listBox').empty();
        /* BUILD MENU */
	var value=document.getElementById('search').value.toLowerCase();
	var fl=0;
        $.each(floors,function() {
			fl++;
                        var ths = this;
                        var points="";
			var count=0;
			for(var i=0;i<this.features.length;i++){
				if(typeof this.features[i].properties.name=="string" && this.features[i].properties.name.length>3 && this.features[i].properties.name.toLowerCase().search(value) != -1){
					points=points+"<a href=\"#\" onclick=\"selectRoom("+fl+","+i+");\">"+this.features[i].properties.name+"</a><br/>";
					count++;
				}
                        }
 
                        $('#listBox').append($('<h3 />', {
                                html: '<a href="#">'+ths.name+' Results:'+count+'</a>'
                                })
                                .click(function() {
                                        setIndoorLayer(ths)
                                        })
                                        )
                                .append($('<div/>', { 
                                             html: points
                                              })
                                             )
			
                });


        $( "#listBox" ).accordion({ autoHeight: false });
        $('[aria-selected="true"]').click();
}

function selectRoom(floorNo,RoomIdx){
	select.unselectAll();
	select.select(indoorLayer.features[RoomIdx]);
}

function makeBuilding(indoorJSON){
	if(indoorJSON==null) return;
	floors=[];
	for(var i=0;i<indoorJSON.features.length;i++){
		var ex=1;
		for(var j=0;j<floors.length;j++){
			if(floors[j].name == indoorJSON.features[i].properties.floor){
				ex=0;
				if(indoorJSON.features[i].properties.tags.name != undefined )
					indoorJSON.features[i].properties.name = indoorJSON.features[i].properties.tags.name;
				else
					indoorJSON.features[i].properties.name = "";

				floors[j].features.push(indoorJSON.features[i]);
			}
		}
		if(ex==1){
			var newFloor={"type":"FeatureCollection",'name': indoorJSON.features[i].properties.floor,
				 'features': []}
			//Add room
			newFloor.features.push(indoorJSON.features[i]);
			floors.push(newFloor);
		}
	}
	
	for(var i=0;i<floors.length;i++){
		floors[i].features.sort(function(a,b){return a.properties.name>b.properties.name;});
	}

	buildIndoorList();
	buildIndoorAutocomplit();
}

function floorhandler(id) {
	var selectid = id;

	$.getJSON('getbuilding.php?id='+selectid, function(data){
		makeBuilding(data);
	});
}



/************************
	EVENTS
*************************/
function featureSelect(feature) {
	floorhandler(feature.attributes.id)
	console.log(feature);
}

function featureUnselect(feature) {
}


/**************************************
		INIT
**************************************/


$(document).ready(function(){
	var gg = new OpenLayers.Projection("EPSG:4326");
	mp = new OpenLayers.Projection("EPSG:900913");
	var fullext = new OpenLayers.Bounds(100000,100000,900000,850000);
	//var center = new OpenLayers.LonLat(19.5, 52.1).transform(gg,mp);
	//var center = new OpenLayers.LonLat(17.015, 51.094).transform(gg,mp);
	var options = {projection: mp,units: "m",maxExtent:fullext, 
			controls:[new OpenLayers.Control.Navigation(),
                        new OpenLayers.Control.PanZoomBar(),
                        new OpenLayers.Control.LayerSwitcher({'ascending':false}),
                        new OpenLayers.Control.Permalink(),
                        new OpenLayers.Control.ScaleLine(),
                        new OpenLayers.Control.Permalink('permalink'),
                        new OpenLayers.Control.MousePosition(),
                        new OpenLayers.Control.OverviewMap(),
                        new OpenLayers.Control.KeyboardDefaults()]
			};
	map = new OpenLayers.Map("map-id", options);   
	var osm = new OpenLayers.Layer.OSM();

	buildings = new OpenLayers.Layer.Vector("Budynki", {
		strategies: [new OpenLayers.Strategy.BBOX()],
		protocol: new OpenLayers.Protocol.HTTP({
		url: "getbuilding.php",
		format: new OpenLayers.Format.GeoJSON()
		}),projection:mp});

	indoorLayer = new OpenLayers.Layer.Vector("Piętro",
		{projection:mp,
		styleMap: new OpenLayers.StyleMap({'default': styleIndoor,
                         'select': selectStyleIndoor}),
		rendererOptions: { zIndexing: true }});

	map.addLayers([osm,buildings,indoorLayer]);

	select = new OpenLayers.Control.SelectFeature([buildings,indoorLayer],
		{onSelect: this.featureSelect, onUnselect:this.featureUnselect});
	
	map.addControl(select);
	select.activate();

	buildings.events.on({"featureselected": function(e) {featureSelect(e.feature)}});
	indoorLayer.events.on({"featureselected": function(e) {featureSelect(e.feature)}});

});
