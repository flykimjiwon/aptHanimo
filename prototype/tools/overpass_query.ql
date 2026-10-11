[out:json][timeout:120];
(
  way["highway"](37.5520,127.0100,37.5710,127.0420);
  node["highway"="crossing"](37.5520,127.0100,37.5710,127.0420);
  node["railway"="subway_entrance"](37.5520,127.0100,37.5710,127.0420);
  node["railway"="station"](37.5520,127.0100,37.5710,127.0420);
  node["amenity"~"^(school|kindergarten|hospital|clinic|doctors|pharmacy|childcare|university|library)$"](37.5520,127.0100,37.5710,127.0420);
  way["amenity"~"^(school|kindergarten|hospital|clinic|doctors|pharmacy|childcare|university|library)$"](37.5520,127.0100,37.5710,127.0420);
  node["shop"~"^(supermarket|convenience|mall|department_store)$"](37.5520,127.0100,37.5710,127.0420);
  way["shop"~"^(supermarket|convenience|mall|department_store)$"](37.5520,127.0100,37.5710,127.0420);
  node["leisure"~"^(park|playground)$"](37.5520,127.0100,37.5710,127.0420);
  way["leisure"~"^(park|playground)$"](37.5520,127.0100,37.5710,127.0420);
  way["building"](37.5540,127.0150,37.5680,127.0400);
  way["landuse"="residential"](37.5540,127.0150,37.5680,127.0400);
  way["landuse"="construction"](37.5520,127.0100,37.5710,127.0420);
  nwr["name"~"라체르보|행당7|왕십리자이"](37.5520,127.0100,37.5710,127.0420);
);
out body geom;
