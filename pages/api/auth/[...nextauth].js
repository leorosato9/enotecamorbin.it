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
        console.log("--- Eseguo authorize (Credentials) ---");
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password sono obbligatori.');
        }
        const { db } = await connectToDatabase();
        const user = await db.collection('utenti').findOne({ email: credentials.email.toLowerCase().trim() });
        if (!user || !user.passwordHash) return null;
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        console.log("Authorize OK, restituisco utente:", user._id);
        
        return { 
          id: user._id.toString(), 
          name: `${user.nome} ${user.cognome}`, 
          email: user.email,
          plan: user.plan || 'free' 
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  secret: process.env.JWT_SECRET,

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("--- Eseguo signIn Callback ---");
      
      if (account.provider === 'google' && profile.email) {
        try {
          const { db } = await connectToDatabase();
          let dbUser = await db.collection('utenti').findOne({ email: profile.email.toLowerCase() });

          if (!dbUser) {
            console.log("Utente Google non trovato nel DB, lo creo con piano 'free'...");
            const [nome, ...rest] = (profile.name || '').split(' ');
            const cognome = rest.join(' ') || '';
            const newUserPayload = {
              nome: nome || '',
              cognome,
              email: profile.email.toLowerCase(),
              googleId: profile.sub,
              createdAt: new Date(),
              plan: 'free', 
            };
            await db.collection('utenti').insertOne(newUserPayload);
            console.log("Nuovo utente Google creato.");
          }
          return true;
        } catch (error) {
          console.error("Errore DB in signIn:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      console.log("--- Eseguo jwt Callback ---");
      
      if (user) {
        token.id = user.id;
        token.plan = user.plan;
      }

      if (!token.plan) {
          const { db } = await connectToDatabase();
          const dbUser = await db.collection('utenti').findOne({ email: token.email });
          if (dbUser) {
            token.plan = dbUser.plan || 'free';
          }
      }

      if (account?.provider === 'google' && !token.id) {
          const { db } = await connectToDatabase();
          const dbUser = await db.collection('utenti').findOne({ email: token.email });
          if (dbUser) {
            token.id = dbUser._id.toString();
          }
      }

      console.log("Token OUT:", token);
      return token;
    },

    async session({ session, token }) {
      console.log("--- Eseguo session Callback ---");
      console.log("Token ricevuto:", token);
      if (token && session.user) {
        session.user.id = token.id;
        session.user.plan = token.plan;
      }
      console.log("Sessione restituita:", session);
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      console.log("--- Eseguo redirect Callback ---");
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

export default NextAuth(authOptions);