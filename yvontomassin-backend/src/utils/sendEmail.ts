import nodemailer from 'nodemailer';
import config from '../app/config';

export const sendEmail = async (to: string, html: string) => {
  if (!config.email_user || !config.email_pass) {
    throw new Error(
      'Email credentials (EMAIL_USER, EMAIL_PASS) are missing in .env file'
    );
  }

  const port = config.email_port || 587;
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
      // Gmail rejects From addresses that don't match the authenticated account
      from: `"Yvon Tomassin" <${config.email_user}>`,
      to,
      subject: 'Verification Code',
      text: 'Please verify your email using the code provided.',
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
