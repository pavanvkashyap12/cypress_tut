// cypress project structure

// After all the setup we have following folders and files

// 1. Cypress --> [subfolders: download,e2e,fixtures,support]
// 2. node_modules --> which stores all of the packages required to build a framework using cypress.
// cypress.config.js --> This is generated by cypress in root directory.
// package.json --> used to handle dependencies
// package-lock.json --> ignore this.

// E2E Folder
// Tests should be there inside this folder.
// The main folder where we store our test files, the "cypress app" will look into this folder inorder to locate test files.
// Where we keep our test data objects, mocked objects and any other data which need for our tests.(In most cases will be JSON files.)

// Fixtures Folder
// This helps to store json file and these files contain data and then we can feed these data to our tests.


// Support Folder

// In this folder we have two files created by cypress.
// commands.js --> This file is used to store command logic. Like methods which are used in many tests.
// you can store custom commands and overwrite commands/custom files.
// used to store commom/custom commands (Functions), even the ability to override cypress functions.

// e2e.js --> This file is used to add specific plugin. Ex: There might be external plugins not created by cypress 
// so that we can use it in our framework.
// External Plugin Ex : require('cypress-xpath'); This plugin enables framework to use xpath selectors.
// e2e.js is the first file cypress investigates: any imports and additional libraries(plugins)

// Downloads Folder
// When we execute testcase and something downloads. This downloaded file by default goes inside this folder.
// But we can change it.

// cypress.config.js
// This file is used to change/override default settings. Ex: Page Load Timeout etc

// Note : Whenever we create a cypress project and when we open cypress app for the first time.
// Its gonna create cypress folder [ in that e2e, fixtures, support folder with subfolder/files in each]
// and also cypress.config.js

// Results Folder
// To store test reports

// Screenshots Folder
// Screenshots taken while executing test can be stored.

// Videos Folder
// Videos of test execution can be stored.