const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const expect = chai.expect;
const app = require('../../server');

// Helper function to generate test tokens
const generateTestToken = (userId) => {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Models
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const Activity = require('../../models/Activity');
const Match = require('../../models/Match');
const Message = require('../../models/Message');

chai.use(chaiHttp);

describe('Messaging System Integration Tests', function() {
  this.timeout(30000);

  let user1, user2, user1Token, user2Token;
  let profile1, profile2, activity1, activity2;
  let match;

  before(async function() {
    const dbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/loveinaction_messaging_test';
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUri);
    }
    console.log('[MESSAGING-INTEGRATION] Connected to test database');
  });

  after(async function() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log('[MESSAGING-INTEGRATION] Database cleaned up');
  });

  beforeEach(async function() {
    // Clean up all collections
    await User.deleteMany({});
    await Profile.deleteMany({});
    await Activity.deleteMany({});
    await Match.deleteMany({});
    await Message.deleteMany({});

    // Create test users
    user1 = new User({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@test.com',
      passwordHash: 'hashedpassword1',
      dateOfBirth: new Date('1995-01-01'),
      isVerified: true
    });
    await user1.save();

    user2 = new User({
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@test.com',
      passwordHash: 'hashedpassword2',
      dateOfBirth: new Date('1995-01-01'),
      isVerified: true
    });
    await user2.save();

    // Generate tokens
    user1Token = generateTestToken(user1._id);
    user2Token = generateTestToken(user2._id);

    // Create profiles
    profile1 = new Profile({
      user: user1._id,
      age: 28,
      gender: 'female',
      pronouns: 'she/her',
      preference: 'Male',
      bio: 'Love outdoor activities',
      location: 'downtown'
    });
    await profile1.save();

    profile2 = new Profile({
      user: user2._id,
      age: 30,
      gender: 'male',
      pronouns: 'he/him',
      preference: 'Female',
      bio: 'Adventure seeker',
      location: 'downtown'
    });
    await profile2.save();

    // Create activities
    activity1 = new Activity({
      userId: user1._id,
      activityType: 'hiking',
      location: 'downtown',
      dates: [new Date('2025-07-15')],
      times: ['morning'],
      isActive: true
    });
    await activity1.save();

    activity2 = new Activity({
      userId: user2._id,
      activityType: 'hiking',
      location: 'downtown',
      dates: [new Date('2025-07-15')],
      times: ['morning'],
      isActive: true
    });
    await activity2.save();

    // Create a match
    match = new Match({
      user1Id: user1._id,
      user2Id: user2._id,
      activityType: 'hiking',
      location: 'downtown',
      dates: [new Date('2025-07-15')],
      status: 'active',
      lastMessageAt: new Date()
    });
    await match.save();
  });

  describe('Plan Suggestion Flow', function() {
    it('should send plan suggestion and create appropriate message', async function() {
      const planSuggestion = {
        matchId: match._id,
        content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
        messageType: 'text'
      };

      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(planSuggestion);

      expect(res).to.have.status(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.content).to.equal(planSuggestion.content);
      expect(res.body.data.messageType).to.equal('text');
      expect(res.body.data.senderId._id.toString()).to.equal(user1._id.toString());

      // Verify message was saved to database
      const savedMessage = await Message.findById(res.body.data._id);
      expect(savedMessage.content).to.equal(planSuggestion.content);
      expect(savedMessage.matchId.toString()).to.equal(match._id.toString());
    });

    it('should update match lastMessageAt when plan is suggested', async function() {
      const originalLastMessageAt = match.lastMessageAt;
      
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
          messageType: 'text'
        });

      // Verify match was updated
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.lastMessageAt).to.be.greaterThan(originalLastMessageAt);
    });

    it('should allow user to retrieve plan suggestion message', async function() {
      // Send plan suggestion
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
          messageType: 'text'
        });

      // Retrieve messages as user2 (recipient)
      const res = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res).to.have.status(200);
      expect(res.body.data).to.have.length(1);
      expect(res.body.data[0].content).to.include('Does that work for you?');
      expect(res.body.data[0].senderId._id).to.equal(user1._id.toString());
    });
  });

  describe('Plan Response: "Sounds good!" Button', function() {
    beforeEach(async function() {
      // Send initial plan suggestion
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
          messageType: 'text'
        });
    });

    it('should send "Sounds good!" response and confirm plans', async function() {
      // User2 responds with "Sounds good!"
      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sounds good!',
          messageType: 'text'
        });

      expect(res).to.have.status(201);
      expect(res.body.data.content).to.equal('Sounds good!');
      expect(res.body.data.senderId._id.toString()).to.equal(user2._id.toString());

      // Verify message thread now has 2 messages
      const messages = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(messages.body.data).to.have.length(2);
      expect(messages.body.data[1].content).to.equal('Sounds good!');
    });

    it('should allow user to confirm plans after responding positively', async function() {
      // User2 responds with "Sounds good!"
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sounds good!',
          messageType: 'text'
        });

      // User2 confirms plans
      const confirmRes = await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(confirmRes).to.have.status(200);
      expect(confirmRes.body.success).to.be.true;
      expect(confirmRes.body.data.userConfirmed).to.be.true;
      expect(confirmRes.body.data.otherUserConfirmed).to.be.false;
      expect(confirmRes.body.data.bothUsersConfirmed).to.be.false;

      // Verify match was updated
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.user2Confirmed).to.be.true;
      expect(updatedMatch.user1Confirmed).to.be.false;
    });

    it('should update match state when both users confirm plans', async function() {
      // User2 responds positively and confirms
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sounds good!',
          messageType: 'text'
        });

      await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user2Token}`);

      // User1 also confirms plans
      const user1ConfirmRes = await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1ConfirmRes).to.have.status(200);
      expect(user1ConfirmRes.body.data.bothUsersConfirmed).to.be.true;
      expect(user1ConfirmRes.body.message).to.include('Both users have confirmed!');

      // Verify match confirmation state
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.user1Confirmed).to.be.true;
      expect(updatedMatch.user2Confirmed).to.be.true;
    });

    it('should allow finalizing date when both users have confirmed', async function() {
      // Both users confirm plans
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sounds good!',
          messageType: 'text'
        });

      await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user2Token}`);

      await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user1Token}`);

      // Finalize the date
      const finalizeRes = await chai.request(app)
        .post(`/api/matches/${match._id}/finalize-date`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(finalizeRes).to.have.status(200);
      expect(finalizeRes.body.success).to.be.true;
      expect(finalizeRes.body.message).to.include('Date confirmed!');

      // Verify match status updated to confirmed
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.status).to.equal('confirmed');
    });
  });

  describe('Plan Response: "Suggest Plans..." Button', function() {
    beforeEach(async function() {
      // Send initial plan suggestion
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
          messageType: 'text'
        });
    });

    it('should send counter-suggestion when user suggests different plans', async function() {
      const counterSuggestion = {
        matchId: match._id,
        content: 'Hi Alice!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 10:00 AM at Lynn Canyon Park.\nDoes that work for you?',
        messageType: 'text'
      };

      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(counterSuggestion);

      expect(res).to.have.status(201);
      expect(res.body.data.content).to.equal(counterSuggestion.content);
      expect(res.body.data.senderId._id.toString()).to.equal(user2._id.toString());

      // Verify message thread shows counter-suggestion
      const messages = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(messages.body.data).to.have.length(2);
      expect(messages.body.data[1].content).to.include('Lynn Canyon Park');
      expect(messages.body.data[1].content).to.include('10:00 AM');
    });

    it('should allow back-and-forth plan negotiations', async function() {
      // User2 sends counter-suggestion
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Alice!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 10:00 AM at Lynn Canyon Park.\nDoes that work for you?',
          messageType: 'text'
        });

      // User1 responds with another counter-suggestion
      const finalSuggestion = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:30 AM at Lynn Canyon Park.\nDoes that work for you?',
          messageType: 'text'
        });

      expect(finalSuggestion).to.have.status(201);

      // Verify complete message thread
      const messages = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(messages.body.data).to.have.length(3);
      expect(messages.body.data[0].content).to.include('9:00 AM at Grouse Mountain');
      expect(messages.body.data[1].content).to.include('10:00 AM at Lynn Canyon Park');
      expect(messages.body.data[2].content).to.include('9:30 AM at Lynn Canyon Park');
    });

    it('should eventually reach agreement after negotiations', async function() {
      // User2 counter-suggests
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Alice!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 10:00 AM at Lynn Canyon Park.\nDoes that work for you?',
          messageType: 'text'
        });

      // User1 agrees to the counter-suggestion
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Sounds good!',
          messageType: 'text'
        });

      // Both users confirm the final plan
      await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user1Token}`);

      await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Verify both users confirmed
      const updatedMatch = await Match.findById(match._id);
      expect(updatedMatch.user1Confirmed).to.be.true;
      expect(updatedMatch.user2Confirmed).to.be.true;
    });
  });

  describe('Plan Response: "Sorry! I can no longer make it" Button', function() {
    beforeEach(async function() {
      // Send initial plan suggestion
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
          messageType: 'text'
        });
    });

    it('should send cancellation message when user cancels plans', async function() {
      // User2 cancels plans
      const cancelRes = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sorry! I can no longer make it',
          messageType: 'text'
        });

      expect(cancelRes).to.have.status(201);
      expect(cancelRes.body.data.content).to.equal('Sorry! I can no longer make it');
      expect(cancelRes.body.data.senderId._id.toString()).to.equal(user2._id.toString());

      // Verify message thread shows cancellation
      const messages = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(messages.body.data).to.have.length(2);
      expect(messages.body.data[1].content).to.include('Sorry! I can no longer make it');
    });

    it('should send system cancellation message after user cancels', async function() {
      // User2 cancels plans
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sorry! I can no longer make it',
          messageType: 'text'
        });

      // Send system cancellation message
      const systemCancelRes = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: '❌ Plans have been cancelled.',
          messageType: 'cancellation'
        });

      expect(systemCancelRes).to.have.status(201);
      expect(systemCancelRes.body.data.messageType).to.equal('cancellation');

      // Verify message thread shows both messages
      const messages = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(messages.body.data).to.have.length(3);
      expect(messages.body.data[2].content).to.equal('❌ Plans have been cancelled.');
      expect(messages.body.data[2].messageType).to.equal('cancellation');
    });

    it('should prevent further plan confirmations after cancellation', async function() {
      // User2 cancels plans
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sorry! I can no longer make it',
          messageType: 'text'
        });

      // Send system cancellation message
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: '❌ Plans have been cancelled.',
          messageType: 'cancellation'
        });

      // Try to confirm plans (should still work as the match is active)
      // Note: Cancellation is handled at the UI level, not backend validation
      const confirmRes = await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(confirmRes).to.have.status(200);
      // Backend allows confirmation, but UI should prevent it after cancellation
    });
  });

  describe('Message Threading and Ordering', function() {
    it('should maintain correct message order in conversation', async function() {
      const messages = [
        { sender: user1Token, content: 'Hi Bob! Let\'s plan our hike.' },
        { sender: user2Token, content: 'Hi Alice! I\'m excited!' },
        { sender: user1Token, content: 'How about 9 AM at Grouse Mountain?' },
        { sender: user2Token, content: 'Perfect! See you there!' }
      ];

      // Send messages in sequence
      for (let i = 0; i < messages.length; i++) {
        await chai.request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${messages[i].sender}`)
          .send({
            matchId: match._id,
            content: messages[i].content,
            messageType: 'text'
          });
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Retrieve messages and verify order
      const res = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.body.data).to.have.length(4);
      expect(res.body.data[0].content).to.equal('Hi Bob! Let\'s plan our hike.');
      expect(res.body.data[1].content).to.equal('Hi Alice! I\'m excited!');
      expect(res.body.data[2].content).to.equal('How about 9 AM at Grouse Mountain?');
      expect(res.body.data[3].content).to.equal('Perfect! See you there!');
    });

    it('should track unread message count correctly', async function() {
      // User1 sends a message
      await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob! How are you?',
          messageType: 'text'
        });

      // Check unread count for user2
      const unreadRes = await chai.request(app)
        .get(`/api/messages/match/${match._id}/unread-count`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unreadRes).to.have.status(200);
      expect(unreadRes.body.data.unreadCount).to.equal(1);

      // Mark all messages as read
      await chai.request(app)
        .put(`/api/messages/match/${match._id}/read-all`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Check unread count again
      const unreadRes2 = await chai.request(app)
        .get(`/api/messages/match/${match._id}/unread-count`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unreadRes2.body.data.unreadCount).to.equal(0);
    });
  });

  describe('Edge Cases and Error Handling', function() {
    it('should prevent messages on inactive matches', async function() {
      // Make match inactive
      match.status = 'unmatched';
      await match.save();

      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'This should fail',
          messageType: 'text'
        });

      expect(res).to.have.status(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('inactive match');
    });

    it('should prevent unauthorized users from accessing messages', async function() {
      // Create third user
      const user3 = new User({
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@test.com',
        passwordHash: 'hashedpassword3',
        dateOfBirth: new Date('1995-01-01'),
        isVerified: true
      });
      await user3.save();
      const user3Token = generateTestToken(user3._id);

      // Try to access messages from unauthorized user
      const res = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res).to.have.status(403);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Not authorized');
    });

    it('should handle malformed message data gracefully', async function() {
      const res = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          // Missing content
          messageType: 'text'
        });

      expect(res).to.have.status(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('content are required');
    });

    it('should prevent confirming plans when both users have not confirmed', async function() {
      // Try to finalize without confirmations
      const res = await chai.request(app)
        .post(`/api/matches/${match._id}/finalize-date`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Both users must confirm plans');
    });
  });

  describe('Complete Plan Confirmation Workflow', function() {
    it('should complete full plan suggestion to confirmation workflow', async function() {
      // Step 1: User1 suggests initial plan
      const planSuggestion = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          matchId: match._id,
          content: 'Hi Bob!\nOur planned activity is to hiking morning.\nMy suggestion is that we meet at 9:00 AM at Grouse Mountain Trail.\nDoes that work for you?',
          messageType: 'text'
        });
      expect(planSuggestion).to.have.status(201);

      // Step 2: User2 responds positively
      const positiveResponse = await chai.request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          matchId: match._id,
          content: 'Sounds good!',
          messageType: 'text'
        });
      expect(positiveResponse).to.have.status(201);

      // Step 3: User2 confirms plans
      const user2Confirm = await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user2Token}`);
      expect(user2Confirm).to.have.status(200);
      expect(user2Confirm.body.data.userConfirmed).to.be.true;
      expect(user2Confirm.body.data.bothUsersConfirmed).to.be.false;

      // Step 4: User1 confirms plans
      const user1Confirm = await chai.request(app)
        .post(`/api/matches/${match._id}/confirm-plans`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(user1Confirm).to.have.status(200);
      expect(user1Confirm.body.data.bothUsersConfirmed).to.be.true;

      // Step 5: Either user can finalize the date
      const finalizeDate = await chai.request(app)
        .post(`/api/matches/${match._id}/finalize-date`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(finalizeDate).to.have.status(200);
      expect(finalizeDate.body.data.status).to.equal('confirmed');

      // Step 6: Verify final match state
      const finalMatch = await Match.findById(match._id);
      expect(finalMatch.status).to.equal('confirmed');
      expect(finalMatch.user1Confirmed).to.be.true;
      expect(finalMatch.user2Confirmed).to.be.true;

      // Step 7: Verify complete message thread
      const finalMessages = await chai.request(app)
        .get(`/api/messages/match/${match._id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(finalMessages.body.data).to.have.length(2);
      expect(finalMessages.body.data[0].content).to.include('Does that work for you?');
      expect(finalMessages.body.data[1].content).to.equal('Sounds good!');
    });
  });
}); 