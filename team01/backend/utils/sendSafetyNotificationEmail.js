// 📁 backend/utils/sendSafetyNotificationEmail.js
const nodemailer = require("nodemailer");

async function sendSafetyNotificationEmail(dateDetails) {
  // Mock implementation for testing
  if (process.env.NODE_ENV === 'test') {
    console.log(`Mock safety notification email sent to ${dateDetails.trustedContactEmail}`);
    return Promise.resolve({ messageId: 'test-safety-message-id' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // Convert port to number for comparison
  const portNumber = parseInt(SMTP_PORT, 10);

  // Use `secure: false` for STARTTLS ports (2525, 587, or 25)
  // Only use `secure: true` for port 465 (implicit SSL)
  const useSecure = portNumber === 465;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: portNumber,
    secure: useSecure, // false for 2525 or 587 (Mailtrap)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // Allow self‐signed certificates if needed (Mailtrap uses a valid cert, so this = optional)
      rejectUnauthorized: false,
    },
  });

  // Format the date nicely
  const dateStr = new Date(dateDetails.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const mailOptions = {
    from: `"Love In Action Safety" <safety@loveinaction.app>`,
    to: dateDetails.trustedContactEmail,
    subject: `Safety Notification: ${dateDetails.userName} has a date scheduled`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e91e63;">Safety Notification from Love In Action</h2>
        
        <p>Hello ${dateDetails.trustedContactName},</p>
        
        <p><strong>${dateDetails.userName}</strong> has designated you as their trusted contact and wanted to let you know about their upcoming date:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📅 Date:</strong> ${dateStr}</p>
          <p><strong>📍 Location:</strong> ${dateDetails.location}</p>
          <p><strong>🎯 Activity:</strong> ${dateDetails.activityType}</p>
          <p><strong>👤 Date Partner:</strong> ${dateDetails.matchName}</p>
        </div>
        
        <p>This is an automated safety notification. ${dateDetails.userName} shared these details with you as a precautionary measure.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This email was sent by Love In Action's safety feature. If you have any concerns, please contact ${dateDetails.userName} directly.
        </p>
      </div>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (err) {
    throw err;
  }
}

module.exports = sendSafetyNotificationEmail; 