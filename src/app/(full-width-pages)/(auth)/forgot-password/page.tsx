import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ResetPasswordConfirmForm from "@/components/auth/ResetPasswordConfirmForm";
import { Metadata } from "next";

// Define metadata for the page
export const metadata: Metadata = {
  title: "Qoncept - Reset password",
  description: "",
};

// Use a type that aligns with Next.js's searchParams
interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function Page({ searchParams }: PageProps) {
  const token = searchParams.token as string | undefined; // Type assertion to access token

  return token ? <ResetPasswordConfirmForm /> : <ResetPasswordForm />;
}