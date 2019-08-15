# AngularApp

Example of [Popoto.js](http://popotojs.com/) on Neo4j movie dataset in angular 2+ app.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.0.1.

## Add popoto to angular 2+ app

1. do `yarn add popoto` (or `npm i popoto`)

2. add `import * as popoto from 'popoto'` to top of `component.ts`

![Add import](https://github.com/sag3ll0/popoto-examples/angular-app/screen/import.png "Add import")

3. add code for initialization (config) popoto to `ngOnInit()` function (**not in `constructor`**)

![Add configuration popoto](https://github.com/sag3ll0/popoto-examples/angular-app/screen/ngOnInit.png "Add configuration popoto")

4. add html template to `app.component.html`

5. add `"node_modules/popoto/dist/popoto.min.css"` to `angular.json > projects > angular-app > architect > build > options > styles` section

![Add css to angular.json](https://github.com/sag3ll0/popoto-examples/angular-app/screen/css.png "Add css to angular.json")

[![Main screenshot](https://github.com/sag3ll0/popoto-examples/angular-app/screen/main.png "Main screenshot")](https://github.com/sag3ll0/popoto-examples/angular-app/dist/angular-app/index.html)

[Live version here](https://github.com/sag3ll0/popoto-examples/angular-app/dist/angular-app/index.html)