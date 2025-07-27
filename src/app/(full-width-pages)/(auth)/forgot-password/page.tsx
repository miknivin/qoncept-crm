import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ResetPasswordConfirmForm from "@/components/auth/ResetPasswordConfirmForm";
import { Metadata } from "next";

// Define metadata for the page
export const metadata: Metadata = {
  title: "Qoncept - Reset password",
  description: "",
};

// Define the props type explicitly
interface PageProps {
  searchParams: { token?: string };
}

// No need for an async getToken function since searchParams is synchronous
export default function Page({ searchParams }: PageProps) {
  const token = searchParams.token; // Directly access token (synchronous)

  return token ? <ResetPasswordConfirmForm /> : <ResetPasswordForm />;
}