const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendVerificationSMS = async (mobile, code) => {
  return client.messages.create({
    body: `Your WalkFit verification code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: mobile
  });
};