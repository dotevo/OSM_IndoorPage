CREATE OR REPLACE FUNCTION unnest_rel_members(ANYARRAY) RETURNS 
SETOF ANYARRAY
LANGUAGE SQL AS $$SELECT regexp_matches( array_to_string($1,','), E'([wrn])(\\d+),([a-z0-9_\-]+)','g');
$$;


CREATE OR REPLACE FUNCTION way_geometry(Integer) RETURNS
geometry
LANGUAGE SQL AS $$SELECT ST_MakeLine(ST_POINT( cast(lon as real)/100,cast (lat as real)/100)) FROM
 planet_osm_nodes INNER JOIN (SELECT unnest(nodes) as node FROM planet_osm_ways WHERE id = $1) As nodes ON (node=id);$$;

CREATE TABLE indoor( id bigint );
