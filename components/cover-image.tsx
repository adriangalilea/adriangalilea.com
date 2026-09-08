"use client";

import { useCardInteraction } from "@/components/clickable-wrapper";
import { Zoomable } from "@/components/media-lightbox";
import { Image } from "@/components/ui/image";
import { AnimatedImage } from "@/components/ui/image-animation";
import { Video } from "@/components/ui/video";
import { slugToGradient } from "@/lib/gradient";
import { isGif, isVideo } from "@/lib/media";

type CoverImageProps = {
  cover: string | null;
  slug: string;
  title: string;
  sizes?: string;
  priority?: boolean;
  intrinsic?: boolean;
  width?: number | null;
  height?: number | null;
  poster?: string | null;
  blurDataURL?: string | null;
  hoverPlay?: boolean;
  lightbox?: boolean;
  contained?: boolean;
};

export function CoverImage({
  cover,
  slug,
  title,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
  intrinsic,
  width,
  height,
  poster,
  blurDataURL,
  hoverPlay,
  lightbox,
  contained,
}: CoverImageProps) {
  const interactionRef = useCardInteraction();
  const w = width ?? 1200;
  const h = height ?? 630;
  const frame = `relative overflow-hidden ${contained ? "cover-contained w-full max-h-[32rem] rounded-2xl" : intrinsic ? "w-full" : "h-full w-full"}`;
  const style = { aspectRatio: `${w} / ${h}` };
  const grain = (
    <div className="cover-grain pointer-events-none absolute inset-0 z-10" />
  );
  if (!cover)
    return (
      <div
        className={frame}
        style={{ ...style, background: slugToGradient(slug) }}
      >
        {grain}
      </div>
    );

  if (isVideo(cover))
    return (
      <div className={frame} style={style}>
        <Video
          src={cover}
          width={w}
          height={h}
          poster={poster ?? undefined}
          blurDataURL={blurDataURL ?? undefined}
          mode="preview"
          interactionRef={interactionRef}
          playOn={hoverPlay ? "intent" : "visible-once"}
          label={title}
          loop
          className="size-full"
          videoClassName={contained ? "object-contain" : "object-cover"}
        />
        {grain}
      </div>
    );

  const animated = isGif(cover);
  if (animated && hoverPlay && poster)
    return (
      <div className={frame} style={style}>
        <AnimatedImage
          src={cover}
          poster={poster}
          interactionRef={interactionRef}
          width={w}
          height={h}
          alt={title}
          blurDataURL={blurDataURL ?? undefined}
          sizes={sizes}
          className="size-full"
          imageClassName={contained ? "object-contain" : "object-cover"}
        />
        {grain}
      </div>
    );
  const content = (
    <div className={`${frame} group/cover`} style={style}>
      {contained && blurDataURL && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-3xl"
          style={{ backgroundImage: `url(${JSON.stringify(blurDataURL)})` }}
        />
      )}
      <Image
        src={cover}
        alt={title}
        fill
        sizes={sizes}
        blurDataURL={blurDataURL ?? undefined}
        unoptimized={animated}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        imageClassName={contained ? "object-contain" : "object-cover"}
      />
      {grain}
    </div>
  );
  return lightbox ? (
    <Zoomable
      picture={{
        src: cover,
        width: w,
        height: h,
        alt: title,
        blur: blurDataURL,
      }}
      radius="rounded-2xl"
    >
      {content}
    </Zoomable>
  ) : (
    content
  );
}
