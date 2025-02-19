import React from "react";

import useModal, { UseModalAttrs } from "~/hooks/useModal";

const RollModal: React.FC<UseModalAttrs> = ({
  onClose = () => undefined,
  onOpen = () => undefined,
  isOpen = false,
  appendedCta = null,
}) => {
  const Modal = useModal({ onClose, appendedCta, isOpen, onOpen });

  return <Modal>Roll</Modal>;
};

export default RollModal;
