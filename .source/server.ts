// @ts-nocheck
import * as __fd_glob_8 from "../content/blog/shapes-of-knowledge/index.mdx?collection=blog"
import * as __fd_glob_7 from "../content/blog/pico-qwiic-reset/index.mdx?collection=blog"
import * as __fd_glob_6 from "../content/blog/matter-thread-relay/index.mdx?collection=blog"
import * as __fd_glob_5 from "../content/blog/e-id-ninja-detour/index.mdx?collection=blog"
import * as __fd_glob_4 from "../content/blog/letter-to-investor.mdx?collection=blog"
import * as __fd_glob_3 from "../content/blog/kai.mdx?collection=blog"
import * as __fd_glob_2 from "../content/blog/hello-world.mdx?collection=blog"
import * as __fd_glob_1 from "../content/blog/e-id.mdx?collection=blog"
import * as __fd_glob_0 from "../content/blog/domain-collection.mdx?collection=blog"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const blog = await create.doc("blog", "content/blog", {"domain-collection.mdx": __fd_glob_0, "e-id.mdx": __fd_glob_1, "hello-world.mdx": __fd_glob_2, "kai.mdx": __fd_glob_3, "letter-to-investor.mdx": __fd_glob_4, "e-id-ninja-detour/index.mdx": __fd_glob_5, "matter-thread-relay/index.mdx": __fd_glob_6, "pico-qwiic-reset/index.mdx": __fd_glob_7, "shapes-of-knowledge/index.mdx": __fd_glob_8, });