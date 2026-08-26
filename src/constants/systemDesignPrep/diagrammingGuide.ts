export interface DiagramTypeEntry {
  id: string;
  label: string;
  /** When a candidate should actually reach for this diagram type. */
  whenToUse: string;
  /** What this generic worked example demonstrates conceptually. */
  exampleNote: string;
  chart: string;
}

// Four standard system-design diagram types, each illustrated with a
// generic, stack-agnostic example — the concepts transfer to any system,
// not tied to one company's or portfolio's specific architecture. This is
// what actually gets drawn during the High-Level Design framework step (see
// interviewFramework.ts), to give the interviewer something concrete to
// react to before committing to a Deep Dive.
export const DIAGRAM_TYPES: DiagramTypeEntry[] = [
  {
    id: 'diagram-c4-container',
    label: 'C4 / Container diagram',
    whenToUse:
      'The macro shape — the system, its external dependencies, and who talks to whom — before any single component gets a deep dive. Usually the first thing drawn in a design interview.',
    exampleNote:
      'A typical container diagram: one client talking to a backend service, which checks a cache before reading/writing a primary datastore, delegates slow work to a background worker via a queue, and calls out to one or more external/third-party services.',
    chart: `graph TD
    Client(["Client (web / mobile)"])

    subgraph system["Your System"]
        API["Backend / API Service"]
        Cache[("Cache")]
        DB[("Primary Database")]
        Queue[("Message Queue")]
        Worker["Background Worker"]
    end

    subgraph external["External Dependencies"]
        ThirdPartyA["Third-Party Service A
(e.g. payments, email, auth provider)"]
        ThirdPartyB["Third-Party Service B
(e.g. AI/LLM API, search index)"]
    end

    Client -->|HTTPS request| API
    API -->|check first| Cache
    API -->|read/write| DB
    API -->|enqueue slow work| Queue
    Queue -->|consume| Worker
    Worker -->|writes result| DB
    API -->|synchronous call| ThirdPartyA
    API -->|synchronous call| ThirdPartyB`,
  },
  {
    id: 'diagram-sequence',
    label: 'UML sequence diagram',
    whenToUse:
      'One specific critical interaction, mapped in execution order — component lifelines, sync/async messages, and explicitly where failure/retry handling sits. Reach for this in the Deep Dive step, not the high-level sketch.',
    exampleNote:
      'A generic request flow: input validation, a cache check that falls through to the database on a miss, a downstream call to an external service, and an explicit error/retry branch when that external call is rate-limited or fails.',
    chart: `sequenceDiagram
    actor C as Client
    participant A as API Service
    participant V as Validator
    participant Ch as Cache
    participant D as Database
    participant E as External Service

    C->>A: request
    A->>V: validate(input)
    alt invalid input
        V-->>A: validation error
        A-->>C: 400 Bad Request
    else valid
        V-->>A: parsed input
        A->>Ch: get(key)
        alt cache hit
            Ch-->>A: cached value
        else cache miss
            Ch-->>A: miss
            A->>D: query()
            alt query fails
                D-->>A: error
                A-->>C: 500 Internal Error
            else success
                D-->>A: rows
                A->>Ch: set(key, value)
            end
        end
        A->>E: call external service
        alt rate-limited / failure
            E-->>A: error (e.g. 429 / 5xx)
            A-->>C: degrade gracefully or retry with backoff
        else success
            E-->>A: response
            A-->>C: 200 OK with result
        end
    end`,
  },
  {
    id: 'diagram-erd',
    label: 'Entity-relationship diagram',
    whenToUse:
      "The data model — entities, keys, attributes, and how they relate. Don't force multiple entities where the real schema has one: an honest single-table ERD is a more accurate answer than an invented join.",
    exampleNote:
      'A single, deliberately denormalized entity — the right shape for a read-optimized system fed by a separate write/ingestion pipeline, where forcing a multi-table join would misrepresent how the data actually gets queried.',
    chart: `erDiagram
    RECORD {
        string id PK
        string title
        string category
        string status
        date created_at
        float score
    }`,
  },
  {
    id: 'diagram-flowchart',
    label: 'Flowchart / activity diagram',
    whenToUse:
      'Complex conditional logic inside one component — decision nodes, loops, terminal states. The right tool for an algorithm or an authorization hand-off, where a sequence diagram would be the wrong shape (no second participant to swim-lane against).',
    exampleNote:
      'A generic signed-access hand-off: a request carrying an access token gates a metadata lookup, which gates a fetch from private storage — with a distinct, specific error at every point the request can be rejected.',
    chart: `flowchart TD
    A["Request with access token + expiry + signature"] --> B{"All required params present?"}
    B -- No --> B1["400 Missing Parameters"]
    B -- Yes --> C{"Token valid?
(not expired AND signature verifies)"}
    C -- Invalid/expired --> C1["401 Unauthorized"]
    C -- Valid --> D["Look up resource metadata"]
    D --> E{"Lookup succeeds?"}
    E -- No --> E1["502 Upstream Error"]
    E -- Yes --> F{"Resource exists?"}
    F -- No --> F1["404 Not Found"]
    F -- Yes --> G["Fetch resource from private storage"]
    G --> H{"Fetch succeeds?"}
    H -- No --> H1["404 Not Found"]
    H -- Yes --> I["Return resource to caller"]`,
  },
];
