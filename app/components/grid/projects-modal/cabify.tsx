import React from "react";

import Modal, { UseModalAttrs } from "~/hooks/useModal";

const CabifyModal: React.FC<UseModalAttrs> = (props) => (
  <Modal {...props}>Cabify</Modal>
);

export default CabifyModal;
