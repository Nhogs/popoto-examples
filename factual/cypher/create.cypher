// get csv line from file:
LOAD CSV WITH HEADERS FROM "https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv" AS line
return line

// Create unique constraints
CREATE CONSTRAINT ON (social:`Social`) ASSERT social.id IS UNIQUE;
CREATE CONSTRAINT ON (year:`Year`) ASSERT year.value IS UNIQUE;
CREATE CONSTRAINT ON (owner:`Owner`) ASSERT owner.name IS UNIQUE;
CREATE CONSTRAINT ON (price:`PriceCategory`) ASSERT price.value IS UNIQUE;
CREATE CONSTRAINT ON (locality:`Locality`) ASSERT locality.value IS UNIQUE;
CREATE CONSTRAINT ON (region:`Region`) ASSERT region.code IS UNIQUE;
CREATE CONSTRAINT ON (country:`Country`) ASSERT country.code IS UNIQUE;
CREATE CONSTRAINT ON (neighborhood:`Neighborhood`) ASSERT neighborhood.id IS UNIQUE;

CREATE CONSTRAINT ON (chain:`Chain`) ASSERT chain.id IS UNIQUE;
CREATE CONSTRAINT ON (cuisine:`Cuisine`) ASSERT cuisine.name IS UNIQUE;
CREATE CONSTRAINT ON (founded:`Founded`) ASSERT founded.year IS UNIQUE;

// Create all node with properties if defined
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
MERGE (node:Social {id: row.factual_id})

// Set properties only if not empty in csv file
FOREACH(i IN CASE WHEN trim(row.name) <> '' THEN [1] ELSE [] END | SET node.name = row.name)
FOREACH(i IN CASE WHEN trim(row.address) <> '' THEN [1] ELSE [] END | SET node.address = row.address)
FOREACH(i IN CASE WHEN trim(row.address_extended) <> '' THEN [1] ELSE [] END | SET node.address_extended = row.address_extended)
FOREACH(i IN CASE WHEN trim(row.postcode) <> '' THEN [1] ELSE [] END | SET node.postcode = row.postcode)
FOREACH(i IN CASE WHEN trim(row.po_box) <> '' THEN [1] ELSE [] END | SET node.po_box = row.po_box)
FOREACH(i IN CASE WHEN trim(row.locality) <> '' THEN [1] ELSE [] END | SET node.locality = row.locality)
FOREACH(i IN CASE WHEN trim(row.region) <> '' THEN [1] ELSE [] END | SET node.region = row.region)
FOREACH(i IN CASE WHEN trim(row.country) <> '' THEN [1] ELSE [] END | SET node.country = row.country)
FOREACH(i IN CASE WHEN trim(row.tel) <> '' THEN [1] ELSE [] END | SET node.tel = row.tel)
FOREACH(i IN CASE WHEN trim(row.fax) <> '' THEN [1] ELSE [] END | SET node.fax = row.fax)
FOREACH(i IN CASE WHEN trim(row.website) <> '' THEN [1] ELSE [] END | SET node.website = row.website)
FOREACH(i IN CASE WHEN trim(row.email) <> '' THEN [1] ELSE [] END | SET node.email = row.email)
FOREACH(i IN CASE WHEN trim(row.longitude) <> '' THEN [1] ELSE [] END | SET node.longitude = toFloat(row.longitude))
FOREACH(i IN CASE WHEN trim(row.latitude) <> '' THEN [1] ELSE [] END | SET node.latitude = toFloat(row.latitude))
FOREACH(i IN CASE WHEN trim(row.rating) <> '' THEN [1] ELSE [] END | SET node.rating = toFloat(row.rating))

// Set additional labels based on category_ids
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '107' THEN [1] ELSE [] END | SET node:`Landmark`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '312' THEN [1] ELSE [] END | SET node:`Bar`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '313' THEN [1] ELSE [] END | SET node:`Bar`:`Hotel Lounge`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '315' THEN [1] ELSE [] END | SET node:`Bar`:`Sport`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '316' THEN [1] ELSE [] END | SET node:`Bar`:`Wine`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '339' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Bagel and Donut`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '340' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Bakery`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '342' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Cafe or Tea House`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '343' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Dessert`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '344' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Ice Cream Parlor`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '346' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Juice Bar and Smoothie`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '347' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '348' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`American`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '349' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Barbecue`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '351' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Burger`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '352' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Chinese`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '353' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Deli`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '354' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Diner`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '355' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Fast Food`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '356' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`French`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '357' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Indian`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '358' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Italian`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '359' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Japanese`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '360' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Korean`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '361' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Mexican`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '362' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Middle Eastern`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '363' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Pizza`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '364' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Seafood`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '365' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Steakhouse`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '366' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Sushi`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '367' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Thai`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '368' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Vegan and Vegetarian`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '457' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Asian`)
FOREACH(i IN CASE WHEN row.category_ids CONTAINS '458' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Food Truck`)

// Create FOUNDED_IN -> Year relations
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row
  WHERE row.founded <> ''
MERGE (node {id: row.factual_id})
MERGE (year:Year {value: row.founded})
MERGE (node)-[:FOUNDED_IN]->(year)

// Create OWNED_BY -> Owner relations
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row
  WHERE row.owner <> ''
MERGE (node {id: row.factual_id})
MERGE (owner:Owner {name: row.owner})
MERGE (node)-[:OWNED_BY]->(owner)

// Create HAS_PRICE_PER_PERSON -> Price relations
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row
  WHERE row.price <> ''
MERGE (node {id: row.factual_id})
MERGE (price:PriceCategory {value: row.price})
MERGE (node)-[:HAS_PRICE_PER_PERSON]->(price)

// Create RATED -> Rating relations
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row
  WHERE row.rating <> ''
MERGE (node {id: row.factual_id})
MERGE (rating:Rating{value: row.rating})
MERGE (node)-[:RATED]->(rating)

// Create LOCATED_IN -> Locality, Region, Country relations
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row
MERGE (node {id: row.factual_id})
MERGE (locality:Locality {name: row.locality})
MERGE (region:Region {code: row.region})
MERGE (country:Country {code: row.country})
MERGE (node)-[:LOCATED_IN]->(locality)
MERGE (locality)-[:LOCATED_IN]->(region)
MERGE (region)-[:LOCATED_IN]->(country)

// Create Neighborhood nodes
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row, split(replace(replace(replace(row.neighborhood,'[',''),']',''),'`',''), ';') AS neighborhoods
  WHERE row.neighborhood <> ''
UNWIND neighborhoods AS neighborhood
MERGE (node {id: row.factual_id})
MERGE (neig:Neighborhood {id: row.locality + neighborhood, name: neighborhood})
MERGE (locality:Locality {name: row.locality})
MERGE (node)-[:LOCATED_NEAR]->(neig)
MERGE (neig)-[:LOCATED_IN]->(locality)

// Create PART_OF -> Chain relations
LOAD CSV WITH HEADERS FROM 'https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv' AS row
WITH row
  WHERE row.chain_id <> ''
MERGE (node {id: row.factual_id})
MERGE (chain:Chain {id: row.chain_id, name: row.chain_name})
MERGE (node)-[:PART_OF]->(chain)
