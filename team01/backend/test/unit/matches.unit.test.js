// Unit tests for Matches routes
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const User = require('../../models/User');
const Match = require('../../models/Match');
const matchesRouter = require('../../routes/matches');

const { expect } = chai;
chai.use(chaiHttp);

const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/matches', matchesRouter);

describe('Matches Routes Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;
  let testUser;
  let matchedUser;
  let authToken;

  const generateTestToken = (userId) => {
    return jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  };

  before(async function() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('[MATCHES] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[MATCHES] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Match.deleteMany({});

    // Create test uers
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@matches.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser.save();

    matchedUser = new User({
      firstName: 'Matched',
      lastName: 'User',
      email: 'matched@matches.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await matchedUser.save();

    authToken = generateTestToken(testUser._id);
  });

  const createValidMatch = (user1Id, user2Id, options = {}) => {
    return {
      user1Id,
      user2Id,
      activityType: options.activityType || 'Soccer',
      location: options.location || 'Test Park',
      dates: options.dates || [new Date()],
      status: options.status || 'active',
      ...options
    };
  };

  describe('GET /api/matches', function() {
    beforeEach(async function() {
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = new User({
          firstName: `User${i}`,
          lastName: 'Test',
          email: `user${i}@test.com`,
          dateOfBirth: new Date('1995-01-01'),
          passwordHash: 'hashedpassword',
          isVerified: true
        });
        await user.save();
        users.push(user);

        const match = new Match(createValidMatch(testUser._id, user._id));
        await match.save();
      }
    });

    it('should get user matches', function(done) {
      chai.request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.be.an('array');
          expect(res.body.data).to.have.length(3);
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get('/api/matches')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should return empty array for user with no matches', async function() {
      await Match.deleteMany({
        $or: [
          { user1Id: testUser._id },
          { user2Id: testUser._id }
        ]
      });

      const res = await chai.request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array').that.is.empty;
    });

    it('should return matches where user is userId1 or userId2', async function() {
      await Match.deleteMany({});

      // user1Id
      const match1 = new Match(createValidMatch(testUser._id, matchedUser._id, {
        location: 'A',
        dates: [new Date('2025-01-01')]
      }));
      await match1.save();

      // user2Id 
      const match2 = new Match(createValidMatch(matchedUser._id, testUser._id, {
        location: 'B',
        dates: [new Date('2025-01-02')]
      }));
      await match2.save();

      const res = await chai.request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(2);
    });

    it('should only return active matches', async function() {
      await Match.deleteMany({});

      // active match
      const activeMatch = new Match(createValidMatch(testUser._id, matchedUser._id, { 
        status: 'active',
        location: 'Active Park',
        dates: [new Date('2025-01-01')]
      }));
      await activeMatch.save();

      // inactive match
      const inactiveMatch = new Match(createValidMatch(testUser._id, matchedUser._id, { 
        status: 'expired',
        location: 'Inactive Park',
        dates: [new Date('2025-01-02')]
      }));
      await inactiveMatch.save();

      const res = await chai.request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(1);
      expect(res.body.data[0].status).to.equal('active');
    });

    it('should populate user information', function(done) {
      chai.request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.data[0]).to.have.property('otherUser');
          expect(res.body.data[0]).to.have.property('activityType');
          expect(res.body.data[0]).to.have.property('location');
          done();
        });
    });
  });

  describe('GET /api/matches/:matchId', function() {
    let testMatch;

    beforeEach(async function() {
      testMatch = new Match(createValidMatch(testUser._id, matchedUser._id));
      await testMatch.save();
    });

    it('should get match details', function(done) {
      chai.request(app)
        .get(`/api/matches/${testMatch._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data._id).to.equal(testMatch._id.toString());
          expect(res.body.data.status).to.equal('active');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get(`/api/matches/${testMatch._id}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail to get non-existent match', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .get(`/api/matches/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should fail with invalid match ID format', function(done) {
      chai.request(app)
        .get('/api/matches/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(500);
          done();
        });
    });

    it('should prevent accessing another user\'s match', async function() {
      const otherUser = new User({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@test.com',
        dateOfBirth: new Date('1995-01-01'),
        passwordHash: 'hashedpassword',
        isVerified: true
      });
      await otherUser.save();

      const otherMatch = new Match(createValidMatch(otherUser._id, matchedUser._id));
      await otherMatch.save();

      const res = await chai.request(app)
        .get(`/api/matches/${otherMatch._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(403); 
    });
  });

  describe('DELETE /api/matches/:matchId', function() {
    let testMatch;

    beforeEach(async function() {
      testMatch = new Match(createValidMatch(testUser._id, matchedUser._id));
      await testMatch.save();
    });

    it('should delete match successfully', function(done) {
      chai.request(app)
        .delete(`/api/matches/${testMatch._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.message).to.include('deleted');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .delete(`/api/matches/${testMatch._id}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail to delete non-existent match', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .delete(`/api/matches/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should fail with invalid match ID format', function(done) {
      chai.request(app)
        .delete('/api/matches/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(500); 
          done();
        });
    });

    it('should actually remove match from database', async function() {
      await chai.request(app)
        .delete(`/api/matches/${testMatch._id}`)
        .set('Authorization', `Bearer ${authToken}`);
      const deletedMatch = await Match.findById(testMatch._id);
      expect(deletedMatch).to.be.null;
    });

    it('should prevent deleting another user\'s match', async function() {
      const otherUser = new User({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@test.com',
        dateOfBirth: new Date('1995-01-01'),
        passwordHash: 'hashedpassword',
        isVerified: true
      });
      await otherUser.save();

      const otherMatch = new Match(createValidMatch(otherUser._id, matchedUser._id));
      await otherMatch.save();

      const res = await chai.request(app)
        .delete(`/api/matches/${otherMatch._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(403);
      
      const stillExists = await Match.findById(otherMatch._id);
      expect(stillExists).to.exist;
    });
  });

  describe('POST /api/matches/:matchId/unmatch', function() {
    let testMatch;

    beforeEach(async function() {
      testMatch = new Match(createValidMatch(testUser._id, matchedUser._id));
      await testMatch.save();
    });

    it('should unmatch successfully', function(done) {
      chai.request(app)
        .post(`/api/matches/${testMatch._id}/unmatch`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data.status).to.equal('unmatched');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .post(`/api/matches/${testMatch._id}/unmatch`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail to unmatch non-existent match', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .post(`/api/matches/${fakeId}/unmatch`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.success).to.be.false;
          done();
        });
    });
  });
});