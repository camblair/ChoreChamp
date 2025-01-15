const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD // Use an App Password for Gmail
  }
});

// Email templates
const templates = {
  welcome: (name) => ({
    subject: 'Welcome to ChoreChamp! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90e2;">Welcome to ChoreChamp! 🎉</h1>
        <p>Hi ${name},</p>
        <p>Welcome to ChoreChamp! We're excited to have you join our community of organized households.</p>
        <p>With ChoreChamp, you can:</p>
        <ul>
          <li>Track and manage household chores</li>
          <li>Earn points for completing tasks</li>
          <li>Stay organized and motivated</li>
        </ul>
        <p>Get started by logging in and checking your assigned chores!</p>
        <p>Best regards,<br>The ChoreChamp Team</p>
      </div>
    `
  }),

  choreAssigned: (childName, choreName, points, dueDate) => ({
    subject: `New Chore Assigned: ${choreName} 📋`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90e2;">New Chore Assigned! 📋</h1>
        <p>Hi ${childName},</p>
        <p>You have been assigned a new chore:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h2 style="color: #333; margin-top: 0;">${choreName}</h2>
          <p><strong>Points:</strong> ${points}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        </div>
        <p>Complete this chore to earn your points!</p>
        <p>Best regards,<br>The ChoreChamp Team</p>
      </div>
    `
  }),

  choreCompleted: (parentName, childName, choreName) => ({
    subject: `Chore Completed by ${childName} ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90e2;">Chore Completed! ✅</h1>
        <p>Hi ${parentName},</p>
        <p>${childName} has completed the following chore:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h2 style="color: #333; margin-top: 0;">${choreName}</h2>
        </div>
        <p>Please verify the completion of this chore.</p>
        <p>Best regards,<br>The ChoreChamp Team</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data = {}) => {
  try {
    const emailContent = templates[template](...Object.values(data));
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail
};
