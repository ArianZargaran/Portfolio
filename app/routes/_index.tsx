import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import parse, {
  HTMLReactParserOptions,
  Element,
  attributesToProps,
  domToReact,
  DOMNode,
} from "html-react-parser";
import { useMemo } from "react";

export const meta: MetaFunction = () => [{ title: "Remix Notes" }];

interface FakerAPIResponse {
  status: string;
  code: number;
  locale: string;
  total: number;
  data: { format: string }[];
}

const OPENING_BODY_TAG = "<body>";
const CLOSING_BODY_TAG = "</body>";

const FETCH_URI =
  "https://fakerapi.it/api/v2/custom?_locale=es_ES&_quantity=1&format=html";

const options: HTMLReactParserOptions = {
  replace(domNode) {
    if (domNode instanceof Element && domNode.name === "div") {
      const props = attributesToProps(domNode.attribs);
      return <div {...props}>{domToReact(domNode.children as DOMNode[])}</div>;
    }
    if (domNode instanceof Element && domNode.name === "form") {
      return <></>;
    }
  },
};

export const loader: LoaderFunction = async () => {
  const response = await fetch(FETCH_URI);

  if (!response.ok) {
    throw new Response("Error fetching data from FakerAPI", {
      status: response.status,
    });
  }

  const dataObj: FakerAPIResponse = await response.json();
  const grossData = dataObj.data[0].format;
  const bodyTagOpenIdx = grossData.indexOf(OPENING_BODY_TAG);
  const bodyTagCloseIdx = grossData.indexOf(CLOSING_BODY_TAG);
  const data = grossData.substring(
    bodyTagOpenIdx + OPENING_BODY_TAG.length,
    bodyTagCloseIdx - CLOSING_BODY_TAG.length,
  );

  return json(data);
};

export default function Index() {
  const data = useLoaderData<FakerAPIResponse>();

  const body = useMemo(() => {
    const html = JSON.stringify(data);
    console.log({ html });
    return parse(html.substring(1), options);
  }, [data]);

  return body;
}
