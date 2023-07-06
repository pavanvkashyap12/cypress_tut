// Activating Commands

// "cy" is a keyword

// How to Activate Cypress 

// Cypress uses the keyword "cy"
// Now if we use cy. in our testcase it is not giving any suggestions for cypress command
// So before we want to implement any cypress commands within our testcase we need to 
// add following to top of our testcase

// ///(three forward slashes) <reference types="Cypress" /> 
// /// <reference types="Cypress" />
// Use the exact above code with exact spaces

// Now if we type cy. we can see list of cypress commands like click etc....

// Just to make sure cy.click is cypress command. The location of click will be in 
// node_modules/cypress/types

// So to use cypress commands we need to add following command on top of the test file

// /// <reference types="Cypress" />