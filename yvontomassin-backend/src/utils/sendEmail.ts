import nodemailer from 'nodemailer';
import config from '../app/config';

export const sendEmail = async (to: string, html: string) => {
  if (!config.email_user || !config.email_pass) {
    throw new Error(
      'Email credentials (EMAIL_USER, EMAIL_PASS) are missing in .env file'
    );
  }

  const port = config.email_port || 587;
  // 465 = implicit TLS from connect. 587 = plain SMTP then STARTTLS.
  // NODE_ENV must not control this: Gmail 587 rejects immediate SSL
  // with "wrong version number".
  const isImplicitTls = port === 465;

  const transporter = nodemailer.createTransport({
    host: config.email_host || 'smtp.gmail.com',
    port,
    secure: isImplicitTls,
    requireTLS: !isImplicitTls,
    auth: {
      user: config.email_user,
      pass: config.email_pass,
    },
  });

  try {
    await transporter.sendMail({
      from: '"Practice Backend" <noreply@practice.com>', // sender address
      to, // list of receivers
      subject: 'Verification Code', // Subject line
      text: 'Please verify your email using the code provided.', // plain text body
      html, // html body
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
