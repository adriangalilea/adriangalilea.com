export type Project = {
	title: string;
	techs: string[];
	link: string;
	status?: "soon" | "sunset" | "lab" | "shipped";
};

export const projects: Project[] = [
	{
		title: "self.fm",
		techs: ["nextjs", "full-stack"],
		link: "https://self.fm",
		status: "soon",
	},
	{
		title: "kai",
		techs: ["telegram bots", "python"],
		link: "https://t.me/kai_helper_bot",
		status: "sunset",
	},
	{
		title: "pico qwiicReset",
		techs: ["electronics", "design"],
		link: "/blog/pico-qwiic-reset",
		status: "shipped",
	},
	{
		title: "tempo",
		techs: [],
		link: "https://tempo-eta-two.vercel.app/",
		status: "lab",
	},
	{
		title: "e-id",
		techs: ["nextjs", "full-stack", "wasm"],
		link: "https://e-id.to",
		status: "lab",
	},
];
