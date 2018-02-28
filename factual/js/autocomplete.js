var main = new autoComplete({
    selector: '#search',
    minChars: 0,

    source: function (term, suggest) {
        var query = "match (s:Social) WHERE (toLower(s.name) contains $term) return DISTINCT s.name AS name LIMIT 20";

        var statements = [
            {
                "statement": query,
                "parameters": {
                    term: term.toLowerCase()
                },
                "resultDataContents": ["row"]
            }
        ];

        popoto.logger.info("AutoComplete ==> ");
        popoto.rest.post(
            {
                "statements": statements
            })
            .done(function (data) {
                var parsedData = popoto.rest.response.parse(data);

                suggest(parsedData[0]);
            })
            .fail(function (xhr, textStatus, errorThrown) {
                console.error(xhr, textStatus, errorThrown);
                suggest([]);
            });
    },
    renderItem: function (item, search) {
        search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&amp;');
        var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");

        return '<div class="autocomplete-suggestion" data-name="' + name + '" data-search="' + search + '">' +item.name.replace(re, "<b>$1</b>") + '</div>';
    },
    onSelect: function (e, term, item) {
        document.getElementById('search').value = "";
        $("#search").blur();
    }
});
