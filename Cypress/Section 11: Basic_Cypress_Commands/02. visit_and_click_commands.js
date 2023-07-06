// Visit And Click Commands //

// https://docs.cypress.io/api/commands/visit
// https://docs.cypress.io/api/commands/click




// Example : 

describe("Test Contact Us form via WebdriverUni", () => {
    it("Should be able to submit a successful submission via contact us form", () => {
        //cypress code
        cy.visit("http://www.webdriveruniversity.com/")
        cy.get('#contact-us > .thumbnail').click() 
    });

    it("Should not be able to submit a successful submission via contact us form as all fields are required", () => {
        //cypress code
    });
})

// Open Bash Terminal
// Type following Command :
// node_modules/.bin/cypress open 
// This will open test runner 
// Select E2e Testing
// Select Browser
// Click on start testing
// Move to contact-us.js 
// You can see test template ie left side and tests run
// Go to Test Runner and click close to stop 

// Note : To get selector click on open selector playground in the test runner and inspect.

