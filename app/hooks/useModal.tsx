import React, { PropsWithChildren, useEffect, useRef } from "react";

import "./modal.css";

import Button from "~/components/interactive-elements/button/button";

export interface UseModalAttrs {
  onClose?: () => void;
  onOpen?: () => void;
  isOpen?: boolean;
  appendedCta?: React.ReactNode;
}

const Modal: React.FC<PropsWithChildren<UseModalAttrs>> = ({
  onClose,
  onOpen,
  isOpen,
  appendedCta,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      onOpen?.();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen, onOpen]);

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      {children}
      <div className="modal-ctas">
        <Button
          className="close-button"
          onClick={() => dialogRef.current?.close()}
        >
          Close
        </Button>
        {appendedCta}
      </div>
    </dialog>
  );
};

export default Modal;
