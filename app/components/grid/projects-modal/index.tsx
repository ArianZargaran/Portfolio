import React, { lazy, LazyExoticComponent, Suspense } from "react";

import { UseModalAttrs } from "~/hooks/useModal";

import { Project } from "../project-grid";

interface ProjectsModalProps {
  selectedProject?: Project;
  onClose?: () => void;
  isOpen?: boolean;
}

const modalContentComponents: Record<
  Project,
  LazyExoticComponent<React.FC<UseModalAttrs>>
> = {
  AIRTABLE: lazy(() => import("./airtable")),
  ANIMATEA: lazy(() => import("./animatea")),
  APPLE: lazy(() => import("./apple")),
  CABIFY: lazy(() => import("./cabify")),
  NEWSELA: lazy(() => import("./newsela")),
  REPLEAT: lazy(() => import("./repleat")),
  ["INITIATIVE ROLL"]: lazy(() => import("./roll")),
  WALMART: lazy(() => import("./walmart")),
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
