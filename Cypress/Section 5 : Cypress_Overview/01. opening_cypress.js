// Open Cypress For First Time

// Run the follwoing commnad from your project terminal
// ./node_modules/.bin/cypress open
// You can see these messages 
// It looks like this is your first time using Cypress: 10.7.0
// Opening Cypress
// Cypress opens
// Click on E2E testing 
// It will create few files for us.
// 1.[cypress.config.js - The Cypress config file for E2E Testing]
// 2.[cypress/support/e2e.js - The support file taht is bundled and loaded before each E2E Spec]
// 3.[cypress/support/commands.js - The support file that is useful for creating custom Cypress Commands and overwrite existing ones]
// 4.[cypress/fixtures/example.json - Added an example fixture file/folder]
// Scroll down and click continue
// So after clicking continue. It creates cypress structure folder for us
// i.e you can see a cypress folder which has support folder[ with e2e.js,commands.js file] and fixture folder [with example.json]
// Now select your browser and click on start E2E testing in Chrome.
// localhost:42015 opens in chrome.
// As it is first time we have opened it opens spec window.
// Here we have two options - 1.Scafold Example Specs 2.Create new empty spec
// Specs are nothing but tests
// Click on Scafold Example Specs [This creates sample examples specs to help in understanding how to write tests in cypress]
// Click on OK
// This Opens the Test Runner.
// If you inspect Test Runner we can see under specs tab we have various different tests.
// Also you can see under cypress two folders downloads and e2e is created. In which e2e has two folders with tests/specs.
// Just click on any spec cypress starts.

// Further we create our own spec/tests and naming of folder changes.So do the following
// Open the cypress.config.js which was created and add the following command.
// specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx,feature}"
// ** here is a wildcard. Here at ** we give the required folder.
// {js,jsx,ts,tsx,feature} This denotes what type of file we can specify
// Any setting we do should be inside e2e object of cypress.config.js

// Refer image for testrunner.png - Whatever you see in the image is cypress test runner.
// Note : packages = folder in this course

// You can command : [npx cypress open] to open cypress and now you can see E2E Testing as configured.
