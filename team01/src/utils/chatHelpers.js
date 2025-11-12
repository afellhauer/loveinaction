import { sanitizePlanInput } from "./sanitize.js";


export function generatePlanMessage(time, location, profileFirst, activity, scheduledTime) {
    const sanitizedTime = sanitizePlanInput(time);
    const sanitizedLocation = sanitizePlanInput(location);
    const sanitizedProfileFirst = sanitizePlanInput(profileFirst);
    const sanitizedActivity = sanitizePlanInput(activity);
    const sanitizedScheduledTime = sanitizePlanInput(scheduledTime);

    // Use fallback values if inputs are empty after sanitization
    const safeTime = sanitizedTime.trim() === "" ? "[TIME]" : sanitizedTime;
    const safeLocation = sanitizedLocation.trim() === "" ? "[LOCATION]" : sanitizedLocation;

    return (
        `Hi ${sanitizedProfileFirst}!\n` +
        `Our planned activity is to ${sanitizedActivity} ${sanitizedScheduledTime}.\n` +
        `My suggestion is that we meet at ${safeTime} at ${safeLocation}.\n` +
        `Does that work for you?`
    );
}