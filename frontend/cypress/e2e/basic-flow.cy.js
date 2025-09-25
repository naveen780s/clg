describe('Gate Pass System - Basic Flow Tests', () => {
  beforeEach(() => {
    // Clear any existing data
    cy.window().then((win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
    });
  });

  describe('Navigation and Landing Page', () => {
    it('should load the landing page', () => {
      cy.visit('/');
      cy.contains('College Gate Pass', { timeout: 10000 }).should('be.visible');
      // Wait for animations to complete
      cy.wait(2000);
      cy.get('a').contains('Sign In').should('be.visible');
      cy.get('a').contains('Get Started').should('be.visible');
    });

    it('should navigate to login page', () => {
      cy.visit('/');
      cy.contains('Login').click();
      cy.url().should('include', '/login');
      cy.contains('Sign In').should('be.visible');
    });

    it('should navigate to registration page', () => {
      cy.visit('/');
      cy.contains('Register').click();  
      cy.url().should('include', '/register');
      cy.contains('Create Account').should('be.visible');
    });
  });

  describe('Authentication', () => {
    it('should show validation errors for empty login form', () => {
      cy.visit('/login');
      cy.get('[data-cy=login-button]').click();
      
      // Should stay on login page and show validation
      cy.url().should('include', '/login');
    });

    it('should handle invalid credentials', () => {
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('invalid@test.com');
      cy.get('[data-cy=password-input]').type('wrongpassword');
      cy.get('[data-cy=login-button]').click();
      
      // Should show error and stay on login page
      cy.url().should('include', '/login');
    });

    it('should redirect to login when accessing protected routes', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      
      cy.visit('/passes');
      cy.url().should('include', '/login');
      
      cy.visit('/profile');
      cy.url().should('include', '/login');
    });
  });

  describe('Registration Flow', () => {
    it('should navigate through registration steps', () => {
      cy.visit('/register');
      
      // Check if we can see the first step
      cy.contains('Basic Information').should('be.visible');
      
      // Try to fill some basic info (without full validation)
      cy.get('#name').should('be.visible');
      cy.get('#email').should('be.visible');
      cy.get('#password').should('be.visible');
      cy.get('#confirmPassword').should('be.visible');
    });

    it('should validate required fields in registration', () => {
      cy.visit('/register');
      
      // Try to proceed without filling required fields
      cy.contains('Next').click();
      
      // Should still be on step 1 (Basic Information)
      cy.contains('Basic Information').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Intercept API calls and simulate server error
      cy.intercept('POST', '**/auth/login', { statusCode: 500, body: { message: 'Server Error' } }).as('loginError');
      
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('test@example.com');
      cy.get('[data-cy=password-input]').type('password123');
      cy.get('[data-cy=login-button]').click();
      
      // Should handle the error gracefully and stay on login page
      cy.wait('@loginError');
      cy.url().should('include', '/login');
    });

    it('should show 404 page for invalid routes', () => {
      cy.visit('/invalid-route');
      cy.contains('Oops! Page Not Found').should('be.visible');
      cy.contains('Go Home').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile viewport', () => {
      cy.viewport(375, 667); // iPhone SE size
      cy.visit('/');
      
      // Should still display main content
      cy.contains('Gate Pass Management System').should('be.visible');
    });

    it('should work on tablet viewport', () => {
      cy.viewport(768, 1024); // iPad size
      cy.visit('/login');
      
      // Should display login form properly
      cy.contains('Sign In').should('be.visible');
      cy.get('[data-cy=email-input]').should('be.visible');
    });
  });

  describe('API Integration', () => {
    it('should make API calls when submitting forms', () => {
      // Intercept API calls
      cy.intercept('POST', '**/auth/login', { fixture: 'login-response.json' }).as('loginApi');
      
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('test@example.com');
      cy.get('[data-cy=password-input]').type('password123');
      cy.get('[data-cy=login-button]').click();
      
      // Should attempt API call
      cy.wait('@loginApi');
    });
  });
});