// 📁 backend/scripts/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");

const User = require("../models/User");
const Profile = require("../models/Profile");
const Activity = require("../models/Activity");
const Swipe = require("../models/Swipe");
const Rating = require("../models/Rating");
const Match = require("../models/Match");
const Message = require("../models/Message");
const BlockedUser = require("../models/BlockedUser");

const { recalcProfileStats } = require("../utils/ratingHelpers.js");

async function seed() {
  const dbUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/loveinaction";
  await mongoose.connect(dbUri);
  console.log("🗄️  Connected to MongoDB");

  // 1) Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Activity.deleteMany({}),
    Swipe.deleteMany({}),
    Rating.deleteMany({}),
    Match.deleteMany({}),
    Message.deleteMany({}),
  ]);
  console.log("🗑️  Cleared all collections");

  // Shared password hash
  const plainPassword = "123";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // Helper function to generate date of birth from age
  const generateDateOfBirth = (age) => {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    const birthMonth = faker.number.int({ min: 0, max: 11 }); // 0-11 for months
    const birthDay = faker.number.int({ min: 1, max: 28 }); // 1-28 to avoid month-end issues
    return new Date(birthYear, birthMonth, birthDay);
  };

  // Helper function to generate verification data
  const generateVerificationData = () => {
    const verificationChance = Math.random();

    if (verificationChance < 0.6) {
      // 60% chance: Verified users
      return {
        isIdVerified: true,
        verificationStatus: "approved",
        verificationScore: faker.number.int({ min: 85, max: 100 }),
        verificationReasons: [
          "✓ Face match: Excellent (95%)",
          "✓ Document verified as authentic",
          "✓ Age verified: Valid",
          "✓ All security checks passed",
        ],
        verifiedAt: faker.date.past({ years: 1 }),
        idType: faker.helpers.arrayElement([
          "drivers_license",
          "passport",
          "state_id",
          "military_id",
        ]),
      };
    } else if (verificationChance < 0.8) {
      // 20% chance: Not verified yet
      return {
        isIdVerified: false,
        verificationStatus: "not_submitted",
        verificationScore: null,
        verificationReasons: [],
        verifiedAt: null,
        idType: null,
      };
    } else if (verificationChance < 0.9) {
      // 10% chance: Pending verification
      return {
        isIdVerified: false,
        verificationStatus: "pending",
        verificationScore: faker.number.int({ min: 60, max: 84 }),
        verificationReasons: [
          "⚠ Verification in progress",
          "⚠ Additional review required",
          "Document analysis pending",
        ],
        verifiedAt: null,
        idType: faker.helpers.arrayElement([
          "drivers_license",
          "passport",
          "state_id",
        ]),
      };
    } else {
      // 10% chance: Rejected verification
      return {
        isIdVerified: false,
        verificationStatus: "rejected",
        verificationScore: faker.number.int({ min: 20, max: 60 }),
        verificationReasons: [
          "✗ Face match: Failed (45%)",
          "✗ Document validation failed",
          "⚠ Image quality too poor",
          "Please try again with clearer photos",
        ],
        verifiedAt: null,
        idType: faker.helpers.arrayElement([
          "drivers_license",
          "passport",
          "state_id",
        ]),
      };
    }
  };

  // Helper function to generate trusted contact data
  const generateTrustedContactData = () => {
    const hasTrustedContact = Math.random() < 0.7; // 70% chance of having trusted contact

    if (hasTrustedContact) {
      return {
        trustedContact: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
        },
        autoNotifyTrustedContact: Math.random() < 0.4, // 40% enable auto-notify
      };
    }

    return {
      trustedContact: { name: "", email: "" },
      autoNotifyTrustedContact: false,
    };
  };

  // Helpers & bias
  const locations = [
    "ubc",
    "kitsilano",
    "downtown",
    "mt pleasant",
    "olympic village",
    "kerrisdale",
  ];
  const focusLocation = "downtown";
  const locationBiasProb = 0.5;
  const activityTypes = [
    "play Volleyball",
    "Swim",
    "Hike",
    "Run",
    "Bike",
    "play Tennis",
    "play Basketball",
    "play Soccer",
    "do Yoga",
    "Dance",
  ];
  const focusActivities = ["Hike", "Run"];
  const activityBiasProb = 0.6;
  const genders = ["Male", "Female", "Non-binary"];
  const pronouns = ["He/Him", "She/Her", "They/Them"];
  const preferences = ["Male", "Female", "Everyone"];
  const educations = ["High School", "Bachelor's", "Master's", "PhD"];
  const timesOfDay = ["morning", "afternoon", "evening"];

  // 2) Seed 50 random users + their profiles + 1–3 activities each
  for (let i = 0; i < 50; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = firstName.toLowerCase() + "_" + lastName.toLowerCase() + "@example.com";
    const age = faker.number.int({ min: 18, max: 35 });
    const dateOfBirth = generateDateOfBirth(age);
    const verificationData = generateVerificationData();
    const trustedContactData = generateTrustedContactData();

    const user = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      dateOfBirth,
      isVerified: true, // Email verified
      isIdVerified: verificationData.isIdVerified,
      verificationStatus: verificationData.verificationStatus,
      verificationScore: verificationData.verificationScore,
      verificationReasons: verificationData.verificationReasons,
      verifiedAt: verificationData.verifiedAt,
      idType: verificationData.idType,
      trustedContact: trustedContactData.trustedContact,
      autoNotifyTrustedContact: trustedContactData.autoNotifyTrustedContact,
      refreshTokens: [],
    });

    // -- Profile --
    let profileLocation = faker.helpers.arrayElement(locations);
    if (Math.random() < locationBiasProb) profileLocation = focusLocation;

    await Profile.create({
      user: user._id,
      age,
      location: profileLocation,
      gender: faker.helpers.arrayElement(genders),
      pronouns: faker.helpers.arrayElement(pronouns),
      preference: faker.helpers.arrayElement(preferences),
      occupation: faker.person.jobTitle(),
      education: faker.helpers.arrayElement(educations),
      bio: faker.lorem.sentences(2),
      profilePicUrl: `https://i.pravatar.cc/300?img=${faker.number.int({
        min: 21,
        max: 70,
      })}`,
      q1: faker.helpers.arrayElement([
        "What's your spirit animal?",
        "If your personality were an activity, what would it be?",
      ]),
      q1Text: faker.lorem.words(6),
      socialMedia: {
        instagram: faker.internet.username(),
        snapchat: faker.internet.username(),
        tiktok: faker.internet.username(),
      },
    });

    // -- Activities (1–3) --
    const numActs = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < numActs; j++) {
      let actType = faker.helpers.arrayElement(activityTypes);
      let actLoc = faker.helpers.arrayElement(locations);
      if (Math.random() < activityBiasProb)
        actType = faker.helpers.arrayElement(focusActivities);
      if (Math.random() < locationBiasProb) actLoc = focusLocation;

      await Activity.create({
        userId: user._id,
        activityType: actType,
        location: actLoc,
        dates: [faker.date.soon(30).toISOString().split("T")[0]],
        times: [faker.helpers.arrayElement(timesOfDay)],
        isActive: true,
      });
    }

    const verificationStatusEmoji = {
      approved: "✅",
      not_submitted: "⚪",
      pending: "⏳",
      rejected: "❌",
    };

    const trustedContactStatus = trustedContactData.trustedContact.name
      ? `TC: ${trustedContactData.autoNotifyTrustedContact ? "auto" : "manual"}`
      : "TC: none";

    console.log(
      `${
        verificationStatusEmoji[verificationData.verificationStatus]
      } Seeded user ${email} (age: ${age}, verification: ${
        verificationData.verificationStatus
      }, ${trustedContactStatus})`
    );
  }

  // 3) Seed one special "Test Demo" user for matching demo (always verified)
  const demoAge = 28;
  const demoDOB = generateDateOfBirth(demoAge);

  const demo = await User.create({
    firstName: "Test",
    lastName: "Demo",
    email: "testdemo@example.com",
    passwordHash,
    dateOfBirth: demoDOB,
    isVerified: true,
    isIdVerified: true, // Demo user is always verified
    verificationStatus: "approved",
    verificationScore: 95,
    verificationReasons: [
      "✓ Face match: Excellent (96%)",
      "✓ Driver's license verified as authentic",
      "✓ Age verified: 28 years old",
      "✓ All security checks passed",
    ],
    verifiedAt: new Date(),
    idType: "drivers_license",
    trustedContact: {
      name: "Demo Contact",
      email: "democontact@example.com",
    },
    autoNotifyTrustedContact: true,
    refreshTokens: [],
  });

  await Profile.create({
    user: demo._id,
    age: demoAge,
    location: "kerrisdale",
    gender: "Female",
    pronouns: "She/Her",
    preference: "Everyone",
    occupation: "Product Demo Specialist",
    education: "Master's",
    bio: "Demo user for matching testing.",
    profilePicUrl: "https://i.pravatar.cc/300?img=25",
    q1: "If your personality were an activity, what would it be?",
    q1Text: "dance",
    socialMedia: {
      instagram: "demo_user",
      snapchat: "demo_user",
      tiktok: "demo_user",
    },
  });

  await Activity.create({
    userId: demo._id,
    activityType: "Dance",
    location: "kerrisdale",
    dates: [new Date()],
    times: ["evening"],
    isActive: true,
  });

  console.log(
    `✅ Seeded Test Demo user (age: ${demoAge}, verification: approved, TC: auto)`
  );

  // 4) Enhanced rating generation with realistic user patterns
  const allUsers = await User.find({});
  console.log("🔄 Generating enhanced ratings...");

  for (const u of allUsers) {
    const others = allUsers.filter((x) => !x._id.equals(u._id));
    const numRatings = faker.number.int({ min: 3, max: 8 }); // Variable number of ratings
    const raters = faker.helpers.arrayElements(others, numRatings);

    // Determine user archetype for consistent behavior patterns
    const userArchetype = faker.helpers.arrayElement([
      "excellent", // 25% - consistently great users
      "good", // 40% - generally good users
      "average", // 25% - mixed bag users
      "problematic", // 10% - users with issues
    ]);

    const archetypeConfig = {
      excellent: { baseProb: 0.9, variation: 0.05, trendChance: 0.1 },
      good: { baseProb: 0.75, variation: 0.15, trendChance: 0.2 },
      average: { baseProb: 0.6, variation: 0.25, trendChance: 0.3 },
      problematic: { baseProb: 0.3, variation: 0.2, trendChance: 0.4 },
    };

    const config = archetypeConfig[userArchetype];
    const hasPositiveTrend = Math.random() < config.trendChance;
    const hasNegativeTrend = Math.random() < config.trendChance * 0.3; // Less likely

    for (let idx = 0; idx < raters.length; idx++) {
      const r = raters[idx];

      // Apply trend over time
      const trendFactor = idx / (raters.length - 1); // 0 to 1
      let trendAdjustment = 0;
      if (hasPositiveTrend) trendAdjustment = trendFactor * 0.25;
      if (hasNegativeTrend) trendAdjustment = -trendFactor * 0.25;

      // Calculate adjusted probability for this rating
      const variation = faker.number.float({
        min: -config.variation,
        max: config.variation,
      });
      const adjustedProb = Math.max(
        0.05,
        Math.min(0.95, config.baseProb + variation + trendAdjustment)
      );

      // Generate special circumstances
      const didNotShowUp = Math.random() < 0.05; // 5% no-shows
      const cancelled = !didNotShowUp && Math.random() < 0.03; // 3% cancellations
      const leftEarly = !didNotShowUp && !cancelled && Math.random() < 0.08; // 8% left early

      // Create enhanced rating with new fields
      const rating = {
        rater: r._id,
        ratee: u._id,
        didNotShowUp,
        cancelled,
        leftEarly,
        createdAt: faker.date.past({ years: 1 }), // Spread over time for trend analysis
      };

      // If special circumstances, skip positive feedback
      if (didNotShowUp || cancelled) {
        rating.safetyAndRespect = {
          madeMeFeelSafe: false,
          asDescribedInProfile: false,
          respectfulOfBoundaries: false,
        };
        rating.connection = {
          greatConversationalist: false,
          activeListener: false,
          madeMeLaugh: false,
          wouldMeetAgain: false,
        };
        rating.consideration = {
          onTime: false,
          attentive: false,
          goodManners: false,
          communicatedClearly: false,
        };
        rating.qualities = {
          dressedWell: false,
          smelledNice: false,
          goodEnergy: false,
          charmingSmile: false,
          athletic: false,
          competitiveDrive: false,
          openToAnything: false,
        };
        rating.wouldRecommendToFriend = false;
        rating.connectionStrength = 1;
        rating.comments = didNotShowUp
          ? "They didn't show up"
          : "Date was cancelled";
      } else {
        // Normal rating based on user archetype
        rating.safetyAndRespect = {
          madeMeFeelSafe: Math.random() < adjustedProb,
          asDescribedInProfile: Math.random() < adjustedProb * 0.9,
          respectfulOfBoundaries: Math.random() < adjustedProb,
        };

        rating.connection = {
          greatConversationalist: Math.random() < adjustedProb * 0.8,
          activeListener: Math.random() < adjustedProb * 0.85,
          madeMeLaugh: Math.random() < adjustedProb * 0.7,
          wouldMeetAgain: Math.random() < adjustedProb * 0.8,
        };

        rating.consideration = {
          onTime: Math.random() < adjustedProb * 0.95,
          attentive: Math.random() < adjustedProb * 0.9,
          goodManners: Math.random() < adjustedProb * 0.9,
          communicatedClearly: Math.random() < adjustedProb * 0.85,
        };

        rating.qualities = {
          dressedWell: Math.random() < adjustedProb * 0.8,
          smelledNice: Math.random() < adjustedProb * 0.75,
          goodEnergy: Math.random() < adjustedProb * 0.85,
          charmingSmile: Math.random() < adjustedProb * 0.7,
          athletic: Math.random() < 0.4, // More random
          competitiveDrive: Math.random() < 0.3,
          openToAnything: Math.random() < adjustedProb * 0.6,
        };

        rating.wouldRecommendToFriend = Math.random() < adjustedProb * 0.8;
        rating.connectionStrength = Math.max(
          1,
          Math.min(
            5,
            Math.round(
              1 + adjustedProb * 4 + faker.number.float({ min: -0.5, max: 0.5 })
            )
          )
        );

        // Generate realistic comments
        const commentTypes = [
          "Great conversation and really fun to be around!",
          "Had a nice time, would definitely meet up again.",
          "Really respectful and made me feel comfortable.",
          "Good energy and easy to talk to.",
          "Pleasant evening, enjoyed their company.",
          "Not bad but didn't feel a strong connection.",
          "They were okay, just not really my type.",
          "Seemed distracted and not very engaged.",
          "Conversation felt forced and awkward.",
          "Not what I expected from their profile.",
        ];

        const commentIndex = Math.floor(adjustedProb * commentTypes.length);
        rating.comments =
          commentTypes[Math.min(commentIndex, commentTypes.length - 1)];
      }

      await Rating.create(rating);
    }

    // Add some problematic patterns for specific users
    if (userArchetype === "problematic" && Math.random() < 0.3) {
      // Add a safety incident report for some problematic users
      const lastRating = await Rating.findOne({ ratee: u._id }).sort({
        createdAt: -1,
      });
      if (lastRating) {
        lastRating.safetyIncident = {
          reported: true,
          severity: faker.helpers.arrayElement(["low", "medium", "high"]),
          description: "User made me feel uncomfortable during the date",
          adminOnly: true,
        };
        await lastRating.save();
      }
    }
  }
  console.log("✅ Generated enhanced ratings with realistic patterns");

  // Adding blocked user data 
  console.log("Blocked User Data");
  
  await BlockedUser.deleteMany({});
  
  let blockedRelationshipsCreated = 0;
  
  for (const u of allUsers) {
    if (Math.random() < 0.15) { 
      const others = allUsers.filter((x) => !x._id.equals(u._id));
      
      let blockingLevel;
      const randomValue = Math.random();
      
      if (randomValue < 0.6) {
        blockingLevel = "light"; 
      } else if (randomValue < 0.85) {
        blockingLevel = "moderate"; 
      } else {
        blockingLevel = "heavy"; 
      }
      
      let numBlocks;
      switch (blockingLevel) {
        case "light":
          numBlocks = faker.number.int({ min: 1, max: 2 });
          break;
        case "moderate":
          numBlocks = faker.number.int({ min: 3, max: 5 });
          break;
        case "heavy":
          numBlocks = faker.number.int({ min: 6, max: 12 });
          break;
        default:
          numBlocks = 1;
      }
      
      const blockers = faker.helpers.arrayElements(others, Math.min(numBlocks, others.length));
      
      for (const blocker of blockers) {
        try {
          await BlockedUser.create({
            blockerId: blocker._id,
            blockedUserId: u._id,
            reason: faker.helpers.arrayElement([
              "inappropriate",
              "harassment", 
              "spam",
              "other"
            ]),
            blockedAt: faker.date.past({ years: 1 })
          });
          blockedRelationshipsCreated++;
        } catch (error) {
        }
      }
    }
  }
  
  console.log(`✅ Generated ${blockedRelationshipsCreated} blocked user relationships`);

  // 5) Recalculate enhanced safety scores
  console.log("🔄 Calculating enhanced safety scores...");
  let processedCount = 0;

  for (const u of allUsers) {
    try {
      await recalcProfileStats(u._id);
      processedCount++;

      if (processedCount % 10 === 0) {
        console.log(
          `   Processed ${processedCount}/${allUsers.length} users...`
        );
      }
    } catch (error) {
      console.error(`❌ Error processing user ${u._id}:`, error.message);
    }
  }
  console.log("🎉 Calculated enhanced safety scores & badges");

  // 6) Enhanced statistics
  const verificationStats = await User.aggregate([
    {
      $group: {
        _id: "$verificationStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  console.log("\n📊 ID Verification Statistics:");
  verificationStats.forEach((stat) => {
    const emoji = {
      approved: "✅",
      not_submitted: "⚪",
      pending: "⏳",
      rejected: "❌",
    };
    console.log(
      `   ${emoji[stat._id] || "❓"} ${stat._id}: ${stat.count} users`
    );
  });

  // Safety statistics
  const safetyStats = await Profile.aggregate([
    {
      $group: {
        _id: null,
        avgSafetyScore: { $avg: "$safetyScore" },
        highSafetyUsers: {
          $sum: { $cond: [{ $gte: ["$safetyScore", 80] }, 1, 0] },
        },
        lowSafetyUsers: {
          $sum: { $cond: [{ $lt: ["$safetyScore", 50] }, 1, 0] },
        },
        totalBadges: { $sum: { $size: { $ifNull: ["$badges", []] } } },
        usersWithMetadata: {
          $sum: { $cond: [{ $ne: ["$safetyMetadata", null] }, 1, 0] },
        },
      },
    },
  ]);

  if (safetyStats.length > 0) {
    const stats = safetyStats[0];
    console.log("\n🛡️ Enhanced Safety Statistics:");
    console.log(
      `   📊 Average Safety Score: ${Math.round(stats.avgSafetyScore || 0)}%`
    );
    console.log(`   ✅ High Safety Users (80%+): ${stats.highSafetyUsers}`);
    console.log(`   ⚠️ Low Safety Users (<50%): ${stats.lowSafetyUsers}`);
    console.log(`   🏆 Total Badges Earned: ${stats.totalBadges}`);
    console.log(`   📈 Users with Enhanced Data: ${stats.usersWithMetadata}`);
  }

  // blocked user statistics
  const blockedStats = await BlockedUser.aggregate([
    {
      $group: {
        _id: "$blockedUserId",
        blockCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalBlocks: { $sum: "$blockCount" },
        usersBlocked: { $sum: 1 },
        avgBlocksPerBlockedUser: { $avg: "$blockCount" },
        maxBlocks: { $max: "$blockCount" },
        lightlyBlocked: { $sum: { $cond: [{ $lte: ["$blockCount", 2] }, 1, 0] } },
        moderatelyBlocked: { $sum: { $cond: [{ $and: [{ $gt: ["$blockCount", 2] }, { $lte: ["$blockCount", 5] }] }, 1, 0] } },
        heavilyBlocked: { $sum: { $cond: [{ $gt: ["$blockCount", 5] }, 1, 0] } }
      }
    }
  ]);

  if (blockedStats.length > 0) {
    const stats = blockedStats[0];
    console.log("\n🚫 Blocked User Statistics:");
    console.log(`   📊 Total Block Relationships: ${stats.totalBlocks}`);
    console.log(`   👥 Users with Blocks: ${stats.usersBlocked}`);
    console.log(`   📈 Avg Blocks per Blocked User: ${Math.round(stats.avgBlocksPerBlockedUser * 10) / 10}`);
    console.log(`   🔝 Max Blocks on Single User: ${stats.maxBlocks}`);
    console.log(`   🟢 Lightly Blocked (1-2): ${stats.lightlyBlocked}`);
    console.log(`   🟡 Moderately Blocked (3-5): ${stats.moderatelyBlocked}`);
    console.log(`   🔴 Heavily Blocked (6+): ${stats.heavilyBlocked}`);
  }

  // Rating pattern statistics
  const ratingStats = await Rating.aggregate([
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        noShows: { $sum: { $cond: [{ $eq: ["$didNotShowUp", true] }, 1, 0] } },
        cancellations: {
          $sum: { $cond: [{ $eq: ["$cancelled", true] }, 1, 0] },
        },
        leftEarly: { $sum: { $cond: [{ $eq: ["$leftEarly", true] }, 1, 0] } },
        wouldRecommend: {
          $sum: { $cond: [{ $eq: ["$wouldRecommendToFriend", true] }, 1, 0] },
        },
        avgConnection: { $avg: "$connectionStrength" },
        safetyIncidents: {
          $sum: { $cond: [{ $eq: ["$safetyIncident.reported", true] }, 1, 0] },
        },
      },
    },
  ]);

  if (ratingStats.length > 0) {
    const stats = ratingStats[0];
    console.log("\n📝 Rating Pattern Statistics:");
    console.log(`   📊 Total Ratings: ${stats.totalRatings}`);
    console.log(
      `   🚫 No-shows: ${stats.noShows} (${(
        (stats.noShows / stats.totalRatings) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   ❌ Cancellations: ${stats.cancellations} (${(
        (stats.cancellations / stats.totalRatings) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   ⏰ Left Early: ${stats.leftEarly} (${(
        (stats.leftEarly / stats.totalRatings) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   👍 Would Recommend: ${stats.wouldRecommend} (${(
        (stats.wouldRecommend / stats.totalRatings) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   💫 Avg Connection: ${
        stats.avgConnection ? stats.avgConnection.toFixed(1) : "N/A"
      }/5`
    );
    console.log(`   🚨 Safety Incidents: ${stats.safetyIncidents}`);
  }

  // Trusted contact statistics
  const trustedContactStats = await User.aggregate([
    {
      $group: {
        _id: null,
        withTrustedContact: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$trustedContact.name", null] },
                  { $ne: ["$trustedContact.name", ""] },
                ],
              },
              1,
              0,
            ],
          },
        },
        autoNotifyEnabled: {
          $sum: { $cond: [{ $eq: ["$autoNotifyTrustedContact", true] }, 1, 0] },
        },
      },
    },
  ]);

  if (trustedContactStats.length > 0) {
    const tcStats = trustedContactStats[0];
    console.log("\n👥 Trusted Contact Statistics:");
    console.log(
      `   📝 Users with Trusted Contact: ${tcStats.withTrustedContact}/${allUsers.length}`
    );
    console.log(
      `   📲 Auto-notify Enabled: ${tcStats.autoNotifyEnabled}/${allUsers.length}`
    );
  }

  // 7) Disconnect
  await mongoose.disconnect();
  console.log("\n🛑 Disconnected, enhanced seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seeding error:", err);
  mongoose.disconnect();
  process.exit(1);
});
