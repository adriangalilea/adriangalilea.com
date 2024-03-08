export type HeadTags = {
  title?: string;
  description?: string;
  noindex?: boolean;
  imgLink?: string;
  og?: {
    title: string;
    type: string;
    description: string;
    image: string;
    alt: string;
  };
};
