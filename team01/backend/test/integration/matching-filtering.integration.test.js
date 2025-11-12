// Integration tests for matching and filtering logic
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const app = require('../../server');

const User = require('../../models/User');
const Profile = require('../../models/Profile');
const Activity = require('../../models/Activity');
const Swipe = require('../../models/Swipe');
const Match = require('../../models/Match');

const { expect } = chai;
chai.use(chaiHttp);

describe('Matching & Filtering Integration Tests', function() {
  this.timeout(30000);
  
  before(async function() {
    // Set up test environment variables
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
    
    const dbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/loveinaction_integration_test';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUri);
    }
    console.log('[MATCHING-FILTERING] Connected to test database');
  });

  after(async function() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('[MATCHING-FILTERING] Database cleaned up');
  });

  beforeEach(async function() {
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      Activity.deleteMany({}),
      Swipe.deleteMany({}),
      Match.deleteMany({})
    ]);
  });

  describe('Preference Filtering', function() {
    it('should handle basic incompatible preference filtering', async function() {
      // Test with users who have incompatible preferences
      // Verify they don't see each other in matches
      
      // User1: Female seeking Male
      const signupRes1 = await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Sarah',
          lastName: 'Connor',
          email: 'sarah@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const user1 = await User.findOne({ email: 'sarah@test.com' });
      user1.isVerified = true;
      await user1.save();
      
      const loginRes1 = await chai.request(app)
        .post('/api/auth/login')
        .send({ email: 'sarah@test.com', password: 'password123' });
      const token1 = loginRes1.body.accessToken;
      
      await chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          age: 30,
          location: 'downtown',
          gender: 'Female',
          pronouns: 'she/her',
          preference: 'Male'
        });
      
      const activityRes1 = await chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          activityType: 'Tennis',
          location: 'downtown',
          dates: [new Date('2024-12-01')]
        });
      
      expect(activityRes1).to.have.status(201);
      expect(activityRes1.body.data._id).to.exist;
      
      // User2: Female seeking Female (incompatible with User1)
      const signupRes2 = await chai.request(app)
        .post('/api/auth/signup')
        .send({
          firstName: 'Lisa',
          lastName: 'Park',
          email: 'lisa@test.com',
          password: 'password123',
          dateOfBirth: '1995-01-01'
        });
      
      const user2 = await User.findOne({ email: 'lisa@test.com' });
      user2.isVerified = true;
      await user2.save();
      
      const loginRes2 = await chai.request(app)
        .post('/api/auth/login')
        .send({ email: 'lisa@test.com', password: 'password123' });
      const token2 = loginRes2.body.accessToken;
      
      await chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          age: 28,
          location: 'downtown',
          gender: 'Female',
          pronouns: 'she/her',
          preference: 'Female'
        });
      
      await chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          activityType: 'Tennis',
          location: 'downtown',
          dates: [new Date('2024-12-01')]
        });
      
      // Verify they don't see each other in matches
      const activity1Id = activityRes1.body.data._id;
      expect(activity1Id).to.exist;
      
      const matchesRes1 = await chai.request(app)
        .get(`/api/activities/${activity1Id}/matches`)
        .set('Authorization', `Bearer ${token1}`);
      
      expect(matchesRes1.body.data).to.have.length(0);
    });

    it('should handle large-scale preference filtering with multiple user types', async function() {
      // Create multiple users with various preferences
      const users = [];
      const tokens = [];

      const userConfigs = [
        { firstName: 'Male1', gender: 'Male', preference: 'Female' },
        { firstName: 'Male2', gender: 'Male', preference: 'Male' },
        { firstName: 'Female1', gender: 'Female', preference: 'Male' },
        { firstName: 'Female2', gender: 'Female', preference: 'Female' },
        { firstName: 'NonBinary1', gender: 'Non-binary', preference: 'Everyone' },
        { firstName: 'NonBinary2', gender: 'Non-binary', preference: 'Non-binary' }
      ];

      // Create all users
      for (let i = 0; i < userConfigs.length; i++) {
        const config = userConfigs[i];
        
        await chai.request(app)
          .post('/api/auth/signup')
          .send({
            firstName: config.firstName,
            lastName: 'Test',
            email: `${config.firstName.toLowerCase()}@test.com`,
            password: 'password123',
          dateOfBirth: '1995-01-01'
          });

        const user = await User.findOne({ email: `${config.firstName.toLowerCase()}@test.com` });
        user.isVerified = true;
        await user.save();
        users.push(user);

        const loginRes = await chai.request(app)
          .post('/api/auth/login')
          .send({
            email: `${config.firstName.toLowerCase()}@test.com`,
            password: 'password123',
          dateOfBirth: '1995-01-01'
          });

        tokens.push(loginRes.body.accessToken);

        // Create profile
        await chai.request(app)
          .post('/api/profile')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            age: 25,
            location: 'downtown',
            gender: config.gender,
            pronouns: config.gender === 'Male' ? 'he/him' : config.gender === 'Female' ? 'she/her' : 'they/them',
            preference: config.preference
          });

        // Create activity
        await chai.request(app)
          .post('/api/activities')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            activityType: 'Tennis',
            location: 'downtown',
            dates: [new Date('2024-12-01')]
          });
      }

      // Test matching for each user
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const token = tokens[i];
        const config = userConfigs[i];

        const activities = await Activity.find({ userId: user._id });
        const activityId = activities[0]._id;

        const matchesRes = await chai.request(app)
          .get(`/api/activities/${activityId}/matches`)
          .set('Authorization', `Bearer ${token}`);

        expect(matchesRes).to.have.status(200);

        // Verify preference filtering works
        const matches = matchesRes.body.data;
        
        for (const match of matches) {
          const matchGender = match.gender;
          const matchPreference = match.preference;

          // Verify mutual compatibility
          let shouldMatch = false;

          // Check if current user matches other user's preference
          if (matchPreference === 'Everyone' || 
              (matchPreference === config.gender)) {
            // Check if other user matches current user's preference  
            if (config.preference === 'Everyone' || 
                config.preference === matchGender) {
              shouldMatch = true;
            }
          }

          expect(shouldMatch).to.be.true;
        }
      }
    });

    it('should handle geographic location filtering', async function() {
      // Create users in different locations
      const locations = ['downtown', 'kitsilano', 'ubc'];
      const users = [];
      const tokens = [];

      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        await chai.request(app)
          .post('/api/auth/signup')
          .send({
            firstName: `User${location}`,
            lastName: 'Test',
            email: `user${location.toLowerCase()}@test.com`,
            password: 'password123',
            dateOfBirth: '1995-01-01'
          });

        const user = await User.findOne({ email: `user${location.toLowerCase()}@test.com` });
        user.isVerified = true;
        await user.save();
        users.push(user);

        const loginRes = await chai.request(app)
          .post('/api/auth/login')
          .send({
            email: `user${location.toLowerCase()}@test.com`,
            password: 'password123'
          });

        tokens.push(loginRes.body.accessToken);

        await chai.request(app)
          .post('/api/profile')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            age: 25,
            location: location,
            gender: 'Male',
            pronouns: 'he/him',
            preference: 'Everyone'
          });

        await chai.request(app)
          .post('/api/activities')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            activityType: 'Running',
            location: location,
            dates: [new Date('2024-12-01')]
          });
      }

      // Test that downtown user only sees downtown activities
      const downtownUser = users[0];
      const downtownToken = tokens[0];
      const downtownActivities = await Activity.find({ userId: downtownUser._id });

      const matchesRes = await chai.request(app)
        .get(`/api/activities/${downtownActivities[0]._id}/matches`)
        .set('Authorization', `Bearer ${downtownToken}`);

      expect(matchesRes).to.have.status(200);
      
      // Should only see matches from same location
      const matches = matchesRes.body.data;
      for (const match of matches) {
        expect(match.location).to.equal('downtown');
      }
    });
  });

  describe('Concurrent Matching Operations', function() {
    it('should handle simultaneous swipes without race conditions', async function() {
      // Create two users
      const users = [];
      const tokens = [];

      for (let i = 1; i <= 2; i++) {
        await chai.request(app)
          .post('/api/auth/signup')
          .send({
            firstName: `Concurrent${i}`,
            lastName: 'Test',
            email: `concurrent${i}@test.com`,
            password: 'password123',
            dateOfBirth: '1995-01-01'
          });

        const user = await User.findOne({ email: `concurrent${i}@test.com` });
        user.isVerified = true;
        await user.save();
        users.push(user);

        const loginRes = await chai.request(app)
          .post('/api/auth/login')
          .send({
            email: `concurrent${i}@test.com`,
            password: 'password123'
          });

        tokens.push(loginRes.body.accessToken);

        await chai.request(app)
          .post('/api/profile')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            age: 25,
            location: 'downtown',
            gender: 'Male',
            pronouns: 'he/him',
            preference: 'Everyone'
          });

        await chai.request(app)
          .post('/api/activities')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            activityType: 'Soccer',
            location: 'downtown',
            dates: [new Date('2024-12-01')]
          });
      }

      const activities = await Activity.find({});
      expect(activities).to.have.length(2);
      const activity1 = activities.find(a => a.userId.equals(users[0]._id));
      const activity2 = activities.find(a => a.userId.equals(users[1]._id));
      expect(activity1).to.exist;
      expect(activity2).to.exist;

      // Simulate concurrent swipes
      const swipePromises = [
        chai.request(app)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${tokens[0]}`)
          .send({ swipedUserId: users[1]._id, activityId: activity1._id, type: 'like' }),
        chai.request(app)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${tokens[1]}`)
          .send({ swipedUserId: users[0]._id, activityId: activity2._id, type: 'like' })
      ];
      
      const results = await Promise.all(swipePromises);
      
      // Verify exactly one match was created
      const matches = await Match.find({});
      expect(matches).to.have.length(1);
    });

    it('should handle concurrent match creation without duplicates', async function() {
      // Create two users
      const users = [];
      const tokens = [];

      for (let i = 1; i <= 2; i++) {
        await chai.request(app)
          .post('/api/auth/signup')
          .send({
            firstName: `User${i}`,
            lastName: 'Test',
            email: `user${i}@test.com`,
            password: 'password123',
            dateOfBirth: '1995-01-01'
          });

        const user = await User.findOne({ email: `user${i}@test.com` });
        user.isVerified = true;
        await user.save();
        users.push(user);

        const loginRes = await chai.request(app)
          .post('/api/auth/login')
          .send({
            email: `user${i}@test.com`,
            password: 'password123'
          });

        tokens.push(loginRes.body.accessToken);

        await chai.request(app)
          .post('/api/profile')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            age: 25,
            location: 'downtown',
            gender: 'Male',
            pronouns: 'he/him',
            preference: 'Everyone'
          });

        await chai.request(app)
          .post('/api/activities')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .send({
            activityType: 'Soccer',
            location: 'downtown',
            dates: [new Date('2024-12-01')]
          });
      }

      const activities = await Activity.find({});
      const activity1 = activities.find(a => a.userId.equals(users[0]._id));
      const activity2 = activities.find(a => a.userId.equals(users[1]._id));

      // Simulate concurrent swipes that should create a match
      const swipePromises = [
        chai.request(app)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${tokens[0]}`)
          .send({
            swipedUserId: users[1]._id,
            activityId: activity1._id,
            type: 'like'
          }),
        chai.request(app)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${tokens[1]}`)
          .send({
            swipedUserId: users[0]._id,
            activityId: activity2._id,
            type: 'like'
          })
      ];

      const results = await Promise.all(swipePromises);

      // Verify exactly one match was created
      const matches = await Match.find({});
      expect(matches).to.have.length(1);

      // Verify at least one swipe resulted in a match
      const matchCreated = results.some(res => res.body.isMatch === true);
      expect(matchCreated).to.be.true;
    });
  });
}); 