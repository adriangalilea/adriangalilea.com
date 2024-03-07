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
    "high-school dropout. entrepreneur. creative. *₿*itcoin believer since 2012.",
  socials: [
    {
      label: "telegram",
      link: "https://t.me/adriangalilea",
    },
    {
      label: "github",
      link: "https://github.com/adriangalilea",
    },
    {
      label: "e-mail",
      link: "mailto:adriangalilea@gmail.com",
    },
    {
      label: "rss",
      link: "https://adriangalilea.com/rss.xml",
    }
  ],
};

export default presentation;