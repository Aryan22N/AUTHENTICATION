import nodemailer from "nodemailer";

// SMTP transporter — works with Mailtrap, Gmail, SendGrid, or any SMTP provider
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        html,
    });
};

const sendVerificationEmail = async (email, token) => {
    const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
    await sendEmail(
        email,
        "Verify your email",
        `<h2>Welcome!</h2><p>Click <a href="${url}">here</a> to verify your email.</p>`,
    );
};

export {
    sendVerificationEmail,
};