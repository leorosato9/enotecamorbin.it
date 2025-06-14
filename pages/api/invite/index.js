import { withAuth } from '../../../lib/auth/withAuth';
import { connectToDatabase } from '../../../lib/mongodb';
import nodemailer from 'nodemailer';
import { ObjectId } from 'mongodb';

async function inviteHandler(req, res, session) {
  const userEmail = session.user.email.toLowerCase();

  if (req.method === 'POST') {
    const { activityId, activityName, inviteeEmail } = req.body;
    if (!activityId || !inviteeEmail) {
      return res.status(400).json({ message: 'Campi mancanti' });
    }

    try {
      const { db } = await connectToDatabase();
      const activity = await db.collection('attività').findOne({ _id: new ObjectId(activityId) });
      
      if (!activity) {
        return res.status(404).json({ message: 'Attività non trovata' });
      }
      if (activity.userEmail !== userEmail) {
        return res.status(403).json({ message: 'Non autorizzato a invitare' });
      }

      const nuovoInvito = {
        activityId: activity._id,
        activityName: activityName || activity.nome,
        inviterEmail: userEmail,
        inviteeEmail: inviteeEmail.toLowerCase().trim(),
        status: 'pending',
        createdAt: new Date(),
      };
      await db.collection('inviti').insertOne(nuovoInvito);

      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const inviteLink = `${process.env.NEXTAUTH_URL}/user`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: inviteeEmail,
        subject: `Enoteca Morbin – Invito a collaborare su "${activity.nome}"`,
        text: `
Ciao!

Sei stato invitato da ${userEmail} a collaborare sull’attività "${activity.nome}".
Per accettare o rifiutare, accedi/al login su:

${inviteLink}

Grazie,
Enoteca Morbin
        `,
        html: `
        <div>
          <h2>Invito a collaborare</h2>
          <p><strong>Attività:</strong> ${activity.nome}</p>
          <p><strong>Da parte di:</strong> ${userEmail}</p>
          <p>Per accettare o rifiutare, fai clic qui sotto:</p>
          <p>
            <a href="${inviteLink}" style="
              display: inline-block;
              padding: 0.5rem 1rem;
              background-color: #388e3c;
              color: #fff;
              text-decoration: none;
              border-radius: 4px;
            ">
              Visualizza la richiesta su Enoteca Morbin
            </a>
          </p>
          <hr>
          <p>Se non ti sei registrato con questa email, ignorare questo messaggio.</p>
        </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return res.status(201).json({ message: 'Invito creato e email inviata' });
    } catch (err) {
      console.error('Errore in /api/inviti (POST):', err);
      return res.status(500).json({ message: 'Errore interno server' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const pendingInviti = await db
        .collection('inviti')
        .find({ inviteeEmail: userEmail, status: 'pending' })
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json({ inviti: pendingInviti });
    } catch (err) {
      console.error('Errore in /api/inviti (GET):', err);
      return res.status(500).json({ message: 'Errore interno server' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ message: 'Metodo non consentito' });
}

export default withAuth(inviteHandler);