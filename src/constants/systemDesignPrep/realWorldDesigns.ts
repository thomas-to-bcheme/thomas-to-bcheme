/**
 * Six classic worked system designs — the "now apply the decision cascades
 * to a real system" payoff after `SYSTEM_DESIGN_QUESTIONS` and
 * `REFERENCE_GRID_COLUMNS` have each been argued individually. This is
 * deliberately a synthesis/index, not a full design doc: each design is
 * Requirements + Key Components + Scale Strategies, kept to a handful of
 * bullets, with `linkId` pointing back into an *existing* question-bank
 * (`SYSTEM_DESIGN_QUESTIONS`) or Reference Grid (`REFERENCE_GRID_COLUMNS`)
 * id wherever that bullet's underlying trade-off already has a full
 * treatment elsewhere on the page — so a design re-uses that cascade
 * instead of re-deriving it. `RealWorldDesignsSection` resolves each
 * `linkId` dynamically against both sources at render time (dropping it
 * silently if the id ever goes stale), the same defensive-lookup pattern
 * `SystemDesignQuestionCard` uses for `ripplesInto`.
 *
 * Referenced by `ExternalReferencesSection`'s "Practice these next" panel
 * (`href="#real-world-designs"`) — this file's section id is a load-bearing
 * anchor target for that existing link, not just a naming convention.
 */

export interface RealWorldDesignPoint {
  /** The concise fact or strategy itself — a few lines, not a paragraph. */
  text: string;
  /** Optional id of an existing SystemDesignQuestion or ReferenceGridEntry
   *  whose full decision cascade this point leans on, resolved and
   *  rendered as an inline link instead of restating the trade-off here. */
  linkId?: string;
}

export interface RealWorldDesign {
  /** Kebab-case, unique across the whole page — rendered as the design's
   *  scroll-anchor id. */
  id: string;
  name: string;
  /** Short "like X" real-world anchor, e.g. "like bit.ly". */
  tagline: string;
  requirements: string[];
  keyComponents: RealWorldDesignPoint[];
  scaleStrategies: RealWorldDesignPoint[];
}

export const REAL_WORLD_DESIGNS: RealWorldDesign[] = [
  {
    id: 'url-shortener',
    name: 'URL Shortener',
    tagline: 'like bit.ly',
    requirements: [
      'Given a long URL, return a short code and redirect to the original on lookup',
      'Read-heavy: redirects vastly outnumber new short-code creations',
      'Redirects need to feel instant worldwide, not just from the origin region',
    ],
    keyComponents: [
      { text: 'Base62 encoding turns an auto-incrementing id (or a hash) into a short, URL-safe code' },
      {
        text: 'A cache sits in front of the DB for hot-code lookups — most redirect traffic hits a small set of popular links',
        linkId: 'caching-layers',
      },
      {
        text: 'A CDN/edge layer serves the redirect itself close to the requester, not just static assets',
        linkId: 'networking-dns-cdn',
      },
      { text: 'The short-code → long-URL mapping lives in a relational store keyed by the short code' },
    ],
    scaleStrategies: [
      { text: 'Read replicas absorb redirect volume once a single primary maxes out', linkId: 'scaling-progression' },
      {
        text: 'Shard the mapping table by short-code hash once write volume (new links created) outgrows one primary',
        linkId: 'partitioning-vs-sharding',
      },
    ],
  },
  {
    id: 'ride-sharing',
    name: 'Ride Sharing',
    tagline: 'like Uber',
    requirements: [
      'Match a rider to a nearby available driver within seconds',
      "Track and broadcast a driver's live location continuously while a trip is active",
      'Handle surge concurrency in dense metro areas without falling behind',
      'Settle payment only after the trip completes',
    ],
    keyComponents: [
      {
        text: "Geo-indexing (geohash or quadtree) over driver locations powers 'nearest available driver' lookups — the one piece here this page's decision cascades don't cover elsewhere yet",
      },
      {
        text: 'Live location updates stream over a persistent connection instead of being polled',
        linkId: 'real-time-vs-batch',
      },
      {
        text: 'Matching, location tracking, and payment run as separate services, since they scale and fail independently of each other',
        linkId: 'monolith-vs-microservices',
      },
      {
        text: "Services coordinate by publishing events (ride requested, driver matched, trip completed) instead of calling each other directly",
        linkId: 'event-driven-architecture',
      },
    ],
    scaleStrategies: [
      {
        text: "Partition driver-location data geographically so a lookup only ever queries the region a rider is actually in",
        linkId: 'partitioning-vs-sharding',
      },
      {
        text: 'Payment settlement runs asynchronously off the matching path so a slow charge never blocks a driver from taking the next ride',
        linkId: 'sync-vs-async',
      },
    ],
  },
  {
    id: 'social-media-feed',
    name: 'Social Media Feed',
    tagline: 'like Instagram',
    requirements: [
      'Every post needs to reach potentially millions of followers',
      "A user's feed loads in well under a second, every time they open the app",
      'A small number of celebrity accounts have follower counts orders of magnitude above everyone else',
    ],
    keyComponents: [
      {
        text: "Fan-out on write precomputes each follower's feed at post time; fan-out on read assembles it lazily at load time — most large-scale feeds hybridize the two",
        linkId: 'fan-out',
      },
      {
        text: 'The feed itself lives in a NoSQL store shaped for fast per-user reads, not a relational schema',
        linkId: 'db-selection',
      },
      {
        text: "Photos and video sit in object storage behind a CDN — the feed store only ever holds references, not bytes",
        linkId: 'storage-types',
      },
      {
        text: "Feed and post data shard by user id so one user's write load never contends with another's",
        linkId: 'partitioning-vs-sharding',
      },
    ],
    scaleStrategies: [
      {
        text: "Celebrity accounts fall back to fan-out on read so one post doesn't trigger millions of synchronous feed writes",
        linkId: 'fan-out',
      },
      {
        text: "Cache the assembled feed for a user's next few loads rather than reassembling it from scratch on every open",
        linkId: 'cache-write-patterns',
      },
    ],
  },
  {
    id: 'video-streaming',
    name: 'Video Streaming Platform',
    tagline: 'like YouTube',
    requirements: [
      'Accept large uploads reliably, including over flaky connections',
      "Serve the same video at multiple resolutions/bitrates depending on the viewer's device and bandwidth",
      'Sustain millions of concurrent viewers without the origin becoming the bottleneck',
    ],
    keyComponents: [
      { text: "Uploads are chunked and resumable so a dropped connection doesn't mean restarting a multi-GB file" },
      {
        text: 'A transcode pipeline converts the source file into multiple resolutions/bitrates after upload, off the request path',
        linkId: 'sync-vs-async',
      },
      { text: 'Transcoded renditions land in object storage, not a database', linkId: 'storage-types' },
      {
        text: 'A CDN serves video chunks from a location close to the viewer instead of every request hitting the origin',
        linkId: 'networking-dns-cdn',
      },
      {
        text: "A metadata DB tracks each video's owner, status, and available renditions, separate from the video bytes themselves",
        linkId: 'db-selection',
      },
    ],
    scaleStrategies: [
      {
        text: 'At global scale a single CDN vendor becomes a bottleneck and single point of failure — multi-CDN spreads delivery across more than one',
      },
      { text: "Metadata shards once a single primary can't keep up with catalog growth", linkId: 'partitioning-vs-sharding' },
    ],
  },
  {
    id: 'ecommerce-system',
    name: 'E-commerce System',
    tagline: 'product catalog to checkout',
    requirements: [
      'Browse a catalog, search it, hold items in a cart, and check out reliably',
      "An order, once placed, has to actually decrement inventory and get fulfilled — not just be recorded",
      "Payment failures can't leave inventory decremented with no order to show for it",
    ],
    keyComponents: [
      {
        text: 'Product, Inventory, Order, and Payment run as separate services, each owning its own data',
        linkId: 'monolith-vs-microservices',
      },
      {
        text: 'Order fulfillment is triggered asynchronously off a queue once payment succeeds, instead of the checkout request blocking on it',
        linkId: 'sync-vs-async',
      },
      { text: 'Search runs against a dedicated search index, not the transactional product table', linkId: 'db-selection' },
    ],
    scaleStrategies: [
      {
        text: "Read replicas handle catalog-browsing traffic; the primary only sees writes that actually change inventory/orders",
        linkId: 'scaling-progression',
      },
      {
        text: "Order and inventory tables shard once a single primary's write volume caps out",
        linkId: 'partitioning-vs-sharding',
      },
      {
        text: 'Failed fulfillment jobs retry with backoff and land in a dead-letter queue instead of silently dropping an order',
        linkId: 'dead-letter-queue',
      },
    ],
  },
  {
    id: 'chat-application',
    name: 'Chat Application',
    tagline: 'like WhatsApp',
    requirements: [
      'Deliver a message to an online recipient in real time',
      "A recipient who's offline still gets every message once they reconnect",
      'Group conversations preserve message order within the conversation',
    ],
    keyComponents: [
      {
        text: "A WebSocket gateway holds a persistent connection per online client rather than the client polling for new messages",
        linkId: 'real-time-vs-batch',
      },
      {
        text: 'A message queue sits between sender and recipient so a message survives a consumer being briefly down',
        linkId: 'message-brokers',
      },
      {
        text: 'Undelivered messages queue durably and flush to the recipient on reconnect instead of being dropped',
        linkId: 'message-queue-delivery-model',
      },
      {
        text: "Conversations partition by room/conversation id so message order is preserved within a chat without needing one global ordering",
        linkId: 'partitioning-vs-sharding',
      },
    ],
    scaleStrategies: [
      {
        text: "A pub/sub backplane fans a message out to whichever server node actually holds the recipient's WebSocket connection, since no single node holds every connection",
        linkId: 'message-queue-topology',
      },
      {
        text: 'At-least-once delivery plus idempotent consumers avoid duplicate or lost messages under retry',
        linkId: 'delivery-semantics',
      },
    ],
  },
];
