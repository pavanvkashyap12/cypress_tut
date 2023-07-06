/// <reference types="Cypress" />

describe("Test Coontact Us Form Via Webdriver Uni", () => {
    it("Should be able to submit a successful submission via contact us form", () => {
        //cypress code
        //cy.visit("http://www.webdriveruniversity.com/")
        //cy.get('#contact-us').click({force: true})
        cy.visit("http://www.webdriveruniversity.com/Contact-Us/contactus.html")
        cy.get('[name="first_name"]').type("Joe")
        cy.get('[name="last_name"]').type("blogs")
        cy.get('[name="email"]').type('joe_blogs123@gmail.com')
        cy.get('textarea.feedback-input').type('How can I learn Cypress?')
        cy.get('[type="submit"]').click()
    });
    
    it.only("Should not be able to submit a successful submission via contact us form", () => {
        //cypress code
        cy.visit("http://www.webdriveruniversity.com/Contact-Us/contactus.html");
        cy.get('[name="first_name"]').type("Tom");
        cy.get('[name="last_name"]').type("blogs");
        cy.get('textarea.feedback-input').type("How can I learn Cypress?")
        cy.get('[type="submit"]').click();
    });
});

// When you make changes and save tests will automatically trigger this is one more feature of cypress.
// One disadvantage is cypress does not support multiple tabs. We will see later how to resolve this.
// For now change the url to 