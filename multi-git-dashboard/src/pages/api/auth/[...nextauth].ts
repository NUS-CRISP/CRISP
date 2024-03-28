import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import NextAuth, { AuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      credentials: {
        email: {
          label: 'E-mail',
          type: 'text',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        const client = await clientPromise;
        const accountsCollection = client
          .db(process.env.DB_NAME)
          .collection('accounts');

        // TODO: shouldn't be hard coded
        if (credentials?.email === 'trial@example.com' && credentials.password === 'nuscrisptrial') {
          return {
            id: '660521956ecaf06ad0654137',
            name: 'Trial User',
            role: 'Trial User',
          };
        }

        const email = credentials?.email?.toLowerCase();
        const account = await accountsCollection.findOne({ email });

        if (!account) {
          throw new Error('Account does not exist.');
        }

        // Validate password
        const passwordIsValid = await bcrypt.compare(
          credentials?.password || '',
          account.password || ''
        );

        if (!passwordIsValid) {
          throw new Error('Invalid credentials');
        }

        // Check if account is approved
        if (!account.isApproved) {
          throw new Error('Account not approved yet.');
        }

        const usersCollection = client
          .db(process.env.DB_NAME)
          .collection('users');

        const user = await usersCollection.findOne({ _id: account.user });

        if (!user) {
          throw new Error('User not found.');
        }

        return {
          id: account._id.toString(),
          name: user?.name || '',
          role: account.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.name) {
        session.user.name = token.name;
      }
      session.user.role = token.role;
      return {
        user: { name: token.name, role: token.role },
        expires: session.expires,
      };
    },
  },
};

export const getServerSessionHelper = (
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
) => getServerSession(...args, authOptions);

export default async function (req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return NextAuth(req, res, authOptions);
}
