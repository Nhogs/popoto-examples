# change-query-root

Example of [Popoto.js](https://github.com/Nhogs/popoto) use with dynamic query root change experimentation.

[![Main screenshot](https://nhogs.github.io/popoto-examples/change-query-root/screen/main.png "Main screenshot")](https://nhogs.github.io/popoto-examples/change-query-root/index.html)

In this example the idea is to get current graph schema, modify the data, change the root node and reset the graph: 

```javascript
function changeQueryRoot() {

    // Get current graph schema
    var graph = popoto.graph.getSchema();

    // Change graph root to a random relation around actual root node
    if (graph.hasOwnProperty("rel") && graph.rel.length > 0) {

        // Remove a random branch from actual root node in graph
        var removedRandomBranch = graph.rel.splice(Math.floor(Math.random() * graph.rel.length), 1)[0];

        // Set the first target of thi branch as newRoot
        var newRoot = removedRandomBranch.target;

        // Add previously pruned graph as a branch and change the isReverse property if crossed in reverse order
        if (newRoot.rel === undefined) {
            newRoot.rel = []
        }
        newRoot.rel.push(
            {
                label: removedRandomBranch.label,
                isReverse: removedRandomBranch.isReverse !== true,
                target: graph
            }
        );

        // Reset graph
        popoto.graph.mainLabel = newRoot;
        popoto.tools.reset();
    }
}
```

[Live version here](https://nhogs.github.io/popoto-examples/change-query-root/index.html)
