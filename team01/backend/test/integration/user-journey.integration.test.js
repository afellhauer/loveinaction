// Integration tests for complete user journeys
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const app = require('../../server');

const User = require('../../models/User');
const Profile = require('../../models/Profile');
const Activity = require('../../models/Activity');
const Swipe = require('../../models/Swipe');
const Match = require('../../models/Match');
const Rating = require('../../models/Rating');
const Message = require('../../models/Message');

const { expect } = chai;
chai.use(chaiHttp);

describe('Integration Tests - Complete User Journeys', function() {
  this.timeout(30000); // Longer timeout for integration tests
  
  before(async function() {
    // Set up test environment variables
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
    
    // Connect to test database (could be real MongoDB instance)
    const dbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/loveinaction_integration_test';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUri);
    }
    console.log('[INTEGRATION] Connected to test database');
  });

  after(async function() {
    // Clean up test database
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('[INTEGRATION] Database cleaned up');
  });

  beforeEach(async function() {
    // Clean all collections before each test
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      Activity.deleteMany({}),
      Swipe.deleteMany({}),
      Match.deleteMany({}),
      Rating.deleteMany({}),
      Message.deleteMany({})
    ]);
  });

  describe('Complete Dating App Flow', function() {
    it('should handle full user journey from signup to rating', async function() {
      // Step 1: User1 Signs Up
      const signupRes1 = await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      expect(signupRes1).to.have.status(201);
      expect(signupRes1.body.message).to.include('Please check your email');
      
      // Step 2: User1 Email Verification (simulate)
      const user1 = await User.findOne({ email: 'alice@test.com' });
      user1.isVerified = true;
      await user1.save();
      
      // Step 3: User1 Login
      const loginRes1 = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      expect(loginRes1).to.have.status(200);
      expect(loginRes1.body.accessToken).to.exist;
      const token1 = loginRes1.body.accessToken;
      
      // Step 4: User1 Creates Profile
      const profileRes1 = await chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          age: 25,
          location: 'downtown',
          gender: 'Female',
          pronouns: 'she/her',
          preference: 'Male',
          bio: 'Love hiking and outdoor activities!'
        });
      
      expect(profileRes1).to.have.status(200);
      
      // Step 5: User1 Creates Activity
      const activityRes1 = await chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          activityType: 'Hike',
          location: 'downtown',
          dates: [new Date('2024-12-01')],
          times: ['morning']
        });
      
      expect(activityRes1).to.have.status(201);
      expect(activityRes1.body.data._id).to.exist;
      const activity1Id = activityRes1.body.data._id;
      
      // Step 6: User2 Signs Up and Creates Profile/Activity
      const signupRes2 = await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Bob',
          lastName: 'Smith',
          email: 'bob@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const user2 = await User.findOne({ email: 'bob@test.com' });
      user2.isVerified = true;
      await user2.save();
      
      const loginRes2 = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const token2 = loginRes2.body.accessToken;
      
      await chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          age: 28,
          location: 'downtown',
          gender: 'Male',
          pronouns: 'he/him',
          preference: 'Female',
          bio: 'Outdoor enthusiast and adventure seeker!'
        });
      
      const activityRes2 = await chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          activityType: 'Hike',
          location: 'downtown',
          dates: [new Date('2024-12-01')],
          times: ['morning']
        });
      
      const activity2Id = activityRes2.body.data._id;
      
      // Step 7: Users Find Each Other's Activities
      const matchesRes1 = await chai.request(app)
        .get(`/api/activities/${activity1Id}/matches`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(matchesRes1).to.have.status(200);
      expect(matchesRes1.body.data).to.have.length.greaterThan(0);
      
      // Step 8: Mutual Swiping
      await chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          swipedUserId: user2._id,
          activityId: activity1Id,
          type: 'like'
        });
      
      const swipeRes2 = await chai.request(app)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          swipedUserId: user1._id,
          activityId: activity2Id,
          type: 'like'
        });
      
      // Should create a match
      expect(swipeRes2).to.have.status(201);
      expect(swipeRes2.body.isMatch).to.be.true;
      
      // Step 9: Verify Match Creation
      const matchesAfterSwipe = await chai.request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${token1}`);
      
      expect(matchesAfterSwipe.body.data).to.have.length(1);
      const matchId = matchesAfterSwipe.body.data[0]._id;
      
      // Step 10: Message Exchange
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          matchId: matchId,
          content: 'Hi Bob! Excited for our hike!',
          type: 'text'
        });
      
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          matchId: matchId,
          content: 'Hi Alice! Me too! Saturday morning works great.',
          type: 'text'
        });
      
      // Step 11: Date Confirmation (simulate date passing)
      const match = await Match.findById(matchId);
      match.status = 'date_passed';
      await match.save();
      
      // Step 12: Mutual Rating
      await chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          ratee: user2._id,
          safetyAndRespect: {
            madeMeFeelSafe: true,
            asDescribedInProfile: true,
            respectfulOfBoundaries: true
          },
          consideration: {
            onTime: true,
            attentive: true,
            goodManners: true
          },
          qualities: {
            dressedWell: true,
            goodEnergy: true,
            athletic: true
          },
          comments: 'Great hiking partner!',
          connectionStrength: 5
        });
      
      await chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          ratee: user1._id,
          safetyAndRespect: {
            madeMeFeelSafe: true,
            asDescribedInProfile: true,
            respectfulOfBoundaries: true
          },
          consideration: {
            onTime: true,
            attentive: true,
            goodManners: true
          },
          qualities: {
            dressedWell: true,
            goodEnergy: true,
            athletic: true
          },
          comments: 'Amazing adventure buddy!',
          connectionStrength: 5
        });
      
      // Step 13: Verify Profile Stats Updated
      // Wait a bit for async profile stats calculation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalProfile1 = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${token1}`);
      
      const finalProfile2 = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${token2}`);
      
      // Verify safety scores and badges were calculated
      expect(finalProfile1.body.profile.safetyScore).to.be.greaterThan(0);
      expect(finalProfile2.body.profile.safetyScore).to.be.greaterThan(0);
      expect(finalProfile1.body.profile.badges).to.include('🛡️ Trusted');
      expect(finalProfile2.body.profile.badges).to.include('🛡️ Trusted');
      
      // Step 14: Verify Match is Expired
      const finalMatch = await Match.findById(matchId);
      expect(finalMatch.status).to.equal('expired');
      expect(finalMatch.user1Rating).to.equal(5);
      expect(finalMatch.user2Rating).to.equal(5);
    });
    

  });
  


}); 