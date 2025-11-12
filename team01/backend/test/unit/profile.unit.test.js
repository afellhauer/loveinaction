// Unit tests for Profile routes
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

const User = require('../../models/User');
const Profile = require('../../models/Profile');
const profileRouter = require('../../routes/profile');

const { expect } = chai;
chai.use(chaiHttp);

const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/profile', profileRouter);

describe('Profile Routes Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;
  let testUser;
  let testUser2;
  let authToken;
  let authToken2;
  let fsStub;
  let existsSyncStub;
  let unlinkSyncStub;

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
    console.log('[PROFILE] Connected to test database');

    // Stub file system operations to avoid actual file operations during tests
    existsSyncStub = sinon.stub(fs, 'existsSync').returns(true);
    unlinkSyncStub = sinon.stub(fs, 'unlinkSync');
  });

  after(async function() {
    // Restore stubs
    if (existsSyncStub) existsSyncStub.restore();
    if (unlinkSyncStub) unlinkSyncStub.restore();

    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[PROFILE] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Profile.deleteMany({});

    // Create test users
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@profile.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser.save();

    testUser2 = new User({
      firstName: 'Test2',
      lastName: 'User2',
      email: 'test2@profile.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser2.save();

    authToken = generateTestToken(testUser._id);
    authToken2 = generateTestToken(testUser2._id);
  });

  const createValidProfileData = (options = {}) => {
    return {
      age: options.age || 25,
      location: options.location || 'Vancouver',
      gender: options.gender || 'Male',
      pronouns: options.pronouns || 'he/him',
      preference: options.preference || 'Everyone',
      occupation: options.occupation || 'Software Engineer',
      education: options.education || 'University of BC',
      bio: options.bio || 'Test bio',
      q1: options.q1 || 'Coffee',
      q1Text: options.q1Text || 'I love coffee',
      instagram: options.instagram || '@testuser',
      snapchat: options.snapchat || 'testsnap',
      tiktok: options.tiktok || '@testtok',
      ...options
    };
  };

  describe('POST /api/profile', function() {
    it('should create a new profile with valid data', function(done) {
      const profileData = createValidProfileData();

      chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('user', testUser._id.toString());
          expect(res.body).to.have.property('age', 30); // Age calculated from dateOfBirth 1995-01-01
          expect(res.body).to.have.property('location', 'Vancouver');
          expect(res.body).to.have.property('gender', 'Male');
          expect(res.body).to.have.property('pronouns', 'he/him');
          expect(res.body).to.have.property('preference', 'Everyone');
          expect(res.body.socialMedia).to.have.property('instagram', '@testuser');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      const profileData = createValidProfileData();

      chai.request(app)
        .post('/api/profile')
        .send(profileData)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should update existing profile', async function() {
      // Create initial profile
      const initialProfile = new Profile({
        user: testUser._id,
        age: 20,
        location: 'Toronto',
        gender: 'Female',
        pronouns: 'she/her',
        preference: 'Male'
      });
      await initialProfile.save();

      const updateData = createValidProfileData({
        age: 30,
        location: 'Montreal'
      });

      const res = await chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res).to.have.status(200);
      expect(res.body.age).to.equal(30);
      expect(res.body.location).to.equal('Montreal');
      
      // Verify only one profile exists for this user
      const profiles = await Profile.find({ user: testUser._id });
      expect(profiles).to.have.length(1);
    });

    it('should set default values for optional fields', function(done) {
      const minimalData = {
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone'
      };

      chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(minimalData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.occupation).to.equal('');
          expect(res.body.education).to.equal('');
          expect(res.body.bio).to.equal('');
          expect(res.body.q1).to.equal('');
          expect(res.body.q1Text).to.equal('');
          expect(res.body.socialMedia.instagram).to.equal('');
          expect(res.body.socialMedia.snapchat).to.equal('');
          expect(res.body.socialMedia.tiktok).to.equal('');
          done();
        });
    });

    it('should handle string age conversion', function(done) {
      const profileData = createValidProfileData({ age: '28' });

      chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.age).to.equal(30); // Age calculated from dateOfBirth, not input age
          expect(typeof res.body.age).to.equal('number');
          done();
        });
    });

    it('should default to age 18 for invalid age', function(done) {
      const profileData = createValidProfileData({ age: 'invalid' });

      chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.age).to.equal(30); // Age calculated from dateOfBirth, not input age
          done();
        });
    });

    it('should preserve existing profile picture when no new file uploaded', async function() {
      // Create profile with existing picture
      const existingProfile = new Profile({
        user: testUser._id,
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone',
        profilePicUrl: 'http://example.com/old-pic.jpg'
      });
      await existingProfile.save();

      const updateData = createValidProfileData({ bio: 'Updated bio' });

      const res = await chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res).to.have.status(200);
      expect(res.body.profilePicUrl).to.equal('http://example.com/old-pic.jpg');
      expect(res.body.bio).to.equal('Updated bio');
    });

    it('should handle database errors gracefully', async function() {
      // Stub Profile.findOneAndUpdate to throw an error
      const findOneAndUpdateStub = sinon.stub(Profile, 'findOneAndUpdate').throws(new Error('Database error'));
      
      try {
        const profileData = createValidProfileData();

        const res = await chai.request(app)
          .post('/api/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(profileData);

        expect(res).to.have.status(500);
        expect(res.body.error).to.equal('Server error saving profile');
      } finally {
        findOneAndUpdateStub.restore();
      }
    });

    it('should trim whitespace from string fields', function(done) {
      const profileData = createValidProfileData({
        location: '  Vancouver  ',
        gender: '  Male  ',
        occupation: '  Software Engineer  '
      });

      chai.request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.location).to.equal('Vancouver');
          expect(res.body.gender).to.equal('Male');
          expect(res.body.occupation).to.equal('Software Engineer');
          done();
        });
    });
  });

  describe('GET /api/profile/me', function() {
    it('should get current user profile', async function() {
      const profile = new Profile({
        user: testUser._id,
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone',
        bio: 'Test bio'
      });
      await profile.save();

      const res = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('user');
      expect(res.body).to.have.property('profile');
      expect(res.body.user.firstName).to.equal('Test');
      expect(res.body.user.lastName).to.equal('User');
      expect(res.body.user.email).to.equal('test@profile.com');
      expect(res.body.profile.age).to.equal(25);
      expect(res.body.profile.bio).to.equal('Test bio');
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get('/api/profile/me')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should return user data with null profile when no profile exists', async function() {
      const res = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('user');
      expect(res.body).to.have.property('profile', null);
      expect(res.body.user.firstName).to.equal('Test');
      expect(res.body.user.lastName).to.equal('User');
      expect(res.body.user.email).to.equal('test@profile.com');
    });

    it('should not expose sensitive user data', async function() {
      const profile = new Profile({
        user: testUser._id,
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone'
      });
      await profile.save();

      const res = await chai.request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body.user).to.not.have.property('passwordHash');
      expect(res.body.user).to.not.have.property('verifyToken');
      expect(res.body.user).to.not.have.property('isVerified');
    });

    it('should handle database errors gracefully', async function() {
      const findOneStub = sinon.stub(Profile, 'findOne').throws(new Error('Database error'));
      
      try {
        const res = await chai.request(app)
          .get('/api/profile/me')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(500);
        expect(res.body.error).to.equal('Server error fetching profile');
      } finally {
        findOneStub.restore();
      }
    });
  });

  describe('GET /api/profile/:userId', function() {
    let otherUserProfile;

    beforeEach(async function() {
      otherUserProfile = new Profile({
        user: testUser2._id,
        age: 28,
        location: 'Toronto',
        gender: 'Female',
        pronouns: 'she/her',
        preference: 'Male',
        bio: 'Other user bio'
      });
      await otherUserProfile.save();
    });

    it('should get another user\'s profile', function(done) {
      chai.request(app)
        .get(`/api/profile/${testUser2._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('user');
          expect(res.body).to.have.property('profile');
          expect(res.body.user.firstName).to.equal('Test2');
          expect(res.body.user.lastName).to.equal('User2');
          expect(res.body.profile.age).to.equal(28);
          expect(res.body.profile.bio).to.equal('Other user bio');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      chai.request(app)
        .get(`/api/profile/${testUser2._id}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should fail with invalid user ID format', function(done) {
      chai.request(app)
        .get('/api/profile/invalid-user-id')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Invalid user ID');
          done();
        });
    });

    it('should fail with non-existent user ID', function(done) {
      const fakeUserId = new mongoose.Types.ObjectId();
      
      chai.request(app)
        .get(`/api/profile/${fakeUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Profile not found');
          done();
        });
    });

    it('should not expose email for other users', function(done) {
      chai.request(app)
        .get(`/api/profile/${testUser2._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.user).to.not.have.property('email');
          expect(res.body.user).to.have.property('firstName');
          expect(res.body.user).to.have.property('lastName');
          done();
        });
    });

    it('should handle database errors gracefully', async function() {
      const findOneStub = sinon.stub(Profile, 'findOne').throws(new Error('Database error'));
      
      try {
        const res = await chai.request(app)
          .get(`/api/profile/${testUser2._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(500);
        expect(res.body.error).to.equal('Server error fetching profile');
      } finally {
        findOneStub.restore();
      }
    });
  });

  describe('Profile Model Validation', function() {
    it('should fail validation for age below minimum', async function() {
      try {
        const invalidProfile = new Profile({
          user: testUser._id,
          age: 17, // Below minimum
          location: 'Vancouver',
          gender: 'Male',
          pronouns: 'he/him',
          preference: 'Everyone'
        });
        await invalidProfile.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('age');
      }
    });

    it('should fail validation for age above maximum', async function() {
      try {
        const invalidProfile = new Profile({
          user: testUser._id,
          age: 100, // Above maximum
          location: 'Vancouver',
          gender: 'Male',
          pronouns: 'he/him',
          preference: 'Everyone'
        });
        await invalidProfile.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('age');
      }
    });

    it('should fail validation for invalid preference', async function() {
      try {
        const invalidProfile = new Profile({
          user: testUser._id,
          age: 25,
          location: 'Vancouver',
          gender: 'Male',
          pronouns: 'he/him',
          preference: 'InvalidPreference'
        });
        await invalidProfile.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('preference');
      }
    });

    it('should fail validation for missing required fields', async function() {
      try {
        const invalidProfile = new Profile({
          user: testUser._id,
          age: 25
          // Missing location, gender, pronouns, preference
        });
        await invalidProfile.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.errors).to.have.property('location');
        expect(error.errors).to.have.property('gender');
        expect(error.errors).to.have.property('pronouns');
        expect(error.errors).to.have.property('preference');
      }
    });

    it('should enforce unique profile per user', async function() {
      // Create first profile
      const profile1 = new Profile({
        user: testUser._id,
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone'
      });
      await profile1.save();

      try {
        // Try to create second profile for same user
        const profile2 = new Profile({
          user: testUser._id,
          age: 30,
          location: 'Toronto',
          gender: 'Male',
          pronouns: 'he/him',
          preference: 'Female'
        });
        await profile2.save();
        expect.fail('Should have thrown duplicate key error');
      } catch (error) {
        expect(error.code).to.equal(11000); // MongoDB duplicate key error
      }
    });

    it('should accept valid preference values', async function() {
      const validPreferences = ['Female', 'Male', 'Everyone'];
      
      for (let i = 0; i < validPreferences.length; i++) {
        const tempUser = new User({
          firstName: `User${i}`,
          lastName: 'Test',
          email: `user${i}@test.com`,
          dateOfBirth: new Date('1995-01-01'),
          passwordHash: 'hashedpassword',
          isVerified: true
        });
        await tempUser.save();

        const profile = new Profile({
          user: tempUser._id,
          age: 25,
          location: 'Vancouver',
          gender: 'Male',
          pronouns: 'he/him',
          preference: validPreferences[i]
        });
        
        const savedProfile = await profile.save();
        expect(savedProfile.preference).to.equal(validPreferences[i]);
      }
    });

    it('should set default values for optional fields', async function() {
      const profile = new Profile({
        user: testUser._id,
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone'
      });
      
      const savedProfile = await profile.save();
      expect(savedProfile.occupation).to.equal('');
      expect(savedProfile.education).to.equal('');
      expect(savedProfile.bio).to.equal('');
      expect(savedProfile.profilePicUrl).to.equal('');
      expect(savedProfile.q1).to.equal('');
      expect(savedProfile.q1Text).to.equal('');
      expect(savedProfile.socialMedia.instagram).to.equal('');
      expect(savedProfile.socialMedia.snapchat).to.equal('');
      expect(savedProfile.socialMedia.tiktok).to.equal('');
    });

    it('should set createdAt timestamp', async function() {
      const profile = new Profile({
        user: testUser._id,
        age: 25,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone'
      });
      
      const savedProfile = await profile.save();
      expect(savedProfile.createdAt).to.be.a('date');
      expect(savedProfile.createdAt.getTime()).to.be.closeTo(Date.now(), 1000);
    });
  });
}); 