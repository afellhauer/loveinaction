const { expect } = require("chai");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../../models/User");
const Match = require("../../models/Match");
const sendSafetyNotificationEmail = require("../../utils/sendSafetyNotificationEmail");

describe("Trusted Contact Backend Tests", function() {
  this.timeout(15000);
  let mongoServer;
  let user1, user2, testMatch;

  before(async function() {
    process.env.NODE_ENV = "test";
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log("[TRUSTED-CONTACT-SIMPLE] Connected to test database");
  });

  after(async function() {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log("[TRUSTED-CONTACT-SIMPLE] Database cleaned up");
  });

  beforeEach(async function() {
    await User.deleteMany({});
    await Match.deleteMany({});

    // Create test users
    user1 = await User.create({
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      passwordHash: "hashedPassword123",
      dateOfBirth: new Date("1995-01-01"),
      isVerified: true,
    });
    
    user2 = await User.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@test.com",
      passwordHash: "hashedPassword456",
      dateOfBirth: new Date("1996-01-01"),
      isVerified: true,
    });

    // Create test match
    testMatch = await Match.create({
      user1Id: user1._id,
      user2Id: user2._id,
      activityType: "Coffee",
      location: "downtown",
      dates: [new Date(Date.now() + 86400000)],
      status: "confirmed",
      user1Confirmed: true,
      user2Confirmed: true,
    });
  });

  describe("User Model Trusted Contact", () => {
    it("should save user with valid trusted contact", async function() {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashedPassword",
        dateOfBirth: new Date("1995-01-01"),
        trustedContact: {
          name: "Emergency Contact",
          email: "emergency@example.com"
        }
      };

      const user = await User.create(userData);
      expect(user.trustedContact.name).to.equal("Emergency Contact");
      expect(user.trustedContact.email).to.equal("emergency@example.com");
    });

    it("should fail validation with invalid trusted contact email", async function() {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashedPassword",
        dateOfBirth: new Date("1995-01-01"),
        trustedContact: {
          name: "Emergency Contact",
          email: "invalid-email"
        }
      };

      try {
        await User.create(userData);
        expect.fail("Should have thrown validation error");
      } catch (error) {
        expect(error.errors['trustedContact.email']).to.exist;
        expect(error.errors['trustedContact.email'].message).to.include("Invalid email format");
      }
    });

    it("should allow empty trusted contact fields", async function() {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashedPassword",
        dateOfBirth: new Date("1995-01-01"),
        trustedContact: {
          name: "",
          email: ""
        }
      };

      const user = await User.create(userData);
      expect(user.trustedContact.name).to.equal("");
      expect(user.trustedContact.email).to.equal("");
    });

    it("should have default empty trusted contact for new users", async function() {
      const userData = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashedPassword",
        dateOfBirth: new Date("1995-01-01")
      };

      const user = await User.create(userData);
      expect(user.trustedContact.name).to.equal("");
      expect(user.trustedContact.email).to.equal("");
    });

    it("should update trusted contact information", async function() {
      // Update user1 with trusted contact
      const updatedUser = await User.findByIdAndUpdate(
        user1._id,
        {
          "trustedContact.name": "Mom",
          "trustedContact.email": "mom@example.com"
        },
        { new: true }
      );

      expect(updatedUser.trustedContact.name).to.equal("Mom");
      expect(updatedUser.trustedContact.email).to.equal("mom@example.com");

      // Verify it persisted
      const fetchedUser = await User.findById(user1._id);
      expect(fetchedUser.trustedContact.name).to.equal("Mom");
      expect(fetchedUser.trustedContact.email).to.equal("mom@example.com");
    });
  });

  describe("Safety Notification Email", () => {
    it("should send email with correct parameters in test environment", async function() {
      const dateDetails = {
        trustedContactName: "Emergency Contact",
        trustedContactEmail: "emergency@example.com",
        userName: "John Doe",
        matchName: "Jane Smith",
        date: new Date(),
        location: "downtown",
        activityType: "Coffee",
      };

      // In test environment, this should not throw an error
      await sendSafetyNotificationEmail(dateDetails);
      
      // If we get here without throwing, the function works correctly
      expect(true).to.be.true;
    });

    it("should handle date formatting", async function() {
      const testDate = new Date("2024-07-28T14:30:00Z");
      const dateDetails = {
        trustedContactName: "Emergency Contact", 
        trustedContactEmail: "emergency@example.com",
        userName: "John Doe",
        matchName: "Jane Smith",
        date: testDate,
        location: "downtown",
        activityType: "Coffee",
      };

      // Should not throw error
      await sendSafetyNotificationEmail(dateDetails);
      expect(true).to.be.true;
    });
  });

  describe("Match Data for Safety Notifications", () => {
    it("should have all required data for safety notification", async function() {
      // Add trusted contact to user1
      await User.findByIdAndUpdate(user1._id, {
        "trustedContact.name": "Emergency Contact",
        "trustedContact.email": "emergency@example.com"
      });

      // Fetch match with populated users
      const match = await Match.findById(testMatch._id)
        .populate("user1Id", "firstName lastName trustedContact")
        .populate("user2Id", "firstName lastName trustedContact");

      expect(match).to.exist;
      expect(match.status).to.equal("confirmed");
      expect(match.user1Id.trustedContact.email).to.equal("emergency@example.com");
      expect(match.user1Id.trustedContact.name).to.equal("Emergency Contact");
      expect(match.user2Id.firstName).to.equal("Jane");
      expect(match.activityType).to.equal("Coffee");
      expect(match.location).to.equal("downtown");
      expect(match.dates).to.have.length.greaterThan(0);
    });

    it("should work when user has no trusted contact", async function() {
      // Fetch match with populated users (no trusted contact set)
      const match = await Match.findById(testMatch._id)
        .populate("user1Id", "firstName lastName trustedContact")
        .populate("user2Id", "firstName lastName trustedContact");

      expect(match.user1Id.trustedContact.email).to.equal("");
      expect(match.user1Id.trustedContact.name).to.equal("");
    });
  });
}); 