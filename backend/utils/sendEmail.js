const sendEmail = async (to, subject, text) => {
    // In a real application, you would use nodemailer or a service like SendGrid here.
    // For now, we will log the email to the console to demonstrate the logic.

    console.log(`\n--- MOCK EMAIL AGENT ---`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    console.log(`------------------------\n`);

    return true;
};

module.exports = sendEmail;
