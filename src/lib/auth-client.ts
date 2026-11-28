"use client";
import { createAuthClient } from "better-auth/react";

// Let Better Auth use the current page origin. This keeps branch previews
// talking to their own Worker instead of accidentally calling Production.
export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } = createAuthClient();
