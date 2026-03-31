import NextAuth, { Account, Profile, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getUuid } from "@/lib/hash";
import { getIsoTimestr } from "@/lib/time";
import { getClientIp } from "@/lib/ip";
import { findUserByEmail, insertUser } from "@/models/user";
import { createUserCredits } from "@/models/credit";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
const GOOGLE_ONE_TAP_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google One Tap Provider
    ...(GOOGLE_ONE_TAP_ENABLED
      ? [
          Credentials({
            id: "google-one-tap",
            name: "Google One Tap",
            credentials: {
              credential: { label: "Credential", type: "text" },
            },
            async authorize(credentials) {
              const token = credentials.credential as string;

              if (!token) {
                console.error("[Google One Tap] No credential provided");
                return null;
              }

              try {
                console.log("[Google One Tap] Verifying token...");
                // Verify the Google ID token
                const response = await fetch(
                  `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
                );

                if (!response.ok) {
                  console.error("[Google One Tap] Failed to verify token, status:", response.status);
                  return null;
                }

                const payload = await response.json();
                console.log("[Google One Tap] Token verified for user:", payload.email);

                if (!payload || !payload.email) {
                  console.error("[Google One Tap] Invalid token payload");
                  return null;
                }

                // Return user object (will be processed in jwt callback)
                return {
                  id: payload.sub,
                  email: payload.email,
                  name: payload.name,
                  image: payload.picture,
                  emailVerified: payload.email_verified,
                } as User;
              } catch (error) {
                console.error("[Google One Tap] Error verifying token:", error);
                return null;
              }
            },
          }),
        ]
      : []),

    // Standard Google OAuth Provider
    ...(GOOGLE_ENABLED && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({
      token,
      user,
      account,
      profile,
    }: {
      token: JWT;
      user?: User;
      account?: Account | null;
      profile?: Profile;
    }) {
      if (account && user) {
        console.log("[NextAuth JWT] Processing login for:", user.email);

        // Get client IP
        let signin_ip = "127.0.0.1";
        try {
          signin_ip = await getClientIp();
          console.log("[NextAuth JWT] Client IP:", signin_ip);
        } catch (error) {
          console.error("[NextAuth JWT] Failed to get client IP:", error);
        }

        // Construct user object for database
        const dbUser = {
          uuid: getUuid(),
          email: user.email!,
          nickname: user.name || user.email?.split("@")[0] || "User",
          avatar_url: user.image || "",
          signin_type: account.type,
          signin_provider: account.provider,
          signin_openid: account.providerAccountId,
          signin_ip: signin_ip,
          created_at: getIsoTimestr(),
          locale: "en",
        };

        try {
          console.log("[NextAuth JWT] Creating user session...");
          console.log("[NextAuth JWT] User data to save:", {
            email: user.email,
            nickname: dbUser.nickname,
            provider: account.provider,
            signin_ip: signin_ip
          });

          // Check if user exists in database
          console.log("[NextAuth JWT] Checking if user exists in database...");
          let dbUserRecord = await findUserByEmail(user.email!, account.provider);

          if (!dbUserRecord) {
            console.log("[NextAuth JWT] User not found, creating new user in database...");
            console.log("[NextAuth JWT] New user details:", {
              uuid: dbUser.uuid,
              email: dbUser.email,
              nickname: dbUser.nickname,
              avatar_url: dbUser.avatar_url,
              signin_provider: dbUser.signin_provider,
              signin_ip: dbUser.signin_ip,
              created_at: dbUser.created_at
            });

            // Create new user in database
            dbUserRecord = await insertUser(dbUser as any);
            console.log("[NextAuth JWT] ✅ New user created successfully!");
            console.log("[NextAuth JWT] Saved user UUID:", dbUserRecord.uuid);
            console.log("[NextAuth JWT] Saved user email:", dbUserRecord.email);

            // Create initial credits for new user (e.g., 100 free credits)
            const initialCredits = parseInt(process.env.INITIAL_USER_CREDITS || "100");
            console.log("[NextAuth JWT] Creating initial credits:", initialCredits);

            const creditRecord = dbUserRecord.uuid ? await createUserCredits(dbUserRecord.uuid, initialCredits) : null;
            if (creditRecord) {
              console.log("[NextAuth JWT] ✅ Initial credits created successfully!");
              console.log("[NextAuth JWT] Credits balance:", creditRecord.balance);
            } else {
              console.error("[NextAuth JWT] ❌ Failed to create initial credits");
            }
          } else {
            console.log("[NextAuth JWT] ✅ Existing user found in database");
            console.log("[NextAuth JWT] User UUID:", dbUserRecord.uuid);
            console.log("[NextAuth JWT] User email:", dbUserRecord.email);
            console.log("[NextAuth JWT] User created at:", dbUserRecord.created_at);
          }

          // Store user info in token (use database UUID for existing users)
          token.user = {
            uuid: dbUserRecord.uuid,
            email: dbUserRecord.email,
            nickname: dbUserRecord.nickname || dbUser.nickname,
            avatar_url: dbUserRecord.avatar_url || dbUser.avatar_url,
            signin_provider: dbUserRecord.signin_provider || dbUser.signin_provider,
            created_at: dbUserRecord.created_at || dbUser.created_at,
            // 保留原始的 name 和 image 用于头像显示
            name: user.name,
            image: user.image,
          };

          console.log("[NextAuth JWT] ✅ Session token created with user info");
        } catch (error) {
          console.error("[NextAuth JWT] ❌ Error saving user to database:", error);
          if (error instanceof Error) {
            console.error("[NextAuth JWT] Error message:", error.message);
            console.error("[NextAuth JWT] Error stack:", error.stack);
          }
        }
      }

      return token;
    },

    async session({ session, token }: { session: any; token: JWT }) {
      // Add user info from token to session
      if (token.user) {
        session.user = {
          ...token.user,
          // 确保 image 字段存在，用于显示头像
          image: (token.user as any).avatar_url || (token.user as any).image,
          name: (token.user as any).nickname || (token.user as any).name || 'User',
        };
        console.log("[NextAuth Session] User loaded:", session.user.email);
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.AUTH_SECRET,
});
