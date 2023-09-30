import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import clientPromise from "@/lib/mongodb";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      credentials: {
        email: {
          label: "E-mail",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const client = await clientPromise;
        const accountsCollection = client
          .db(process.env.DB_NAME)
          .collection("account");
        const email = credentials?.email.toLowerCase();
        const account = await accountsCollection.findOne({ email });
        if (!account) {
          throw new Error("Account does not exist.");
        }

        // Validate password
        const passwordIsValid = await bcrypt.compare(
          credentials?.password!,
          account.password,
        );

        if (!passwordIsValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: account._id.toString(),
          ...account,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
};

export default NextAuth(authOptions);
