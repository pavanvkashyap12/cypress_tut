// Cypress Setup

// Create a folder cypress-automation-framework
// Open this in VS code
// Now we are going to use terminal window to create package.json file
// package.json file enables us to handle packages and dependenices. Its usually used in nodeJs Projects
// Open terminal select bash and run following command
// npm init
// This helps us to setup package.json file
// Now you get following
// package name : (cypress-automation-framework) i.e folder name
// version : (1.0.0)
// description : add description Ex:cypress-automation-framework enter
// entry point : (index.js) leave as it is
// testcommand : leave blank enter
// git repository : leave blank enter
// keywords : leave blank enter
// author : add your name enter
// license : (ISC) leave as it is enter

// Now you get json file and asks to confirm 

// {
//   "name": "cypress-automation-framework",
//   "version": "1.0.0",
//   "description": "Cypress Automation Framework",
//   "main": "index.js",
//   "scripts": {
//     "test": "echo \"Error: no test specified\" && exit 1"
//   },
//   "author": "Gianni Bruno",
//   "license": "ISC",
//   "devDependencies": {
//     "cypress": "^10.7.0"
//   }
// }

// If ok press enter
// Now package.json file is created

// Now download cypress

// In same terminal clear all and run
// npm install --save-dev cypress@10.7.0
// Now you can see node_modules folder which contains all packages

// Now in package.json you can see devdependcies is cypress.
// When you get project from developer.Go to git bash and run the following command
// npm install
// Now it has scanned package.json and has seen cypress is listed and it has downloaded cypress packages.
// And node_modules folder re-appears and we can see cypress folder is present inside this node_modules.


