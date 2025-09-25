// Import commands.js using ES2015 syntax
import './commands';

// Alternatively, you can use CommonJS syntax
// require('./commands');

// Global configuration
Cypress.on('uncaught:exception', (err) => {
  // Ignore React development warnings and non-critical errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('ChunkLoadError')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

// Global before hook
beforeEach(() => {
  // Clear localStorage and sessionStorage
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up test environment
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
});