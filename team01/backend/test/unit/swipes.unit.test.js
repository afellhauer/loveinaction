//Unit tests for Swipes routes
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const User = require('../../models/User');
const Swipe = require('../../models/Swipe');
const Activity = require('../../models/Activity');
const swipesRouter = require('../../routes/swipes');

const { expect } = chai;
chai.use(chaiHttp);

const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/swipes', swipesRouter);

describe('Swipes Routes Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;
  let testUser;
  let targetUser;
  let testActivity;
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
    console.log('[SWIPE] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[SWIPE] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Swipe.deleteMany({});
    await Activity.deleteMany({});

    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@swipes.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser.save();

    targetUser = new User({
      firstName: 'Target',
      lastName: 'User',
      email: 'target@swipes.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await targetUser.save();

    testActivity = new Activity({
      userId: testUser._id,
      activityType: 'Soccer',
      location: 'ubc',
      dates: [new Date()],
      times: ['morning'],
      isActive: true
    });
    await testActivity.save();

    authToken = generateTestToken(testUser._id);
  });

  describe('POST /api/swipes', function() {
    it('should create a right swipe successfully', function(done) {
      const swipeData = {
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.data.type).to.equal('like');
          expect(res.body.data.swipedUserId).to.equal(targetUser._id.toString());
          done();
        });
    });

    it('should create a left swipe successfully', function(done) {
      const swipeData = {
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'pass'
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.data.type).to.equal('pass');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      const swipeData = {
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      };

      chai.request(app)
        .post('/api/swipes')
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail with missing target user ID', function(done) {
      const swipeData = {
        activityId: testActivity._id,
        type: 'like'
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should fail with missing direction', function(done) {
      const swipeData = {
        swipedUserId: targetUser._id,
        activityId: testActivity._id
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should fail with invalid direction', function(done) {
      const swipeData = {
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'invalid'
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should prevent duplicate swipes on same user', async function() {
      const swipeData = { 
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      };

      await chai.request(app) //first swipe
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData);

      
      const res = await chai.request(app) //second swipe same user
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData);

      expect(res).to.have.status(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('You have already swiped on this user');
    });

    it('should not swipe on self', function(done) {
      const swipeData = {
        swipedUserId: testUser._id, 
        activityId: testActivity._id,
        type: 'like'
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(500);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should fail with non-existent target user', function(done) {
      const fakeUserId = new mongoose.Types.ObjectId();
      const swipeData = {
        swipedUserId: fakeUserId,
        activityId: testActivity._id,
        type: 'like'
      };

      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData)
        .end((err, res) => {
          expect(res).to.have.status(404); 
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should save swipe data to database', async function() {
      const swipeData = {
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      };

      await chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(swipeData);

      const savedSwipe = await Swipe.findOne({ 
        swiperId: testUser._id, 
        swipedUserId: targetUser._id 
      });
      expect(savedSwipe).to.exist;
      expect(savedSwipe.type).to.equal('like');
    });
  });

  describe('GET /api/swipes/my-swipes', function() {
    beforeEach(async function() {
      //creating swipe hisotry
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

        const swipe = new Swipe({
          swiperId: testUser._id,
          swipedUserId: user._id,
          activityId: testActivity._id,
          type: i % 2 === 0 ? 'like' : 'pass'
        });
        await swipe.save();
      }
    });

    it('should get user swipe history', function(done) {
      chai.request(app)
        .get('/api/swipes/my-swipes')
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
        .get('/api/swipes/my-swipes')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should return empty array for user with no swipes', async function() {
      await Swipe.deleteMany({ swiperId: testUser._id });

      const res = await chai.request(app)
        .get('/api/swipes/my-swipes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array').that.is.empty;
    });

    it('should sort swipes by creation date (newest first)', async function() {
      await Swipe.deleteMany({ swiperId: testUser._id });

      const anotherUser = new User({
        firstName: 'Another',
        lastName: 'User',
        email: 'another@test.com',
        dateOfBirth: new Date('1995-01-01'),
        passwordHash: 'hashedpassword',
        isVerified: true
      });
      await anotherUser.save();

      //creating swipes with different times
      const oldSwipe = new Swipe({
        swiperId: testUser._id,
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'pass',
        createdAt: new Date('2025-01-01')
      });

      const newSwipe = new Swipe({
        swiperId: testUser._id,
        swipedUserId: anotherUser._id,
        activityId: testActivity._id,
        type: 'like',
        createdAt: new Date('2025-07-01')
      });

      await oldSwipe.save();
      await newSwipe.save();

      const res = await chai.request(app)
        .get('/api/swipes/my-swipes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data[0].type).to.equal('like'); 
      expect(res.body.data[1].type).to.equal('pass');
    });

    it('should only return current user\'s swipes', async function() {
      const otherUser = new User({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@test.com',
        dateOfBirth: new Date('1995-01-01'),
        passwordHash: 'hashedpassword',
        isVerified: true
      });
      await otherUser.save();

      const otherSwipe = new Swipe({
        swiperId: otherUser._id,
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      });
      await otherSwipe.save();

      const res = await chai.request(app)
        .get('/api/swipes/my-swipes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(3); 
      res.body.data.forEach(swipe => {
        expect(swipe.swiperId.toString()).to.equal(testUser._id.toString());
      });
    });
  });

  describe('GET /api/swipes/matches/:activityId', function() {
    beforeEach(async function() {
      const swipe1 = new Swipe({
        swiperId: testUser._id,
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      });
      
      const swipe2 = new Swipe({
        swiperId: targetUser._id,
        swipedUserId: testUser._id,
        activityId: testActivity._id,
        type: 'like'
      });

      await swipe1.save();
      await swipe2.save();
    });

    it('should get user matches (mutual right swipes)', function(done) {
      chai.request(app)
        .get(`/api/swipes/matches/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.be.an('array');
          expect(res.body.data).to.have.length(1);
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get(`/api/swipes/matches/${testActivity._id}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should not return non-mutual swipes', async function() {
      await Swipe.deleteMany({});

      const oneWaySwipe = new Swipe({
        swiperId: testUser._id,
        swipedUserId: targetUser._id,
        activityId: testActivity._id,
        type: 'like'
      });
      await oneWaySwipe.save();

      const res = await chai.request(app)
        .get(`/api/swipes/matches/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.be.an('array').that.is.empty;
    });
  });

  describe('Data Validation', function() {
    it('should handle empty request body', function(done) {
      chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          done();
        });
    });
  });
});