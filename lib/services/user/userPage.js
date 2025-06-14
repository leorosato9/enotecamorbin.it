import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../mongodb';

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      props: {
        userData: null,
        activities: [],
        emailToName: {},
      },
    };
  }

  try {
    const { db } = await connectToDatabase();
    const email = session.user.email.toLowerCase();

    const user = await db
      .collection('utenti')
      .findOne({ email }, { projection: { passwordHash: 0 } });

    let userData = null;
    if (user) {
      userData = {
        nome: user.nome || '',
        cognome: user.cognome || '',
        email: user.email || '',
        telefono: user.telefono || '',
        createdAt: user.createdAt ? user.createdAt.toISOString() : '',
      };
    }

    const attCursor = db
      .collection('attività')
      .find({
        $or: [{ userEmail: email }, { collaboratori: email }],
      })
      .sort({ createdAt: -1 });
      
    const attArray = await attCursor.toArray();
    const activities = attArray.map((att) => ({
      _id: att._id.toString(),
      userEmail: att.userEmail,
      nome: att.nome,
      regione: att.regione,
      provincia: att.provincia,
      comune: att.comune,
      createdAt: att.createdAt ? att.createdAt.toISOString() : '',
      collaboratori: att.collaboratori || [],
    }));

    const allCollaboratori = attArray.flatMap((att) =>
      Array.isArray(att.collaboratori) ? att.collaboratori : []
    );
    const uniqueCollaboratori = [...new Set(allCollaboratori)];

    let emailToName = {};
    if (uniqueCollaboratori.length > 0) {
      const usersCursor = await db
        .collection('utenti')
        .find({ email: { $in: uniqueCollaboratori } });
      const usersArray = await usersCursor.toArray();
      usersArray.forEach((u) => {
        emailToName[u.email] = `${u.nome} ${u.cognome}`;
      });
    }

    return {
      props: {
        userData,
        activities,
        emailToName,
      },
    };
  } catch (e) {
    console.error('Errore in getServerSideProps /user:', e);
    return {
      props: {
        userData: null,
        activities: [],
        emailToName: {},
      },
    };
  }
}