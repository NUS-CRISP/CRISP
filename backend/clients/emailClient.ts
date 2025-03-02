import nodemailer from 'nodemailer';
import { config } from 'dotenv';
const env = process.env.NODE_ENV ?? 'development';
config({ path: `.env.${env}` });

// const outlookTransporter = nodemailer.createTransport({
//   service: 'outlook',
//   secure: false,
//   port: 587,
//   host: 'smtp.office365.com',
//   auth: {
//     user: '',
//     pass: ''
//   },
//   tls: {
//     ciphers: 'SSLv3',
//   }
// });

const googleTransporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const transporter = googleTransporter; // Set to toggle your desired transporter

const mailOptions = {
  from: process.env.SMTP_USER,
  to: process.env.TEST_TO_EMAIL,
  subject: 'test',
  text: 'test description',
};

// transporter.sendMail(mailOptions, (error, info) => {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Email sent!' + info.response);
//   }
// })

export const sendTestNotificationEmail = async () => {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(
        'Email sent!' +
          info.response +
          ' Sender: ' +
          mailOptions.from +
          ' Recipient: ' +
          mailOptions.to +
          ' Subject: ' +
          mailOptions.subject +
          ' Body: ' +
          mailOptions.text
      );
    }
  });
};

export const sendNotificationEmail = async (
  to: string,
  subject: string,
  text: string
) => {
  const notificationMailOptions = {
    from: process.env.SMTP_USER,
    to: to,
    subject: subject,
    text: text,
  };

  transporter.sendMail(notificationMailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(
        'Email sent!' +
          info.response +
          ' Sender: ' +
          mailOptions.from +
          ' Recipient: ' +
          mailOptions.to +
          ' Subject: ' +
          mailOptions.subject +
          ' Body: ' +
          mailOptions.text
      );
    }
  });
};
