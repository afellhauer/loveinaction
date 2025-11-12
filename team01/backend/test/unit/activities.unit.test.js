// Unit tests for Activities routes
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

describe('Activities Routes Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;
  let testUser;
  let testUser2;
  let authToken;
  let authToken2;

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
    console.log('[ACTIVITIES] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[ACTIVITIES] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Activity.deleteMany({});
    await Profile.deleteMany({});

    // Create test users
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@activities.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser.save();

    testUser2 = new User({
      firstName: 'Test2',
      lastName: 'User2',
      email: 'test2@activities.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser2.save();

    // Create test profiles
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
      location: 'downtown',
      gender: 'Female',
      pronouns: 'she/her',
      preference: 'Everyone',
      bio: 'Test bio 2',
      safetyScore: 4.2
    });
    await testProfile2.save();

    authToken = generateTestToken(testUser._id);
    authToken2 = generateTestToken(testUser2._id);
  });

  const createValidActivity = (userId, options = {}) => {
    return {
      userId,
      activityType: options.activityType || 'Soccer',
      location: options.location || 'ubc',
      dates: options.dates || [new Date('2025-01-01')],
      times: options.times || ['morning'],
      isActive: options.isActive !== undefined ? options.isActive : true,
      ...options
    };
  };

  describe('POST /api/activities', function() {
    it('should create a new activity with valid data', function(done) {
      const activityData = {
        activityType: 'Soccer',
        location: 'ubc',
        dates: ['2025-01-01'],
        times: ['morning']
      };

      chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.have.property('activityType', 'Soccer');
          expect(res.body.data).to.have.property('location', 'ubc');
          expect(res.body.data).to.have.property('userId');
          expect(res.body.message).to.include('created successfully');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      const activityData = {
        activityType: 'Soccer',
        location: 'ubc'
      };

      chai.request(app)
        .post('/api/activities')
        .send(activityData)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail when activityType is missing', function(done) {
      const activityData = {
        location: 'ubc'
      };

      chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.include('Activity type and location are required');
          done();
        });
    });

    it('should fail when location is missing', function(done) {
      const activityData = {
        activityType: 'Soccer'
      };

      chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.include('Activity type and location are required');
          done();
        });
    });

    it('should create activity with empty dates and times arrays as default', function(done) {
      const activityData = {
        activityType: 'Basketball',
        location: 'downtown'
      };

      chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.data.dates).to.be.an('array');
          expect(res.body.data.times).to.be.an('array');
          done();
        });
    });

    it('should populate userId with user information', function(done) {
      const activityData = {
        activityType: 'Tennis',
        location: 'kitsilano'
      };

      chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.data.userId).to.have.property('firstName');
          expect(res.body.data.userId).to.have.property('lastName');
          done();
        });
    });

    it('should set isActive to true by default', async function() {
      const activityData = {
        activityType: 'Yoga',
        location: 'olympic village'
      };

      const res = await chai.request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(activityData);

      expect(res.body.data.isActive).to.be.true;
    });
  });

  describe('GET /api/activities/my-activities', function() {
    beforeEach(async function() {
      // Create multiple activities for testUser
      const activities = [
        new Activity(createValidActivity(testUser._id, { activityType: 'Soccer', location: 'ubc' })),
        new Activity(createValidActivity(testUser._id, { activityType: 'Basketball', location: 'downtown' })),
        new Activity(createValidActivity(testUser._id, { activityType: 'Tennis', isActive: false }))
      ];

      for (let activity of activities) {
        await activity.save();
      }

      // Create activity for testUser2
      const otherActivity = new Activity(createValidActivity(testUser2._id, { activityType: 'Yoga' }));
      await otherActivity.save();
    });

    it('should get user\'s active activities', function(done) {
      chai.request(app)
        .get('/api/activities/my-activities')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.be.an('array');
          expect(res.body.data).to.have.length(2); // only active activities
          expect(res.body.count).to.equal(2);
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get('/api/activities/my-activities')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should return empty array for user with no activities', async function() {
      await Activity.deleteMany({ userId: testUser._id });

      const res = await chai.request(app)
        .get('/api/activities/my-activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body.data).to.be.an('array').that.is.empty;
      expect(res.body.count).to.equal(0);
    });

    it('should only return activities for authenticated user', function(done) {
      chai.request(app)
        .get('/api/activities/my-activities')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          res.body.data.forEach(activity => {
            expect(activity.userId.toString()).to.equal(testUser._id.toString());
          });
          done();
        });
    });

    it('should sort activities by creation date (newest first)', async function() {
      await Activity.deleteMany({ userId: testUser._id });

      // Create activities with different timestamps
      const oldActivity = new Activity(createValidActivity(testUser._id, { activityType: 'Old Activity' }));
      oldActivity.createdAt = new Date('2024-01-01');
      await oldActivity.save();

      const newActivity = new Activity(createValidActivity(testUser._id, { activityType: 'New Activity' }));
      newActivity.createdAt = new Date('2025-01-01');
      await newActivity.save();

      const res = await chai.request(app)
        .get('/api/activities/my-activities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data[0].activityType).to.equal('New Activity');
      expect(res.body.data[1].activityType).to.equal('Old Activity');
    });
  });

  describe('GET /api/activities/:activityId/matches', function() {
    let userActivity;
    let matchingActivity;

    beforeEach(async function() {
      // Create user's activity
      userActivity = new Activity(createValidActivity(testUser._id, {
        activityType: 'Soccer',
        location: 'ubc',
        dates: [new Date('2025-01-01')],
        times: ['morning']
      }));
      await userActivity.save();

      // Create matching activity from another user
      matchingActivity = new Activity(createValidActivity(testUser2._id, {
        activityType: 'Soccer',
        location: 'ubc',
        dates: [new Date('2025-01-01')],
        times: ['morning']
      }));
      await matchingActivity.save();
    });

    it('should get matches for user activity', function(done) {
      chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data).to.be.an('array');
          expect(res.body.data).to.have.length(1);
          expect(res.body.data[0]).to.have.property('name');
          expect(res.body.data[0]).to.have.property('activity', 'Soccer');
          expect(res.body.data[0]).to.have.property('location', 'ubc');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail with non-existent activity ID', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .get(`/api/activities/${fakeId}/matches`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.success).to.be.false;
          expect(res.body.code).to.equal('ACTIVITY_NOT_FOUND');
          done();
        });
    });

    it('should fail with invalid activity ID format', function(done) {
      chai.request(app)
        .get('/api/activities/invalid-id/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(500);
          done();
        });
    });

    it('should not include user\'s own activities in matches', async function() {
      // Create another activity for the same user
      const anotherUserActivity = new Activity(createValidActivity(testUser._id, {
        activityType: 'Soccer',
        location: 'ubc'
      }));
      await anotherUserActivity.save();

      const res = await chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(1); // Only the activity from testUser2
      expect(res.body.data[0].userId).to.equal(testUser2._id.toString());
    });

    it('should only include matches with same activity type and location', async function() {
      // Create non-matching activities
      const differentActivity = new Activity(createValidActivity(testUser2._id, {
        activityType: 'Basketball', // different activity
        location: 'ubc'
      }));
      await differentActivity.save();

      const differentLocation = new Activity(createValidActivity(testUser2._id, {
        activityType: 'Soccer',
        location: 'downtown' // different location
      }));
      await differentLocation.save();

      const res = await chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(1); // Only the original matching activity
    });

    it('should only include active activities', async function() {
      // Create inactive matching activity
      const inactiveActivity = new Activity(createValidActivity(testUser2._id, {
        activityType: 'Soccer',
        location: 'ubc',
        isActive: false
      }));
      await inactiveActivity.save();

      const res = await chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(1); // Only the active matching activity
    });

    it('should include profile information in match results', function(done) {
      chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.data[0]).to.have.property('age');
          expect(res.body.data[0]).to.have.property('bio');
          expect(res.body.data[0]).to.have.property('safetyScore');
          done();
        });
    });

    it('should deduplicate matches by userId', async function() {
      // Create multiple activities for testUser2
      const anotherMatchingActivity = new Activity(createValidActivity(testUser2._id, {
        activityType: 'Soccer',
        location: 'ubc',
        dates: [new Date('2025-01-02')], // different date
        times: ['afternoon'] // different time
      }));
      await anotherMatchingActivity.save();

      const res = await chai.request(app)
        .get(`/api/activities/${userActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.data).to.have.length(1); // Should be deduplicated to one match per user
    });

    it('should prevent accessing another user\'s activity', async function() {
      const res = await chai.request(app)
        .get(`/api/activities/${matchingActivity._id}/matches`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(404);
      expect(res.body.code).to.equal('ACTIVITY_NOT_FOUND');
    });
  });

  describe('PUT /api/activities/:id', function() {
    let testActivity;

    beforeEach(async function() {
      testActivity = new Activity(createValidActivity(testUser._id));
      await testActivity.save();
    });

    it('should update activity successfully', function(done) {
      const updateData = {
        activityType: 'Updated Activity',
        location: 'downtown',
        times: ['evening']
      };

      chai.request(app)
        .put(`/api/activities/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data.activityType).to.equal('Updated Activity');
          expect(res.body.data.location).to.equal('downtown');
          expect(res.body.message).to.include('updated successfully');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      const updateData = { activityType: 'Updated' };

      chai.request(app)
        .put(`/api/activities/${testActivity._id}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail with non-existent activity ID', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = { activityType: 'Updated' };
      
      chai.request(app)
        .put(`/api/activities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.message).to.include('not found or not authorized');
          done();
        });
    });

    it('should prevent updating another user\'s activity', async function() {
      const otherActivity = new Activity(createValidActivity(testUser2._id));
      await otherActivity.save();

      const updateData = { activityType: 'Hacked' };

      const res = await chai.request(app)
        .put(`/api/activities/${otherActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res).to.have.status(404);
      expect(res.body.message).to.include('not found or not authorized');
    });

    it('should update isActive status', async function() {
      const updateData = { isActive: false };

      const res = await chai.request(app)
        .put(`/api/activities/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.body.data.isActive).to.be.false;
    });

    it('should populate userId after update', function(done) {
      const updateData = { activityType: 'Updated' };

      chai.request(app)
        .put(`/api/activities/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.data.userId).to.have.property('firstName');
          expect(res.body.data.userId).to.have.property('lastName');
          done();
        });
    });

    it('should only update provided fields', async function() {
      const originalLocation = testActivity.location;
      const updateData = { activityType: 'New Activity Type' };

      const res = await chai.request(app)
        .put(`/api/activities/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.body.data.activityType).to.equal('New Activity Type');
      expect(res.body.data.location).to.equal(originalLocation);
    });
  });

  describe('DELETE /api/activities/:id', function() {
    let testActivity;

    beforeEach(async function() {
      testActivity = new Activity(createValidActivity(testUser._id));
      await testActivity.save();
    });

    it('should delete activity successfully', function(done) {
      chai.request(app)
        .delete(`/api/activities/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.message).to.include('deleted successfully');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .delete(`/api/activities/${testActivity._id}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail with non-existent activity ID', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .delete(`/api/activities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.message).to.include('not found or not authorized');
          done();
        });
    });

    it('should prevent deleting another user\'s activity', async function() {
      const otherActivity = new Activity(createValidActivity(testUser2._id));
      await otherActivity.save();

      const res = await chai.request(app)
        .delete(`/api/activities/${otherActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(404);
      expect(res.body.message).to.include('not found or not authorized');
      
      // Verify the activity still exists
      const stillExists = await Activity.findById(otherActivity._id);
      expect(stillExists).to.exist;
    });

    it('should actually remove activity from database', async function() {
      await chai.request(app)
        .delete(`/api/activities/${testActivity._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const deletedActivity = await Activity.findById(testActivity._id);
      expect(deletedActivity).to.be.null;
    });

    it('should fail with invalid activity ID format', function(done) {
      chai.request(app)
        .delete('/api/activities/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(500);
          done();
        });
    });
  });

  describe('POST /api/activities/:id/toggle', function() {
    let testActivity;

    beforeEach(async function() {
      testActivity = new Activity(createValidActivity(testUser._id, { isActive: true }));
      await testActivity.save();
    });

    it('should toggle activity from active to inactive', function(done) {
      chai.request(app)
        .post(`/api/activities/${testActivity._id}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data.isActive).to.be.false;
          expect(res.body.message).to.include('deactivated successfully');
          done();
        });
    });

    it('should toggle activity from inactive to active', async function() {
      testActivity.isActive = false;
      await testActivity.save();

      const res = await chai.request(app)
        .post(`/api/activities/${testActivity._id}/toggle`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body.data.isActive).to.be.true;
      expect(res.body.message).to.include('activated successfully');
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .post(`/api/activities/${testActivity._id}/toggle`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail with non-existent activity ID', function(done) {
      const fakeId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .post(`/api/activities/${fakeId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.message).to.include('not found or not authorized');
          done();
        });
    });

    it('should prevent toggling another user\'s activity', async function() {
      const otherActivity = new Activity(createValidActivity(testUser2._id));
      await otherActivity.save();

      const res = await chai.request(app)
        .post(`/api/activities/${otherActivity._id}/toggle`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(404);
      expect(res.body.message).to.include('not found or not authorized');
    });

    it('should persist toggle state in database', async function() {
      await chai.request(app)
        .post(`/api/activities/${testActivity._id}/toggle`)
        .set('Authorization', `Bearer ${authToken}`);

      const updatedActivity = await Activity.findById(testActivity._id);
      expect(updatedActivity.isActive).to.be.false;
    });

    it('should fail with invalid activity ID format', function(done) {
      chai.request(app)
        .post('/api/activities/invalid-id/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(500);
          done();
        });
    });
  });

  describe('Activity Model Validation', function() {
    it('should fail validation for invalid location', async function() {
      try {
        const invalidActivity = new Activity(createValidActivity(testUser._id, {
          location: 'invalid-location'
        }));
        await invalidActivity.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('location');
      }
    });

    it('should fail validation for invalid time values', async function() {
      try {
        const invalidActivity = new Activity(createValidActivity(testUser._id, {
          times: ['invalid-time']
        }));
        await invalidActivity.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('Time must be morning, afternoon, or evening');
      }
    });

    it('should update updatedAt on save', async function() {
      const activity = new Activity(createValidActivity(testUser._id));
      await activity.save();
      
      const originalUpdatedAt = activity.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      activity.activityType = 'Updated Activity';
      await activity.save();
      
      expect(activity.updatedAt.getTime()).to.be.greaterThan(originalUpdatedAt.getTime());
    });
  });
}); 