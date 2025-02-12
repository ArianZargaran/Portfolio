import classNames from "classnames";
import { motion, MotionProps } from "framer-motion";
import React, { useCallback, useState } from "react";

import { useElementSize } from "~/hooks/useElementSize";

import { Airtable } from "./items/airtable";
import { Animatea } from "./items/animatea";
import { Apple } from "./items/apple";
import { Cabify } from "./items/cabify";
import { Newsela } from "./items/newsela";
import { Repleat } from "./items/repleat";
import { Roll } from "./items/roll";
import { Walmart } from "./items/walmart";

import "./project-grid.css";

export const hoverConfig = {
  initial: { scale: 1 },
  whileHover: { scale: 1.05 },
  transition: { duration: 0.4 },
};

const GAP = 24;

export type Projects =
  | "animatea"
  | "airtable"
  | "newsela"
  | "apple"
  | "roll"
  | "walmart"
  | "cabify"
  | "repleat";

interface ProjectGridProps {
  className?: string;
  onClick?: (project?: Projects) => void;
  preselected?: Projects;
}

export const ProjectsGrid: React.FC<ProjectGridProps> = ({
  onClick = () => undefined,
  preselected,
}) => {
  const [selected, setSelected] = useState(preselected);
  const { dimensions: animateaDimensions, ref: animateaRef } =
    useElementSize<HTMLDivElement>();
  const { dimensions: airtableDimensions, ref: airtableRef } =
    useElementSize<HTMLDivElement>();
  const { dimensions: newselaDimensions, ref: newselaRef } =
    useElementSize<HTMLDivElement>();
  // const { dimensions: walmartDimensions, ref: walmartRef } =
  //   useElementSize<HTMLDivElement>();
  // const { dimensions: appleDimensions, ref: appleRef } =
  //   useElementSize<HTMLDivElement>();
  const { dimensions: rollDimensions, ref: rollRef } =
    useElementSize<HTMLDivElement>();
  // const { dimensions: repleatDimensions, ref: repleatRef } =
  //   useElementSize<HTMLDivElement>();
  // const { dimensions: cabifyDimensions, ref: cabifyRef } =
  //   useElementSize<HTMLDivElement>();

  const DATA: {
    id: Projects;
    component: React.ReactNode;
    motion?: MotionProps;
  }[] = [
    {
      id: "animatea",
      component: <Animatea ref={animateaRef} className="block" />,
    },
    {
      id: "airtable",
      component: <Airtable ref={airtableRef} />,
    },
    {
      id: "newsela",
      component: <Newsela ref={newselaRef} className="block" />,
    },
    {
      id: "apple",
      component: (
        <Apple
          // ref={appleRef}
          className="block"
        />
      ),
      motion: {
        animate: {
          top: airtableDimensions.height + GAP,
          left: rollDimensions.width + GAP * 2,
          opacity: 1,
        },
      },
    },
    {
      id: "roll",
      component: <Roll ref={rollRef} className="block" />,
    },
    {
      id: "walmart",
      component: (
        <Walmart
          // ref={walmartRef}
          className="block"
        />
      ),
    },
    {
      id: "repleat",
      component: (
        <Repleat
          // ref={repleatRef}
          className="block"
        />
      ),
    },
    {
      id: "cabify",
      component: (
        <Cabify
          // ref={cabifyRef}
          className="block"
        />
      ),
    },
  ];

  const handleClick = useCallback(
    (selectedId: Projects) => {
      onClick(selectedId);
      setSelected(selectedId);
    },
    [onClick],
  );

  return (
    <motion.ul
      style={{
        ["--animatea-height"]: `${animateaDimensions.height}px`,
        ["--animatea-width"]: `${animateaDimensions.width}px`,
        // ["--airtable-height"]: `${airtableDimensions.height}px`,
        // ["--airtable-width"]: `${airtableDimensions.width}px`,
        ["--newsela-height"]: `${newselaDimensions.height}px`,
        // ["--newsela-width"]: `${newselaDimensions.width}px`,
        // ["--walmart-height"]: `${walmartDimensions.height}px`,
        // ["--walmart-width"]: `${walmartDimensions.width}px`,
        // ["--apple-height"]: `${appleDimensions.height}px`,
        // ["--apple-width"]: `${appleDimensions.width}px`,
        // ["--roll-height"]: `${rollDimensions.height}px`,
        // ["--roll-width"]: `${rollDimensions.width}px`,
        // ["--repleat-height"]: `${repleatDimensions.height}px`,
        // ["--repleat-width"]: `${repleatDimensions.width}px`,
        // ["--cabify-height"]: `${cabifyDimensions.height}px`,
        // ["--cabify-width"]: `${cabifyDimensions.width}px`,
        ["--gap"]: `${GAP}px`,
      }}
      className="grid"
    >
      {DATA.map(({ id, component, motion: elMotion }) => (
        <motion.li
          key={id}
          onClick={() => handleClick(id)}
          className={classNames(
            "grid-item",
            `${id}-wrapper`,
            `selected-${selected}`,
          )}
          layout
          initial={{
            opacity: 0,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          animate={{
            opacity: 1,
          }}
          {...elMotion}
        >
          {component}
        </motion.li>
      ))}
    </motion.ul>
  );
};
