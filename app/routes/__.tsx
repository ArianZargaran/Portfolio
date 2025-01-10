import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import React from "react";

import FloatingParticlesBackground from "~/components/backgrounds/floating-particles-background";

interface HelloProps {
  greetings?: string;
}

export const loader = async (args: LoaderFunctionArgs) => {
  console.log(args);
  return json({ foo: "foo" });
};

const Hello: React.FC<HelloProps> = () => {
  const { foo } = useLoaderData<typeof loader>();

  return (
    <div>
      <Link to="/foo" viewTransition style={{ viewTransitionName: "header" }}>
        {foo}
      </Link>
      <FloatingParticlesBackground count={1000} />
    </div>
  );
};

export default Hello;
