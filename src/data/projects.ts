export type Project = {
  title: string;
  techs: string[];
  link: string;
  isComingSoon?: boolean;
};

const projects: Project[] = [
  {
    title: "self.fm",
    techs: ["nextjs", "full-stack"],
    link: "https://self.fm",
    isComingSoon: true,
  },
  {
    title: "kai",
    techs: ["telegram bots", "python"],
    link: "https://t.me/kai_helper_bot",
  },
  {
    title: "pico qwiicReset",
    techs: ["electronics", "design"],
    link: "/posts/pico-qwiic-reset",
  },
  {
    title: "portfolio",
    techs: ["astro"],
    link: "/",
  },
];

export default projects;
