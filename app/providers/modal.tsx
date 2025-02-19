import React, { createContext, useContext, useState } from "react";

type Projects = "Airtable";

const ModalContext = createContext<{
  activeModal?: Projects;
  setActiveModal: React.Dispatch<React.SetStateAction<Projects | undefined>>;
}>({ activeModal: undefined, setActiveModal: () => undefined });

export const useModalContext = () => {
  return useContext(ModalContext);
};

export const ModalProvider: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<Projects | undefined>(
    undefined,
  );

  return (
    <ModalContext.Provider value={{ activeModal, setActiveModal }}>
      {children}
    </ModalContext.Provider>
  );
};
