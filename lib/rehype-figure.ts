// Rehype plugin: transforms <p> containing <img> into <figure>
//
// Pattern 1 — image + italic caption:
//   <p><img /><em>caption</em></p> → <figure><img /><figcaption>caption</figcaption></figure>
//
// Pattern 2 — image alone:
//   <p><img /></p> → <figure><img /></figure>
//
// Pattern 3 — image + body text (NOT a caption):
//   <p><img />Text...</p> → <figure><img /></figure><p>Text...</p>
//
// Caption is detected only when the content after the image is a single <em> element.

import type { Element, ElementContent, Root, RootContent } from "hast";
import type { Plugin } from "unified";

const rehypeFigure: Plugin<[], Root> = () => {
  return (tree) => {
    walk(tree);
  };
};

function walk(node: Root | Element) {
  if (!("children" in node)) return;

  const out: (RootContent | ElementContent)[] = [];

  for (const child of node.children) {
    if (child.type === "element" && child.tagName === "p" && hasImg(child)) {
      const result = splitImgParagraph(child);
      out.push(...result);
    } else {
      if (child.type === "element") walk(child);
      out.push(child);
    }
  }

  node.children = out as typeof node.children;
}

function hasImg(p: Element): boolean {
  return p.children.some((c) => c.type === "element" && c.tagName === "img");
}

function isCaption(nodes: ElementContent[]): boolean {
  // Caption = exactly one <em> element (the *italic text* pattern)
  if (nodes.length !== 1) return false;
  const node = nodes[0];
  return node.type === "element" && node.tagName === "em";
}

function splitImgParagraph(p: Element): Element[] {
  const meaningful = p.children.filter(
    (c) =>
      !(c.type === "text" && c.value.trim() === "") &&
      !(c.type === "element" && c.tagName === "br"),
  );

  const imgIndex = meaningful.findIndex(
    (c) => c.type === "element" && c.tagName === "img",
  );
  const img = meaningful[imgIndex];
  const afterImg = meaningful.slice(imgIndex + 1);

  const figureChildren: ElementContent[] = [img];

  if (isCaption(afterImg)) {
    figureChildren.push({
      type: "element",
      tagName: "figcaption",
      properties: {},
      children:
        afterImg[0].type === "element" ? afterImg[0].children : afterImg,
    });

    return [
      {
        type: "element",
        tagName: "figure",
        properties: {},
        children: figureChildren,
      },
    ];
  }

  const result: Element[] = [
    {
      type: "element",
      tagName: "figure",
      properties: {},
      children: figureChildren,
    },
  ];

  if (afterImg.length > 0) {
    result.push({
      type: "element",
      tagName: "p",
      properties: {},
      children: afterImg,
    });
  }

  return result;
}

export default rehypeFigure;
