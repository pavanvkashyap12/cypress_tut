/// <reference types="cypress"/>

describe('Test Contact Us form via Automation Test Store',() => {
    it('Should be able to submit a successful submission via contact us form',() => {
        cy.visit("https://www.automationteststore.com/")
        cy.get(".info_links_footer > :nth-child(5) > a").click()
        cy.get('#ContactUsFrm_first_name').type('Joe')
        cy.get('#ContactUsFrm_email').type('joe_blogs@gmail.com')
        cy.get('#ContactUsFrm_enquiry').type("do you provide additional discounts")
        cy.get('.col-md-6 > .btn').click()
        
        
        // all the above locators are form cypress app and might be flaky
    })

});