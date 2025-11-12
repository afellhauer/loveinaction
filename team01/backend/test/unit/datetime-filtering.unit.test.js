// Unit tests for Activities date/time filtering functionality
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Profile = require('../../models/Profile');
const activitiesRouter = require('../../routes/activities');

const { expect } = chai;
chai.use(chaiHttp);

const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/activities', activitiesRouter);

describe('Activities Date/Time Filtering Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;
  let testUser;
  let testUser2;
  let testUser3;
  let authToken;
  let authToken2;
  let authToken3;

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
    console.log('[DATETIME-FILTERING] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[DATETIME-FILTERING] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Activity.deleteMany({});
    await Profile.deleteMany({});

    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@datetime.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser.save();

    testUser2 = new User({
      firstName: 'Test2',
      lastName: 'User2',
      email: 'test2@datetime.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser2.save();

    testUser3 = new User({
      firstName: 'Test3',
      lastName: 'User3',
      email: 'test3@datetime.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser3.save();

    const testProfile = new Profile({
      user: testUser._id,
      age: 25,
      location: 'ubc',
      gender: 'Male',
      pronouns: 'he/him',
      preference: 'Everyone',
      bio: 'Test bio',
      safetyScore: 4.5
    });
    await testProfile.save();

    const testProfile2 = new Profile({
      user: testUser2._id,
      age: 23,
      location: 'ubc',
      gender: 'Female',
      pronouns: 'she/her',
      preference: 'Everyone',
      bio: 'Test bio 2',
      safetyScore: 4.2
    });
    await testProfile2.save();

    const testProfile3 = new Profile({
      user: testUser3._id,
      age: 28,
      location: 'ubc',
      gender: 'Male',
      pronouns: 'he/him',
      preference: 'Everyone',
      bio: 'Test bio 3',
      safetyScore: 4.8
    });
    await testProfile3.save();

    authToken = generateTestToken(testUser._id);
    authToken2 = generateTestToken(testUser2._id);
    authToken3 = generateTestToken(testUser3._id);
  });

  const createActivity = (userId, options = {}) => {
    return new Activity({
      userId,
      activityType: options.activityType || 'Soccer',
      location: options.location || 'ubc',
      dates: options.dates || [],
      times: options.times || [],
      isActive: options.isActive !== undefined ? options.isActive : true,
      ...options
    });
  };

  describe('Date/Time Matching Logic', function() {
    
    describe('Exact Date and Time Matches', function() {
      it('should match activities with same date and same time', async function() {
        const testDate = new Date('2025-07-05');
        
        //acitvity: july 5th, morning
        const userActivity = createActivity(testUser._id, {
          dates: [testDate],
          times: ['morning']
        });
        await userActivity.save();

        //matching activity: july 5th, morning
        const matchingActivity = createActivity(testUser2._id, {
          dates: [testDate],
          times: ['morning']
        });
        await matchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });

      it('should not match activities with same date but different time', async function() {
        const testDate = new Date('2025-07-05');
        
        //acitvity: july 5th, morning
        const userActivity = createActivity(testUser._id, {
          dates: [testDate],
          times: ['morning']
        });
        await userActivity.save();

        //non-matching activity: july 5th, afternoon
        const nonMatchingActivity = createActivity(testUser2._id, {
          dates: [testDate],
          times: ['afternoon']
        });
        await nonMatchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(0);
      });

      it('should NOT match activities with different date but same time', async function() {
        //acitvity: july 5th, morning
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //non-matching activity: july 6th, morning
        const nonMatchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-06')],
          times: ['morning']
        });
        await nonMatchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(0);
      });
    });

    describe('Flexible Date Matching', function() {
      it('should match when user has specific date but other has flexible dates', async function() {
        //july 5, morning
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //flexible activity: no date, morning
        const flexibleActivity = createActivity(testUser2._id, {
          dates: [], // flexible dates
          times: ['morning']
        });
        await flexibleActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });

      it('should match when user has flexible dates but other has specific date', async function() {
        //flexible date, morning
        const userActivity = createActivity(testUser._id, {
          dates: [], // flexible dates
          times: ['morning']
        });
        await userActivity.save();

        //july 5th, morning
        const specificActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await specificActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });
    });

    describe('Flexible Time Matching', function() {
      it('should match when user has specific time but other has flexible times', async function() {
        //july 5th, morning
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //flex activity: july5th, flexible time
        const flexibleActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: [] 
        });
        await flexibleActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });

      it('should match when user has flexible times but other has specific time', async function() {
        //july 5th, flexible time
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: []
        });
        await userActivity.save();

        //july 5th, morning
        const specificActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await specificActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });
    });

    describe('Both Flexible Matching', function() {
      it('should match when both activities have flexible dates and times', async function() {
        //flexible date and time
        const userActivity = createActivity(testUser._id, {
          dates: [], 
          times: [] 
        });
        await userActivity.save();

        //flexible date and time
        const flexibleActivity = createActivity(testUser2._id, {
          dates: [], 
          times: [] 
        });
        await flexibleActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });
    });

    describe('Multiple Dates and Times', function() {
      it('should match when there is any overlapping date and time', async function() {
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05'), new Date('2025-07-06')],
          times: ['morning', 'evening']
        });
        await userActivity.save();

        const matchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-06'), new Date('2025-07-07')],
          times: ['evening', 'afternoon']
        });
        await matchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });

      it('should not match when dates overlap but times do not', async function() {
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05'), new Date('2025-07-06')],
          times: ['morning', 'evening']
        });
        await userActivity.save();

        const nonMatchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05'), new Date('2025-07-07')],
          times: ['afternoon'] 
        });
        await nonMatchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(0);
      });

      it('should NOT match when times overlap but dates do not', async function() {
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05'), new Date('2025-07-06')],
          times: ['morning', 'evening']
        });
        await userActivity.save();

        const nonMatchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-07'), new Date('2025-07-08')], 
          times: ['morning'] 
        });
        await nonMatchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(0);
      });
    });

    describe('Complex Filtering Scenarios', function() {
      it('should handle multiple matches with different flexibility levels', async function() {
        //july 5th, morning
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //exact match: july 5th, morning
        const exactMatch = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await exactMatch.save();

        //flexible date, morning
        const flexibleDateMatch = createActivity(testUser3._id, {
          dates: [],
          times: ['morning']
        });
        await flexibleDateMatch.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(2);
        
        const names = res.body.data.map(match => match.name);
        expect(names).to.include('Test2 User2');
        expect(names).to.include('Test3 User3');
      });

      it('should filter out non-matching activities correctly', async function() {
        //july 5th, morning
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //matched activity: july 5th, morning
        const matchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await matchingActivity.save();

        //non-matching activity: july 5th, afternoon
        const nonMatchingActivity = createActivity(testUser3._id, {
          dates: [new Date('2025-07-05')],
          times: ['afternoon']
        });
        await nonMatchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
        expect(res.body.data[0].name).to.equal('Test2 User2');
      });
    });

    describe('Edge Cases', function() {
      it('should handle activities with only dates specified (no times)', async function() {
        //july 5th, flex times
        const userActivity = createActivity(testUser._id, {
          dates: [new Date('2025-07-05')],
          times: []
        });
        await userActivity.save();

        //july 5th, morning
        const matchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await matchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
      });

      it('should handle activities with only times specified (no dates)', async function() {
        //no dates, morning
        const userActivity = createActivity(testUser._id, {
          dates: [],
          times: ['morning']
        });
        await userActivity.save();

        //july 5th, morning
        const matchingActivity = createActivity(testUser2._id, {
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await matchingActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(1);
      });

      it('should not match different activity types even with matching dates/times', async function() {
        //Soccer, July 5, morning
        const userActivity = createActivity(testUser._id, {
          activityType: 'Soccer',
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //Basketball, July 5, morning
        const differentActivity = createActivity(testUser2._id, {
          activityType: 'Basketball',
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await differentActivity.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(0);
      });

      it('should not match different locations even with matching dates/times', async function() {
        //ubc, july 5th, morning
        const userActivity = createActivity(testUser._id, {
          location: 'ubc',
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await userActivity.save();

        //downtown, July 5, morning
        const differentLocation = createActivity(testUser2._id, {
          location: 'downtown',
          dates: [new Date('2025-07-05')],
          times: ['morning']
        });
        await differentLocation.save();

        const res = await chai.request(app)
          .get(`/api/activities/${userActivity._id}/matches`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.data).to.have.length(0);
      });
    });
  });
});
