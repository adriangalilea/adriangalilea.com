export type Project = {
	title: string;
	description?: string;
	techs: string[];
	link: string;
	status?: "soon" | "sunset" | "lab" | "shipped";
};

export const projects: Project[] = [
	{
		title: "streamlit-shortcuts",
		description: "Keyboard shortcuts for Streamlit buttons — 44k downloads a month",
		techs: ["python", "streamlit"],
		link: "https://github.com/adriangalilea/streamlit-shortcuts",
		status: "shipped",
	},
	{
		title: "namecheap-python",
		description: "Modern Python client for the Namecheap API — 1.4k downloads a month",
		techs: ["python"],
		link: "https://github.com/adriangalilea/namecheap-python",
		status: "lab",
	},
	{
		title: "telos",
		description: "Self-improving functions defined by purpose — declare WHAT, not HOW",
		techs: ["python", "ai"],
		link: "https://github.com/adriangalilea/telos",
		status: "soon",
	},
	{
		title: "self.fm",
		description: "World's OS",
		techs: ["nextjs", "full-stack"],
		link: "https://self.fm",
		status: "soon",
	},
	{
		title: "kai",
		description: "First multimodal chatbot — text/speech hot-swappable, hundreds of active users",
		techs: ["telegram bots", "python"],
		link: "https://t.me/kai_helper_bot",
		status: "sunset",
	},
	{
		title: "pico qwiicReset",
		description: "Raspberry Pi Pico addon — Qwiic connector and reset button. Hundreds sold",
		techs: ["electronics", "design"],
		link: "/blog/pico-qwiic-reset",
		status: "shipped",
	},
	{
		title: "tempo",
		description: "Exploring alternative representations of time",
		techs: [],
		link: "https://tempo-eta-two.vercel.app/",
		status: "lab",
	},
	{
		title: "e-id",
		description: "My take on Linktree — a digital identity card",
		techs: ["nextjs", "full-stack", "wasm"],
		link: "https://e-id.to",
		status: "lab",
	},
];
