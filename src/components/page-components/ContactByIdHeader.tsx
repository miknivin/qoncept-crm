"use client";
import Link from "next/link";

interface ContactByIdWrapperProps {
  contactId: string;
}
export default function ContactByIdHeader({ contactId }: ContactByIdWrapperProps) {

  return (
    <>
    <div className="flex justify-between w-full px-6 flex-row-reverse">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">#{contactId.slice(-6)}</h3>

        <Link href={'/contacts'} className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">Go Back</Link>
    </div>
     

    </>
  );
}