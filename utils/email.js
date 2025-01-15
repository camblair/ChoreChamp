const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendHouseholdInvitation = async (email, inviteUrl, inviterName) => {
  const subject = 'Invitation to Join ChoreChamp Household';
  const text = `
    Hello!
    
    ${inviterName} has invited you to join their household on ChoreChamp.
    
    Click the following link to accept the invitation:
    ${inviteUrl}
    
    This invitation will expire in 48 hours.
    
    Best regards,
    The ChoreChamp Team
  `;

  const html = `
    <h2>Welcome to ChoreChamp!</h2>
    <p><strong>${inviterName}</strong> has invited you to join their household.</p>
    <p>Click the button below to accept the invitation:</p>
    <a href="${inviteUrl}" style="
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    ">
      Accept Invitation
    </a>
    <p><small>This invitation will expire in 48 hours.</small></p>
    <hr>
    <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
    <p><small>${inviteUrl}</small></p>
  `;

  return sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendHouseholdInvitation
};
