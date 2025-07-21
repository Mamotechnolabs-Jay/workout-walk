const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: `"Workout Effective App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Email Verification Code',
    html: `<p>Your verification code is: <strong>${code}</strong></p>
           <p>This code expires in 10 minutes.</p>`
  };

  return transporter.sendMail(mailOptions);
};