import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, text }) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "SmartOps <onboarding@resend.dev>",
    to,
    subject,
    text,
  });
};

export default sendEmail;