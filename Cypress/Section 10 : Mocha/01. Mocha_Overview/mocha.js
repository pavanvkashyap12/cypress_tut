// Mocha Overview

// https://mochajs.org/

// Check mocha_overview.pdf

// FUNCTION CALLS

// ▪ MOCHA - Comes pre bundled with two function calls which are describe() and it() both have their own specific purpose.

// ▪ describe() is simply a way to group our tests in Mocha; basically enabling us to
//  group a series of tests together. describe() takes two arguments: first argument:
//  the name of the test group and the second argument is simply the call-back
//  function (Simply put: A call-back is a function that is to be executed after another
//  function has finished executing — hence the name ‘call back’)


// ▪ it() is way to describe each individual test case which is nested inside the
//  describe() block. it() should be described in way that makes sense for the given
//  test case. describe is used to define and group tests, it is used to define individual
//  test cases.


// MOCHA EXAMPLE

describe("Test Contact Us form WebdriverUni", () => {
it("Should be able to submit a successful submission via contact us form", () => {
cy.get('[name="first_name"]').type("Joe")
cy.get('[name="last_name"]').type("Blogs")
cy.get('[name="email"]').type("joe_blogs@mail.com")
cy.get('textarea').type("How much does product x cost?")
cy.get('#form_buttons .contact_button:nth-of-type(2)').click()
});


it("Should not be able to submit a successful submission via contact us form as all fields are required", () => {
cy.get('[name="first_name"]').type("Joe")
cy.get('[name="last_name"]').type("Blogs")
cy.get('#form_buttons .contact_button:nth-of-type(2)').click()
});
});


// describe() is used to define multiple test cases
// it() is used to define indiviual test cases