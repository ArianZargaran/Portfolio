import React from "react";

import useModal, { UseModalAttrs } from "~/hooks/useModal";

const AirtableModal: React.FC<UseModalAttrs> = ({
  onClose = () => undefined,
  onOpen = () => undefined,
  isOpen = false,
  appendedCta = null,
}) => {
  const Modal = useModal({ onClose, appendedCta, isOpen, onOpen });

  return <Modal>Airtable</Modal>;
};

export default AirtableModal;
