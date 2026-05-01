import React from "react";

import Modal, { UseModalAttrs } from "~/hooks/useModal";

const WalmartModal: React.FC<UseModalAttrs> = (props) => (
  <Modal {...props}>Walmart</Modal>
);

export default WalmartModal;
