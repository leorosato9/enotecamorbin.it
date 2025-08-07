// pages/user.js
import React, { useEffect } from 'react'
import Head from 'next/head'
import { useSession, signOut } from 'next-auth/react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './api/auth/[...nextauth]'
import { useRouter } from 'next/router'
import { connectToDatabase } from '../lib/mongodb'

import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import ProfileCard from '../components/user/ProfileCard'
import AvatarUploader from '../components/user/AvatarUploader'
import ActivityForm from '../components/user/ActivityForm'
import ActivityList from '../components/user/ActivityList'
import { useUserPage } from '../hooks/useUserPage'

export default function UserPage({ userData, activities, emailToName }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const {
    activities: listaAttivita,
    isSubmittingActivity,
    activitySubmitError,
    handleAddActivity,
  } = useUserPage({
    initialActivities: activities,
    currentUserEmail: session?.user?.email,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <>
        <Head>
          <title>Caricamento... | Enoteca Morbin</title>
        </Head>
        <Header profileImageUrl={userData?.profileImageUrl} />
        <div className="scheda" style={{ textAlign: 'center', padding: '5rem 0' }}>
          <p>Caricamento...</p>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Il tuo Profilo | Enoteca Morbin</title>
      </Head>
      <Header profileImageUrl={userData?.profileImageUrl} />

      <div className="scheda">
        <h1>Il tuo Profilo</h1>

        <ProfileCard
          userData={userData}
          onSignOut={() => signOut({ callbackUrl: window.location.href })}
        />

        <AvatarUploader />

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
      </div>

      <Footer />
    </>
  )
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return { props: { userData: null, activities: [], emailToName: {} } }
  }

  const { db } = await connectToDatabase()
  const email = session.user.email.toLowerCase()
  const user = await db.collection('utenti').findOne(
    { email },
    { projection: { passwordHash: 0 } }
  )

  const userData = user
    ? {
        nome: user.nome || '',
        cognome: user.cognome || '',
        email: user.email || '',
        telefono: user.telefono || '',
        profileImageUrl: user.profileImageUrl || '',
        createdAt: user.createdAt?.toISOString() || '',
      }
    : {
        nome: '',
        cognome: '',
        email: session.user.email,
        telefono: '',
        profileImageUrl: '',
        createdAt: '',
      }

  const attArray = await db
    .collection('attività')
    .find({ $or: [{ userEmail: email }, { collaboratori: email }] })
    .sort({ createdAt: -1 })
    .toArray()

  const activities = attArray.map(att => ({
    _id: att._id.toString(),
    userEmail: att.userEmail,
    nome: att.nome,
    regione: att.regione,
    provincia: att.provincia,
    comune: att.comune,
    createdAt: att.createdAt?.toISOString() || '',
    collaboratori: att.collaboratori || [],
  }))

  const uniqueCollaboratori = [
    ...new Set(attArray.flatMap(att => att.collaboratori || [])),
  ]
  let emailToName = {}
  if (uniqueCollaboratori.length > 0) {
    const usersArray = await db
      .collection('utenti')
      .find({ email: { $in: uniqueCollaboratori } })
      .toArray()
    usersArray.forEach(u => {
      emailToName[u.email] = `${u.nome} ${u.cognome}`
    })
  }

  return {
    props: { userData, activities, emailToName },
  }
}
