import { json, LoaderFunctionArgs } from "@remix-run/node";

interface HelloProps {
  greetings?: string;
}

export const loader = async (args: LoaderFunctionArgs) => {
  console.log(args);
  return json({ foo: "foo" });
};

export default function Hello({ greetings = "Hello!" }: HelloProps) {
  return <div>{greetings}</div>;
}
