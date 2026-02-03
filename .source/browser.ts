// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  blog: create.doc("blog", {"domain-collection.mdx": () => import("../content/blog/domain-collection.mdx?collection=blog"), "e-id.mdx": () => import("../content/blog/e-id.mdx?collection=blog"), "hello-world.mdx": () => import("../content/blog/hello-world.mdx?collection=blog"), "kai.mdx": () => import("../content/blog/kai.mdx?collection=blog"), "letter-to-investor.mdx": () => import("../content/blog/letter-to-investor.mdx?collection=blog"), "namecheap-python.mdx": () => import("../content/blog/namecheap-python.mdx?collection=blog"), "matter-thread-relay/index.mdx": () => import("../content/blog/matter-thread-relay/index.mdx?collection=blog"), "pico-qwiic-reset/index.mdx": () => import("../content/blog/pico-qwiic-reset/index.mdx?collection=blog"), "e-id-ninja-detour/index.mdx": () => import("../content/blog/e-id-ninja-detour/index.mdx?collection=blog"), "shapes-of-knowledge/index.mdx": () => import("../content/blog/shapes-of-knowledge/index.mdx?collection=blog"), }),
};
export default browserCollections;