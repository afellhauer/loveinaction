// Integration tests for authentication flows
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const User = require('../../models/User');

const { expect } = chai;
chai.use(chaiHttp);

describe('Authentication Integration Tests', function() {
  this.timeout(15000);
  
  before(async function() {
    const dbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/loveinaction_integration_test';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUri);
    }
    console.log('[AUTH-INTEGRATION] Connected to test database');
  });

  after(async function() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('[AUTH-INTEGRATION] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
  });

  describe('Complete Authentication Flow', function() {
    it('should handle signup → verification → login → token usage', async function() {
      // Step 1: Signup
      const signupRes = await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          password: 'securepassword123',
          dateOfBirth: '1995-01-01'
        });
      
      expect(signupRes).to.have.status(201);
      expect(signupRes.body.message).to.include('Please check your email');
      
      // Step 2: Check user exists but is unverified
      const unverifiedUser = await User.findOne({ email: 'john.doe@test.com' });
      expect(unverifiedUser).to.exist;
      expect(unverifiedUser.isVerified).to.be.false;
      expect(unverifiedUser.verifyToken).to.exist;
      
      // Step 3: Login should fail before verification
      const loginBeforeVerify = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'securepassword123',
          dateOfBirth: '1995-01-01'
        });
      
      expect(loginBeforeVerify).to.have.status(403);
      expect(loginBeforeVerify.body.error).to.include('verify your email');
      
      // Step 4: Email verification  
      const verifyRes = await chai.request(app)
        .get(`/api/auth/verify/${unverifiedUser.verifyToken}`)
        .redirects(0); // Don't follow redirects
      
      expect(verifyRes).to.have.status(302); // Redirect response
      
      // Step 5: Verify user is now verified
      const verifiedUser = await User.findOne({ email: 'john.doe@test.com' });
      expect(verifiedUser.isVerified).to.be.true;
      expect(verifiedUser.verifyToken).to.be.null;
      
      // Step 6: Login should now succeed
      const loginRes = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'securepassword123',
          dateOfBirth: '1995-01-01'
        });
      
      expect(loginRes).to.have.status(200);
      expect(loginRes.body.accessToken).to.exist;
      expect(loginRes.body.user.email).to.equal('john.doe@test.com');
      
      // Step 7: Use token to access protected route
      const protectedRes = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);
      
      expect(protectedRes).to.have.status(200);
      expect(protectedRes.body.user.email).to.equal('john.doe@test.com');
    });
    
    it('should handle JWT token expiration', async function() {
      // Create verified user
      const user = new User({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        passwordHash: '$2a$10$hashedpassword',
        dateOfBirth: new Date('1995-01-01'),
        isVerified: true
      });
      await user.save();
      
      // Generate expired token
      const expiredToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      
      // Try to use expired token
      const protectedRes = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(protectedRes).to.have.status(401);
      expect(protectedRes.body.error).to.include('expired');
    });
    
    it('should handle malformed JWT tokens', async function() {
      const malformedToken = 'invalid.jwt.token';
      
      const protectedRes = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${malformedToken}`);
      
      expect(protectedRes).to.have.status(401);
    });
    
    it('should handle deleted user with valid token', async function() {
      // Create user and get token
      const signupRes = await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Temp',
          lastName: 'User',
          email: 'temp@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const user = await User.findOne({ email: 'temp@test.com' });
      user.isVerified = true;
      await user.save();
      
      const loginRes = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'temp@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const token = loginRes.body.accessToken;
      
      // Delete user
      await User.findByIdAndDelete(user._id);
      
      // Try to use token after user deletion
      const protectedRes = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(protectedRes).to.have.status(404); // User not found
    });
  });
  
  describe('Security Edge Cases', function() {
    it('should handle password reset flow (if implemented)', async function() {
      // This would test password reset functionality
      // Skip if not implemented
      this.skip();
    });
    
    it('should prevent token reuse after logout (if logout implemented)', async function() {
      // This would test token invalidation
      // Skip if not implemented  
      this.skip();
    });
    
    it('should handle case-insensitive email login', async function() {
      // Create user with lowercase email
      await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Case',
          lastName: 'Test',
          email: 'case@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const user = await User.findOne({ email: 'case@test.com' });
      user.isVerified = true;
      await user.save();
      
      // Try login with uppercase email
      const loginRes = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'CASE@TEST.COM',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      // Should handle case-insensitive login
      expect(loginRes).to.have.status(200);
    });
  });
  
  describe('Rate Limiting & Brute Force Protection', function() {
    it('should handle multiple failed login attempts', async function() {
      // Create verified user
      await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Brute',
          lastName: 'Test',
          email: 'brute@test.com',
          password: 'correctpassword',
          dateOfBirth: '1995-01-01'
        });
      
      const user = await User.findOne({ email: 'brute@test.com' });
      user.isVerified = true;
      await user.save();
      
      // Attempt multiple failed logins
      const failedAttempts = [];
      for (let i = 0; i < 5; i++) {
        failedAttempts.push(
          chai.request(app)
            .post('/api/auth/login')
            .send({
              email: 'brute@test.com',
              password: 'wrongpassword',
          dateOfBirth: '1995-01-01'
            })
        );
      }
      
      const results = await Promise.all(failedAttempts);
      
      // All should fail with 400 status
      results.forEach(res => {
        expect(res).to.have.status(400);
      });
      
      // Valid login should still work (unless rate limiting is implemented)
      const validLogin = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'brute@test.com',
          password: 'correctpassword',
          dateOfBirth: '1995-01-01'
        });
      
      expect(validLogin).to.have.status(200);
    });
  });
  
  describe('Cross-Route Authentication', function() {
    it('should maintain authentication across multiple protected routes', async function() {
      // Setup authenticated user
      await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Multi',
          lastName: 'Route',
          email: 'multi@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const user = await User.findOne({ email: 'multi@test.com' });
      user.isVerified = true;
      await user.save();
      
      const loginRes = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'multi@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const token = loginRes.body.accessToken;
      
      // Test multiple protected routes with same token
      const routes = [
        { method: 'get', path: '/api/profile/me' },
        { method: 'get', path: '/api/activities/my-activities' },
        { method: 'get', path: '/api/matches' },
        { method: 'get', path: '/api/swipes/my-swipes' }
      ];
      
      for (const route of routes) {
        const res = await chai.request(app)
          [route.method](route.path)
          .set('Authorization', `Bearer ${token}`);
        
        // Should not fail due to authentication (may fail for other reasons like missing data)
        expect(res.status).to.not.equal(401);
      }
    });
  });

  describe('User Account Deactivation and Reactivation', function() {
  let user, accessToken;

  beforeEach(async function() {
    // Delete any existing user with this email first
    await User.deleteOne({ email: 'deactivation@test.com' });
    
    // Create and verify a test user
    user = new User({
      firstName: 'Deactivation',
      lastName: 'Test',
      email: 'deactivation@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      dateOfBirth: new Date('1995-01-01'),
      isVerified: true,
      isActive: true
    });
    await user.save();

    // Generate access token
    accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  });

  describe('POST /api/auth/deactivate', function() {
    it('should deactivate user account with valid password', async function() {
      const response = await request(app)
        .post('/api/auth/deactivate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'password123',
          reason: 'Taking a break from dating'
        });

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Account deactivated successfully');
      expect(response.body.reason).to.equal('Taking a break from dating');

      // Verify user is deactivated in database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isActive).to.be.false;
      expect(updatedUser.deactivatedAt).to.be.a('date');
      expect(updatedUser.deactivationReason).to.equal('Taking a break from dating');
      expect(updatedUser.refreshTokens).to.be.empty;
    });

    it('should require password for deactivation', async function() {
      const response = await request(app)
        .post('/api/auth/deactivate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reason: 'Taking a break'
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Password confirmation required for account deactivation');
    });

    it('should reject invalid password', async function() {
      const response = await request(app)
        .post('/api/auth/deactivate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'wrongpassword',
          reason: 'Taking a break'
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid password');
    });

    it('should prevent deactivating already deactivated account', async function() {
      // First deactivation
      await request(app)
        .post('/api/auth/deactivate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'password123',
          reason: 'First deactivation'
        });

      // Try to deactivate again - should use new token since old one is invalid
      const newToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const response = await request(app)
        .post('/api/auth/deactivate')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          password: 'password123',
          reason: 'Second deactivation'
        });

      expect(response.status).to.equal(403);
      expect(response.body.code).to.equal('ACCOUNT_DEACTIVATED');
    });

    it('should require authentication', async function() {
      const response = await request(app)
        .post('/api/auth/deactivate')
        .send({
          password: 'password123',
          reason: 'Taking a break'
        });

      expect(response.status).to.equal(401);
    });
  });

  describe('POST /api/auth/reactivate', function() {
    beforeEach(async function() {
      // Deactivate the user first
      user.isActive = false;
      user.deactivatedAt = new Date();
      user.deactivationReason = 'Test deactivation';
      user.refreshTokens = [];
      await user.save();
    });

    it('should reactivate deactivated account with valid credentials', async function() {
      const response = await request(app)
        .post('/api/auth/reactivate')
        .send({
          email: 'deactivation@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });

      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal('Account reactivated successfully');
      expect(response.body.user.isActive).to.be.true;
      expect(response.body.user.reactivatedAt).to.be.a('string');
      expect(response.body.accessToken).to.be.a('string');
      expect(response.body.refreshToken).to.be.a('string');

      // Verify user is reactivated in database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isActive).to.be.true;
      expect(updatedUser.reactivatedAt).to.be.a('date');
      expect(updatedUser.deactivationReason).to.be.null;
      expect(updatedUser.refreshTokens).to.have.length(1);
    });

    it('should reject invalid credentials', async function() {
      const response = await request(app)
        .post('/api/auth/reactivate')
        .send({
          email: 'deactivation@test.com',
          password: 'wrongpassword',
          dateOfBirth: '1995-01-01'
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Invalid credentials');
    });

    it('should reject reactivation of active account', async function() {
      // Reactivate the user first
      user.isActive = true;
      await user.save();

      const response = await request(app)
        .post('/api/auth/reactivate')
        .send({
          email: 'deactivation@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Account is already active. Please use the regular login endpoint.');
    });

    it('should reject reactivation of unverified account', async function() {
      user.isVerified = false;
      await user.save();

      const response = await request(app)
        .post('/api/auth/reactivate')
        .send({
          email: 'deactivation@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });

      expect(response.status).to.equal(403);
      expect(response.body.error).to.equal('Please verify your email before reactivating your account.');
    });

    it('should require email and password', async function() {
      const response = await request(app)
        .post('/api/auth/reactivate')
        .send({
          email: 'deactivation@test.com'
        });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Email and password are required');
    });
  });

  describe('Login with deactivated account', function() {
    beforeEach(async function() {
      // Deactivate the user
      user.isActive = false;
      user.deactivatedAt = new Date();
      user.deactivationReason = 'Test deactivation';
      await user.save();
    });

    it('should reject login for deactivated account', async function() {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'deactivation@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });

      expect(response.status).to.equal(403);
      expect(response.body.error).to.equal('Account is deactivated');
      expect(response.body.code).to.equal('ACCOUNT_DEACTIVATED');
      expect(response.body.message).to.equal('Your account has been deactivated. Use the reactivate endpoint to restore your account.');
    });
  });

  describe('Protected routes with deactivated account', function() {
    let deactivatedToken;

    beforeEach(async function() {
      // Deactivate the user
      user.isActive = false;
      user.deactivatedAt = new Date();
      await user.save();

      // Create token for deactivated user (simulating old token)
      deactivatedToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
    });

    it('should reject access to protected routes for deactivated account', async function() {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${deactivatedToken}`);

      expect(response.status).to.equal(403);
      expect(response.body.error).to.equal('Account is deactivated');
      expect(response.body.code).to.equal('ACCOUNT_DEACTIVATED');
    });
  });
}); 
});