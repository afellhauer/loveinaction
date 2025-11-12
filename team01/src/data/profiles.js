export const profiles = [
  {
    id: 0,
    email: "zbaig@email.com",
    name: "Zainab Baig",
    age: 23,
    location: "UBC",
    gender: "Female",
    pronouns: "She/Her",
    occupation: "SWE",
    education: "Bachelor of Science",
    bio: "I'm a matcha girlie!",
    profilePic: null,
    q1: "What's your spirit animal?",
    q1Text: "Wolf",
    safetyScore: 5,
    socialMedia: {
      instagram: "@zbaig",
      snapchat: "@zbaig",
      tiktok: "@crazygirlbaig",
    },
    activity: "Bike",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
  },
  {
    id: 1,
    name: "David Peter",
    age: 25,
    activity: "Bike",
    location: "UBC",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/david_peter.jpeg",
    bio: "Coffee snob and trivia night champion. Ask me anything about 90s cartoons.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@davidpeter",
      snapchat: "@david_rides",
    },
  },
  {
    id: 2,
    name: "Sarah Chen",
    age: 23,
    activity: "Bike",
    location: "Lynn Canyon",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/sarah_chen.jpeg",
    bio: "Plant mom with over 30 succulents. I bake banana bread weekly.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@sarahc_hikes",
      linkedin: "sarah-chen-outdoors",
    },
  },
  {
    id: 3,
    name: "Mike Johnson",
    age: 28,
    activity: "Bike",
    location: "Squamish",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/mike_johnson.png",
    bio: "Engineer by day, amateur woodworker by night. Ask me about my custom desk.",
    safetyScore: 4,
    socialMedia: {
      instagram: "@mike_climbs",
      facebook: "Mike Johnson Climbing",
    },
  },
  {
    id: 4,
    name: "Emma Wilson",
    age: 26,
    activity: "Bike",
    location: "English Bay",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/emma_wilson.png",
    bio: "Marine biology student who can identify 50+ sea creatures on sight.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@emma_paddles",
      snapchat: "@emma_water",
    },
  },
  {
    id: 5,
    name: "Alex Rodriguez",
    age: 24,
    activity: "Bike",
    location: "Queen Elizabeth Park",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/alex_rodriguez.jpeg",
    bio: "Graffiti artist who once painted a mural in Barcelona.",
    safetyScore: 4,
    socialMedia: {
      instagram: "@alex_skates",
      snapchat: "@alex_art",
    },
  },
  {
    id: 6,
    name: "Jessica Kim",
    age: 27,
    activity: "Bike",
    location: "Stanley Park Seawall",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/jessica_kim.jpeg",
    bio: "Morning person with a love for crossword puzzles and green smoothies.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@jessica_runs",
      linkedin: "jessica-kim-fitness",
    },
  },
  {
    id: 7,
    name: "Ryan Martinez",
    age: 29,
    activity: "Bike",
    location: "Chesterman Beach",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/ryan_martinez.jpeg",
    bio: "Barista turned high school teacher. Can do latte art in my sleep.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@ryan_surfs",
      facebook: "Ryan Martinez Surf School",
    },
  },
  {
    id: 8,
    name: "Mia Thompson",
    age: 22,
    activity: "Bike",
    location: "Kitsilano Beach",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/mia_thompson.jpeg",
    bio: "Poet and amateur astrologer. I write haikus about strangers on the bus.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@mia_yoga",
      snapchat: "@mia_wellness",
    },
  },
  {
    id: 9,
    name: "Jordan Lee",
    age: 26,
    activity: "Bike",
    location: "Gastown",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/jordan_lee.jpeg",
    bio: "Vintage film collector. Still has a flip phone for the vibes.",
    safetyScore: 4,
    socialMedia: {
      instagram: "@jordan_captures",
      linkedin: "jordan-lee-photography",
    },
  },
  {
    id: 10,
    name: "Taylor Brooks",
    age: 25,
    activity: "Bike",
    location: "Queen Elizabeth Tennis Courts",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/taylor_brooks.jpeg",
    bio: "Big on indie music, tiny on TikTok. I rate all sandwiches I eat.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@taylor_tennis",
      facebook: "Taylor Brooks Tennis",
    },
  },
  {
    id: 11,
    name: "Cameron Park",
    age: 30,
    activity: "Bike",
    location: "Granville Island Market",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/cameron_park.jpeg",
    bio: "Dad joke expert. Once won a pun competition at a food festival.",
    safetyScore: 5,
    socialMedia: {
      instagram: "@cameron_cooks",
      snapchat: "@chef_cameron",
    },
  },
  {
    id: 12,
    name: "Riley Chen",
    age: 24,
    activity: "Bike",
    location: "Storm Crow Tavern",
    time: formatSimplePrettyDate(new Date()),
    timeOfDay: "Morning",
    image: "/images/riley_chen.jpeg",
    bio: "Dungeon master with a spreadsheet for every campaign. Loves bubble tea.",
    safetyScore: 4,
    socialMedia: {
      instagram: "@riley_games",
      linkedin: "riley-chen-games",
    },
  },
];

export const getProfilesByActivity = (activity) => {
  return profiles.filter((profile) =>
    profile.activity.toLowerCase().includes(activity.toLowerCase())
  );
};

export const getProfilesByAgeRange = (minAge, maxAge) => {
  return profiles.filter(
    (profile) => profile.age >= minAge && profile.age <= maxAge
  );
};

export const matches = new Map([
  [1, []],
  [2, []],
  [3, []],
  [4, [0]],
  [5, []],
  [6, []],
  [7, []],
  [8, []],
  [9, [0]],
  [10, []],
  [11, []],
  [12, [0]],
]);

export const isMatch = (userID, profilePic) => {
  const matchedList = matches.get(profilePic);
  return matchedList?.includes(userID) ?? false;
};

export function formatSimplePrettyDate(dateInput) {
  const date = new Date(dateInput); // Accepts string, number, or Date object

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default profiles;
