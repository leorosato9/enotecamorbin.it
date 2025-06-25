import React, { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';
import { useRouter } from 'next/router';
import Head from 'next/head';

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

import ProfileCard from '../components/user/ProfileCard';
import ActivityForm from '../components/user/ActivityForm';
import ActivityList from '../components/user/ActivityList';
import PendingInvitations from '../components/user/PendingInvitations';

import { useUserPage } from '../hooks/useUserPage';
import { connectToDatabase } from '../lib/mongodb';

export default function UserPage({ userData, activities, emailToName }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('[PAGE] userData prop:', userData);
  }, [userData]);

  const {
    activities: listaAttivita,
    isSubmittingActivity,
    activitySubmitError,
    handleAddActivity,
    pendingInvites,
    isLoadingInvites,
    errorInvites,
    handleInviteResponse,
  } = useUserPage({
    initialActivities: activities,
    currentUserEmail: session?.user?.email,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <>
        <Head>
          <title>Caricamento... | Enoteca Morbin</title>
        </Head>
        <Header />
        <div className="scheda" style={{ textAlign: 'center', padding: '5rem 0' }}>
          <p>Caricamento...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Il tuo Profilo | Enoteca Morbin</title>
      </Head>
      <Header />
      <div className="scheda">
        <h1>Il tuo Profilo</h1>

        <ProfileCard
          userData={userData}
          onSignOut={() => signOut({ callbackUrl: window.location.href })}
        />

        <ActivityForm
          onSubmit={handleAddActivity}
          isSubmitting={isSubmittingActivity}
          error={activitySubmitError}
        />

        <ActivityList
          activities={listaAttivita}
          currentUserEmail={session.user.email}
          emailToName={emailToName}
        />

        <PendingInvitations
          invites={pendingInvites}
          isLoading={isLoadingInvites}
          error={errorInvites}
          onRespond={handleInviteResponse}
        />
      </div>
      <Footer />
    </>
  );
}

export async function getServerSideProps(context) {
  let session;
  try {
    session = await getServerSession(context.req, context.res, authOptions);
    console.log('[SSR] session:', session.user.email, session.user.name);
  } catch (err) {
    console.error('[SSR] getServerSession error:', err);
  }

  if (!session) {
    console.log('[SSR] nessuna sessione utente trovata');
    return {
      props: { userData: null, activities: [], emailToName: {} },
    };
  }

  try {
    const { db } = await connectToDatabase();
    const email = session.user.email.toLowerCase();

    const user = await db
      .collection('utenti')
      .findOne({ email }, { projection: { passwordHash: 0 } });

    let userData;
    if (user) {
      userData = {
        nome: user.nome || '',
        cognome: user.cognome || '',
        email: user.email || '',
        telefono: user.telefono || '',
        createdAt: user.createdAt ? user.createdAt.toISOString() : '',
      };
    } else {
      // Fallback: usa i dati di sessione se non esiste record DB
      const parts = session.user.name ? session.user.name.split(' ') : [];
      userData = {
        nome: parts[0] || '',
        cognome: parts.slice(1).join(' ') || '',
        email: session.user.email || '',
        telefono: '',
        createdAt: '',
      };
      console.log('[SSR] fallback userData da session:', userData);
    }

    console.log('[SSR] userData finale:', userData);

    const attCursor = db
      .collection('attività')
      .find({ $or: [{ userEmail: email }, { collaboratori: email }] })
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

    return { props: { userData, activities, emailToName } };
  } catch (e) {
    console.error('[SSR] errore DB:', e);
    return { props: { userData: null, activities: [], emailToName: {} } };
  }
}
