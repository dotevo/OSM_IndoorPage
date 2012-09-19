<?php
/* Get values:
 @id id of relation.
 OR
 @bbox
*/

	/* Config */
	include_once("config.php");
	/* Connection */
	$dbconn = pg_connect (BUILDING_CONNECTION);
	if (!$dbconn) {
		echo("Error in connection: " . pg_last_error());
	}

	if(isset($_GET['bbox'])){
		$bbox = pg_escape_string($_GET['bbox']);
		list($bbox_west, $bbox_south, $bbox_east, $bbox_north) = explode(",", $bbox);

		if (!isset ($_GET['srid'])) {
			$srid = '4326';
		} else{
			$srid = pg_escape_string($_GET['srid']);
		}
		$sql  =" select id,*,st_asgeojson(geom) AS geojson FROM (";
		$sql .="select ( ";
		//Make polygon from members polygons 
		$sql .="SELECT ST_UNION(array_agg(ST_MakePolygon(way_geometry(cast (z.member[2] as int))))) FROM ( ";
		//Get members of level_0
			$sql .= "SELECT unnest_rel_members(members) as member FROM planet_osm_rels WHERE id = cast(n.member[2] as int) ";
		$sql .= ") ";

		$sql .= "As z WHERE z.member[1]='w') as geom,* "; 
		$sql .= "FROM (";
			//Get members of type=building where level_0
			$sql .= " select unnest_rel_members(members) as member,tags,id from planet_osm_rels ";
			$sql .= " where array_to_string(tags,',') like '%type,building%' AND array_to_string(members,',') like '%level_0%' AND id IN (SELECT id FROM indoor) ";
			//End
		$sql .= ") As n "; 
		$sql .= "WHERE n.member[3]='level_0' ";
		$sql .= ") as gable";  
//		echo $sql;
 
		# Try query or error
		$rs = pg_query($dbconn, $sql);
                if(!$rs) {
                die( pg_last_error());
                }
                $geojson = array(
                 'type'      => 'FeatureCollection',
                 'features'  => array()
                 );
while($row=pg_fetch_assoc($rs)) {  
	  $feature = array(
          'type' => 'Feature',
          'properties' => array('id' => $row['id']),
          'geometry' => json_decode($row['geojson'], true),      
          );
          
       // Add feature array to feature collection array
       array_push($geojson['features'], $feature);
    }

	}else if(isset($_GET['id'])){
		$id = pg_escape_string($_GET['id']);

		/* GET FLOORS */
		$sql  = "SELECT floor,member[3] as type,st_asgeojson(ST_MakePolygon(way_geometry(cast (member[2] as Integer)))) as geojson";
		$sql .= ",";
		//Get tags
		$sql .= "array_to_string((Select tags FROM planet_osm_ways WHERE id = cast (member[2] as Integer)), '^') as tags ";
		$sql .= "FROM (";
		$sql .= "SELECT member[3] as floor,unnest_rel_members(members) As member FROM planet_osm_rels INNER JOIN ( ";
		//members
		$sql .= "SELECT unnest_rel_members(members) As member FROM planet_osm_rels WHERE id = $id ";
		$sql .= ") As p ON ( cast(p.member[2] as integer) = id)) As z;";

		# Try query or error
                $rs = pg_query($dbconn, $sql);

		if(!$rs) {
                	die( pg_last_error());
                }

                $geojson = array(
                 'type'      => 'FeatureCollection',
                 'features'  => array()
                 );

		while($row=pg_fetch_assoc($rs)) {
			$tags=null;
			
			$tagArray=explode("^",$row['tags']);
			for($i=0;$i<count($tagArray)+1;$i+=2){
				$tags[$tagArray[$i]] = $tagArray[$i+1];
			}
			$feature = array(
			'type' => 'Feature',
			'properties' => array('floor' => $row['floor'], 'type' => $row['type'], 'tags' => $tags),
			'geometry' => json_decode($row['geojson'], true),
			);

			// Add feature array to feature collection array
			array_push($geojson['features'], $feature);
		}

	}


	/* Close connection */
	pg_close($dbconn);
	/* Print result */
	header('Content-type: application/json',true);
	echo json_encode($geojson); 
?>
