import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qoncept - Reset password",
  description: "",
};

export default function Page() {
  return <ResetPasswordForm />;
}
