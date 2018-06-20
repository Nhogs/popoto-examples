# add-relation-event

Example of [Popoto.js](http://popotojs.com/) application showing use of ```popoto.graph.Events.GRAPH_NODE_RELATION_ADD``` event fired when a new relation is added.

In this customization example when a relation is added all the other one on the same node are removed.

```javascript
    // Add a listener on new relation added
    popoto.graph.on(popoto.graph.Events.GRAPH_NODE_RELATION_ADD, function (relations) {
        var newRelation = relations[0];

        // Collapse all expanded choose nodes first to avoid having value node in selection.
        popoto.graph.node.collapseAllNode();

        var linksToRemove = popoto.dataModel.links.filter(function (link) {
            // All other links starting from same source node except new one.
            return link !== newRelation && link.source === newRelation.source;
        });

        linksToRemove.forEach(function (link) {
            var willChangeResults = popoto.graph.node.removeNode(link.target);
            popoto.result.hasChanged = popoto.result.hasChanged || willChangeResults;
        });

        popoto.update();
    });
```

[![Main screenshot](https://nhogs.github.io/popoto-examples/add-relation-event/screen/main.png "Main screenshot")](https://nhogs.github.io/popoto-examples/add-relation-event/index.html)

[Live version here](https://nhogs.github.io/popoto-examples/add-relation-event/index.html)
