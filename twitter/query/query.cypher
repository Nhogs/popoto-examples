// cree les relations directes des reponses entre user
MATCH (u2:User)<-[:TWEETED_BY]-(reply:Tweet)-[:REPLIED_TO]->(t:Tweet)-[:TWEETED_BY]->(u1:User) WHERE u1 <> u2 MERGE (u2)-[:DIRECT_REPLY]->(u1)
// cree les relations directes des mentions entre user
MATCH (u2:User)<-[:MENTIONS]-(t:Tweet)-[:TWEETED_BY]->(u1:User) WHERE u1 <> u2  MERGE (u1)-[:DIRECT_MENTION]->(u2)
// cree les relations directes des retweet entre user
MATCH (u2:User)<-[:RETWEETED_BY]-(t:Tweet)-[:TWEETED_BY]->(u1:User) WHERE u1 <> u2  MERGE (u2)-[:DIRECT_RETWEET]->(u1)


// cree les relations indirectes entre les user qui on tweeté un même Hashtag (la contrainte id(u1)<id(u2) permet juste d'éviter de creer la relation dans les deux sens)
MATCH (u2:User)<-[:TWEETED_BY]-(t2:Tweet)-[:TAGS]->(ht:Hashtag)<-[:TAGS]-(t:Tweet)-[:TWEETED_BY]->(u1:User) WHERE id(u1)<id(u2) MERGE (u2)-[:INDIRECT_HASHTAG]->(u1)

// cree les relations indirectes entre les user qui on tweeté une même Url
MATCH (u2:User)<-[:TWEETED_BY]-(t2:Tweet)-[:LINKS]->(url:Url)<-[:LINKS]-(t:Tweet)-[:TWEETED_BY]->(u1:User) WHERE id(u1)<id(u2) MERGE (u2)-[:INDIRECT_URL]->(u1)

// cree les relations indirectes entre les user qui on tweeté plus de trois Stem identiques
MATCH (t1:Tweet)-[:TWEETED_BY]->(u1:User),(t2:Tweet)-[:TWEETED_BY]->(u2:User), (t1)-[:HAS]->(s1:Stem)<-[:HAS]-(t2),(t1)-[:HAS]->(s2:Stem)<-[:HAS]-(t2),(t1)-[:HAS]->(s3:Stem)<-[:HAS]-(t2)  WHERE id(u1)<id(u2) AND s1.text > s2.text > s3.text MERGE (u2)-[:INDIRECT_STEM]->(u1)