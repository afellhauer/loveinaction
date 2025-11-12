const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const authMiddleware = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const Match = require('../../models/Match');
const Message = require('../../models/Message');
const messagesRouter = require('../../routes/messages');

const { expect } = chai;
chai.use(chaiHttp);

//creating mock for authMiddleware
const mockAuthMiddleware = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      req.user = { _id: decoded.userId };
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
};

const express = require('express');
const app = express();
app.use(express.json());

const originalStack = messagesRouter.stack;
messagesRouter.stack = originalStack.map(layer => {
  if (layer.route) {
    layer.route.stack = layer.route.stack.map(routeLayer => {
      if (routeLayer.handle === authMiddleware) {
        routeLayer.handle = mockAuthMiddleware;
      }
      return routeLayer;
    });
  }
  return layer;
});

app.use('/api/messages', messagesRouter);

describe('Messages API Tests', function() {
  this.timeout(15000);
  let mongoServer;
  
  let user1, user2;
  let user1Token, user2Token;
  let match;
  let message1, message2;

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
    console.log('[MESSAGES] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[MESSAGES] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Match.deleteMany({});
    await Message.deleteMany({});

    user1 = new User({
      firstName: 'User',
      lastName: '1',
      email: 'user1@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await user1.save();
    
    user2 = new User({
      firstName: 'User',
      lastName: '2',
      email: 'user2@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await user2.save();

    user1Token = generateTestToken(user1._id);
    user2Token = generateTestToken(user2._id);

    //creating a match
    match = new Match({
      user1Id: user1._id,
      user2Id: user2._id,
      activityType: 'Tennis',
      location: 'Downtown',
      dates: [new Date('2025-07-10')],
      status: 'active', 
      lastMessageAt: new Date()
    });
    await match.save();

    //checking match.isActive() works 
    const savedMatch = await Match.findById(match._id);
    if (!savedMatch.isActive()) {
      throw new Error('Match is not active, this will cause tests to fail');
    }

    //creating test messages
    message1 = new Message({
      matchId: match._id,
      senderId: user1._id,
      content: 'Hello from user1',
      messageType: 'text'
    });
    await message1.save();
    
    message2 = new Message({
      matchId: match._id,
      senderId: user2._id,
      content: 'Hello from user2',
      messageType: 'text'
    });
    await message2.save();
  });

  describe('POST /api/messages', function() {
    it('should create a new message successfully', function(done) {
      const newMessage = {
        matchId: match._id.toString(),
        content: 'This is a new test message',
        messageType: 'text'
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(newMessage)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.have.property('content', newMessage.content);
          expect(res.body.data).to.have.property('senderId');
          expect(res.body.data).to.have.property('matchId');
          done();
        });
    });

    it('should create a confirmation message type correctly', function(done) {
      const confirmationMessage = {
        matchId: match._id.toString(),
        content: 'I confirm our plans',
        messageType: 'confirmation'
      };

      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(confirmationMessage)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.have.property('messageType', 'confirmation');
          done();
        });
    });
    
    it('should handle message with "sounds good" content as regular text message', async function() {
      const confirmMessage = {
        matchId: match._id.toString(),
        content: 'sounds good',
        messageType: 'text'
      };

      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(confirmMessage);
        
      expect(res).to.have.status(201);
      expect(res.body.data.messageType).to.equal('text');
      expect(res.body.data.content).to.equal('sounds good');
    });

    it('should return 400 if required fields are missing (content)', function(done) {
      chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ matchId: match._id.toString() }) 
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          done();
        });
    });

    it('should return 403 if user does not have access to the match', async function() {
      //create a new user who is not part of the match
      const user3 = new User({
        firstName: 'Third',
        lastName: 'User',
        email: 'thirduser@test.com',
        dateOfBirth: new Date('1995-01-01'),
        passwordHash: 'hashedpassword',
        isVerified: true
      });
      await user3.save();
      const user3Token = generateTestToken(user3._id);

      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          matchId: match._id.toString(),
          content: 'This should fail'
        });

      expect(res).to.have.status(403);
      expect(res.body.success).to.be.false;
    });
  });

  describe('GET /api/messages/match/:matchId', function() {
    it('should return messages for a match', function(done) {
      chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.be.an('array');
          expect(res.body.data.length).to.be.at.least(2);
          done();
        });
    });

    it('should return messages in the correct order (oldest first)', function(done) {
      chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          const messages = res.body.data;
          
          for (let i = 0; i < messages.length - 1; i++) {
            const currMsgTime = new Date(messages[i].createdAt).getTime();
            const nextMsgTime = new Date(messages[i+1].createdAt).getTime();
            expect(currMsgTime).to.be.at.most(nextMsgTime);
          }
          
          done();
        });
    });
    
    it('should return 403 if user is not part of the match', async function() {
      //create a third user who is not part of the match
      const user3 = new User({
        firstName: 'Third',
        lastName: 'User',
        email: 'third@test.com',
        dateOfBirth: new Date('1995-01-01'),
        passwordHash: 'hashedpassword',
        isVerified: true
      });
      await user3.save();
      const user3Token = generateTestToken(user3._id);

      const res = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res).to.have.status(403);
      expect(res.body.success).to.be.false;
    });

  });

  describe('PUT /api/messages/:id/read', function() {
    it('should mark a message as read', function(done) {
      //user1 marking user2s msg as read
      chai.request(app)
        .put(`/api/messages/${message2._id}/read`)
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.have.property('readAt');
          expect(res.body.data.readAt).to.not.be.null;
          done();
        });
    });

    it('should not allow marking your own message as read', function(done) {
      chai.request(app)
        .put(`/api/messages/${message1._id}/read`)
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          done();
        });
    });
  });

  describe('PUT /api/messages/match/:matchId/read-all', function() {
    it('should mark all messages in a match as read', function(done) {
      chai.request(app)
        .put(`/api/messages/match/${match._id}/read-all`)
        .set('Authorization', `Bearer ${user1Token}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.have.property('modifiedCount');
          done();
        });
    });
  });
  
  describe('Match Status Updates via Messages', function() {
    it('should update match with confirmation messages', async function() {
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id.toString(),
          content: 'I confirm',
          messageType: 'confirmation'
        });
        
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id.toString(),
          content: 'I confirm too',
          messageType: 'confirmation'
        });
        
      const messages = await Message.find({ matchId: match._id, messageType: 'confirmation' });
      expect(messages.length).to.equal(2);
    });
  });

  describe('GET /api/messages/match/:matchId/unread-count', function() {
    it('should return the correct unread message count', async function() {
      const res = await chai.request(app)
        .get(`/api/messages/match/${match._id}/unread-count`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('unreadCount');
      expect(res.body.data.unreadCount).to.equal(1); 
    });

    it('should return 0 unread count after marking messages as read', async function() {
      //marking all msgs as read
      await chai.request(app)
        .put(`/api/messages/match/${match._id}/read-all`)
        .set('Authorization', `Bearer ${user1Token}`);

      const res = await chai.request(app)
        .get(`/api/messages/match/${match._id}/unread-count`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.data.unreadCount).to.equal(0);
    });
  });
});
