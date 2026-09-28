import type { Metadata } from "next";
import { SignIn } from "@/components/SignIn";

export const metadata: Metadata = {
  title: "Sign in · MentorMatch",
  description: "Continue with your account, or open a sample one.",
};

export default function SignInPage() {
  return <SignIn />;
}
