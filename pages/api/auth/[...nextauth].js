import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Email e password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password sono obbligatori.');
        }
        const { db } = await connectToDatabase();
        const user = await db
          .collection('utenti')
          .findOne({ email: credentials.email.toLowerCase().trim() });
        if (!user || !user.passwordHash) return null;
        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isValid) return null;

        // Ritorniamo questi campi, NextAuth li passa a jwt callback
        return {
          id: user._id.toString(),
          name: `${user.nome} ${user.cognome}`,
          email: user.email,
          plan: user.plan || 'free',
          profileImageUrl: user.profileImageUrl || null, // ← aggiunto
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  secret: process.env.JWT_SECRET,

  callbacks: {
    // --- signIn: lato Google, creazione/fallback utente in MongoDB ---
    async signIn({ user, account, profile }) {
      if (account.provider === 'google' && profile.email) {
        try {
          const { db } = await connectToDatabase();
          let dbUser = await db
            .collection('utenti')
            .findOne({ email: profile.email.toLowerCase() });

          if (!dbUser) {
            const [nome, ...rest] = (profile.name || '').split(' ');
            const cognome = rest.join(' ') || '';
            const newUser = {
              nome,
              cognome,
              email: profile.email.toLowerCase(),
              googleId: profile.sub,
              createdAt: new Date(),
              plan: 'free',
              profileImageUrl: null, // inizialmente vuoto
            };
            await db.collection('utenti').insertOne(newUser);
          }
          return true;
        } catch (error) {
          console.error('Errore DB in signIn:', error);
          return false;
        }
      }
      return true;
    },

    // --- jwt: arricchisci il token con plan e profileImageUrl ---
    async jwt({ token, user, account }) {
      // Al primo login (user esiste), popola token dai dati di authorize o signIn
      if (user) {
        token.id               = user.id;
        token.plan             = user.plan;
        token.profileImageUrl  = user.profileImageUrl || null;
      }

      // Se il token non ha ancora plan o profileImageUrl (es. reload), leggili da DB
      if (!token.plan || token.profileImageUrl === undefined) {
        try {
          const { db } = await connectToDatabase();
          const dbUser = await db
            .collection('utenti')
            .findOne({ email: token.email });
          if (dbUser) {
            token.plan = dbUser.plan || 'free';
            token.profileImageUrl = dbUser.profileImageUrl || null;
          }
        } catch (e) {
          console.error('Errore nel jwt callback (DB):', e);
        }
      }

      return token;
    },

    // --- session: passa profileImageUrl come session.user.image ---
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id    = token.id;
        session.user.plan  = token.plan;
        // NextAuth convention: l'immagine di default in session.user.image
        session.user.image = token.profileImageUrl || null;
      }
      return session;
    },

    // --- redirect: gestisci redirect in maniera sicura ---
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

export default NextAuth(authOptions);
