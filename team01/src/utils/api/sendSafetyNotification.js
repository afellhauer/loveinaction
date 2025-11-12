// src/utils/api/sendSafetyNotification.js
import { request } from './client';

export function sendSafetyNotification(matchId) {
  return request(`/api/matches/${matchId}/send-safety-notification`, {
    method: 'POST',
  });
}
