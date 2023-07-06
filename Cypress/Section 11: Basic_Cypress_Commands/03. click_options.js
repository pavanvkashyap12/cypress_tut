// Click Options

// https://docs.cypress.io/api/commands/click#Options

describe("Test Contact Us form via WebdriverUni", () => {
    it("Should be able to submit a successful submission via contact us form", () => {
        //cypress code
        cy.visit("http://www.webdriveruniversity.com/")
        cy.get('#contact-us').click({force: true}) 
    });

    it("Should not be able to submit a successful submission via contact us form as all fields are required", () => {
        //cypress code
    });
})

// {force: true} 
// Here contact-us has a unique id but if you use it still it will not work. Only 
// locator from open playgroud loctor will work.
// This will give error as this element is not visible as it has an effective width and height of 0px 0px
// Timed out retrying after 4000ms: Expected to find element: contact-us, but never found it.
// So use {force: true} 
