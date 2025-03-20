import clientPromise from '@/lib/mongodb';
import CrispRole from '@shared/types/auth/CrispRole';
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
        type: {
          label: 'Type',
          type: 'text',
        },
      },
      async authorize(credentials) {
        const client = await clientPromise;
        const accountsCollection = client
          .db(process.env.DB_NAME)
          .collection('accounts');

        if (credentials?.type === CrispRole.TrialUser) {
          const trialAccount = await accountsCollection.findOne({ crispRole: CrispRole.TrialUser });
          return {
            id: process.env.TRIAL_USER_ID || '',
            name: CrispRole.TrialUser,
            crispRole: CrispRole.TrialUser,
            courseRoles: trialAccount!.courseRoles,
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
          crispRole: account.crispRole,
          courseRoles: account.courseRoles,
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
        token.crispRole = user.crispRole;
        token.courseRoles = user.courseRoles;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.name) {
        session.user.name = token.name;
      }
      session.user.crispRole = token.crispRole;
      session.user.courseRoles = token.courseRoles;
      return {
        user: { name: token.name, crispRole: token.crispRole, courseRoles: token.courseRoles },
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
