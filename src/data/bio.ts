type Social = {
  label: string;
  link: string;
};

type Presentation = {
  title: string;
  description: string;
  socials: Social[];
  profile?: string;
};

const presentation: Presentation = {
  title: "ADRIAN GALILEA",
  description:
    "high-school dropout. entreprenour. creative. *₿*itcoin believer(since 2012).",
  socials: [
    {
      label: "e-mail",
      link: "mailto:adriangalilea@gmail.com",
    },
    {
      label: "telegram",
      link: "https://t.me/adriangalilea",
    },
    {
      label: "github",
      link: "https://github.com/adriangalilea",
    },
  ],
};

export default presentation;