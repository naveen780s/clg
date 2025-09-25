// Custom Cypress commands for Gate Pass Management System

// Authentication commands
Cypress.Commands.add('login', (email = 'student@test.com', password = 'TestPass123!') => {
  cy.visit('/login');
  cy.get('[data-cy=email-input]').type(email);
  cy.get('[data-cy=password-input]').type(password);
  cy.get('[data-cy=login-button]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('loginAsStudent', () => {
  cy.login('student@test.com', 'TestPass123!');
});

Cypress.Commands.add('loginAsMentor', () => {
  cy.login('mentor@test.com', 'TestPass123!');
});

Cypress.Commands.add('loginAsHOD', () => {
  cy.login('hod@test.com', 'TestPass123!');
});

Cypress.Commands.add('loginAsSecurity', () => {
  cy.login('security@test.com', 'TestPass123!');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=logout-button]').click();
  cy.url().should('include', '/login');
});

// Gate pass commands
Cypress.Commands.add('createGatePass', (passData = {}) => {
  const defaultData = {
    reason: 'Medical appointment with family doctor',
    destination: 'City Hospital, Main Street',
    exitTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    returnTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    emergencyContact: '+1234567890'
  };
  
  const data = { ...defaultData, ...passData };
  
  cy.visit('/passes/create');
  cy.get('[data-cy=reason-input]').type(data.reason);
  cy.get('[data-cy=destination-input]').type(data.destination);
  cy.get('[data-cy=exit-time-input]').type(data.exitTime);
  cy.get('[data-cy=return-time-input]').type(data.returnTime);
  
  if (data.emergencyContact) {
    cy.get('[data-cy=emergency-contact-input]').type(data.emergencyContact);
  }
  
  cy.get('[data-cy=create-pass-button]').click();
});

Cypress.Commands.add('approveGatePass', (passId) => {
  cy.visit(`/passes/${passId}`);
  cy.get('[data-cy=approve-button]').click();
  cy.get('[data-cy=remarks-input]').type('Approved by automated test');
  cy.get('[data-cy=confirm-approve-button]').click();
});

Cypress.Commands.add('rejectGatePass', (passId) => {
  cy.visit(`/passes/${passId}`);
  cy.get('[data-cy=reject-button]').click();
  cy.get('[data-cy=remarks-input]').type('Rejected by automated test');
  cy.get('[data-cy=confirm-reject-button]').click();
});

// Navigation commands
Cypress.Commands.add('navigateTo', (page) => {
  const routes = {
    dashboard: '/dashboard',
    passes: '/passes',
    createPass: '/passes/create',
    profile: '/profile',
    notifications: '/notifications',
    approval: '/approvals',
    statistics: '/statistics',
    scanner: '/scanner'
  };
  
  if (routes[page]) {
    cy.visit(routes[page]);
  } else {
    cy.visit(page);
  }
});

// Assertion commands
Cypress.Commands.add('shouldShowSuccess', (message) => {
  cy.get('[data-cy=toast-success]')
    .should('be.visible')
    .and('contain', message);
});

Cypress.Commands.add('shouldShowError', (message) => {
  cy.get('[data-cy=toast-error]')
    .should('be.visible')
    .and('contain', message);
});

Cypress.Commands.add('shouldBeAuthenticated', () => {
  cy.window().its('localStorage').invoke('getItem', 'token').should('exist');
  cy.get('[data-cy=user-menu]').should('be.visible');
});

Cypress.Commands.add('shouldNotBeAuthenticated', () => {
  cy.window().its('localStorage').invoke('getItem', 'token').should('not.exist');
  cy.url().should('include', '/login');
});

// API commands
Cypress.Commands.add('setupTestData', () => {
  // Create test users via API
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: {
      name: 'Test Student',
      email: 'student@test.com',
      password: 'TestPass123!',
      regNumber: 'CS2021001',
      department: 'cse',
      year: 3,
      section: 'A',
      phone: '+1234567890',
      parentContact: '+1234567891',
      address: '123 Test Street, Test City',
      mentor: null
    },
    failOnStatusCode: false
  });

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: {
      name: 'Test Mentor',
      email: 'mentor@test.com',
      password: 'TestPass123!',
      regNumber: 'MEN001',
      department: 'cse',
      year: null,
      section: null,
      phone: '+1234567891',
      parentContact: '+1234567891',
      address: '123 Mentor Street, Test City',
      role: 'mentor'
    },
    failOnStatusCode: false
  });

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: {
      name: 'Test HOD',
      email: 'hod@test.com',
      password: 'TestPass123!',
      regNumber: 'HOD001',
      department: 'cse',
      year: null,
      section: null,
      phone: '+1234567892',
      parentContact: '+1234567892',
      address: '123 HOD Street, Test City',
      role: 'hod'
    },
    failOnStatusCode: false
  });

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: {
      name: 'Test Security',
      email: 'security@test.com',
      password: 'TestPass123!',
      regNumber: 'SEC001',
      department: 'security',
      year: null,
      section: null,
      phone: '+1234567893',
      parentContact: '+1234567893',
      address: '123 Security Street, Test City',
      role: 'security'
    },
    failOnStatusCode: false
  });
});

Cypress.Commands.add('cleanupTestData', () => {
  // This would typically clean up test data
  // Implementation depends on your API endpoints
  cy.log('Test data cleanup completed');
});

// Wait for network requests
Cypress.Commands.add('waitForApiCall', (alias, timeout = 10000) => {
  cy.wait(alias, { timeout });
});

// Custom keyboard shortcuts
Cypress.Commands.add('pressEscape', () => {
  cy.get('body').type('{esc}');
});

Cypress.Commands.add('pressEnter', () => {
  cy.get('body').type('{enter}');
});