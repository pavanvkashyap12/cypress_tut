// create a new folder in e2e for new test
// automation-test-store folder
// contact-us.js file inside it
// here we are using different website with more locators to explore
// https://github.com/cypress-io/cypress/issues/9358


describe("Test Contact Us form via Automation Test Store", () => {
    it("Should be able to submit a successful submission via contact us form", () => {
        cy.visit("https://www.automationteststore.com/");
        cy.get('.info_links_footer > :nth-child(5) > a').click();
        cy.get('#ContactUsFrm_first_name').type("Joe");
        cy.get('#ContactUsFrm_email').type("joe_blogs123@gmail.com");
        cy.get('#ContactUsFrm_enquiry').type("Do you provide additional discount on bulk orders?")
        cy.get('.col-md-6 > .btn').click();
    });
})