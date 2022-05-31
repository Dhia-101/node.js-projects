const nodemailer = require("nodemailer");
const express = require('express');
const Joi = require("@hapi/joi");
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); // suuport url encoded qm

const validateEmail = Joi.object({
    senderName: Joi.string().min(3).max(30).required(),
    from: Joi.string().min(3).max(30).required(),
    subject: Joi.string().min(5).max(100).required(),
    text: Joi.string().min(10).max(1024).required()
})

app.post('/', async (req, res) => {

    const { error } = validateEmail.validate(req.body);
    if (error) return res.send(error.message);

    const mail = {
        senderName: req.body.senderName,
        from: req.body.from,
        subject: req.body.subject,
        text: req.body.text
    }
    send(mail).catch(console.error);
    res.send('sent!');
});

async function send(mail) {
    let transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        auth: {
            user: 'yourOutlookMail@outlook.fr',
            pass: 'yourPasswrd',
        },
        tls: {
            ciphers: 'SSLv3'
        },
    });

    let info = await transporter.sendMail({
        from: 'yourOutlookMail@outlook.fr',
        to: 'yourTargetMail@gmail.com',
        subject: mail.subject,
        text: mail.senderName + '\n' + mail.from + '\n\n' + mail.text
    });
}

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Listening on port ${port}...`));

