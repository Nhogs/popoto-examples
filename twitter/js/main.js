autocomplete = (function () {
    'use strict';

    var self = {};

    var instances = {};

    self.getInstance = function (id) {
        return instances[id];
    };

    self.generateSearchQuery = function (label, relPath, limit) {
        var displayAttr = popoto.provider.node.getDisplayAttribute(label);
        var returnAttributes = popoto.provider.node.getReturnAttributes(label);
        var query = "MATCH (n:`" + label + "`) WHERE toLower(n." + displayAttr + ") contains $term OPTIONAL MATCH p=(n)" + relPath + " ";
        var sep = "";
        var attributes = returnAttributes.reduce(function (a, attr) {
            var res = a + sep + attr + ":n." + attr;
            sep = ", ";
            return res;
        }, "");

        return query + " RETURN {label:\"" + label + "\", count:count(p), type:type(r), attributes:{" + attributes + "}} AS res ORDER BY res.count DESC LIMIT " + limit;
    };

    self.create = function (id, config) {
        var unions = [];
        unions = config.searches.map(function (search) {
            return self.generateSearchQuery(search.label, search.relPath, search.limit);
        });

        var instance = new autoComplete({
            selector: '#' + id,
            minChars: config.minChars || 0,
            source: function (term, suggest) {

                // Abort any old running request before starting a new one
                if (instance.xhr !== undefined) {
                    instance.xhr.abort();
                }

                var statements = [
                    {
                        "statement": unions.join(" UNION "),
                        "parameters": {
                            term: term.toLowerCase()
                        },
                        "resultDataContents": ["row"]
                    }
                ];
                popoto.logger.info("AutoComplete ==> ");
                instance.xhr = popoto.rest.post(
                    {
                        "statements": statements
                    })
                    .done(function (response) {
                        popoto.logger.info("<== AutoComplete");
                        var parsedData = popoto.rest.response.parse(response);
                        var data = parsedData[0].sort(function (a, b) {
                                return b.res.count - a.res.count;

                                // Use this to order alphabetically.
                                // var attrA = a.res.attributes[popoto.provider.node.getDisplayAttribute(a.res.label)].toLowerCase();
                                // var attrB = b.res.attributes[popoto.provider.node.getDisplayAttribute(b.res.label)].toLowerCase();
                                // if (attrA < attrB) {
                                //     return -1;
                                // }
                                // if (attrA > attrB) {
                                //     return 1;
                                // }
                                // return 0;
                            }
                        );
                        instance.data = data;
                        suggest(data);
                    })
                    .fail(function (xhr, textStatus, errorThrown) {
                        if (textStatus !== "abort") {
                            console.error(xhr, textStatus, errorThrown);
                            suggest([]);
                        }
                        // Do nothing if the request have been aborted
                    });
            },
            renderItem: function (item, search) {
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&amp;');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                var label = item.res.label;
                var relation = item.res.type;
                var attributes = item.res.attributes;
                var displayAttr = popoto.provider.node.getDisplayAttribute(label);
                var constraintAttr = popoto.provider.node.getConstraintAttribute(label);
                var id = attributes[constraintAttr];
                var value = attributes[displayAttr];

                var imagePath = popoto.provider.node.getImagePath({
                    label: label,
                    type: popoto.graph.node.NodeTypes.CHOOSE
                });

                var cssClass = "";
                if (item.res.count === 0) {
                    cssClass = " disabled";
                }

                return '<div class="autocomplete-suggestion' + cssClass + '" data-label="' + label + '" data-id="' + id + '"><img width="15px" height="15px" src="' + imagePath + '"> '+relation+"->" + value.replace(re, "<b>$1</b>") + ' <span>(' + item.res.count + ')</span></div>';
            },
            onSelect: function (e, term, item) {
                var dataId = item.getAttribute('data-id');
                var dataLabel = item.getAttribute('data-label');

                document.getElementById(id).value = "";
                $("#" + id).blur();

                config.onSelect({id: dataId, label: dataLabel});
            }
        });

        instances[id] = instance;
        return instance;
    };


    return self;
})();
