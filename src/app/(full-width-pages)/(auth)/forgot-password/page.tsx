import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ResetPasswordConfirmForm from "@/components/auth/ResetPasswordConfirmForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qoncept - Reset password",
  description: "",
};

async function getToken(searchParams: { token?: string } | undefined): Promise<string | undefined> {
  return new Promise((resolve) => {
    resolve( searchParams?.token);
  });
}

export default async function Page({ searchParams }: { searchParams: { token?: string } | undefined }) {
  const token = await getToken(searchParams);

  return token ? <ResetPasswordConfirmForm /> : <ResetPasswordForm />;
}