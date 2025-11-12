// 📁 backend/utils/sendVerificationEmail.js
const nodemailer = require("nodemailer");

async function sendVerificationEmail(toEmail, verificationToken) {
  //mock implementation for testing
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve({ messageId: 'test-message-id' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, BASE_URL } = process.env;

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

  const verifyUrl = `${BASE_URL}/api/auth/verify/${verificationToken}`;

  const mailOptions = {
    from: `"Love In Action" <no-reply@loveinaction.app>`,
    to: toEmail,
    subject: "Verify Your Email for Love In Action",
    html: `
      <h2>Welcome to Love In Action!</h2>
      <p>Click the link below to verify your email and activate your account:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>If you did not sign up, you can ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendVerificationEmail;
