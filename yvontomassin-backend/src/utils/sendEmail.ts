import nodemailer from 'nodemailer';
import config from '../app/config';

export const sendEmail = async (to: string, html: string) => {
  if (!config.email_user || !config.email_pass) {
    throw new Error(
      'Email credentials (EMAIL_USER, EMAIL_PASS) are missing in .env file'
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.email_host || 'smtp.gmail.com',
    port: config.email_port || 587,
    secure: config.NODE_ENV === 'production',
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
