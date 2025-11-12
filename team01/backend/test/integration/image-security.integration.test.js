const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const User = require('../../models/User');
const Profile = require('../../models/Profile');
const BlockedUser = require('../../models/BlockedUser');

const { expect } = chai;
chai.use(chaiHttp);

describe('Image Security Integration Tests', function() {
  this.timeout(15000);
  
  let user1, user2, user3;
  let token1, token2, token3;
  let testImageFilename = 'profile-1234567890-12345.jpg';
  let testImagePath;

  before(async function() {
    const dbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/loveinaction_image_security_test';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUri);
    }
    console.log('[IMAGE-SECURITY] Connected to test database');

    // Create test image file
    testImagePath = path.join(__dirname, '../../uploads', testImageFilename);
    const uploadsDir = path.dirname(testImagePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(testImagePath, 'fake image content');
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Profile.deleteMany({});
    await BlockedUser.deleteMany({});

    // Create test users
    user1 = new User({
      firstName: 'Alice',
      lastName: 'Test',
      email: 'alice@imagetest.com',
      passwordHash: await bcrypt.hash('password123', 10),
      dateOfBirth: new Date('1995-01-01'),
      isVerified: true,
      isActive: true
    });
    await user1.save();

    user2 = new User({
      firstName: 'Bob',
      lastName: 'Test',
      email: 'bob@imagetest.com',
      passwordHash: await bcrypt.hash('password123', 10),
      dateOfBirth: new Date('1995-01-01'),
      isVerified: true,
      isActive: true
    });
    await user2.save();

    user3 = new User({
      firstName: 'Charlie',
      lastName: 'Test',
      email: 'charlie@imagetest.com',
      passwordHash: await bcrypt.hash('password123', 10),
      dateOfBirth: new Date('1995-01-01'),
      isVerified: true,
      isActive: false // Deactivated user
    });
    await user3.save();

    // Generate tokens
    token1 = jwt.sign({ userId: user1._id, email: user1.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    token2 = jwt.sign({ userId: user2._id, email: user2.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    token3 = jwt.sign({ userId: user3._id, email: user3.email }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Create profile for user1 with the test image
    const profile1 = new Profile({
      user: user1._id,
      age: 30,
      location: 'Vancouver',
      gender: 'Female',
      pronouns: 'she/her',
      preference: 'Everyone',
      profilePicUrl: `/uploads/${testImageFilename}` // Use relative URL to match DB
    });
    await profile1.save();
  });

  after(async function() {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('[IMAGE-SECURITY] Database cleaned up');
  });

  describe('Protected Image Access', function() {
      it('should allow users to view their own profile images', async function() {
    const response = await chai.request(app)
      .get(`/api/images/profile/${testImageFilename}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(response).to.have.status(200);
    // For binary responses, check the body buffer
    expect(response.body.toString()).to.equal('fake image content');
  });

    it('should allow other authenticated users to view profile images', async function() {
      const response = await chai.request(app)
        .get(`/api/images/profile/${testImageFilename}`)
        .set('Authorization', `Bearer ${token2}`);

          expect(response).to.have.status(200);
    expect(response.body.toString()).to.equal('fake image content');
    });

    it('should reject unauthenticated requests', async function() {
      const response = await chai.request(app)
        .get(`/api/images/profile/${testImageFilename}`);

      expect(response).to.have.status(401);
      expect(response.body.error).to.equal('Not authorized');
    });

    it('should reject requests with invalid filename format', async function() {
      const response = await chai.request(app)
        .get('/api/images/profile/malicious-file.php')
        .set('Authorization', `Bearer ${token1}`);

      expect(response).to.have.status(400);
      expect(response.body.error).to.equal('Invalid filename format');
    });

    it('should return 404 for non-existent images', async function() {
      const response = await chai.request(app)
        .get('/api/images/profile/profile-9999999999-99999.jpg')
        .set('Authorization', `Bearer ${token1}`);

      expect(response).to.have.status(404);
      expect(response.body.error).to.equal('Image not found');
    });
  });

  describe('Deactivated User Protection', function() {
    it('should prevent access to deactivated user images', async function() {
      // Create profile for deactivated user
      const profile3 = new Profile({
        user: user3._id,
        age: 30,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone',
        profilePicUrl: `/uploads/profile-9999999998-12345.jpg`
      });
      await profile3.save();

      // Create the image file
      const deactivatedImagePath = path.join(__dirname, '../../uploads', 'profile-9999999998-12345.jpg');
      fs.writeFileSync(deactivatedImagePath, 'deactivated user image');

      try {
        const response = await chai.request(app)
          .get('/api/images/profile/profile-9999999998-12345.jpg')
          .set('Authorization', `Bearer ${token1}`);

        expect(response).to.have.status(403);
        expect(response.body.error).to.equal('Cannot access deactivated user\'s image');
      } finally {
        // Clean up
        if (fs.existsSync(deactivatedImagePath)) {
          fs.unlinkSync(deactivatedImagePath);
        }
      }
    });
  });

  describe('Blocked User Protection', function() {
    it('should prevent access to blocked user images', async function() {
      // User1 blocks User2
      const blockRecord = new BlockedUser({
        blockerId: user1._id,
        blockedUserId: user2._id,
        reason: 'other'
      });
      await blockRecord.save();

      // Create profile for user2
      const profile2 = new Profile({
        user: user2._id,
        age: 30,
        location: 'Vancouver',
        gender: 'Male',
        pronouns: 'he/him',
        preference: 'Everyone',
        profilePicUrl: `/uploads/profile-9999999997-12345.jpg`
      });
      await profile2.save();

      // Create the image file
      const blockedImagePath = path.join(__dirname, '../../uploads', 'profile-9999999997-12345.jpg');
      fs.writeFileSync(blockedImagePath, 'blocked user image');

      try {
        // User1 tries to access User2's image (should be blocked)
        const response = await chai.request(app)
          .get('/api/images/profile/profile-9999999997-12345.jpg')
          .set('Authorization', `Bearer ${token1}`);

        expect(response).to.have.status(403);
        expect(response.body.error).to.equal('Cannot access blocked user\'s image');
      } finally {
        // Clean up
        if (fs.existsSync(blockedImagePath)) {
          fs.unlinkSync(blockedImagePath);
        }
      }
    });
  });

  describe('Direct File Access Prevention', function() {
    it('should no longer allow direct access to uploaded files', async function() {
      // This test verifies that the old vulnerable endpoint no longer works
      const response = await chai.request(app)
        .get(`/uploads/${testImageFilename}`);

      expect(response).to.have.status(404);
      // The static file serving should now be disabled
    });
  });
}); 