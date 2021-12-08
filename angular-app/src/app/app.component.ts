import { Component, OnInit } from '@angular/core';
import * as popoto from 'popoto'
import * as M from 'materialize-css'
import * as $ from 'jquery'

@Component({
  selector: 'app-root',
  templateUrl: `app.component.html`,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'angular-app';


  ngOnInit(): void {
    // Demo Neo4j database settings hosted on GrapheneDb
    popoto.rest.CYPHER_URL = "https://db-kh9ct9ai1mqn6hz2itry.graphenedb.com:24780/db/data/transaction/commit";
    popoto.rest.AUTHORIZATION = "Basic cG9wb3RvOmIuVlJZQVF2blZjV2tyLlRaYnpmTks5aHp6SHlTdXk=";
    // Define the list of label provider to customize the graph behavior:
    // Only two labels are used in Neo4j movie graph example: "Movie" and "Person"
    popoto.provider.node.Provider = {
      "Movie": {
        "returnAttributes": ["title", "released", "tagline"],
        "constraintAttribute": "title"
      },
      "Person": {
        "returnAttributes": ["name", "born"],
        "constraintAttribute": "name"
      }
    };

    this.initCollapsible();

    // Start the generation using parameter as root label of the query.
    popoto.start("Person");
  }

  initCollapsible() {

    var element = document.querySelector('#collapsible-components');
    var collapsible = new M.Collapsible(element,
      {
        accordion: false,
        onOpenEnd: function (el) {
          var id = el.id;
          if (id === "p-collapsible-popoto") {
            if (popoto.graph.getRootNode() !== undefined) {
              popoto.graph.getRootNode().px = $('#p-collapsible-popoto').width() / 2;
              popoto.graph.getRootNode().py = 300;
              popoto.updateGraph();
            }
          }
        },
        onCloseEnd: function (el) {
        }
      });
  }

}
