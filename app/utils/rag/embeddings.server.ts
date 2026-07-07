import { singleton } from "~/singleton.server";
import { cosineSimilarity } from "~/utils/rag/cosine-similarity";
import { KNOWLEDGE_BASE, KnowledgeChunk } from "~/utils/rag/knowledge-base";

const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-3-lite";

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not configured");

  const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL }),
  });

  if (!response.ok) {
    throw new Error(`Voyage embeddings request failed: ${response.status}`);
  }

  const body = (await response.json()) as VoyageEmbeddingResponse;
  // Voyage doesn't guarantee response order matches input order — index maps back.
  const ordered = new Array<number[]>(texts.length);
  for (const item of body.data) ordered[item.index] = item.embedding;
  return ordered;
};

interface EmbeddedChunk {
  chunk: KnowledgeChunk;
  embedding: number[];
}

/** Embedded once per server process (singleton survives across requests, not
    across restarts) — the corpus is small and static, so re-embedding it on
    every chat message would be pure waste. */
const getCorpusEmbeddings = (): Promise<EmbeddedChunk[]> =>
  singleton("rag-corpus-embeddings", () =>
    embedTexts(KNOWLEDGE_BASE.map((chunk) => chunk.text)).then((vectors) =>
      KNOWLEDGE_BASE.map((chunk, i) => ({ chunk, embedding: vectors[i] })),
    ),
  );

export const retrieveRelevant = async (
  query: string,
  topK = 4,
): Promise<KnowledgeChunk[]> => {
  const [corpus, [queryEmbedding]] = await Promise.all([
    getCorpusEmbeddings(),
    embedTexts([query]),
  ]);

  return corpus
    .map(({ chunk, embedding }) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk }) => chunk);
};
