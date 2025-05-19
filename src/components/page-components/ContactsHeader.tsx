"use client";
import Button from "@/components/ui/button/Button";
import { Modal } from "../ui/modal";
import { useModal } from "@/hooks/useModal"; // Adjust path to your useModal hook
import AddContactForm from "../form/contact-form/Add-Form";
import FilterIcons from "../ui/flowbiteIcons/Filter";

export default function ContactsHeader() {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-0 items-start justify-between lg:items-center w-full my-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 text-start">Contacts</h3>
        <div className="flex justify-between items-center gap-3 flex-wrap-reverse">
          {/* <SearchInput/> */}
          <div className="flex gap-2">
          < Button  size="sm" variant="outline" endIcon={<FilterIcons/>}>
           Filter 
          </Button>
          <Button onClick={() => openModal()} size="sm" variant="primary">
           Add contact +
          </Button>
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
        <AddContactForm onClose={closeModal} />
      </Modal>
    </>
  );
}