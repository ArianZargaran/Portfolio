import React, { PropsWithChildren, useEffect, useRef } from "react";

import "./modal.css";

import Button from "~/components/interactive-elements/button/button";

export interface UseModalAttrs {
  onClose?: () => void;
  onOpen?: () => void;
  isOpen?: boolean;
  appendedCta?: React.ReactNode;
}

const useModal = ({
  onClose = () => undefined,
  onOpen = () => undefined,
  isOpen,
  appendedCta,
}: UseModalAttrs) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
      onOpen();
    }

    if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOpen]);

  const Modal: React.FC<PropsWithChildren> = ({ children }) => {
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

  return Modal;
};

export default useModal;
