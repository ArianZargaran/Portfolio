import React from "react";

import Modal, { UseModalAttrs } from "~/hooks/useModal";

const NewselaModal: React.FC<UseModalAttrs> = (props) => (
  <Modal {...props}>Newsela</Modal>
);

export default NewselaModal;
