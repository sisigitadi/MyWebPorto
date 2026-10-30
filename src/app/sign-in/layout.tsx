import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/env";

export default function SignInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!hasClerkPublishableKey()) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}

