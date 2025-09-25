describe('Gate Pass Management System - E2E Tests', () => {
  beforeEach(() => {
    // Set up test data before each test
    cy.setupTestData();
  });

  afterEach(() => {
    // Clean up after each test
    cy.cleanupTestData();
  });

  describe('Authentication Flow', () => {
    it('should allow user to register and login', () => {
      // Visit registration page
      cy.visit('/register');
      
      // Step 1: Basic Information
      cy.get('#name').type('John Doe');
      cy.get('#email').type('john.doe@test.com');
      cy.get('#password').type('TestPass123!');
      cy.get('#confirmPassword').type('TestPass123!');
      cy.contains('Next').click();
      
      // Step 2: College Information
      cy.get('#regNumber').type('21CS1234');
      cy.get('#department').select('cse');
      cy.get('#year').select('3');
      cy.get('#section').select('A');
      cy.contains('Next').click();
      
      // Step 3: Contact & Mentor (skip mentor for now)
      cy.get('#phone').type('+1234567899');
      cy.get('#parentPhone').type('+1234567898');
      cy.get('#address').type('123 Test Street, Test City, Test State, 12345');
      
      // Submit registration (skip mentor selection for now)
      cy.contains('Create Account').click();
      
      // Should redirect to dashboard after successful registration
      cy.url().should('include', '/dashboard');
      cy.shouldBeAuthenticated();
    });

    it('should handle login with valid credentials', () => {
      cy.loginAsStudent();
      cy.shouldBeAuthenticated();
      cy.url().should('include', '/dashboard');
    });

    it('should handle login with invalid credentials', () => {
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type('wrong@test.com');
      cy.get('[data-cy=password-input]').type('wrongpassword');
      cy.get('[data-cy=login-button]').click();
      
      cy.shouldShowError('Invalid credentials');
      cy.shouldNotBeAuthenticated();
    });

    it('should handle logout', () => {
      cy.loginAsStudent();
      cy.logout();
      cy.shouldNotBeAuthenticated();
    });

    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  });

  describe('Gate Pass Management Flow', () => {
    beforeEach(() => {
      cy.loginAsStudent();
    });

    it('should allow student to create a new gate pass', () => {
      cy.navigateTo('createPass');
      
      // Fill gate pass form
      cy.get('[data-cy=reason-input]').type('Medical appointment with family doctor for regular checkup');
      cy.get('[data-cy=destination-input]').type('City General Hospital, Downtown');
      
      const exitTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const returnTime = new Date(Date.now() + 4 * 60 * 60 * 1000);
      
      cy.get('[data-cy=exit-time-input]').type(exitTime.toISOString().slice(0, 16));
      cy.get('[data-cy=return-time-input]').type(returnTime.toISOString().slice(0, 16));
      cy.get('[data-cy=emergency-contact-input]').type('+1234567890');
      
      // Submit form
      cy.get('[data-cy=create-pass-button]').click();
      
      // Should show success message and redirect
      cy.shouldShowSuccess('Gate pass created successfully');
      cy.url().should('include', '/passes');
      
      // Should see the created pass in the list
      cy.get('[data-cy=pass-list]').should('contain', 'Medical appointment');
      cy.get('[data-cy=pass-status]').should('contain', 'Pending');
    });

    it('should validate gate pass form inputs', () => {
      cy.navigateTo('createPass');
      
      // Try to submit empty form
      cy.get('[data-cy=create-pass-button]').click();
      
      // Should show validation errors
      cy.get('[data-cy=reason-error]').should('contain', 'Reason is required');
      cy.get('[data-cy=destination-error]').should('contain', 'Destination is required');
      cy.get('[data-cy=exit-time-error]').should('contain', 'Exit time is required');
      cy.get('[data-cy=return-time-error]').should('contain', 'Return time is required');
    });

    it('should validate exit time is in future', () => {
      cy.navigateTo('createPass');
      
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      
      cy.get('[data-cy=exit-time-input]').type(pastTime.toISOString().slice(0, 16));
      cy.get('[data-cy=create-pass-button]').click();
      
      cy.get('[data-cy=exit-time-error]').should('contain', 'Exit time must be in the future');
    });

    it('should validate return time is after exit time', () => {
      cy.navigateTo('createPass');
      
      const exitTime = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const returnTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      cy.get('[data-cy=exit-time-input]').type(exitTime.toISOString().slice(0, 16));
      cy.get('[data-cy=return-time-input]').type(returnTime.toISOString().slice(0, 16));
      cy.get('[data-cy=create-pass-button]').click();
      
      cy.get('[data-cy=return-time-error]').should('contain', 'Return time must be after exit time');
    });

    it('should display gate passes list with correct information', () => {
      // Create a test pass first
      cy.createGatePass({
        reason: 'Test reason for E2E testing',
        destination: 'Test destination'
      });
      
      cy.navigateTo('passes');
      
      // Should display pass information
      cy.get('[data-cy=pass-list]').should('be.visible');
      cy.get('[data-cy=pass-item]').should('have.length.at.least', 1);
      cy.get('[data-cy=pass-reason]').first().should('contain', 'Test reason');
      cy.get('[data-cy=pass-destination]').first().should('contain', 'Test destination');
      cy.get('[data-cy=pass-status]').first().should('contain', 'Pending');
    });

    it('should allow viewing gate pass details', () => {
      // Create a test pass
      cy.createGatePass();
      
      cy.navigateTo('passes');
      cy.get('[data-cy=pass-item]').first().click();
      
      // Should navigate to pass details
      cy.url().should('match', /\/passes\/[a-f0-9]{24}$/);
      
      // Should display detailed information
      cy.get('[data-cy=pass-details]').should('be.visible');
      cy.get('[data-cy=pass-qr-code]').should('be.visible');
      cy.get('[data-cy=pass-timeline]').should('be.visible');
    });
  });

  describe('Approval Workflow', () => {
    let passId;

    beforeEach(() => {
      // Create a pass as student
      cy.loginAsStudent();
      cy.createGatePass();
      
      // Get the pass ID from the URL or response
      cy.url().then((url) => {
        const match = url.match(/\/passes\/([a-f0-9]{24})$/);
        if (match) {
          passId = match[1];
        }
      });
    });

    it('should allow mentor to approve gate pass', () => {
      cy.loginAsMentor();
      cy.navigateTo('approval');
      
      // Should see pending passes
      cy.get('[data-cy=pending-passes]').should('be.visible');
      cy.get('[data-cy=approve-button]').first().click();
      
      // Fill approval form
      cy.get('[data-cy=remarks-input]').type('Approved for medical appointment');
      cy.get('[data-cy=confirm-approve-button]').click();
      
      cy.shouldShowSuccess('Gate pass approved successfully');
      
      // Verify status change
      cy.get('[data-cy=pass-status]').should('contain', 'Approved');
    });

    it('should allow mentor to reject gate pass', () => {
      cy.loginAsMentor();
      cy.navigateTo('approval');
      
      cy.get('[data-cy=reject-button]').first().click();
      cy.get('[data-cy=remarks-input]').type('Insufficient reason provided');
      cy.get('[data-cy=confirm-reject-button]').click();
      
      cy.shouldShowSuccess('Gate pass rejected');
      cy.get('[data-cy=pass-status]').should('contain', 'Rejected');
    });

    it('should show different approval queues for different roles', () => {
      // Check mentor view
      cy.loginAsMentor();
      cy.navigateTo('approval');
      cy.get('[data-cy=approval-section]').should('contain', 'Mentor Approval');
      
      // Check HOD view
      cy.loginAsHOD();
      cy.navigateTo('approval');
      cy.get('[data-cy=approval-section]').should('contain', 'HOD Approval');
    });
  });

  describe('QR Code Scanning', () => {
    beforeEach(() => {
      // Create and approve a pass
      cy.loginAsStudent();
      cy.createGatePass();
      
      cy.loginAsMentor();
      cy.navigateTo('approval');
      cy.get('[data-cy=approve-button]').first().click();
      cy.get('[data-cy=confirm-approve-button]').click();
    });

    it('should allow security to scan QR codes', () => {
      cy.loginAsSecurity();
      cy.navigateTo('scanner');
      
      // Should display QR scanner interface
      cy.get('[data-cy=qr-scanner]').should('be.visible');
      cy.get('[data-cy=manual-qr-input]').should('be.visible');
      
      // Test manual QR code input
      cy.get('[data-cy=manual-qr-input]').type('test-qr-code-string');
      cy.get('[data-cy=scan-button]').click();
      
      // Should process the QR code
      cy.get('[data-cy=scan-result]').should('be.visible');
    });

    it('should validate QR code and show pass details', () => {
      cy.loginAsSecurity();
      cy.navigateTo('scanner');
      
      // Simulate scanning a valid QR code
      cy.get('[data-cy=manual-qr-input]').type('valid-qr-code');
      cy.get('[data-cy=scan-button]').click();
      
      // Should display pass details
      cy.get('[data-cy=scanned-pass-details]').should('be.visible');
      cy.get('[data-cy=student-info]').should('be.visible');
      cy.get('[data-cy=pass-validity]').should('be.visible');
    });
  });

  describe('Notifications System', () => {
    beforeEach(() => {
      cy.loginAsStudent();
    });

    it('should display notifications', () => {
      cy.navigateTo('notifications');
      
      cy.get('[data-cy=notifications-list]').should('be.visible');
      cy.get('[data-cy=notification-item]').should('have.length.at.least', 0);
    });

    it('should mark notifications as read', () => {
      cy.navigateTo('notifications');
      
      // If there are notifications
      cy.get('[data-cy=notification-item]').then(($notifications) => {
        if ($notifications.length > 0) {
          cy.get('[data-cy=mark-read-button]').first().click();
          cy.shouldShowSuccess('Notification marked as read');
        }
      });
    });

    it('should show real-time notifications', () => {
      // Create a pass to trigger notification
      cy.createGatePass();
      
      // Should show notification about pass creation
      cy.get('[data-cy=toast-success]').should('contain', 'Gate pass created');
    });
  });

  describe('Statistics and Reports', () => {
    it('should display statistics for HOD', () => {
      cy.loginAsHOD();
      cy.navigateTo('statistics');
      
      cy.get('[data-cy=stats-dashboard]').should('be.visible');
      cy.get('[data-cy=total-passes]').should('be.visible');
      cy.get('[data-cy=pending-passes]').should('be.visible');
      cy.get('[data-cy=approved-passes]').should('be.visible');
      cy.get('[data-cy=rejected-passes]').should('be.visible');
    });

    it('should not allow students to access statistics', () => {
      cy.loginAsStudent();
      cy.visit('/statistics');
      
      // Should redirect or show access denied
      cy.get('[data-cy=access-denied]').should('be.visible');
    });

    it('should display charts and graphs', () => {
      cy.loginAsHOD();
      cy.navigateTo('statistics');
      
      cy.get('[data-cy=pass-trends-chart]').should('be.visible');
      cy.get('[data-cy=department-wise-chart]').should('be.visible');
    });
  });

  describe('User Profile Management', () => {
    beforeEach(() => {
      cy.loginAsStudent();
    });

    it('should display user profile information', () => {
      cy.navigateTo('profile');
      
      cy.get('[data-cy=profile-form]').should('be.visible');
      cy.get('[data-cy=first-name-field]').should('have.value', 'Test');
      cy.get('[data-cy=last-name-field]').should('have.value', 'Student');
      cy.get('[data-cy=email-field]').should('have.value', 'student@test.com');
    });

    it('should allow profile updates', () => {
      cy.navigateTo('profile');
      
      cy.get('[data-cy=first-name-field]').clear().type('Updated');
      cy.get('[data-cy=phone-field]').clear().type('+9876543210');
      cy.get('[data-cy=update-profile-button]').click();
      
      cy.shouldShowSuccess('Profile updated successfully');
      
      // Verify changes persisted
      cy.reload();
      cy.get('[data-cy=first-name-field]').should('have.value', 'Updated');
    });

    it('should allow password change', () => {
      cy.navigateTo('profile');
      
      cy.get('[data-cy=change-password-button]').click();
      cy.get('[data-cy=current-password]').type('TestPass123!');
      cy.get('[data-cy=new-password]').type('NewTestPass123!');
      cy.get('[data-cy=confirm-password]').type('NewTestPass123!');
      cy.get('[data-cy=update-password-button]').click();
      
      cy.shouldShowSuccess('Password updated successfully');
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.loginAsStudent();
    });

    it('should work on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.navigateTo('dashboard');
      
      // Should display mobile-friendly navigation
      cy.get('[data-cy=mobile-menu-button]').should('be.visible');
      cy.get('[data-cy=mobile-menu-button]').click();
      cy.get('[data-cy=mobile-nav-menu]').should('be.visible');
    });

    it('should work on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.navigateTo('passes');
      
      // Should adapt layout for tablet
      cy.get('[data-cy=pass-grid]').should('be.visible');
      cy.get('[data-cy=pass-item]').should('have.class', 'tablet-layout');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Intercept API calls and force network error
      cy.intercept('GET', '/api/passes', { forceNetworkError: true }).as('networkError');
      
      cy.loginAsStudent();
      cy.navigateTo('passes');
      
      cy.wait('@networkError');
      cy.shouldShowError('Network error occurred');
      cy.get('[data-cy=retry-button]').should('be.visible');
    });

    it('should handle server errors', () => {
      cy.intercept('POST', '/api/passes', { statusCode: 500 }).as('serverError');
      
      cy.loginAsStudent();
      cy.createGatePass();
      
      cy.wait('@serverError');
      cy.shouldShowError('Server error occurred');
    });

    it('should handle authentication errors', () => {
      // Login first
      cy.loginAsStudent();
      
      // Simulate token expiration
      cy.window().then((win) => {
        win.localStorage.removeItem('token');
      });
      
      // Try to access protected route
      cy.navigateTo('passes');
      
      // Should redirect to login
      cy.url().should('include', '/login');
      cy.shouldShowError('Session expired');
    });
  });
});