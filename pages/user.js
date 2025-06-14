import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

import ProfileCard from '../components/user/ProfileCard';
import ActivityForm from '../components/user/ActivityForm';
import ActivityList from '../components/user/ActivityList';
import PendingInvitations from '../components/user/PendingInvitations';

import { useUserPage } from '../hooks/useUserPage';

export default function UserPage({ userData, activities, emailToName }) {
  const { data: session, status } = useSession();
  const router = useRouter(); 

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

export { getServerSideProps } from '../lib/services/user/userPage';