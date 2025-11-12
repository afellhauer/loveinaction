//Unit tests for Authentication
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../../models/User');
const authRouter = require('../../routes/auth');

const { expect } = chai;
chai.use(chaiHttp);

const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;

  before(async function() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('[AUTH] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[AUTH] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
  });

  describe('POST /api/auth/signup', function() {
    it('should register a new user with valid data', function(done) {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@test.com',
        password: 'password123',
        dateOfBirth: '1995-01-01'
      };

      chai.request(app)
        .post('/api/auth/signup')
        .send(userData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.include('User registered');
          done();
        });
    });

    it('should fail when email is missing', function(done) {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        password: 'password123'
      };

      chai.request(app)
        .post('/api/auth/signup')
        .send(userData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Email and password are required');
          done();
        });
    });

    it('should fail when password is missing', function(done) {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@test.com'
      };

      chai.request(app)
        .post('/api/auth/signup')
        .send(userData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Email and password are required');
          done();
        });
    });

    it('should fail when email already exists', async function() {
      const existingUser = new User({
        firstName: 'Test',
        lastName: 'User1',
        email: 'testuser@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        dateOfBirth: new Date('1995-01-01'),
        isVerified: true
      });
      await existingUser.save();

      const userData = {
        firstName: 'Test',
        lastName: 'User2',
        email: 'testuser@test.com',
        password: 'password123',
        dateOfBirth: '1995-01-01'
      };

      const res = await chai.request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(res).to.have.status(400);
      expect(res.body.error).to.equal('Email already in use');
    });

    it('should create user with correct password hash', async function() {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'mypassword123',
        dateOfBirth: '1995-01-01'
      };

      await chai.request(app)
        .post('/api/auth/signup')
        .send(userData);

      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser).to.exist;
      
      // checking if pwd was hashed
      const isValidPassword = await bcrypt.compare(userData.password, savedUser.passwordHash);
      expect(isValidPassword).to.be.true;
    });

    it('should set isVerified to false for new users', async function() {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'verify@test.com',
        password: 'password123',
        dateOfBirth: '1995-01-01'
      };

      await chai.request(app)
        .post('/api/auth/signup')
        .send(userData);

      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser.isVerified).to.be.false;
      expect(savedUser.verifyToken).to.be.a('string');
    });
  });

  describe('GET /api/auth/verify/:token', function() {
    it('should verify user with valid token', async function() {
      const user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'verify@test.com',
        passwordHash: 'hashedpassword',
        dateOfBirth: new Date('1995-01-01'),
        isVerified: false,
        verifyToken: 'valid-token-123'
      });
      await user.save();

      try {
        const res = await chai.request(app)
          .get('/api/auth/verify/valid-token-123')
          .redirects(0);

        expect(res).to.have.status(302);
        expect(res).to.have.header('location');
      } catch (error) {
        // If redirect fails due to connection thats fine for testing
        // just want to verify the user was updated in database
        if (!error.message.includes('ECONNREFUSED')) {
          throw error;
        }
      }

      const verifiedUser = await User.findById(user._id);
      expect(verifiedUser.isVerified).to.be.true;
      expect(verifiedUser.verifyToken).to.be.null;
    });

    it('should fail with invalid token', function(done) {
      chai.request(app)
        .get('/api/auth/verify/invalid-token')
        .end((err, res) => {
          expect(res).to.have.status(400);
          done();
        });
    });

    it('should fail with no token', function(done) {
      chai.request(app)
        .get('/api/auth/verify/no-token-456')
        .end((err, res) => {
          expect(res).to.have.status(400);
          done();
        });
    });
  });

  describe('Validating Input', function() {
    it('should handle empty request body', function(done) {
      chai.request(app)
        .post('/api/auth/signup')
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Email and password are required');
          done();
        });
    });

    it('should remove trailing whitespace from email', async function() {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: '  test@example.com  ',
        password: 'password123',
        dateOfBirth: '1995-01-01'
      };

      await chai.request(app)
        .post('/api/auth/signup')
        .send(userData);

      const savedUser = await User.findOne({ email: 'test@example.com' });
      expect(savedUser).to.exist;
      expect(savedUser.email).to.equal('test@example.com');
    });
  });
});
