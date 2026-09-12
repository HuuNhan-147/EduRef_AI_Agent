import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail của bạn
    pass: process.env.EMAIL_PASS, // App Password 16 ký tự
  },
});

const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email đã được gửi tới: ${to}`);
  } catch (error) {
    console.error("❌ Lỗi gửi email:", error);
  }
};

export default sendEmail;
