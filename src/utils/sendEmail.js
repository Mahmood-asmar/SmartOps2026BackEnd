import {
  TransactionalEmailsApi,
  SendSmtpEmail,
} from "@getbrevo/brevo";

const sendEmail = async ({ to, subject, text }) => {
  const emailAPI = new TransactionalEmailsApi();

  emailAPI.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;

  const message = new SendSmtpEmail();

  message.sender = {
    name: "SmartOps",
    email: process.env.BREVO_SENDER_EMAIL,
  };

  message.to = [
    {
      email: to,
    },
  ];

  message.subject = subject;
  message.textContent = text;

  await emailAPI.sendTransacEmail(message);
};

export default sendEmail;