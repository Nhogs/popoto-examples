// get csv line from file:
LOAD CSV WITH HEADERS FROM "https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv" AS line
return line

// Create unique constraints
CREATE CONSTRAINT ON (social:`Social`) ASSERT social.id IS UNIQUE;
CREATE CONSTRAINT ON (year:`Year`) ASSERT year.value IS UNIQUE;
CREATE CONSTRAINT ON (owner:`Owner`) ASSERT owner.name IS UNIQUE;
CREATE CONSTRAINT ON (price:`Price`) ASSERT price.value IS UNIQUE;
CREATE CONSTRAINT ON (locality:`Locality`) ASSERT locality.value IS UNIQUE;
CREATE CONSTRAINT ON (region:`Region`) ASSERT region.code IS UNIQUE;
CREATE CONSTRAINT ON (country:`Country`) ASSERT country.code IS UNIQUE;
CREATE CONSTRAINT ON (neighborhood:`Neighborhood`) ASSERT neighborhood.name IS UNIQUE;

// create all node with properties if defined
LOAD CSV WITH HEADERS FROM "https://nhogs.github.io/popoto-examples/factual/csv/us_restaurants_sample.csv" AS row
MERGE (node:Social {id: row.factual_id})

// Set properties only if not empty in csv file
FOREACH(i IN CASE WHEN trim(row.name) <> "" THEN [1] ELSE [] END | SET node.name = row.name)
FOREACH(i IN CASE WHEN trim(row.address) <> "" THEN [1] ELSE [] END | SET node.address = row.address)
FOREACH(i IN CASE WHEN trim(row.address_extended) <> "" THEN [1] ELSE [] END | SET node.address_extended = row.address_extended)
FOREACH(i IN CASE WHEN trim(row.postcode) <> "" THEN [1] ELSE [] END | SET node.postcode = row.postcode)
FOREACH(i IN CASE WHEN trim(row.po_box) <> "" THEN [1] ELSE [] END | SET node.po_box = row.po_box)
FOREACH(i IN CASE WHEN trim(row.locality) <> "" THEN [1] ELSE [] END | SET node.locality = row.locality)
FOREACH(i IN CASE WHEN trim(row.tel) <> "" THEN [1] ELSE [] END | SET node.tel = row.tel)
FOREACH(i IN CASE WHEN trim(row.fax) <> "" THEN [1] ELSE [] END | SET node.fax = row.fax)
FOREACH(i IN CASE WHEN trim(row.website) <> "" THEN [1] ELSE [] END | SET node.website = row.website)
FOREACH(i IN CASE WHEN trim(row.email) <> "" THEN [1] ELSE [] END | SET node.email = row.email)
FOREACH(i IN CASE WHEN trim(row.longitude) <> "" THEN [1] ELSE [] END | SET node.longitude = toFloat(row.longitude))
FOREACH(i IN CASE WHEN trim(row.latitude) <> "" THEN [1] ELSE [] END | SET node.latitude = toFloat(row.latitude))

// Set additional labels based on category_ids
FOREACH(i IN CASE WHEN row.category_ids contains '107' THEN [1] ELSE [] END | SET node:`Landmark`)
FOREACH(i IN CASE WHEN row.category_ids contains '312' THEN [1] ELSE [] END | SET node:`Bar`)
FOREACH(i IN CASE WHEN row.category_ids contains '313' THEN [1] ELSE [] END | SET node:`Bar`:`Hotel Lounge`)
FOREACH(i IN CASE WHEN row.category_ids contains '315' THEN [1] ELSE [] END | SET node:`Bar`:`Sport`)
FOREACH(i IN CASE WHEN row.category_ids contains '316' THEN [1] ELSE [] END | SET node:`Bar`:`Wine`)
FOREACH(i IN CASE WHEN row.category_ids contains '339' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Bagel and Donut`)
FOREACH(i IN CASE WHEN row.category_ids contains '340' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Bakery`)
FOREACH(i IN CASE WHEN row.category_ids contains '342' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Cafe or Tea House`)
FOREACH(i IN CASE WHEN row.category_ids contains '343' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Dessert`)
FOREACH(i IN CASE WHEN row.category_ids contains '344' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Ice Cream Parlor`)
FOREACH(i IN CASE WHEN row.category_ids contains '346' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Juice Bar and Smoothie`)
FOREACH(i IN CASE WHEN row.category_ids contains '347' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`)
FOREACH(i IN CASE WHEN row.category_ids contains '348' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`American`)
FOREACH(i IN CASE WHEN row.category_ids contains '349' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Barbecue`)
FOREACH(i IN CASE WHEN row.category_ids contains '351' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Burger`)
FOREACH(i IN CASE WHEN row.category_ids contains '352' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Chinese`)
FOREACH(i IN CASE WHEN row.category_ids contains '353' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Deli`)
FOREACH(i IN CASE WHEN row.category_ids contains '354' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Diner`)
FOREACH(i IN CASE WHEN row.category_ids contains '355' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Fast Food`)
FOREACH(i IN CASE WHEN row.category_ids contains '356' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`French`)
FOREACH(i IN CASE WHEN row.category_ids contains '357' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Indian`)
FOREACH(i IN CASE WHEN row.category_ids contains '358' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Italian`)
FOREACH(i IN CASE WHEN row.category_ids contains '359' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Japanese`)
FOREACH(i IN CASE WHEN row.category_ids contains '360' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Korean`)
FOREACH(i IN CASE WHEN row.category_ids contains '361' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Mexican`)
FOREACH(i IN CASE WHEN row.category_ids contains '362' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Middle Eastern`)
FOREACH(i IN CASE WHEN row.category_ids contains '363' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Pizza`)
FOREACH(i IN CASE WHEN row.category_ids contains '364' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Seafood`)
FOREACH(i IN CASE WHEN row.category_ids contains '365' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Steakhouse`)
FOREACH(i IN CASE WHEN row.category_ids contains '366' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Sushi`)
FOREACH(i IN CASE WHEN row.category_ids contains '367' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Thai`)
FOREACH(i IN CASE WHEN row.category_ids contains '368' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Vegan and Vegetarian`)
FOREACH(i IN CASE WHEN row.category_ids contains '457' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Asian`)
FOREACH(i IN CASE WHEN row.category_ids contains '458' THEN [1] ELSE [] END | SET node:`Food and Dining`:`Restaurant`:`Food Truck`)

