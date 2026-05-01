import React from "react";

import Modal, { UseModalAttrs } from "~/hooks/useModal";

const AirtableModal: React.FC<UseModalAttrs> = (props) => (
  <Modal {...props}>Airtable</Modal>
);

export default AirtableModal;
