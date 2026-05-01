import React from "react";

import Modal, { UseModalAttrs } from "~/hooks/useModal";

const RollModal: React.FC<UseModalAttrs> = (props) => (
  <Modal {...props}>Roll</Modal>
);

export default RollModal;
