import React, { lazy, LazyExoticComponent, Suspense } from "react";

import { UseModalAttrs } from "~/hooks/useModal";

import { Projects } from "../project-grid";

interface ProjectsModalProps {
  selectedProject?: Projects;
  onClose?: () => void;
  isOpen?: boolean;
}

const modalContentComponents: Record<
  Projects,
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
  const SelectedComponent = selectedProject
    ? modalContentComponents[selectedProject]
    : null;

  if (SelectedComponent === null) {
    return null;
  }

  return (
    <Suspense>
      {SelectedComponent ? (
        <SelectedComponent
          onClose={onClose}
          isOpen={Boolean(selectedProject)}
        />
      ) : (
        <p>Error loading content</p>
      )}
    </Suspense>
  );
};
