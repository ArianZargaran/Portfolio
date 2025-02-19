import React from "react";

import useModal, { UseModalAttrs } from "~/hooks/useModal";

const CabifyModal: React.FC<UseModalAttrs> = ({
  onClose = () => undefined,
  onOpen = () => undefined,
  isOpen = false,
  appendedCta = null,
}) => {
  const Modal = useModal({ onClose, appendedCta, isOpen, onOpen });

  return <Modal>Cabify</Modal>;
};

export default CabifyModal;
