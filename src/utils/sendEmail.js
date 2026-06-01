const sendEmail = async ({ to, subject, text }) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "SmartOps",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [
        {
          email: to,
        },
      ],
      subject,
      textContent: text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to send email with Brevo");
  }

  return data;
};

export default sendEmail;