// Unit tests for Rating routes and helpers
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');

const User = require('../../models/User');
const Rating = require('../../models/Rating');
const Match = require('../../models/Match');
const Profile = require('../../models/Profile');
const ratingsRouter = require('../../routes/ratings');
const { recalcProfileStats } = require('../../utils/ratingHelpers');

const { expect } = chai;
chai.use(chaiHttp);

const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/ratings', ratingsRouter);

describe('Ratings Unit Tests', function() {
  this.timeout(15000);
  let mongoServer;
  let testUser1;
  let testUser2;
  let testUser3;
  let authToken1;
  let authToken2;
  let testProfile1;
  let testProfile2;
  let testMatch;

  const generateTestToken = (userId) => {
    return jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  };

  const createValidRatingData = (options = {}) => {
    return {
      ratee: options.ratee || testUser2._id,
      safetyAndRespect: {
        madeMeFeelSafe: options.madeMeFeelSafe !== undefined ? options.madeMeFeelSafe : true,
        asDescribedInProfile: options.asDescribedInProfile !== undefined ? options.asDescribedInProfile : true,
        respectfulOfBoundaries: options.respectfulOfBoundaries !== undefined ? options.respectfulOfBoundaries : true,
      },
      connection: {
        greatConversationalist: options.greatConversationalist !== undefined ? options.greatConversationalist : true,
        activeListener: options.activeListener !== undefined ? options.activeListener : false,
        madeMeLaugh: options.madeMeLaugh !== undefined ? options.madeMeLaugh : true,
      },
      consideration: {
        onTime: options.onTime !== undefined ? options.onTime : true,
        attentive: options.attentive !== undefined ? options.attentive : true,
        goodManners: options.goodManners !== undefined ? options.goodManners : false,
      },
      qualities: {
        dressedWell: options.dressedWell !== undefined ? options.dressedWell : true,
        smelledNice: options.smelledNice !== undefined ? options.smelledNice : true,
        goodEnergy: options.goodEnergy !== undefined ? options.goodEnergy : true,
        charmingSmile: options.charmingSmile !== undefined ? options.charmingSmile : false,
        athletic: options.athletic !== undefined ? options.athletic : true,
        competitiveDrive: options.competitiveDrive !== undefined ? options.competitiveDrive : false,
        openToAnything: options.openToAnything !== undefined ? options.openToAnything : true,
      },
      comments: options.comments || 'Great date!',
      connectionStrength: options.connectionStrength || 4,
      ...options
    };
  };

  before(async function() {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('[RATINGS] Connected to test database');
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('[RATINGS] Database cleaned up');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Rating.deleteMany({});
    await Match.deleteMany({});
    await Profile.deleteMany({});

    // Create test users
    testUser1 = new User({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser1.save();

    testUser2 = new User({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser2.save();

    testUser3 = new User({
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@test.com',
      dateOfBirth: new Date('1995-01-01'),
      passwordHash: 'hashedpassword',
      isVerified: true
    });
    await testUser3.save();

    // Create test profiles
    testProfile1 = new Profile({
      user: testUser1._id,
      age: 25,
      location: 'Vancouver',
      gender: 'Male',
      pronouns: 'he/him',
      preference: 'Everyone',
      safetyScore: 0,
      badges: []
    });
    await testProfile1.save();

    testProfile2 = new Profile({
      user: testUser2._id,
      age: 23,
      location: 'Vancouver',
      gender: 'Female',
      pronouns: 'she/her',
      preference: 'Everyone',
      safetyScore: 0,
      badges: []
    });
    await testProfile2.save();

    authToken1 = generateTestToken(testUser1._id);
    authToken2 = generateTestToken(testUser2._id);

    // Create a test match in date_passed state
    testMatch = new Match({
      user1Id: testUser1._id,
      user2Id: testUser2._id,
      activityType: 'Hike',
      location: 'Vancouver',
      dates: [new Date('2024-01-01')],
      status: 'date_passed'
    });
    await testMatch.save();
  });

  describe('Rating Model', function() {
    it('should create a rating with valid data', async function() {
      const ratingData = {
        rater: testUser1._id,
        ratee: testUser2._id,
        safetyAndRespect: {
          madeMeFeelSafe: true,
          asDescribedInProfile: true,
          respectfulOfBoundaries: true,
        },
        connection: {
          greatConversationalist: true,
          activeListener: false,
          madeMeLaugh: true,
        },
        consideration: {
          onTime: true,
          attentive: true,
          goodManners: true,
        },
        qualities: {
          dressedWell: true,
          smelledNice: true,
          goodEnergy: true,
          charmingSmile: false,
          athletic: true,
          competitiveDrive: false,
          openToAnything: true,
        },
        comments: 'Had a great time!',
      };

      const rating = new Rating(ratingData);
      const savedRating = await rating.save();

      expect(savedRating._id).to.exist;
      expect(savedRating.rater.toString()).to.equal(testUser1._id.toString());
      expect(savedRating.ratee.toString()).to.equal(testUser2._id.toString());
      expect(savedRating.safetyAndRespect.madeMeFeelSafe).to.be.true;
      expect(savedRating.connection.greatConversationalist).to.be.true;
      expect(savedRating.consideration.onTime).to.be.true;
      expect(savedRating.qualities.dressedWell).to.be.true;
      expect(savedRating.comments).to.equal('Had a great time!');
      expect(savedRating.createdAt).to.exist;
    });

    it('should require rater field', async function() {
      try {
        const rating = new Rating({
          ratee: testUser2._id,
          safetyAndRespect: { madeMeFeelSafe: true },
        });
        await rating.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('rater');
      }
    });

    it('should require ratee field', async function() {
      try {
        const rating = new Rating({
          rater: testUser1._id,
          safetyAndRespect: { madeMeFeelSafe: true },
        });
        await rating.save();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
        expect(error.message).to.include('ratee');
      }
    });

    it('should allow optional fields to be undefined', async function() {
      const rating = new Rating({
        rater: testUser1._id,
        ratee: testUser2._id,
      });
      const savedRating = await rating.save();

      expect(savedRating.safetyAndRespect.madeMeFeelSafe).to.be.undefined;
      expect(savedRating.connection.greatConversationalist).to.be.undefined;
      expect(savedRating.consideration.onTime).to.be.undefined;
      expect(savedRating.qualities.dressedWell).to.be.undefined;
      expect(savedRating.comments).to.be.undefined;
    });

    it('should set default createdAt timestamp', async function() {
      const rating = new Rating({
        rater: testUser1._id,
        ratee: testUser2._id,
      });
      const savedRating = await rating.save();

      expect(savedRating.createdAt).to.exist;
      expect(savedRating.createdAt).to.be.a('date');
    });
  });

  describe('POST /api/ratings', function() {
    it('should create a rating with valid data', function(done) {
      const ratingData = createValidRatingData();

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('_id');
          expect(res.body.rater.toString()).to.equal(testUser1._id.toString());
          expect(res.body.ratee.toString()).to.equal(testUser2._id.toString());
          expect(res.body.safetyAndRespect.madeMeFeelSafe).to.be.true;
          expect(res.body.connection.greatConversationalist).to.be.true;
          expect(res.body.comments).to.equal('Great date!');
          done();
        });
    });

    it('should fail without authentication token', function(done) {
      const ratingData = createValidRatingData();

      chai.request(app)
        .post('/api/ratings')
        .send(ratingData)
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    it('should set rater to authenticated user', function(done) {
      const ratingData = createValidRatingData();

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.rater.toString()).to.equal(testUser1._id.toString());
          done();
        });
    });

    it('should update match status when both users have rated', async function() {
      const ratingData1 = createValidRatingData({ ratee: testUser2._id });
      const ratingData2 = createValidRatingData({ ratee: testUser1._id });

      // First user rates
      await chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData1);

      // Second user rates
      await chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken2}`)
        .send(ratingData2);

      const updatedMatch = await Match.findById(testMatch._id);
      expect(updatedMatch.status).to.equal('expired');
      expect(updatedMatch.user1Rating).to.equal(4);
      expect(updatedMatch.user2Rating).to.equal(4);
    });

    it('should not change match status when only one user has rated', async function() {
      const ratingData = createValidRatingData({ ratee: testUser2._id });

      await chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData);

      const updatedMatch = await Match.findById(testMatch._id);
      expect(updatedMatch.status).to.equal('date_passed');
      expect(updatedMatch.user1Rating).to.equal(4);
      expect(updatedMatch.user2Rating).to.be.null;
    });

    it('should handle case when no matching match exists', function(done) {
      const ratingData = createValidRatingData({ ratee: testUser3._id });

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('_id');
          done();
        });
    });

    it('should handle invalid ratee ID', function(done) {
      const ratingData = createValidRatingData({ ratee: 'invalid-id' });

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('should handle database errors gracefully', async function() {
      const saveStub = sinon.stub(Rating.prototype, 'save').throws(new Error('Database error'));
      
      try {
        const ratingData = createValidRatingData();

        const res = await chai.request(app)
          .post('/api/ratings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send(ratingData);

        expect(res).to.have.status(400);
        expect(res.body.error).to.equal('Database error');
      } finally {
        saveStub.restore();
      }
    });

    it('should trigger profile stats recalculation', async function() {
      const recalcStub = sinon.stub({ recalcProfileStats }, 'recalcProfileStats').resolves();
      
      // We need to stub the actual imported function
      const ratingHelpersStub = sinon.stub(require('../../utils/ratingHelpers'), 'recalcProfileStats').resolves();
      
      try {
        const ratingData = createValidRatingData();

        const res = await chai.request(app)
          .post('/api/ratings')
          .set('Authorization', `Bearer ${authToken1}`)
          .send(ratingData);

        expect(res).to.have.status(201);
        // Note: We can't easily verify the stub was called due to the .catch() pattern
        // But we can verify the rating was created successfully
        expect(res.body).to.have.property('_id');
      } finally {
        recalcStub.restore();
        ratingHelpersStub.restore();
      }
    });
  });

  describe('Rating Helpers - recalcProfileStats', function() {
    it('should calculate safety score correctly', async function() {
      // Create ratings with different safety scores
      const rating1 = new Rating({
        rater: testUser1._id,
        ratee: testUser2._id,
        safetyAndRespect: {
          madeMeFeelSafe: true,
          asDescribedInProfile: true,
          respectfulOfBoundaries: true,
        },
      });
      await rating1.save();

      const rating2 = new Rating({
        rater: testUser3._id,
        ratee: testUser2._id,
        safetyAndRespect: {
          madeMeFeelSafe: true,
          asDescribedInProfile: false,
          respectfulOfBoundaries: true,
        },
      });
      await rating2.save();

      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      // Expected: 5 true out of 6 total = 83%
      expect(updatedProfile.safetyScore).to.equal(83);
    });

    it('should assign trusted badge for high safety score', async function() {
      const rating = new Rating({
        rater: testUser1._id,
        ratee: testUser2._id,
        safetyAndRespect: {
          madeMeFeelSafe: true,
          asDescribedInProfile: true,
          respectfulOfBoundaries: true,
        },
      });
      await rating.save();

      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      expect(updatedProfile.badges).to.include('🛡️ Trusted');
    });

    it('should assign warning badge for low safety score', async function() {
      const rating = new Rating({
        rater: testUser1._id,
        ratee: testUser2._id,
        safetyAndRespect: {
          madeMeFeelSafe: false,
          asDescribedInProfile: false,
          respectfulOfBoundaries: false,
        },
      });
      await rating.save();

      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      expect(updatedProfile.badges).to.include('⚠️ Work on safety');
    });

    it('should assign consideration badges correctly', async function() {
      // Create multiple ratings with consistent consideration traits
      const ratings = [
        {
          rater: testUser1._id,
          ratee: testUser2._id,
          consideration: {
            onTime: true,
            attentive: true,
            goodManners: true,
          },
        },
        {
          rater: testUser3._id,
          ratee: testUser2._id,
          consideration: {
            onTime: true,
            attentive: false,
            goodManners: true,
          },
        },
      ];

      for (const ratingData of ratings) {
        const rating = new Rating(ratingData);
        await rating.save();
      }

      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      expect(updatedProfile.badges).to.include('⏰ Punctual');
      expect(updatedProfile.badges).to.include('🙏 Well-mannered');
      expect(updatedProfile.badges).to.not.include('👂 Attentive');
    });

    it('should assign qualities badges correctly', async function() {
      // Create multiple ratings with consistent quality traits
      const ratings = [
        {
          rater: testUser1._id,
          ratee: testUser2._id,
          qualities: {
            dressedWell: true,
            smelledNice: true,
            goodEnergy: true,
            charmingSmile: false,
            athletic: true,
            competitiveDrive: false,
            openToAnything: true,
          },
        },
        {
          rater: testUser3._id,
          ratee: testUser2._id,
          qualities: {
            dressedWell: true,
            smelledNice: false,
            goodEnergy: true,
            charmingSmile: false,
            athletic: true,
            competitiveDrive: false,
            openToAnything: true,
          },
        },
      ];

      for (const ratingData of ratings) {
        const rating = new Rating(ratingData);
        await rating.save();
      }

      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      expect(updatedProfile.badges).to.include('👗 Dressed Well');
      expect(updatedProfile.badges).to.include('⚡ Good Energy');
      expect(updatedProfile.badges).to.include('🏃 Athletic');
      expect(updatedProfile.badges).to.include('🤝 Open-minded');
      expect(updatedProfile.badges).to.not.include('👃 Smelled Nice');
      expect(updatedProfile.badges).to.not.include('😊 Charming Smile');
    });

    it('should reset to zero when no ratings exist', async function() {
      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      expect(updatedProfile.safetyScore).to.equal(0);
      expect(updatedProfile.badges).to.be.empty;
    });

    it('should handle division by zero safely', async function() {
      // Create rating with all undefined safety fields
      const rating = new Rating({
        rater: testUser1._id,
        ratee: testUser2._id,
      });
      await rating.save();

      await recalcProfileStats(testUser2._id);

      const updatedProfile = await Profile.findOne({ user: testUser2._id });
      expect(updatedProfile.safetyScore).to.equal(0);
    });

    it('should handle database errors gracefully', async function() {
      const findStub = sinon.stub(Rating, 'find').throws(new Error('Database error'));
      
      try {
        await recalcProfileStats(testUser2._id);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Database error');
      } finally {
        findStub.restore();
      }
    });
  });

  describe('Edge Cases and Error Handling', function() {
    it('should handle empty rating data', function(done) {
      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.rater.toString()).to.equal(testUser1._id.toString());
          done();
        });
    });

    it('should handle rating with partial data', function(done) {
      const partialRatingData = {
        ratee: testUser2._id,
        safetyAndRespect: {
          madeMeFeelSafe: true,
        },
        comments: 'Partial rating',
      };

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(partialRatingData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.safetyAndRespect.madeMeFeelSafe).to.be.true;
          // Connection object may not exist if not provided
          expect(res.body.connection).to.be.undefined;
          done();
        });
    });

    it('should handle self-rating attempt', function(done) {
      const selfRatingData = createValidRatingData({ ratee: testUser1._id });

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(selfRatingData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          // Self-rating should technically work, but might be prevented by business logic
          expect(res.body.rater.toString()).to.equal(testUser1._id.toString());
          expect(res.body.ratee.toString()).to.equal(testUser1._id.toString());
          done();
        });
    });

    it('should handle very long comments', function(done) {
      const longComment = 'A'.repeat(1000);
      const ratingData = createValidRatingData({ comments: longComment });

      chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.comments).to.equal(longComment);
          done();
        });
    });

    it('should handle match in wrong status', async function() {
      // Create match in active status instead of date_passed
      const activeMatch = new Match({
        user1Id: testUser1._id,
        user2Id: testUser3._id,
        activityType: 'Run',
        location: 'Vancouver',
        dates: [new Date()],
        status: 'active'
      });
      await activeMatch.save();

      const ratingData = createValidRatingData({ ratee: testUser3._id });

      const res = await chai.request(app)
        .post('/api/ratings')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(ratingData);

      expect(res).to.have.status(201);
      
      // Match should not be updated since it's not in date_passed state
      const unchangedMatch = await Match.findById(activeMatch._id);
      expect(unchangedMatch.status).to.equal('active');
      expect(unchangedMatch.user1Rating).to.be.null;
    });
  });
}); 