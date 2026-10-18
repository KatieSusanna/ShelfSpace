export type BookMetadata = {
  isbn: string;
  title: string;
  authors: string[];
  publishDate: string | null;
  pages: number | null;
  description: string | null;
  coverUrl: string | null;
};
