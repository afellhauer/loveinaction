// script to check database collections during testing (MICHELLE TESTING)
const mongoose = require('mongoose');
const User = require('./models/User');
const Activity = require('./models/Activity');
const Swipe = require('./models/Swipe');
const Match = require('./models/Match');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/team01');
    console.log('🔗 Connected to MongoDB\n');

    const users = await User.find({}).select('firstName lastName email');
    console.log('👥 Users:', users.length);
    users.forEach(u => console.log(`  - ${u.firstName} ${u.lastName} (${u.email})`));

    const activities = await Activity.find({}).populate('userId', 'firstName lastName');
    console.log('\n🎯 Activities:', activities.length);
    activities.forEach(a => console.log(`  - ${a.userId.firstName}: ${a.activityType} at ${a.location}`));

    const swipes = await Swipe.find({}).populate('swiperId swipedUserId', 'firstName lastName');
    console.log('\n👆 Swipes:', swipes.length);
    swipes.forEach(s => console.log(`  - ${s.swiperId.firstName} ${s.type}d ${s.swipedUserId.firstName}`));

    const matches = await Match.find({}).populate('user1Id user2Id', 'firstName lastName');
    console.log('\n💕 Matches:', matches.length);
    matches.forEach(m => console.log(`  - ${m.user1Id.firstName} ❤️ ${m.user2Id.firstName}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData(); 