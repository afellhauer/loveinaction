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

describe('Preference Filtering Tests', function() {
  this.timeout(15000);
  let mongoServer;
  
  // testing users with different genders and preferences
  let maleUser, femaleUser, nonBinaryUser;
  let maleToken, femaleToken, nonBinaryToken;
  
  let maleActivity, femaleActivity, nonBinaryActivity;

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
    console.log('[PREFERENCE-FILTERING] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[PREFERENCE-FILTERING] Database cleaned up');
  });

  beforeEach(async function() {
    // Clean up the database
    await User.deleteMany({});
    await Activity.deleteMany({});
    await Profile.deleteMany({});

    //create test users with different genders
    maleUser = new User({
      firstName: 'Male',
      lastName: 'User',
      email: 'male@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await maleUser.save();
    
    femaleUser = new User({
      firstName: 'Female',
      lastName: 'User',
      email: 'female@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await femaleUser.save();
    
    nonBinaryUser = new User({
      firstName: 'NonBinary',
      lastName: 'User',
      email: 'nonbinary@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await nonBinaryUser.save();

    //create profiles with different gender preferences
    const maleProfile = new Profile({
      user: maleUser._id,
      age: 25,
      location: 'downtown',
      gender: 'Male',
      pronouns: 'he/him',
      preference: 'Female', //male preferring a female
      bio: 'Test bio'
    });
    await maleProfile.save();

    const femaleProfile = new Profile({
      user: femaleUser._id,
      age: 27,
      location: 'ubc',
      gender: 'Female',
      pronouns: 'she/her',
      preference: 'Male', //female preferring a male
      bio: 'Test bio'
    });
    await femaleProfile.save();

    const nonBinaryProfile = new Profile({
      user: nonBinaryUser._id,
      age: 24,
      location: 'kitsilano',
      gender: 'Non-binary',
      pronouns: 'they/them',
      preference: 'Everyone', //non-binary with no preference
      bio: 'Test bio'
    });
    await nonBinaryProfile.save();

    maleToken = generateTestToken(maleUser._id);
    femaleToken = generateTestToken(femaleUser._id);
    nonBinaryToken = generateTestToken(nonBinaryUser._id);

    //creating activities for each user
    maleActivity = new Activity({
      userId: maleUser._id,
      activityType: 'Tennis',
      location: 'downtown',
      dates: [new Date('2025-07-10')],
      times: ['evening'],
      isActive: true
    });
    await maleActivity.save();

    femaleActivity = new Activity({
      userId: femaleUser._id,
      activityType: 'Tennis',
      location: 'downtown',
      dates: [new Date('2025-07-10')],
      times: ['evening'],
      isActive: true
    });
    await femaleActivity.save();

    nonBinaryActivity = new Activity({
      userId: nonBinaryUser._id,
      activityType: 'Tennis',
      location: 'downtown',
      dates: [new Date('2025-07-10')],
      times: ['evening'],
      isActive: true
    });
    await nonBinaryActivity.save();
  });

  describe('Gender Preference Filtering', function() {
    it('should match Male user with Female user based on preferences', function(done) {
      chai.request(app)
        .get(`/api/activities/${maleActivity._id}/matches`)
        .set('Authorization', `Bearer ${maleToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          
          //should find female users
          const matches = res.body.data;
          expect(matches).to.be.an('array');
          expect(matches.length).to.be.at.least(1);
          
          const femaleMatch = matches.find(m => m.gender === 'Female');
          expect(femaleMatch).to.exist;
          expect(femaleMatch.name).to.include('Female');
          
          done();
        });
    });

    it('should match Female user with Male user based on preferences', function(done) {
      chai.request(app)
        .get(`/api/activities/${femaleActivity._id}/matches`)
        .set('Authorization', `Bearer ${femaleToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          
          //should find male users
          const matches = res.body.data;
          expect(matches).to.be.an('array');
          expect(matches.length).to.be.at.least(1);
          
          const maleMatch = matches.find(m => m.gender === 'Male');
          expect(maleMatch).to.exist;
          expect(maleMatch.name).to.include('Male');
          
          done();
        });
    });

    it('should match Non-binary user with both Male and Female users', function(done) {
      chai.request(app)
        .get(`/api/activities/${nonBinaryActivity._id}/matches`)
        .set('Authorization', `Bearer ${nonBinaryToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          
          // Should match with male and female
          const matches = res.body.data;
          expect(matches).to.be.an('array');
          
          done();
        });
    });

    it('should not match when preferences are incompatible', async function() {
      //changing male user's preference to "male" (from "female")
      await Profile.findOneAndUpdate(
        { user: maleUser._id },
        { preference: 'Male' }
      );
      
      // Female user still prefers "Male"
      // preferences are incompatible
      const res = await chai.request(app)
        .get(`/api/activities/${femaleActivity._id}/matches`)
        .set('Authorization', `Bearer ${femaleToken}`);
      
      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      
      //shouldnt find male user
      const maleMatch = res.body.data.find(m => m.userId === maleUser._id.toString());
      expect(maleMatch).to.be.undefined;
    });
  });
});
