import React, { lazy, LazyExoticComponent, Suspense } from "react";

import { UseModalAttrs } from "~/hooks/useModal";

import { ProjectId } from "../project-grid";

interface ProjectsModalProps {
  selectedProject?: ProjectId;
  onClose?: () => void;
  isOpen?: boolean;
}

const modalContentComponents: Record<
  ProjectId,
  LazyExoticComponent<React.FC<UseModalAttrs>>
> = {
  airtable: lazy(() => import("./airtable")),
  animatea: lazy(() => import("./animatea")),
  apple: lazy(() => import("./apple")),
  cabify: lazy(() => import("./cabify")),
  newsela: lazy(() => import("./newsela")),
  repleat: lazy(() => import("./repleat")),
  "initiative-roll": lazy(() => import("./roll")),
  walmart: lazy(() => import("./walmart")),
};

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  selectedProject,
  onClose,
}) => {
  if (!selectedProject) return null;

  const SelectedComponent = modalContentComponents[selectedProject];

  return (
    <Suspense>
      <SelectedComponent onClose={onClose} isOpen />
    </Suspense>
  );
};
