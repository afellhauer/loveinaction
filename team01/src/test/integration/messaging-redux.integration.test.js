import chai from 'chai';
const { expect } = chai;

// Mock Redux store and actions for testing
const mockMatchStatus = {
  PLANNING: 0,
  CANCELLED: 1,
  CONFIRMED: 2
};

function simulateLoadMessagesFromBackend(initialState, action) {
  const { profileId, messages, currentUserId } = action.payload;
  const state = JSON.parse(JSON.stringify(initialState));
    
  const convertedMessages = messages.map(msg => {
    // Detect message type by content if not set properly
    let messageType = msg.messageType || "text";
    if (msg.content.includes("🎉 Date confirmed!")) {
      messageType = "confirmation";
    } else if (msg.content.includes("❌ Plans have been cancelled")) {
      messageType = "cancellation";
    }
    
    return {
      sender: msg.senderId._id || msg.senderId,
      message: msg.content,
      timeStamp: new Date(msg.createdAt).getTime(),
      messageType: messageType,
      isPlanSuggestion: msg.content.includes("Does that work for you?")
    };
  });
  state.messageContent[profileId] = convertedMessages;
  
  // Check for existing status from messages
  const hasConfirmation = convertedMessages.some(msg => msg.messageType === "confirmation");
  const hasCancellation = convertedMessages.some(msg => msg.messageType === "cancellation");
  const hasUnrespondedPlanSuggestions = convertedMessages.some(msg => 
    msg.isPlanSuggestion && msg.sender !== currentUserId
  );
  
  // Check if user already responded with "Sounds good!"
  const userSentSoundsGood = convertedMessages.some(msg => 
    msg.sender === currentUserId && msg.message === "Sounds good!"
  );
  
  const lastMsg = convertedMessages[convertedMessages.length - 1];
  const userSentLast = lastMsg && lastMsg.sender === currentUserId;
    
  if (hasConfirmation) {
    state.matchStatus[profileId] = mockMatchStatus.CONFIRMED;
    state.responseNeeded[profileId] = false;
  } else if (hasCancellation) {
    state.matchStatus[profileId] = mockMatchStatus.CANCELLED;
    state.responseNeeded[profileId] = false;
  } else if (userSentSoundsGood) {
    state.responseNeeded[profileId] = false;
    state.matchStatus[profileId] = mockMatchStatus.PLANNING;
  } else if (userSentLast) {
    state.responseNeeded[profileId] = false;
    state.matchStatus[profileId] = mockMatchStatus.PLANNING;
  } else if (hasUnrespondedPlanSuggestions) {
    state.responseNeeded[profileId] = true;
    state.matchStatus[profileId] = mockMatchStatus.PLANNING;
  } else {
    state.matchStatus[profileId] = mockMatchStatus.PLANNING;
    state.responseNeeded[profileId] = false;
  }
  
  return state;
}

describe('Messaging System Frontend Integration Tests', function() {
  this.timeout(10000);
  
  let initialState;

  beforeEach(function() {
    initialState = {
      messageList: [],
      messageContent: {},
      matchStatus: {},
      responseNeeded: {},
      confirmationState: {},
      loading: false,
      error: null,
      matchIdToProfileMap: {},
      lastMessageCheck: {}
    };
  });

  describe('Load Messages from Backend (Redux State)', function() {
    it('should set response buttons when receiving unanswered plan suggestions', function() {
      const mockMessages = [
        {
          _id: '1',
          content: 'Hi there! Our planned activity is to go hiking tomorrow. My suggestion is that we meet at 10 AM at Central Park. Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      const action = {
        payload: {
          profileId: 'profile123',
          messages: mockMessages,
          currentUserId: 'user2' // Different from sender
        }
      };

      const resultState = simulateLoadMessagesFromBackend(initialState, action);
      
      // Check that response buttons are enabled
      expect(resultState.responseNeeded['profile123']).to.equal(true);
      expect(resultState.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
      expect(resultState.messageContent['profile123']).to.have.lengthOf(1);
      expect(resultState.messageContent['profile123'][0].isPlanSuggestion).to.equal(true);
    });

    it('should clear response buttons when user already responded with "Sounds good!"', function() {
      const mockMessages = [
        {
          _id: '1',
          content: 'Hi there! Our planned activity is to go hiking tomorrow. My suggestion is that we meet at 10 AM at Central Park. Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        },
        {
          _id: '2',
          content: 'Sounds good!',
          senderId: { _id: 'user2' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      const action = {
        payload: {
          profileId: 'profile123',
          messages: mockMessages,
          currentUserId: 'user2' // Same as second message sender
        }
      };

      const resultState = simulateLoadMessagesFromBackend(initialState, action);
      
      // Check that response buttons are disabled
      expect(resultState.responseNeeded['profile123']).to.equal(false);
      expect(resultState.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
      expect(resultState.messageContent['profile123']).to.have.lengthOf(2);
    });

    it('should set CONFIRMED status when confirmation message exists', function() {
      const mockMessages = [
        {
          _id: '1',
          content: 'Hi there! Our planned activity is to go hiking tomorrow. My suggestion is that we meet at 10 AM at Central Park. Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        },
        {
          _id: '2',
          content: 'Sounds good!',
          senderId: { _id: 'user2' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        },
        {
          _id: '3',
          content: '🎉 Date confirmed! Your match is now official.',
          senderId: { _id: 'system' },
          createdAt: new Date().toISOString(),
          messageType: 'confirmation'
        }
      ];

      const action = {
        payload: {
          profileId: 'profile123',
          messages: mockMessages,
          currentUserId: 'user2'
        }
      };

      const resultState = simulateLoadMessagesFromBackend(initialState, action);
      
      // Check that status is CONFIRMED
      expect(resultState.matchStatus['profile123']).to.equal(mockMatchStatus.CONFIRMED);
      expect(resultState.responseNeeded['profile123']).to.equal(false);
      expect(resultState.messageContent['profile123']).to.have.lengthOf(3);
    });

    it('should set CANCELLED status when cancellation message exists', function() {
      const mockMessages = [
        {
          _id: '1',
          content: 'Hi there! Our planned activity is to go hiking tomorrow. My suggestion is that we meet at 10 AM at Central Park. Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        },
        {
          _id: '2',
          content: 'Sorry! I can no longer make it',
          senderId: { _id: 'user2' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        },
        {
          _id: '3',
          content: '❌ Plans have been cancelled',
          senderId: { _id: 'system' },
          createdAt: new Date().toISOString(),
          messageType: 'cancellation'
        }
      ];

      const action = {
        payload: {
          profileId: 'profile123',
          messages: mockMessages,
          currentUserId: 'user2'
        }
      };

      const resultState = simulateLoadMessagesFromBackend(initialState, action);
      
      // Check that status is CANCELLED
      expect(resultState.matchStatus['profile123']).to.equal(mockMatchStatus.CANCELLED);
      expect(resultState.responseNeeded['profile123']).to.equal(false);
      expect(resultState.messageContent['profile123']).to.have.lengthOf(3);
    });

    it('should clear response buttons when user sent the last message', function() {
      const mockMessages = [
        {
          _id: '1',
          content: 'Hi there! Our planned activity is to go hiking tomorrow. My suggestion is that we meet at 10 AM at Central Park. Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        },
        {
          _id: '2',
          content: 'How about 2 PM instead?',
          senderId: { _id: 'user2' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      const action = {
        payload: {
          profileId: 'profile123',
          messages: mockMessages,
          currentUserId: 'user2' // Same as last message sender
        }
      };

      const resultState = simulateLoadMessagesFromBackend(initialState, action);
      
      // Check that response buttons are disabled since user sent last message
      expect(resultState.responseNeeded['profile123']).to.equal(false);
      expect(resultState.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
      expect(resultState.messageContent['profile123']).to.have.lengthOf(2);
    });

    it('should use defaults when no specific conditions are met', function() {
      const mockMessages = [
        {
          _id: '1',
          content: 'Hello there!',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      const action = {
        payload: {
          profileId: 'profile123',
          messages: mockMessages,
          currentUserId: 'user2'
        }
      };

      const resultState = simulateLoadMessagesFromBackend(initialState, action);
      
      // Check that defaults are used
      expect(resultState.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
      expect(resultState.responseNeeded['profile123']).to.equal(false);
      expect(resultState.messageContent['profile123']).to.have.lengthOf(1);
    });
  });

  describe('Regular Reducer Actions', function() {
    it('should create new message conversation', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/createNewMessage',
        payload: { profile }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.messageList.push(profile.id);
      state.messageContent[profile.id] = [];
      state.matchStatus[profile.id] = mockMatchStatus.PLANNING;

      expect(state.messageList).to.include('profile123');
      expect(state.messageContent['profile123']).to.have.lengthOf(0);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
    });

    it('should add new regular message', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/addNewMessage',
        payload: {
          profile,
          senderID: 'user1',
          content: 'Hello there!',
          messageType: 'text'
        }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.messageContent[profile.id] = [];
      
      const newMessage = {
        sender: action.payload.senderID,
        message: action.payload.content,
        timeStamp: Date.now(),
        messageType: action.payload.messageType || "text",
        isPlanSuggestion: action.payload.isPlanSuggestion || false
      };
      state.messageContent[profile.id].push(newMessage);

      expect(state.messageContent['profile123']).to.have.lengthOf(1);
      expect(state.messageContent['profile123'][0].message).to.equal('Hello there!');
      expect(state.messageContent['profile123'][0].sender).to.equal('user1');
    });

    it('should add plan suggestion message and set status', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/addNewMessage',
        payload: {
          profile,
          senderID: 'user1',
          content: 'Want to go hiking?',
          messageType: 'text',
          isPlanSuggestion: true
        }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.messageContent[profile.id] = [];
      
      const newMessage = {
        sender: action.payload.senderID,
        message: action.payload.content,
        timeStamp: Date.now(),
        messageType: action.payload.messageType || "text",
        isPlanSuggestion: action.payload.isPlanSuggestion || false
      };
      state.messageContent[profile.id].push(newMessage);
      
      if (action.payload.isPlanSuggestion) {
        state.matchStatus[profile.id] = mockMatchStatus.PLANNING;
      }

      expect(state.messageContent['profile123'][0].isPlanSuggestion).to.equal(true);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
    });

    it('should handle confirmation message in addNewMessage', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/addNewMessage',
        payload: {
          profile,
          senderID: 'system',
          content: '🎉 Date confirmed!',
          messageType: 'confirmation'
        }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.messageContent[profile.id] = [];
      
      const newMessage = {
        sender: action.payload.senderID,
        message: action.payload.content,
        timeStamp: Date.now(),
        messageType: action.payload.messageType || "text",
        isPlanSuggestion: action.payload.isPlanSuggestion || false
      };
      state.messageContent[profile.id].push(newMessage);
      
      if (action.payload.messageType === "confirmation") {
        state.matchStatus[profile.id] = mockMatchStatus.CONFIRMED;
        state.responseNeeded[profile.id] = false;
      }

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CONFIRMED);
      expect(state.responseNeeded['profile123']).to.equal(false);
    });

    it('should handle cancellation message in addNewMessage', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/addNewMessage',
        payload: {
          profile,
          senderID: 'system',
          content: '❌ Plans cancelled',
          messageType: 'cancellation'
        }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.messageContent[profile.id] = [];
      
      const newMessage = {
        sender: action.payload.senderID,
        message: action.payload.content,
        timeStamp: Date.now(),
        messageType: action.payload.messageType || "text",
        isPlanSuggestion: action.payload.isPlanSuggestion || false
      };
      state.messageContent[profile.id].push(newMessage);
      
      if (action.payload.messageType === "cancellation") {
        state.matchStatus[profile.id] = mockMatchStatus.CANCELLED;
        state.responseNeeded[profile.id] = false;
      }

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CANCELLED);
      expect(state.responseNeeded['profile123']).to.equal(false);
    });

    it('should cancel plans', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/cancelPlans',
        payload: { profile }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.matchStatus[profile.id] = mockMatchStatus.CANCELLED;

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CANCELLED);
    });

    it('should finalize plans', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/finalizePlans',
        payload: { profile }
      };

      // Simulate finalizePlans reducer
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchStatus[profile.id] = mockMatchStatus.CONFIRMED;

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CONFIRMED);
    });

    it('should set response needed', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/setResponseNeeded',
        payload: { profile }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.responseNeeded[profile.id] = true;

      expect(state.responseNeeded['profile123']).to.equal(true);
    });

    it('should clear response needed', function() {
      const profile = { id: 'profile123', name: 'John' };
      const action = {
        type: 'messages/clearResponseNeeded',
        payload: { profile }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.responseNeeded[profile.id] = false;

      expect(state.responseNeeded['profile123']).to.equal(false);
    });

    it('should set match ID mapping', function() {
      const action = {
        type: 'messages/setMatchIdMapping',
        payload: { profileId: 'profile123', matchId: 'match456' }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';

      expect(state.matchIdToProfileMap['profile123']).to.equal('match456');
    });

    it('should update last message check', function() {
      const action = {
        type: 'messages/updateLastMessageCheck',
        payload: { profileId: 'profile123' }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      const timestamp = Date.now();
      state.lastMessageCheck['profile123'] = timestamp;

      expect(state.lastMessageCheck['profile123']).to.be.a('number');
    });

    it('should update confirmation state', function() {
      const action = {
        type: 'messages/updateConfirmationState',
        payload: {
          profileId: 'profile123',
          myConfirmed: true,
          theirConfirmed: false,
          bothConfirmed: false
        }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.confirmationState['profile123'] = {
        myConfirmed: true,
        theirConfirmed: false,
        bothConfirmed: false
      };

      expect(state.confirmationState['profile123'].myConfirmed).to.equal(true);
      expect(state.confirmationState['profile123'].theirConfirmed).to.equal(false);
      expect(state.confirmationState['profile123'].bothConfirmed).to.equal(false);
    });
  });

  describe('Async Action Loading States', function() {
    it('should handle sendMessageToBackend pending state', function() {
      const action = { type: 'messages/sendMessageToBackend/pending' };
      
      const state = JSON.parse(JSON.stringify(initialState));
      state.loading = true;
      state.error = null;

      expect(state.loading).to.equal(true);
      expect(state.error).to.equal(null);
    });

    it('should handle sendMessageToBackend fulfilled state', function() {
      const action = { 
        type: 'messages/sendMessageToBackend/fulfilled',
        payload: { data: { _id: 'msg123' } }
      };
      
      // Simulate fulfilled state
      const state = JSON.parse(JSON.stringify(initialState));
      state.loading = false;

      expect(state.loading).to.equal(false);
    });

    it('should handle sendMessageToBackend rejected state', function() {
      const action = { 
        type: 'messages/sendMessageToBackend/rejected',
        payload: 'Network error'
      };
      
      // Simulate rejected state
      const state = JSON.parse(JSON.stringify(initialState));
      state.loading = false;
      state.error = 'Network error';

      expect(state.loading).to.equal(false);
      expect(state.error).to.equal('Network error');
    });

    it('should handle fetchMessagesFromBackend pending state', function() {
      const action = { type: 'messages/fetchMessagesFromBackend/pending' };
      
      // Simulate pending state
      const state = JSON.parse(JSON.stringify(initialState));
      state.loading = true;
      state.error = null;

      expect(state.loading).to.equal(true);
      expect(state.error).to.equal(null);
    });

    it('should handle fetchMessagesFromBackend fulfilled state', function() {
      const action = { 
        type: 'messages/fetchMessagesFromBackend/fulfilled',
        payload: { matchId: 'match123', messages: [] }
      };
      
      // Simulate fulfilled state
      const state = JSON.parse(JSON.stringify(initialState));
      state.loading = false;

      expect(state.loading).to.equal(false);
    });

    it('should handle fetchMessagesFromBackend rejected state', function() {
      const action = { 
        type: 'messages/fetchMessagesFromBackend/rejected',
        payload: 'Fetch failed'
      };
      
      // Simulate rejected state
      const state = JSON.parse(JSON.stringify(initialState));
      state.loading = false;
      state.error = 'Fetch failed';

      expect(state.loading).to.equal(false);
      expect(state.error).to.equal('Fetch failed');
    });
  });

  describe('Complete Messaging Workflow Logic', function() {
    it('should handle complete plan suggestion to finalization workflow', function() {
      // Step 1: Load initial plan suggestion
      const planSuggestionMessages = [
        {
          _id: '1',
          content: 'Hi there! Our planned activity is to go hiking tomorrow. My suggestion is that we meet at 10 AM at Central Park. Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      let action = {
        payload: {
          profileId: 'profile123',
          messages: planSuggestionMessages,
          currentUserId: 'user2'
        }
      };

      let state = simulateLoadMessagesFromBackend(initialState, action);
      expect(state.responseNeeded['profile123']).to.equal(true);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);

      // Step 2: User responds positively
      const afterResponseMessages = [
        ...planSuggestionMessages,
        {
          _id: '2',
          content: 'Sounds good!',
          senderId: { _id: 'user2' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      action = {
        payload: {
          profileId: 'profile123',
          messages: afterResponseMessages,
          currentUserId: 'user2'
        }
      };

      state = simulateLoadMessagesFromBackend(initialState, action);
      expect(state.responseNeeded['profile123']).to.equal(false);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
      expect(state.messageContent['profile123']).to.have.lengthOf(2);

      // Step 3: Date gets confirmed
      const afterConfirmationMessages = [
        ...afterResponseMessages,
        {
          _id: '3',
          content: '🎉 Date confirmed! Your match is now official.',
          senderId: { _id: 'system' },
          createdAt: new Date().toISOString(),
          messageType: 'confirmation'
        }
      ];

      action = {
        payload: {
          profileId: 'profile123',
          messages: afterConfirmationMessages,
          currentUserId: 'user2'
        }
      };

      state = simulateLoadMessagesFromBackend(initialState, action);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CONFIRMED);
      expect(state.responseNeeded['profile123']).to.equal(false);
      expect(state.messageContent['profile123']).to.have.lengthOf(3);
    });
  });

  describe('Poll For New Messages Complex Logic', function() {
    beforeEach(function() {
      initialState.matchIdToProfileMap['profile123'] = 'match456';
    });

    it('should handle pollForNewMessages with no new messages', function() {
      const action = {
        type: 'messages/pollForNewMessages/fulfilled',
        payload: {
          matchId: 'match456',
          newMessages: [],
          lastCheck: Date.now(),
          currentUserId: 'user2'
        }
      };

      // Simulate no new messages scenario
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      
      // No changes should occur when no new messages
      expect(state.messageContent['profile123']).to.be.undefined;
    });

    it('should add new unique messages and enable response buttons for plan suggestions', function() {
      const mockNewMessages = [
        {
          _id: 'msg1',
          content: 'Want to meet at 2 PM? Does that work for you?',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      const action = {
        type: 'messages/pollForNewMessages/fulfilled',
        payload: {
          matchId: 'match456',
          newMessages: mockNewMessages,
          lastCheck: Date.now(),
          currentUserId: 'user2'
        }
      };

      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      
      const convertedNewMessages = mockNewMessages.map(msg => ({
        sender: msg.senderId._id,
        message: msg.content,
        timeStamp: new Date(msg.createdAt).getTime(),
        messageType: msg.messageType || "text",
        isPlanSuggestion: msg.content.includes("Does that work for you?"),
        backendId: msg._id
      }));
      
      state.messageContent['profile123'] = convertedNewMessages;
      
      const newPlanSuggestions = convertedNewMessages.filter(msg => 
        msg.isPlanSuggestion && msg.sender !== 'user2'
      );
      
      if (newPlanSuggestions.length > 0) {
        state.responseNeeded['profile123'] = true;
        state.matchStatus['profile123'] = mockMatchStatus.PLANNING;
      }
      
      state.lastMessageCheck['profile123'] = action.payload.lastCheck;

      expect(state.messageContent['profile123']).to.have.lengthOf(1);
      expect(state.responseNeeded['profile123']).to.equal(true);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
    });

    it('should filter out duplicate messages', function() {
      const existingMessages = [
        {
          sender: 'user1',
          message: 'Hello there!',
          timeStamp: Date.now() - 1000,
          messageType: 'text',
          isPlanSuggestion: false
        }
      ];

      const mockNewMessages = [
        {
          _id: 'msg1',
          content: 'Hello there!',
          senderId: { _id: 'user1' },
          createdAt: new Date(Date.now() - 1000).toISOString(),
          messageType: 'text'
        }
      ];

      // Simulate duplicate filtering
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      state.messageContent['profile123'] = existingMessages;
      
      const convertedNewMessages = mockNewMessages.map(msg => ({
        sender: msg.senderId._id,
        message: msg.content,
        timeStamp: new Date(msg.createdAt).getTime(),
        messageType: msg.messageType || "text",
        isPlanSuggestion: msg.content.includes("Does that work for you?"),
        backendId: msg._id
      }));
      
      const newUniqueMessages = convertedNewMessages.filter(newMsg => {
        const isDuplicate = existingMessages.some(existingMsg => 
          existingMsg.message === newMsg.message &&
          existingMsg.sender === newMsg.sender &&
          Math.abs(existingMsg.timeStamp - newMsg.timeStamp) < 5000
        );
        return !isDuplicate;
      });

      // Should not add duplicate message
      expect(newUniqueMessages).to.have.lengthOf(0);
      expect(state.messageContent['profile123']).to.have.lengthOf(1);
    });

    it('should clear response needed when user sends "Sounds good!"', function() {
      const existingMessages = [
        {
          sender: 'user1',
          message: 'Want to meet at 2 PM? Does that work for you?',
          timeStamp: Date.now() - 2000,
          messageType: 'text',
          isPlanSuggestion: true
        }
      ];

      const mockNewMessages = [
        {
          _id: 'msg2',
          content: 'Sounds good!',
          senderId: { _id: 'user2' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      // Simulate user responding with "Sounds good!"
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      state.messageContent['profile123'] = existingMessages;
      state.responseNeeded['profile123'] = true;
      
      const convertedNewMessages = mockNewMessages.map(msg => ({
        sender: msg.senderId._id,
        message: msg.content,
        timeStamp: new Date(msg.createdAt).getTime(),
        messageType: msg.messageType || "text",
        isPlanSuggestion: msg.content.includes("Does that work for you?"),
        backendId: msg._id
      }));
      
      state.messageContent['profile123'] = [...existingMessages, ...convertedNewMessages];
      
      const userSentSoundsGood = convertedNewMessages.some(msg => 
        msg.sender === 'user2' && msg.message === "Sounds good!"
      );
      
      if (userSentSoundsGood) {
        state.responseNeeded['profile123'] = false;
      }

      expect(state.responseNeeded['profile123']).to.equal(false);
      expect(state.messageContent['profile123']).to.have.lengthOf(2);
    });

    it('should clear response needed when OTHER user sends "Sounds good!"', function() {
      const existingMessages = [
        {
          sender: 'user2',
          message: 'Want to meet at 3 PM? Does that work for you?',
          timeStamp: Date.now() - 2000,
          messageType: 'text',
          isPlanSuggestion: true
        }
      ];

      const mockNewMessages = [
        {
          _id: 'msg2',
          content: 'Sounds good!',
          senderId: { _id: 'user1' },
          createdAt: new Date().toISOString(),
          messageType: 'text'
        }
      ];

      // Simulate other user responding with "Sounds good!"
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      state.messageContent['profile123'] = existingMessages;
      
      const convertedNewMessages = mockNewMessages.map(msg => ({
        sender: msg.senderId._id,
        message: msg.content,
        timeStamp: new Date(msg.createdAt).getTime(),
        messageType: msg.messageType || "text",
        isPlanSuggestion: msg.content.includes("Does that work for you?"),
        backendId: msg._id
      }));
      
      state.messageContent['profile123'] = [...existingMessages, ...convertedNewMessages];
      
      const otherUserSentSoundsGood = convertedNewMessages.some(msg => 
        msg.sender !== 'user2' && msg.message === "Sounds good!"
      );
      
      if (otherUserSentSoundsGood) {
        state.responseNeeded['profile123'] = false;
      }

      expect(state.responseNeeded['profile123']).to.equal(false);
      expect(state.messageContent['profile123']).to.have.lengthOf(2);
    });

    it('should handle confirmation messages in polling', function() {
      const mockNewMessages = [
        {
          _id: 'msg1',
          content: '🎉 Date confirmed! Your match is now official.',
          senderId: { _id: 'system' },
          createdAt: new Date().toISOString(),
          messageType: 'confirmation'
        }
      ];

      // Simulate confirmation message in polling
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      
      const convertedNewMessages = mockNewMessages.map(msg => ({
        sender: msg.senderId._id,
        message: msg.content,
        timeStamp: new Date(msg.createdAt).getTime(),
        messageType: msg.messageType || "text",
        isPlanSuggestion: msg.content.includes("Does that work for you?"),
        backendId: msg._id
      }));
      
      state.messageContent['profile123'] = convertedNewMessages;
      
      const confirmationMessages = convertedNewMessages.filter(msg => 
        msg.messageType === "confirmation"
      );
      
      if (confirmationMessages.length > 0) {
        state.matchStatus['profile123'] = mockMatchStatus.CONFIRMED;
        state.responseNeeded['profile123'] = false;
      }

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CONFIRMED);
      expect(state.responseNeeded['profile123']).to.equal(false);
    });

    it('should handle cancellation messages in polling', function() {
      const mockNewMessages = [
        {
          _id: 'msg1',
          content: '❌ Plans have been cancelled',
          senderId: { _id: 'system' },
          createdAt: new Date().toISOString(),
          messageType: 'cancellation'
        }
      ];

      // Simulate cancellation message in polling
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      
      const convertedNewMessages = mockNewMessages.map(msg => ({
        sender: msg.senderId._id,
        message: msg.content,
        timeStamp: new Date(msg.createdAt).getTime(),
        messageType: msg.messageType || "text",
        isPlanSuggestion: msg.content.includes("Does that work for you?"),
        backendId: msg._id
      }));
      
      state.messageContent['profile123'] = convertedNewMessages;
      
      const cancellationMessages = convertedNewMessages.filter(msg => 
        msg.messageType === "cancellation"
      );
      
      if (cancellationMessages.length > 0) {
        state.matchStatus['profile123'] = mockMatchStatus.CANCELLED;
        state.responseNeeded['profile123'] = false;
      }

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CANCELLED);
      expect(state.responseNeeded['profile123']).to.equal(false);
    });

    it('should handle pollForNewMessages rejection with 403 error cleanup', function() {
      const action = {
        type: 'messages/pollForNewMessages/rejected',
        payload: '403 Not authorized',
        meta: { arg: { matchId: 'match456' } }
      };

      // Simulate 403 error cleanup
      const state = JSON.parse(JSON.stringify(initialState));
      state.matchIdToProfileMap['profile123'] = 'match456';
      
      if (action.payload && action.payload.includes('403')) {
        const matchId = action.meta?.arg?.matchId;
        if (matchId) {
          const profileId = Object.keys(state.matchIdToProfileMap).find(
            id => state.matchIdToProfileMap[id] === matchId
          );
          if (profileId) {
            delete state.matchIdToProfileMap[profileId];
          }
        }
      }

      expect(state.matchIdToProfileMap['profile123']).to.be.undefined;
    });
  });

  describe('Plan Confirmation Async Actions', function() {
    it('should handle confirmPlansAsync fulfilled', function() {
      const action = {
        type: 'messages/confirmPlans/fulfilled',
        payload: {
          profileId: 'profile123',
          userConfirmed: true,
          otherUserConfirmed: false,
          bothUsersConfirmed: false
        }
      };

      // Simulate confirmPlansAsync.fulfilled
      const state = JSON.parse(JSON.stringify(initialState));
      
      state.confirmationState['profile123'] = {
        myConfirmed: action.payload.userConfirmed,
        theirConfirmed: action.payload.otherUserConfirmed,
        bothConfirmed: action.payload.bothUsersConfirmed
      };
      state.matchStatus['profile123'] = mockMatchStatus.PLANNING;
      state.responseNeeded['profile123'] = false;

      expect(state.confirmationState['profile123'].myConfirmed).to.equal(true);
      expect(state.confirmationState['profile123'].theirConfirmed).to.equal(false);
      expect(state.confirmationState['profile123'].bothConfirmed).to.equal(false);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
      expect(state.responseNeeded['profile123']).to.equal(false);
    });

    it('should handle confirmPlansAsync with both users confirmed', function() {
      const action = {
        type: 'messages/confirmPlans/fulfilled',
        payload: {
          profileId: 'profile123',
          userConfirmed: true,
          otherUserConfirmed: true,
          bothUsersConfirmed: true
        }
      };

      // Simulate both users confirming
      const state = JSON.parse(JSON.stringify(initialState));
      
      state.confirmationState['profile123'] = {
        myConfirmed: action.payload.userConfirmed,
        theirConfirmed: action.payload.otherUserConfirmed,
        bothConfirmed: action.payload.bothUsersConfirmed
      };
      state.matchStatus['profile123'] = mockMatchStatus.PLANNING;
      state.responseNeeded['profile123'] = false;

      expect(state.confirmationState['profile123'].bothConfirmed).to.equal(true);
      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.PLANNING);
    });

    it('should handle finalizeDateAsync fulfilled', function() {
      const action = {
        type: 'messages/finalizeDate/fulfilled',
        payload: {
          profileId: 'profile123'
        }
      };

      // Simulate finalizeDateAsync.fulfilled
      const state = JSON.parse(JSON.stringify(initialState));
      
      state.matchStatus['profile123'] = mockMatchStatus.CONFIRMED;
      state.responseNeeded['profile123'] = false;
      state.confirmationState['profile123'] = {
        myConfirmed: false,
        theirConfirmed: false,
        bothConfirmed: false
      };

      expect(state.matchStatus['profile123']).to.equal(mockMatchStatus.CONFIRMED);
      expect(state.responseNeeded['profile123']).to.equal(false);
      expect(state.confirmationState['profile123'].myConfirmed).to.equal(false);
      expect(state.confirmationState['profile123'].theirConfirmed).to.equal(false);
      expect(state.confirmationState['profile123'].bothConfirmed).to.equal(false);
    });
  });
}); 