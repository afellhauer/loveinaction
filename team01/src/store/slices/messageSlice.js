import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getMessages, sendMessage as sendMessageAPI } from '../../utils/api/messages';
import { confirmPlans } from "../../utils/api/matches";
import { sendSafetyNotification } from '../../utils/api/sendSafetyNotification';

const initialState = {
    byMatchId: {},   // matchId => [message, ...]
    loading: 'false',
    error: null,
}

//  Fetch messages for a match
export const fetchMessages = createAsyncThunk(
    'messages/fetchMessages',
    async ({ matchId, page = 1, limit = 50 }, {rejectWithValue, getState}) => {
        try {
            const response = await getMessages(matchId, page, limit);
            const state = getState();
            const match = state.matches.matches.find(m => m._id === matchId);
            return { matchId, data: response.data, match };
        } catch (error) {
            return rejectWithValue(error.message)
        }
    }
);

// Send a new message
export const sendMessage = createAsyncThunk(
    'messages/sendMessage',
    async ({ matchId, content, messageType}, {rejectWithValue}) => {
        try {
            const response = await sendMessageAPI(matchId, content, messageType);
            return {...response}
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);


export const updateConfirmationState = createAsyncThunk(
    'messages/updateConfirmationState',
    async ({ matchId }, { rejectWithValue, getState }) => {
        try {
            const response = await confirmPlans(matchId);
            // After confirming plans, always attempt to send safety notification if match is confirmed
            const state = getState();
            const match = state.matches.matches.find(m => m._id === matchId);
            if (match && match.status === 'confirmed') {
                try {
                    await sendSafetyNotification(matchId);
                } catch (err) {
                    console.error('Failed to send safety notification:', err);
                }
            }
            return { ...response.data };
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        createNewMessage: (state, action) => {
            const match = action.payload.match;
            const matchId = match.id;
            if (!state.byMatchId[matchId]) {
                state.byMatchId[matchId] = [];
            } else {
                // delete any existing message with the same userId
            }

        },
        addMessage: (state, action) => {
            const {matchId, _id} = action.payload;
            const messages = state.byMatchId[matchId] || [];
            
            if (action.payload.messageType === "system" && 
                action.payload.content.includes("trusted contact has been notified")) {
                
                const persistentMessageId = `trusted-contact-notification-${matchId}`;
                const filteredMessages = messages.filter(msg => msg._id !== persistentMessageId);
                
                const persistentMessage = {
                    ...action.payload,
                    _id: persistentMessageId
                };
                
                state.byMatchId[matchId] = [...filteredMessages, persistentMessage];
            } else {
                const alreadyExists = messages.some(msg => msg._id === _id);
                if (!alreadyExists) {
                    state.byMatchId[matchId] = [...messages, action.payload];
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMessages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                const { matchId, data: messages, match } = action.payload;
                if (!state.byMatchId[matchId]) {
                    state.byMatchId[matchId] = [];
                }
                
                let allMessages = [...messages];
                if (match && match.myTrustedContactNotified) {
                    const trustedContactMessage = {
                        _id: `trusted-contact-notification-${matchId}`,
                        matchId: matchId,
                        content: "Your trusted contact has been notified about your confirmed plan for your safety.",
                        messageType: "system",
                        createdAt: new Date().toISOString(),
                        senderId: "system"
                    };
                    
                    const messageExists = allMessages.some(msg => msg._id === trustedContactMessage._id);
                    if (!messageExists) {
                        allMessages.push(trustedContactMessage);
                    }
                }
                
                state.byMatchId[matchId] = allMessages;
                state.loading = false;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(sendMessage.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                const message = action.payload;
                const matchId = message.matchId;

                if (!state.byMatchId[matchId]) {
                    state.byMatchId[matchId] = [];
                }

                const alreadyExists = state.byMatchId[matchId].some(m => m._id === message._id);
                if (!alreadyExists) {
                    state.byMatchId[matchId].push(message);
                }
                state.loading = false;
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(updateConfirmationState.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateConfirmationState.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateConfirmationState.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
    },
});

export const {
    addMessage,
    createNewMessage  } = messageSlice.actions;
export default messageSlice.reducer;
