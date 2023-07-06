// Type Command

// https://docs.cypress.io/api/commands/type


describe("Test Contact Us form via WebdriverUni", () => {
    it("Should be able to submit a successful submission via contact us form", () => {
        cy.visit("http://www.webdriveruniversity.com")
        //
        cy.visit("http://www.webdriveruniversity.com/Contact-Us/contactus.html")
        //cy.get('#contact-us').click({force: true})
        cy.get('[name="first_name"]').type("Joe") 
        // OR
        cy.get('input[name="first_name"]').type("Joe")

    });

    it("Should not be able to submit a successful submission via contact us form as all fields are required", () => {
        //cypress code
    });
})

// When you make changes and save tests will automatically trigger this is one more feature of cypress.
// One disadvantage is cypress does not support multiple tabs. We will see later how to resolve this.
// For now change the url to http://www.webdriveruniversity.com/Contact-Us/contactus.html