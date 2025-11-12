### Team01

**Team Name**: The MatchMakers

**Project Name**: Love In Action

**Team Members**:

- Michelle Lei
- Allison Fellhauer
- Minou Khademolsharie​
- Zainab Baig

---

## Description

Love In Action is an activity-first dating app designed to connect singles through real-time shared experiences instead of relying solely on photos. Users can securely sign up, build a profile, and swipe through profiles who share both their interests and availability. When two users match, a chat window opens immediately. A dynamic safety-score, fueled by anonymous post-date feedback, ID verification, and linked social profiles, provides an overall trust rating plus earned personality badges. In future releases, we’ll integrate AI-powered activity recommendations, such as suggesting nearby trails when you match on hiking. The result is a secure, personalized platform that makes spontaneous, in-person connections effortless and safe.

---

## Milestone 1

- User authentication and registration (login, signup, logout, create profile)
- Sidebar navigation with links to Home, Chat, Profile, and Logout
- Alert and upcoming event cards on the home page
- Modal dialogs for alerts, safety score information, and match success
- Preset messages and responses between users in the chat
- Match creation form with dropdown for activities, location, and time
- Feed of user profiles with swiping

---

## Milestone 2

### New Models & Schemas

We’ve introduced full Mongoose schemas for:

- **User** (with email verification token + refresh tokens + bcrypt’d password)
- **Profile** (age, bio, social links, profile picture, etc.)
- **Activity**
- **Swipe**
- **Match**
- **Message**
- **Rating**

---

### API Reference

All endpoints are prefixed with `/api` and require a valid `Authorization: Bearer <accessToken>` header, except signup, login, verify and refresh.

### Auth

- **POST** `/api/auth/signup`  
  Registers a new user; body: `{ firstName, lastName, email, password }`
- **GET** `/api/auth/verify/:token`  
  Verifies email and redirects to `/verify-success`
- **POST** `/api/auth/login`  
  Logs in; body: `{ email, password }` → returns `{ user, accessToken, refreshToken }`
- **POST** `/api/auth/refresh`  
  Exchanges a refresh token for a new access token; body: `{ token }`

### Profile

- **POST** `/api/profile`  
  Create or update your profile (multipart form-data, including `profilePic` file and fields)
- **GET** `/api/profile/me`  
  Fetch your user + profile data
- **GET** `/api/profile/:userId`  
  Fetch another user’s profile

### Activities

- **POST** `/api/activities`  
  Create a new activity intention; body: `{ activityType, location, dates?, times? }`
- **GET** `/api/activities/my-activities`  
  List your active activities
- **GET** `/api/activities/:activityId/matches`  
  Find other users whose activity matches this one
- **PUT** `/api/activities/:id`  
  Update or deactivate an activity
- **DELETE** `/api/activities/:id`  
  Delete an activity
- **POST** `/api/activities/:id/toggle`  
  Toggle `isActive` on/off

### Swipes

- **GET** `/api/swipes/activity/:activityId/already-swiped`  
  List user IDs you’ve already swiped on for this activity
- **POST** `/api/swipes`  
  Record a swipe; body: `{ swipedUserId, activityId, type: "like" | "pass" }` → returns `{ isMatch, match }` if it was mutual
- **GET** `/api/swipes/matches/:activityId`  
  List simple match info for this activity
- **GET** `/api/swipes/my-swipes?activityId=&type=`  
  List your past swipes (filterable)
- **DELETE** `/api/swipes/:id`  
  Remove one of your swipes

### Matches

- **GET** `/api/matches`  
  List your matches (filter by `?status=active,confirmed,date_passed`)
- **GET** `/api/matches/:id`  
  Get details for one match
- **POST** `/api/matches/:id/block`  
  Block the other user; body: `{ reason }`
- **POST** `/api/matches/:id/unblock`  
  Unblock the other user
- **POST** `/api/matches/:id/rate`  
  Submit a 1–5 star rating; body: `{ rating }`
- **POST** `/api/matches/:id/unmatch`  
  End the match without deleting it
- **DELETE** `/api/matches/:id`  
  Permanently delete the match

### Messages

- **POST** `/api/messages`  
  Send a new message; body: `{ matchId, content }`
- **GET** `/api/messages/:matchId`  
  Fetch the chat history for a match

### Ratings

- **POST** `/api/ratings`  
  Submit post-date feedback (ties into match expiration)

---

### File Uploads

- **Multer** is used on the backend to handle profile picture uploads and ID scans.

---

### Email Verification

- **Nodemailer** + **Mailtrap** integration for email verification.
- Click the verification link in your Mailtrap inbox to activate your account and be redirected into the app.

---

### Front-End Enhancements

- **React Router v6** with dedicated “pages”:
  - `HomePage`, `FilterPage`, `ChatPage`, `MatchesPage`, `MyActivitiesPage`, `ViewProfilePage`
- Refactored components into page-based structure under `/src/pages/…`
- New UI components & styling:
  - `RatingModal`, enhanced alerts, success dialogs
  - General CSS polish for a cleaner, more consistent look

---

### Redux Store Slices

Added new slices in `/src/store/slices/`:

- `activitySlice`
- `matchedProfilesSlice`
- `matchSlice`
- `messageSlice`
- `profileSlice`
- `ratingSlice`
- `swipeSlice`

…plus the existing `userFlagsSlice` and `profilesSlice` to drive routing, sidebar state, and home-page controls.

---

### Seeding & Test Data

- A custom seeding script (`backend/scripts/seed.js`) injects:
  - **Weighted “bias”** so that ~50% of profiles and ~60% of activities land in “Downtown” with Hike or Run
  - **Test Demo User** (`testdemo@example.com` / `123`) is seeded with the less-common combo “Dance in Kerrisdale, Evening” so you can trigger matches quickly.

---

### Testing Credentials

**Mailtrap**

- URL: https://mailtrap.io/signin
- Username: `minookhadem@yahoo.com`
- Password: `Loveinaction123!`

_Note: \_This will require validation! If it asks you to validate, reach out to Minou and she can give you access.\_\_
\_Otherwise, there are pre-made accounts recorded in the database (`Users model`) whose emails you can use with the password `123`_

**Test Demo User** (to verify matching logic)

- Email: `testdemo@example.com`
- Password: `123`

---

### Docker Instructions

```shell
cd team01
docker compose up
```

Open your browser and go to: http://localhost:8080

---

## Milestone 3

### What's New Since Milestone 3

- **Unit Test Suite**: Added unit tests for all major API endpoints and routes. Created tests for:

  - `authentication`
  - `profile`
  - `activities`
  - `swipes`
  - `matches`
  - `preference-filtering`
  - `datetime-filtering`
  - `messages`
  - `ratings`

- **Message Confirmation**: Confirm button now appears in chat when a user replies "sounds good" to suggested plans
- **Match Confirmation Status**: Both users clicking the confirmation button sets the match status to "confirmed"
- **About Us Page**: Created an About Us page with team information and app details
- **Tutorial Modal**: Created a tutorial icon (bottom right corner on Home page) to provide a brief overview to the app.
- **Help Page**: Added a deciated help page with detailed instructions, images, and a FAQ.
- **Rating Page**: created a dedicated rating page where users can rate their matches with the "date_passed" status (e.g. the date has happened)
- **Activity Navigation**: The activity panel on the homepage navigates to activity (i.e. resume swipe/match)
- **Improved Error Handling**: Improved error responses across all endpoints
- **Scoring/Badges**: Created scoring badges logic based on user ratings
- **Profile Scoring Display**: Score and badges now appear on profile details page
- **Preference-Based Matching**: Implemented two-way mutual preference filtering for activity matches based on gender preferences, so users are only shown potential matches when there is bidirectional compatibility based on gender preferences. The logic is:
  - A user who prefers "Everyone" can see users of any gender (who also want to see them)
  - A user who prefers "Male" will only see male users (who also want to see them)
  - A user who prefers "Female" will only see female users (who also want to see them)
  - Dynamic updates: when a user updates their gender preference in their profile settings, future activity matches immediately reflect this change without affecting existing matches.
- **Date/Time Filtered Matching**: Activities match when they have overlapping dates AND overlapping times, with empty arrays treated as "flexible" (matches everything).
  - 4 match cases (when at least one of date OR time is flexible, OR both are exact matches)
  - No-match cases (when both date and time are specified but at least one doesn't match)
- **Bug fixes** (Refer to Github Issues)

## Test Suite

#### Testing Tools & Libraries

- **Mocha**: Test framework for organizing and running tests
- **Chai**: Assertion library with HTTP testing
- **Sinon**: Mocking/stubbing library
- **MongoDB Memory Server**: In-memory MongoDB instance for testing
- **Chai-HTTP**: HTTP integration testing for API endpoints

#### Test Suite Repository Links

- **Complete Test Suite**: ([`backend/test/unit/`](team01/backend/test/unit/))

Unit tests links:

1. **Authentication** ([`backend/test/unit/auth.unit.test.js`](team01/backend/test/unit/auth.unit.test.js))
2. **Profile** ([`backend/test/unit/profile.unit.test.js`](team01/backend/test/unit/profile.unit.test.js))
3. **Activities** ([`backend/test/unit/activities.unit.test.js`](team01/backend/test/unit/activities.unit.test.js))
4. **Swipe** ([`backend/test/unit/swipes.unit.test.js`](team01/backend/test/unit/swipes.unit.test.js))
5. **Matching** ([`backend/test/unit/matches.unit.test.js`](team01/backend/test/unit/matches.unit.test.js))
6. **Messages** ([`backend/test/unit/messages.unit.test.js`](team01/backend/test/unit/messages.unit.test.js))
7. **Ratings** ([`backend/test/unit/ratings.unit.test.js`](team01/backend/test/unit/ratings.unit.test.js))
8. **Two-Way Preference Filtering**: ([`backend/test/unit/preference-filtering.unit.test.js`](team01/backend/test/unit/preference-filtering.unit.test.js))
9. **Date-Time Filtering**: ([`backend/test/unit/datetime-filtering.unit.test.js`](team01/backend/test/unit/datetime-filtering.unit.test.js))
10. **Trusted Contact Notifications**: ([`backend/test/unit/trusted-contact-simple.unit.test.js`](team01/backend/test/unit/trusted-contact-simple.unit.test.js))
    
## Running the Test Suite

### 🚀 Running Unit Tests

To run the unit test suite:

```bash
# Install dependencies (run from project root)
npm install
cd team01/backend && npm install && cd ..

# Run all unit tests (from backend directory)
cd team01/backend && npm test

# Run tests with coverage report (from backend directory)
cd team01/backend && npm run test:coverage

# Run specific test files (from backend directory)
cd team01/backend && npm run test:profile
cd team01/backend && npm run test:auth
cd team01/backend && npm run test:activities
cd team01/backend && npm run test:matches
cd team01/backend && npm run test:swipes
cd team01/backend && npm run test:messages
cd team01/backend && npm run test:ratings
cd team01/backend && npm run test:preference-filtering
cd team01/backend && npm run test:datetime-filtering
cd team01/backend && npm run test:trusted-contact-simple
```

### 🚀 Running Integration Tests

```bash
# Run all integration tests
cd team01/backend
npm run test:integration

# Run specific test suites
npm run test:integration:journey      # User journey tests
npm run test:integration:auth         # Authentication tests
npm run test:integration:matching     # Matching & filtering tests
npm run test:integration:messaging    # Messaging & plan confirmation tests

cd ../src  # In the src directory

# Run all tests (unit + integration)
npm run test:all:fullstack

```

---

### Docker Instructions

```shell
cd team01
docker compose up
```

Open your browser and go to: http://localhost:8080

---
## Milestone 4
### App Summary
Love In Action is an activity-first dating app designed to connect singles through real-time shared experiences, prioritizing safety and authenticity. Instead of focusing solely on photos, our platform matches people based on shared activities, availability, and preferences. With features like ID verification, safety scoring, and trust badges, Love In Action ensures a secure, engaging, and human-centered dating experience.

### Standard Goals
| Goal                                                   | Status      |
| ------------------------------------------------------ | ----------- |
| User Authentication (Login, Signup, Logout)            | ✅ Completed |
| Profile Creation and Management                        | ✅ Completed |
| Activity Matching (based on activity type, date, time) | ✅ Completed |
| Swipe & Match Flow                                     | ✅ Completed |
| Chat with Preset Messages                              | ✅ Completed |
| Safety Score System (based on post-date feedback)      | ✅ Completed |
| Rating System                                          | ✅ Completed |
| Unit & Integration Testing                             | ✅ Completed |
| Dockerized Deployment                                  | ✅ Completed |

### Stretch Goals
| Feature                                      | Status      | Comments     |
| -------------------------------------------- | ----------- | -----------  |
| ID Verification (AWS Rekognition & Textract) | ✅ Completed |              |
| User Blocking                                | ✅ Completed |              |
| New User Badge                               | ✅ Completed |              |
| Account Self-Deactivation                    | ✅ Completed |              |
| Push/Email Notifications                     | ❌ Dropped   | TBD |
| Real-Time Chat                               | ❌ Dropped   | replaced with preset messages to encourage in-person meetups |
| ML-Based Activity Recommendations            | ❌ Dropped   | deferred due to scope |

### Non-Trivial Elements
| Feature                                      | Status      |
| -------------------------------------------- | ----------- |
| Dynamic Matching Logic (Date & Time Overlap) | ✅ Completed |
| Two-Way Gender Preference Matching           | ✅ Completed |
| Safety Score System + Badges                 | ✅ Completed |
| ID Verification (AWS Rekognition + Textract) | ✅ Completed |
| Account Self-Deactivation                    | ✅ Completed |
| Blocking & Unblocking Users                  | ✅ Completed |

### XSS Security Assessment
During WS4, we performed a comprehensive XSS security review by injecting <script> tags, encoded payloads, and event-based JavaScript in all input points. Below is the summary:

| Vulnerability                   | Result                                | Mitigation                                                  |
| ------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Scripts in time/location fields | Rendered unsafe content in chat       | **Sanitized input before sending**                          |
| JS alerts in text fields        | Displayed as plain text, not executed | ✅ Safe                                                      |
| HTML entity encoding bypass     | Decoded and executed                  | **DOMPurify ensures entity decoding and full sanitization** |
| Profile picture URL guessing    | Public access possible                | **Added auth guard for image route**                        |
| Scripts in bio                  | Executed                              | **Sanitized bio input on backend with DOMPurify**           |
| Script injection via login URL  | Unsafe message displayed              | **Sanitized query params and added whitelist**              |

- Implemented DOMPurify + server-side sanitization for all risky fields
- Restricted file access with authorization middleware
- Hardened routes to only accept validated, whitelisted paths

### Response Obfuscation
We added middleware to Base64-encode responses from sensitive routes (`/api/matches, /api/profile, /api/activities, /api/messages, /api/swipes`) when `OBFUSCATE_RESPONSES=true` to add an extra layer against unauthorized data parsing.

Adds a X-Response-Obfuscated: true header and wraps the response as:

`{
  "obfuscated": true,
  "data": "<base64-string>"
}`

### M4 Highlights
New Features Since Milestone 3:
- ID Verification using AWS Rekognition + Textract
- User Blocking & Unblocking
- Account Self-Deactivation
- Attendance in Ratings (No-Show, Cancelled options)
- New User Badge
- Hardened Security: DOMPurify for XSS, auth checks for profile images
- Full Unit & Integration Test Suite for all flows
- Sign-Up Page updates (strong password validation, DOB for age)

### Bug List
We are tracking all known issues in our GitHub Issues board, but one major ongoing bug and plan are highlighted here:

[**The Issue**](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/issues/46?fbclid=IwY2xjawLr86JleHRuA2FlbQIxMABicmlkETFVZFNwdlVLWTdndFBvajI2AR4GMTAT8XzDYia3TCf2-jJjdApGgkEaGVkNiAYYRDccKhBQaK_PAkjKJjx-nQ_aem_shw-O5HF8NAAMw51S8rmXw)

The Chat Dashboard faces recurring issues, including occasional infinite request loops when new users join a conversation. These are difficult to resolve due to current structure and complexity of chat logic.

**The Plan**
- Investigate root cause of infinite request loops.
- Explore alternatives to polling to prevent redundant requests.
- Refactor chat logic into modular components for easier debugging.
- Track all changes under a new branch: refactoring-chat.
- Begin by cleaning up message slice and backend routes for simpler architecture.

### Docker Instructions
Make sure mongodb is running and accepting connections. 

Pull changes from remote (M4) and run the following commands:

```shell
cd team01
docker compose pull
docker compose up
```

Once running, navigate to: `http://localhost:8080`

You can log in using: `testdemo@example.com` password: `123`

### Testing Details
Our full unit and integration test suite remains unchanged since Milestone 3. For complete setup instructions and test script details, please refer to the Milestone 3 - Test Suite section.

### Next Steps
- Final UI polish
- Missing validations
- Deployment check
- Final documentation pass

---
## Milestone 5: Final Release

### Standard Goals
| Goal                                                   | Status      | Comments     |
| ------------------------------------------------------ | ----------- | -----------  |
| User Authentication (Login, Signup, Logout)            | ✅ Completed | Includes JWT, email verification, bcrypt, Terms of Service |
| Profile Creation and Management                        | ✅ Completed | Users can create full profiles with bio, gender, photos, and more |
| Activity Matching (based on activity type, date, time) | ✅ Completed | Includes date/time filtering and mutual preference matching |
| Swipe & Match Flow                                     | ✅ Completed | All logic completed except $geoNear location matching due to time constraints |
| Chat with Preset Messages                              | ✅ Completed | Real-time via Socket.IO; intentionally limited to preset messages |
| Safety Score System (based on post-date feedback)      | ✅ Completed | Aggregates post-activity ratings to generate a dynamic safety score visible on user profiles |
| Rating System                                          | ✅ Completed | Enforced stricter rule: users must rate all unrated matches
| Unit & Integration Testing                             | ✅ Completed | Full coverage for core API flows, filters, and chat logic |
| Dockerized Deployment                                  | ✅ Completed | Fully containerized backend and frontend with seed script |
| Two-Way Gender Preference Matching                     | ✅ Completed | Bidirectional filter logic ensures only compatible matches are shown |
| Push/Email Notifications                               | ❌ Dropped   | Dropped due to scoping limitations; replaced with trusted contact notifications to better support user safety via real-time updates on match activity |

### Stretch Goals
| Feature                                      | Status      | Comments     |
| -------------------------------------------- | ----------- | -----------  |
| ID Verification (AWS Rekognition & Textract) | ✅ Completed | Users verify with government ID + face photo |
| User Blocking                                | ✅ Completed | Bidirectional block via chat; blocks future matches permanently |
| New User Badge                               | ✅ Completed | Automatically assigns a badge to recently joined users to help others identify and welcome newcomers |
| Account Self-Deactivation                    | ✅ Completed | Users can deactivate their account anytime |
| Real-Time Chat                               | ❌ Dropped   | Replaced with preset messages to encourage faster in-person meetups |
| ML-Based Activity Recommendations            | ❌ Dropped   | Omitted due to scope |

### Non-Trivial Elements
| Feature                                      | Status      | Comments     |
| -------------------------------------------- | ----------- | -----------  |
| Dynamic Matching Logic (Date & Time Overlap) | ✅ Completed | Matching algorithm filters users based on overlapping availability for selected activities |
| Safety Score System + Badges                 | ✅ Completed | Multi-dimensional safety scoring from ratings, logarithmic blocked user penalties, and dynamic warning badges |
| ID Verification (AWS Rekognition + Textract) | ✅ Completed | Utilizes facial recognition and document scanning for secure identity verification |
| Account Self-Deactivation                    | ✅ Completed | Implemented soft deactivation, enabling users to easily reactivate and resume their account |
| Structured Chat with Date Planning           | ✅ Completed | Real-time Socket.IO messaging that integrates across multiple models (Match, Rating) to drive status updates, post-date rating prompts, and trusted contact notifications |

### Demo
1. **Plan Activity Form**  
   *Users suggest a specific time and location for their shared activity using this form*
![activity_form](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/assets/24710/f6c0576f-49f2-4d98-9d94-5ffd62f9dcb3)

2. **Swipe Dashboard**  
   *Users swipe on profile cards and create a match.*
![swipe](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/assets/24710/32c91254-af98-4bd6-8c67-c0d1c534aa05)

3. **Chat Dashboard**  
   *Users propose a specific time and location for their shared activity directly within the chat interface and use pre-set messages for chatting*
![chat_v2](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/assets/24710/eb1ef6d1-c927-4045-92da-f8e0889f2e7b)

4. **ID Verification**  
   *Users upload a government-issued ID and a selfie. AWS Rekognition and Textract are used to verify authenticity, and a trust score is assigned after approval*
![id_approval](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/assets/24710/9acc07f1-dbe9-4c8d-b773-aafa2064d252)

5. **Post-Date Rating Modal**  
   *After a confirmed date, users submit ratings on safety, behavior, and connection. These ratings impact the other user's safety score and badges*
![rating](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/assets/24710/3b25ffb5-f850-4a03-922a-5ef96b9b559e)

6. **Safety Score & Profile Badges**  
   *User profiles display a dynamic safety score, earned behavior badges, and social handles*
![safety_score_in_profile](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/assets/24710/0a192bd0-ebbf-47bf-837f-f8fb5d3218cd)


### M5 Highlights
New Features Since Milestone 4:
- Trusted Contact Safety Notifications: After a match is confirmed, an automated email is sent to the user's designated trusted contact, enhancing user safety and peace of mind. Users can set a trusted contact in their profile, and if auto-notify checked off, contact is notified upon plan confirmation automatically. 
- Real-Time Chat Refactor with Socket.IO: The chat system was upgraded from  HTTP polling, which occasionally caused infinite request loops, to a robust Socket.IO implementation. This enables real-time, bidirectional communication, greatly improving performance, reliability, and user experience.
- Enhanced Rating Modal: Completely revamped the rating modal interface for improved user experience and more comprehensive feedback collection.
- Advanced Safety Score Calculation: Safety score calculation now incorporates blocked user count with logarithmic penalty scaling, providing more accurate safety assessments based on community feedback.
- Match Cards on Homepage: Match cards are now displayed on the homepage, display trusted contact notification status for confirmed matches, display both active and confirmed matches, and directly navigate to specific chats, 

### Bug List
We are tracking all known issues in our GitHub Issues board. All bugs have been resolved, and unresolved bugs are marked as wontfix.  

Here is a bug from FinalRelease that is marked as `wontfix` (P3):

>[#56 – Matches not always all loading](https://github.students.cs.ubc.ca/CPSC455-2025S/team01/issues/56)  
>**Rationale:** This bug is intermittent and cannot be consistently recreated. Affected profiles do appear eventually, so user impact is minimal.  

---

[GitHub Issues board]: https://github.students.cs.ubc.ca/CPSC455-2025S/team01/issues
[#56 – Matches not always all loading]: https://github.students.cs.ubc.ca/CPSC455-2025S/team01/issues/56

### Docker Instructions
Make sure mongodb is running and accepting connections. 

Pull changes from remote (M4) and run the following commands:

```shell
cd team01
docker compose pull
docker compose up
```

Once running, navigate to: `http://localhost:8080`

You can log in using: `testdemo@example.com` password: `123`

### MailTrap details (Sandbox)

To access the emails sent to users using MailTrap, we have created an account with the following credentials:

website: [https://mailtrap.io/home]

Username: `allie_fellhauer@hotmail.com`

Password: `StrongPassword123$`

NOTE: You may require authentication. Please message Allison Fellhauer to get the code if required. 

### Testing Details
For complete setup instructions and test script details, please refer to the Milestone 3 - Test Suite section.

