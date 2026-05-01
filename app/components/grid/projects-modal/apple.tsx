import React from "react";

import Modal, { UseModalAttrs } from "~/hooks/useModal";

const AppleModal: React.FC<UseModalAttrs> = (props) => (
  <Modal {...props}>Apple</Modal>
);

export default AppleModal;
