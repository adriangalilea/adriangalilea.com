export type Project = {
  title: string;
  techs: string[];
  link: string;
  isComingSoon?: boolean;
  isActive?: boolean;
};

const projects: Project[] = [
  {
    title: "self.fm",
    techs: ["nextjs", "full-stack"],
    link: "https://self.fm",
    isComingSoon: true,
    isActive: true,
  },
  {
    title: "kai",
    techs: ["telegram bots", "python"],
    link: "https://t.me/kai_helper_bot",
  },
  {
    title: "pico qwiicReset",
    techs: ["electronics", "design"],
    link: "/blog/pico-qwiic-reset",
  },
  {
    title: "portfolio",
    techs: ["astro"],
    link: "https://github.com/adriangalilea/adriangalilea.com",
  },
  {
    title: "tempo",
    techs: [],
    link: "https://tempo-eta-two.vercel.app/",
  },
  {
    title: "e-id",
    techs: ["nextjs", "full-stack", "wasm"],
    link: "https://e-id.to",
  }
];

export default projects;
