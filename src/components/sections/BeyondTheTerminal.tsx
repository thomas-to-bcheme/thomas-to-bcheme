import React from 'react';

// In-src image assets (src/docs). Next.js bundles these to /_next/static/media on build.
import yosemite from '@/docs/yosemite-valley.jpg';
import ibjjfWorlds from '@/docs/ibjjf-worlds-2025.jpg';
import coaching from '@/docs/coaching-oakland.jpg';

/**
 * "Off the clock" — a small editorial photo section closing the page on a human
 * note. Carries forward the discipline/community story (Brazilian jiu-jitsu,
 * the outdoors) with an asymmetric grid: Yosemite as the large anchor, the two
 * jiu-jitsu portraits stacked beside it. Captions are factual; hover zoom is
 * subtle and respects reduced-motion.
 */

interface Photo {
  src: string;
  alt: string;
  caption: string;
}

const PHOTOS = {
  yosemite: {
    src: yosemite.src,
    alt: 'Thomas To sitting on a granite outcrop overlooking Yosemite Valley',
    caption: 'Yosemite Valley, California',
  },
  worlds: {
    src: ibjjfWorlds.src,
    alt: 'Thomas To in a jiu-jitsu gi in front of the 2025 IBJJF World Championship banner',
    caption: 'IBJJF World Championship, 2025',
  },
  coaching: {
    src: coaching.src,
    alt: 'Thomas To coaching a group of children in Brazilian jiu-jitsu on the mats',
    caption: "Coaching kids' jiu-jitsu, Oakland",
  },
} as const satisfies Record<string, Photo>;

const Figure: React.FC<{ photo: Photo; className?: string }> = ({ photo, className }) => (
  <figure className={`group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 ${className ?? ''}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={photo.src}
      alt={photo.alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
    />
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-3 pt-12">
      <figcaption className="text-xs font-medium text-white/95 tracking-wide">
        {photo.caption}
      </figcaption>
    </div>
  </figure>
);

const BeyondTheTerminal: React.FC = () => {
  return (
    <section className="py-16">
      <div className="mb-8 max-w-2xl">
        <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3 block">
          Off the Clock
        </span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          The same discipline, off the keyboard.
        </h2>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          I compete and coach Brazilian jiu-jitsu in Oakland. The mat rewards the same habits good
          engineering does &mdash; show up consistently, stay calm under pressure, and leave the people
          around you better than you found them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:h-[560px]">
        <Figure
          photo={PHOTOS.yosemite}
          className="aspect-[4/3] sm:col-span-2 sm:aspect-[16/9] lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:h-full"
        />
        <Figure
          photo={PHOTOS.worlds}
          className="aspect-[4/5] lg:aspect-auto lg:h-full"
        />
        <Figure
          photo={PHOTOS.coaching}
          className="aspect-[4/5] lg:aspect-auto lg:h-full"
        />
      </div>
    </section>
  );
};

export default BeyondTheTerminal;
