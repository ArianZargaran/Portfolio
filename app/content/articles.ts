/**
 * /articles — the notebook. Per Ari's decision (Oct 13, 2026) it launches as
 * a static object with no interactivity; entries get wired up later.
 */
export interface Article {
  slug: string;
  title: string;
  date: string;
  summary: string;
}

export const ARTICLES: Article[] = [];

export const NOTEBOOK = {
  title: "Notebook",
  intro:
    "This is where articles will live. Nothing is published yet — the notebook is closed for now.",
};
