import type { Concept } from './types';

export const FROM_SCRATCH_CONCEPTS: Concept[] = [
  {
    id: 'http-router',
    part: 'scratch',
    navLabel: 'HTTP router',
    title: 'An HTTP router',
    summary:
      'A router maps a method and a path to a handler, and middleware wraps handlers with shared behaviour such as logging. Built here with exact-match routes and only each language’s standard library.',
    snippets: {
      sql: {
        code: `-- Routing as a lookup table, dispatched in SQL (the idea, not a web server).
CREATE TABLE routes (method text, path text, handler regproc, PRIMARY KEY (method, path));
INSERT INTO routes VALUES ('GET', '/health', 'health_handler'::regproc);

CREATE FUNCTION health_handler() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"status":"ok"}'::jsonb $$;

CREATE FUNCTION dispatch(m text, p text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE h regproc; result jsonb;
BEGIN
  SELECT handler INTO h FROM routes WHERE method = m AND path = p;
  IF h IS NULL THEN RETURN '{"error":"not found"}'::jsonb; END IF;
  EXECUTE format('SELECT %s()', h) INTO result;
  RETURN result;
END $$;

SELECT dispatch('GET', '/health');`,
        note: 'Illustrates the method+path lookup. Real HTTP serving is done outside the database (PostgREST is the usual tool).',
      },
      python: {
        code: `from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Callable

Handler = Callable[[BaseHTTPRequestHandler], tuple[int, str]]

class Router:
    def __init__(self) -> None:
        self.routes: dict[tuple[str, str], Handler] = {}
        self.middleware: list[Callable[[Handler], Handler]] = []

    def add(self, method: str, path: str, handler: Handler) -> None:
        self.routes[(method, path)] = handler

    def use(self, wrap: Callable[[Handler], Handler]) -> None:
        self.middleware.append(wrap)

    def resolve(self, method: str, path: str) -> Handler:
        handler = self.routes.get((method, path), lambda request: (404, "not found"))
        for wrap in reversed(self.middleware):     # first registered runs outermost
            handler = wrap(handler)
        return handler

router = Router()
router.add("GET", "/health", lambda request: (200, "ok"))
router.use(lambda next_handler: lambda request: (print("request", request.path), next_handler(request))[1])

class App(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        status, body = router.resolve("GET", self.path)(self)
        self.send_response(status)
        self.end_headers()
        self.wfile.write(body.encode())

HTTPServer(("", 8080), App).serve_forever()    # standard library only; single-threaded`,
      },
      typescript: {
        code: `import { createServer, IncomingMessage, ServerResponse } from "node:http";

type Handler = (request: IncomingMessage, response: ServerResponse) => void;
type Middleware = (next: Handler) => Handler;

class Router {
  private routes = new Map<string, Handler>();        // key: "METHOD /path"
  private middleware: Middleware[] = [];

  use(wrap: Middleware) { this.middleware.push(wrap); }
  add(method: string, path: string, handler: Handler) { this.routes.set(\`\${method} \${path}\`, handler); }

  handler: Handler = (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    let handler: Handler =
      this.routes.get(\`\${request.method} \${url.pathname}\`) ??
      ((_, res) => { res.statusCode = 404; res.end("not found"); });
    for (const wrap of [...this.middleware].reverse()) handler = wrap(handler);
    handler(request, response);
  };
}

const router = new Router();
router.use((next) => (req, res) => { console.log(req.method, req.url); next(req, res); });
router.add("GET", "/health", (_, res) => res.end("ok"));
createServer(router.handler).listen(8080);`,
      },
      spark: {
        code: `# Spark does not serve HTTP routes. The analogue is dispatching records to handlers by key,
# which is a routing table applied to a DataFrame.
from pyspark.sql import functions as F

routes = spark.createDataFrame([("GET", "/health", "health")], ["method", "path", "handler"])
requests = spark.createDataFrame([("GET", "/health"), ("GET", "/missing")], ["method", "path"])

routed = (requests.join(routes, ["method", "path"], "left")
    .withColumn("handler", F.coalesce("handler", F.lit("not_found"))))   # default route
routed.show()`,
        note: 'Illustrates route lookup as a left join with a fallback. Serving requests is the job of a web framework.',
      },
      rust: {
        code: `use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

type Handler = Box<dyn Fn() -> (u16, String) + Send + Sync>;

struct Router {
    routes: HashMap<(String, String), Handler>,
}

impl Router {
    fn new() -> Self { Router { routes: HashMap::new() } }
    fn add(&mut self, method: &str, path: &str, handler: Handler) {
        self.routes.insert((method.to_string(), path.to_string()), handler);
    }
    fn handle(&self, method: &str, path: &str) -> (u16, String) {
        match self.routes.get(&(method.to_string(), path.to_string())) {
            Some(handler) => handler(),
            None => (404, "not found".to_string()),
        }
    }
}

fn serve(router: &Router, mut stream: TcpStream) -> std::io::Result<()> {
    let mut buffer = [0u8; 1024];
    let n = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..n]);
    let mut parts = request.lines().next().unwrap_or("").split_whitespace();
    let (status, body) = router.handle(parts.next().unwrap_or(""), parts.next().unwrap_or(""));
    write!(stream, "HTTP/1.1 {status} OK\\r\\nContent-Length: {}\\r\\n\\r\\n{body}", body.len())
}

fn main() -> std::io::Result<()> {
    let mut router = Router::new();
    router.add("GET", "/health", Box::new(|| (200, "ok".to_string())));
    for stream in TcpListener::bind("127.0.0.1:8080")?.incoming() { serve(&router, stream?)?; }
    Ok(())
}
// std only: a minimal HTTP/1.1 parser. Production code would use hyper or axum.`,
        note: 'The standard library has no HTTP server, so this parses the request line by hand.',
      },
      cpp: {
        code: `#include <functional>
#include <iostream>
#include <map>
#include <string>
#include <utility>
#include <vector>

// The C++ standard library has no networking. This shows the routing core,
// separated from the transport (sockets, Asio, or Boost.Beast would supply requests).
using Handler = std::function<std::pair<int, std::string>()>;
using Middleware = std::function<Handler(Handler)>;

class Router {
public:
    void use(Middleware wrap) { middleware_.push_back(std::move(wrap)); }
    void add(const std::string& method, const std::string& path, Handler handler) {
        routes_[method + " " + path] = std::move(handler);
    }
    std::pair<int, std::string> handle(const std::string& method, const std::string& path) const {
        auto it = routes_.find(method + " " + path);
        Handler handler = it != routes_.end() ? it->second
                                              : Handler([] { return std::pair{404, std::string("not found")}; });
        for (auto wrap = middleware_.rbegin(); wrap != middleware_.rend(); ++wrap) handler = (*wrap)(handler);
        return handler();
    }
private:
    std::map<std::string, Handler> routes_;
    std::vector<Middleware> middleware_;
};

int main() {
    Router router;
    router.use([](Handler next) { return [next] { std::cout << "request\\n"; return next(); }; });
    router.add("GET", "/health", [] { return std::pair{200, std::string("ok")}; });
    auto [status, body] = router.handle("GET", "/health");
    std::cout << status << " " << body << "\\n";
}`,
        note: 'Sockets are platform specific, so only the router is shown.',
      },
      go: {
        code: `package main

import (
    "fmt"
    "log"
    "net/http"
)

type Middleware func(http.Handler) http.Handler

type Router struct {
    routes     map[string]http.Handler // key: "METHOD /path"
    middleware []Middleware
}

func NewRouter() *Router { return &Router{routes: make(map[string]http.Handler)} }

func (router *Router) Use(mw Middleware) { router.middleware = append(router.middleware, mw) }

func (router *Router) Handle(method, path string, handler http.HandlerFunc) {
    router.routes[method+" "+path] = handler
}

// ServeHTTP makes Router an http.Handler.
func (router *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    var handler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        route, found := router.routes[r.Method+" "+r.URL.Path]
        if !found {
            http.NotFound(w, r)
            return
        }
        route.ServeHTTP(w, r)
    })
    for index := len(router.middleware) - 1; index >= 0; index-- {
        handler = router.middleware[index](handler) // first registered runs outermost
    }
    handler.ServeHTTP(w, r)
}

func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        log.Printf("method=%s path=%s", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}

func main() {
    router := NewRouter()
    router.Use(logging)
    router.Handle("GET", "/health", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "ok")
    })
    log.Fatal(http.ListenAndServe(":8080", router))
}`,
        note: 'Go 1.22 added method and wildcard patterns to http.ServeMux, which covers many real needs.',
      },
      swift: {
        code: `// Swift's standard library has no HTTP server (SwiftNIO or Vapor provide one).
// This is the routing core, independent of the transport.
struct Response { var status: Int; var body: String }
typealias Handler = () -> Response
typealias Middleware = (@escaping Handler) -> Handler

final class Router {
    private var routes: [String: Handler] = [:]        // key: "METHOD /path"
    private var middleware: [Middleware] = []

    func use(_ wrap: @escaping Middleware) { middleware.append(wrap) }
    func add(_ method: String, _ path: String, handler: @escaping Handler) {
        routes["\\(method) \\(path)"] = handler
    }

    func handle(_ method: String, _ path: String) -> Response {
        var handler: Handler = routes["\\(method) \\(path)"] ?? { Response(status: 404, body: "not found") }
        for wrap in middleware.reversed() { handler = wrap(handler) }   // first registered runs outermost
        return handler()
    }
}

let router = Router()
router.use { next in { print("request"); return next() } }
router.add("GET", "/health") { Response(status: 200, body: "ok") }
print(router.handle("GET", "/health"))`,
      },
      kotlin: {
        code: `import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress

typealias Handler = (HttpExchange) -> Pair<Int, String>
typealias Middleware = (Handler) -> Handler

class Router {
    private val routes = mutableMapOf<String, Handler>()          // key: "METHOD /path"
    private val middleware = mutableListOf<Middleware>()

    fun use(wrap: Middleware) { middleware += wrap }
    fun add(method: String, path: String, handler: Handler) { routes["$method $path"] = handler }

    fun handle(exchange: HttpExchange): Pair<Int, String> {
        var handler: Handler = routes["\${exchange.requestMethod} \${exchange.requestURI.path}"]
            ?: { 404 to "not found" }
        for (wrap in middleware.reversed()) handler = wrap(handler)
        return handler(exchange)
    }
}

fun main() {
    val router = Router()
    router.use { next -> { exchange -> println(exchange.requestURI); next(exchange) } }
    router.add("GET", "/health") { 200 to "ok" }

    val server = HttpServer.create(InetSocketAddress(8080), 0)     // JDK built-in server
    server.createContext("/") { exchange ->
        val (status, body) = router.handle(exchange)
        exchange.sendResponseHeaders(status, body.length.toLong())
        exchange.responseBody.use { it.write(body.toByteArray()) }
    }
    server.start()
}`,
      },
    },
    takeaway:
      'A router is a lookup table plus a chain of wrapping functions. Frameworks add path parameters, a radix tree for speed, and body parsing, but the core is small enough to read in one sitting.',
  },
  {
    id: 'state-store',
    part: 'scratch',
    navLabel: 'Reactive state store',
    title: 'A reactive state store',
    summary:
      'A store holds one state value, replaces it immutably on every update, and notifies subscribers with the new and previous values. Subscribing returns a way to unsubscribe.',
    snippets: {
      sql: {
        code: `-- The database equivalent: a state table plus a trigger that notifies subscribers.
CREATE TABLE app_state (key text PRIMARY KEY, value jsonb NOT NULL);

CREATE FUNCTION notify_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('state_changed', json_build_object('key', NEW.key, 'value', NEW.value)::text);
  RETURN NEW;
END $$;

CREATE TRIGGER state_changed AFTER INSERT OR UPDATE ON app_state
FOR EACH ROW EXECUTE FUNCTION notify_state();

LISTEN state_changed;                                          -- subscribe
INSERT INTO app_state VALUES ('count', '1') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`,
      },
      python: {
        code: `from typing import Callable, Generic, TypeVar
from dataclasses import replace

State = TypeVar("State")
Listener = Callable[[State, State], None]

class Store(Generic[State]):
    def __init__(self, initial: State) -> None:
        self._state = initial
        self._listeners: list[Listener] = []

    def get_state(self) -> State:
        return self._state

    def set_state(self, **changes) -> None:
        previous = self._state
        self._state = replace(previous, **changes)        # works with frozen dataclasses: a NEW object
        for listener in list(self._listeners):            # copy: a listener may unsubscribe itself
            listener(self._state, previous)

    def subscribe(self, listener: Listener) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)   # unsubscribe`,
      },
      typescript: {
        code: `type Listener<State> = (state: State, previous: State) => void;

export function createStore<State>(initial: State) {
  let state = initial;
  const listeners = new Set<Listener<State>>();

  return {
    getState: () => state,

    setState(update: Partial<State> | ((current: State) => Partial<State>)) {
      const previous = state;
      const patch = typeof update === "function" ? update(state) : update;
      state = { ...state, ...patch };          // new object, never mutate
      listeners.forEach((listener) => listener(state, previous));
    },

    subscribe(listener: Listener<State>) {
      listeners.add(listener);
      return () => listeners.delete(listener); // unsubscribe
    },

    select<Selected>(selector: (state: State) => Selected, onChange: (value: Selected) => void) {
      return this.subscribe((next, previous) => {
        const value = selector(next);
        if (!Object.is(value, selector(previous))) onChange(value);
      });
    },
  };
}

const counter = createStore({ count: 0 });
counter.select((s) => s.count, (count) => console.log("count", count));
counter.setState((s) => ({ count: s.count + 1 }));`,
      },
      spark: {
        code: `# Structured Streaming keeps state per key across micro-batches and emits updates to a sink.
from pyspark.sql import functions as F

counts = (stream
    .groupBy("user_id").count())                      # state: one running count per user

query = (counts.writeStream
    .outputMode("update")                              # emit only rows whose state changed
    .foreachBatch(lambda batch, batch_id: print(batch_id, batch.collect()))   # the subscriber
    .option("checkpointLocation", "/tmp/state")        # state survives restarts
    .start())`,
        note: 'The store is the aggregation state; the sink is the subscriber.',
      },
      rust: {
        code: `use std::sync::{Arc, Mutex};

type Listener<S> = Box<dyn Fn(&S, &S) + Send + Sync>;

struct Store<S: Clone> {
    state: Mutex<S>,
    listeners: Mutex<Vec<(usize, Listener<S>)>>,
    next_id: Mutex<usize>,
}

impl<S: Clone> Store<S> {
    fn new(initial: S) -> Arc<Self> {
        Arc::new(Store { state: Mutex::new(initial), listeners: Mutex::new(Vec::new()), next_id: Mutex::new(0) })
    }

    fn state(&self) -> S { self.state.lock().unwrap().clone() }

    fn update(&self, change: impl FnOnce(&S) -> S) {
        let (previous, next) = {
            let mut guard = self.state.lock().unwrap();
            let previous = guard.clone();
            *guard = change(&previous);                       // replace, do not mutate in place
            (previous, guard.clone())
        };                                                    // lock released before calling listeners
        for (_, listener) in self.listeners.lock().unwrap().iter() { listener(&next, &previous); }
    }

    fn subscribe(&self, listener: Listener<S>) -> usize {
        let mut next_id = self.next_id.lock().unwrap();
        *next_id += 1;
        self.listeners.lock().unwrap().push((*next_id, listener));
        *next_id                                              // pass to unsubscribe
    }

    fn unsubscribe(&self, id: usize) { self.listeners.lock().unwrap().retain(|(existing, _)| *existing != id); }
}`,
      },
      cpp: {
        code: `#include <functional>
#include <iostream>
#include <map>
#include <mutex>

template <typename State>
class Store {
public:
    using Listener = std::function<void(const State& next, const State& previous)>;

    explicit Store(State initial) : state_(std::move(initial)) {}

    State state() const { std::lock_guard lock(mutex_); return state_; }

    void update(const std::function<State(const State&)>& change) {
        State previous, next;
        std::map<int, Listener> snapshot;
        {
            std::lock_guard lock(mutex_);
            previous = state_;
            state_ = change(previous);                    // replace with a new value
            next = state_;
            snapshot = listeners_;                         // notify outside the lock
        }
        for (auto& [id, listener] : snapshot) listener(next, previous);
    }

    int subscribe(Listener listener) {
        std::lock_guard lock(mutex_);
        listeners_[++next_id_] = std::move(listener);
        return next_id_;
    }
    void unsubscribe(int id) { std::lock_guard lock(mutex_); listeners_.erase(id); }

private:
    mutable std::mutex mutex_;
    State state_;
    std::map<int, Listener> listeners_;
    int next_id_ = 0;
};

int main() {
    Store<int> counter(0);
    counter.subscribe([](int next, int previous) { std::cout << previous << " -> " << next << "\\n"; });
    counter.update([](int current) { return current + 1; });
}`,
      },
      go: {
        code: `type Listener[State any] func(next, previous State)

type Store[State any] struct {
    mu        sync.RWMutex
    state     State
    listeners map[int]Listener[State]
    nextID    int
}

func NewStore[State any](initial State) *Store[State] {
    return &Store[State]{state: initial, listeners: map[int]Listener[State]{}}
}

func (s *Store[State]) State() State {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.state
}

func (s *Store[State]) Update(change func(State) State) {
    s.mu.Lock()
    previous := s.state
    s.state = change(previous)               // State is a value: replaced, never edited in place
    next := s.state
    listeners := make([]Listener[State], 0, len(s.listeners))
    for _, l := range s.listeners {
        listeners = append(listeners, l)
    }
    s.mu.Unlock()                            // notify outside the lock
    for _, listener := range listeners {
        listener(next, previous)
    }
}

func (s *Store[State]) Subscribe(l Listener[State]) (unsubscribe func()) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.nextID++
    id := s.nextID
    s.listeners[id] = l
    return func() { s.mu.Lock(); delete(s.listeners, id); s.mu.Unlock() }
}`,
      },
      swift: {
        code: `final class Store<State> {
    typealias Listener = (_ next: State, _ previous: State) -> Void

    private(set) var state: State
    private var listeners: [UUID: Listener] = [:]

    init(_ initial: State) { state = initial }

    func update(_ change: (State) -> State) {
        let previous = state
        state = change(previous)                         // State is usually a struct: value semantics
        for listener in listeners.values { listener(state, previous) }
    }

    @discardableResult
    func subscribe(_ listener: @escaping Listener) -> () -> Void {
        let id = UUID()
        listeners[id] = listener
        return { [weak self] in self?.listeners[id] = nil }   // unsubscribe; weak avoids a retain cycle
    }
}

struct Counter { var count = 0 }
let store = Store(Counter())
let unsubscribe = store.subscribe { next, previous in print(previous.count, "->", next.count) }
store.update { Counter(count: $0.count + 1) }
unsubscribe()
// Not thread-safe: wrap in an actor or add a lock for concurrent use.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class Store<State>(initial: State) {
    private val flow = MutableStateFlow(initial)
    val state: StateFlow<State> get() = flow

    fun update(change: (State) -> State) {
        flow.value = change(flow.value)       // atomic enough for one writer
    }
}

// Hand-rolled version, without coroutines:
class SimpleStore<State>(initial: State) {
    private var current = initial
    private val listeners = LinkedHashSet<(State, State) -> Unit>()

    fun get() = current
    fun update(change: (State) -> State) {
        val previous = current
        current = change(previous)             // data classes: use copy()
        listeners.toList().forEach { it(current, previous) }
    }
    fun subscribe(listener: (State, State) -> Unit): () -> Unit {
        listeners += listener
        return { listeners -= listener }
    }
}

data class Counter(val count: Int = 0)
val store = SimpleStore(Counter())
val unsubscribe = store.subscribe { next, previous -> println("\${previous.count} -> \${next.count}") }
store.update { it.copy(count = it.count + 1) }`,
      },
    },
    takeaway:
      'A store is a value, a set of listeners, and an immutable update rule. Notify outside any lock, copy the listener set before iterating, and always return an unsubscribe so subscribers can clean up.',
  },
  {
    id: 'worker-pool-scratch',
    part: 'scratch',
    navLabel: 'Worker pool',
    title: 'A thread-safe worker pool',
    summary:
      'A fixed number of workers pull jobs from a shared queue. Closing the queue tells idle workers to exit, and shutdown waits for in-flight jobs to finish. Built from the standard library only.',
    snippets: {
      sql: {
        code: `-- A pool of workers on a table queue: each worker claims one job without blocking the others.
CREATE TABLE jobs (id bigserial PRIMARY KEY, payload jsonb, status text DEFAULT 'pending');

-- Run this in each worker session in a loop:
WITH next AS (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
)
UPDATE jobs SET status = 'running' FROM next WHERE jobs.id = next.id RETURNING jobs.*;

-- Mark done: UPDATE jobs SET status = 'done' WHERE id = $1;`,
        note: 'Workers are separate sessions; SKIP LOCKED is the queue discipline.',
      },
      python: {
        code: `import queue
import threading
from typing import Callable

Job = Callable[[], None]

class WorkerPool:
    def __init__(self, size: int) -> None:
        if size <= 0:
            raise ValueError("pool needs at least one worker")
        self._jobs: "queue.Queue[Job | None]" = queue.Queue()
        self._workers = [threading.Thread(target=self._run) for _ in range(size)]
        for worker in self._workers:
            worker.start()

    def _run(self) -> None:
        while (job := self._jobs.get()) is not None:      # None means "shut down"
            try:
                job()
            except Exception as error:                      # one failing job must not kill the worker
                print("job failed:", error)

    def submit(self, job: Job) -> None:
        self._jobs.put(job)

    def shutdown(self) -> None:
        for _ in self._workers:
            self._jobs.put(None)                            # one sentinel per worker
        for worker in self._workers:
            worker.join()

pool = WorkerPool(4)
for n in range(8): pool.submit(lambda n=n: print(n * n))
pool.shutdown()`,
      },
      typescript: {
        code: `import { Worker } from "node:worker_threads";
import { EventEmitter } from "node:events";

type Job = { id: number; payload: unknown };

// Workers are threads with separate heaps; jobs and results are copied through messages.
class WorkerPool extends EventEmitter {
  private idle: Worker[] = [];
  private queue: Job[] = [];

  constructor(private script: string, size: number) {
    super();
    for (let i = 0; i < size; i++) this.idle.push(this.spawn());
  }

  private spawn(): Worker {
    const worker = new Worker(this.script);
    worker.on("message", (result) => {
      this.emit("result", result);
      this.idle.push(worker);
      this.next();                            // pull the next queued job
    });
    return worker;
  }

  submit(job: Job) { this.queue.push(job); this.next(); }

  private next() {
    const worker = this.idle.pop();
    const job = this.queue.shift();
    if (worker && job) worker.postMessage(job);
    else if (worker) this.idle.push(worker);  // nothing to do yet
    else if (job) this.queue.unshift(job);    // no free worker: put it back
  }

  async close() { await Promise.all([...this.idle].map((w) => w.terminate())); }
}
// For I/O-bound work you do not need threads: a mapLimit over promises is enough (see Concurrency).`,
      },
      spark: {
        code: `# The cluster IS the worker pool. Executors are workers, tasks are jobs, partitions are the queue.
spark = (SparkSession.builder
    .config("spark.executor.instances", "4")
    .config("spark.executor.cores", "2")           # 8 task slots in total
    .config("spark.task.maxFailures", "4")         # a failing job is retried, as a pool would
    .getOrCreate())

results = (spark.sparkContext
    .parallelize(range(100), numSlices=16)         # 16 jobs queued for 8 slots
    .map(lambda n: n * n)
    .collect())`,
      },
      rust: {
        code: `use std::sync::{mpsc, Arc, Mutex};
use std::thread::{self, JoinHandle};

type Job = Box<dyn FnOnce() + Send + 'static>;

pub struct WorkerPool {
    workers: Vec<JoinHandle<()>>,
    sender: Option<mpsc::Sender<Job>>,
}

impl WorkerPool {
    pub fn new(size: usize) -> Self {
        assert!(size > 0, "pool needs at least one worker");
        let (sender, receiver) = mpsc::channel::<Job>();
        let receiver = Arc::new(Mutex::new(receiver));

        let workers = (0..size)
            .map(|_| {
                let receiver = Arc::clone(&receiver);
                thread::spawn(move || loop {
                    // Hold the lock only while receiving, not while running the job.
                    let job = receiver.lock().unwrap().recv();
                    match job {
                        Ok(job) => job(),
                        Err(_) => break, // channel closed: shut down
                    }
                })
            })
            .collect();

        WorkerPool { workers, sender: Some(sender) }
    }

    pub fn execute<F: FnOnce() + Send + 'static>(&self, job: F) {
        self.sender.as_ref().unwrap().send(Box::new(job)).unwrap();
    }
}

impl Drop for WorkerPool {
    fn drop(&mut self) {
        drop(self.sender.take()); // close the channel
        for worker in self.workers.drain(..) {
            worker.join().unwrap();
        }
    }
}`,
      },
      cpp: {
        code: `#include <condition_variable>
#include <functional>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

class WorkerPool {
public:
    explicit WorkerPool(std::size_t size) {
        for (std::size_t i = 0; i < size; ++i)
            workers_.emplace_back([this] { run(); });
    }

    void submit(std::function<void()> job) {
        { std::lock_guard lock(mutex_); jobs_.push(std::move(job)); }
        ready_.notify_one();
    }

    ~WorkerPool() {
        { std::lock_guard lock(mutex_); stopping_ = true; }
        ready_.notify_all();
        for (auto& worker : workers_) worker.join();          // drain, then exit
    }

private:
    void run() {
        for (;;) {
            std::function<void()> job;
            {
                std::unique_lock lock(mutex_);
                ready_.wait(lock, [this] { return stopping_ || !jobs_.empty(); });
                if (jobs_.empty()) return;                    // stopping and nothing left
                job = std::move(jobs_.front());
                jobs_.pop();
            }                                                  // run the job outside the lock
            job();
        }
    }

    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> jobs_;
    std::mutex mutex_;
    std::condition_variable ready_;
    bool stopping_ = false;
};`,
      },
      go: {
        code: `type Job func()

type WorkerPool struct {
    jobs  chan Job
    group sync.WaitGroup
}

func NewWorkerPool(size int) *WorkerPool {
    pool := &WorkerPool{jobs: make(chan Job)}
    for i := 0; i < size; i++ {
        pool.group.Add(1)
        go func() {
            defer pool.group.Done()
            for job := range pool.jobs { // exits when the channel is closed and drained
                job()
            }
        }()
    }
    return pool
}

func (pool *WorkerPool) Submit(job Job) { pool.jobs <- job }

func (pool *WorkerPool) Shutdown() {
    close(pool.jobs)   // no more jobs
    pool.group.Wait()  // wait for in-flight work
}

func main() {
    pool := NewWorkerPool(4)
    for n := 0; n < 8; n++ {
        pool.Submit(func() { fmt.Println(n * n) })
    }
    pool.Shutdown()
}`,
      },
      swift: {
        code: `// A bounded pool of tasks: a task group that keeps at most 'size' jobs running.
func runPool(size: Int, jobs: [@Sendable () async -> Void]) async {
    await withTaskGroup(of: Void.self) { group in
        var iterator = jobs.makeIterator()
        for _ in 0..<size {                              // seed 'size' workers
            guard let job = iterator.next() else { break }
            group.addTask { await job() }
        }
        for await _ in group {                           // as one finishes, start the next
            if let job = iterator.next() { group.addTask { await job() } }
        }
    }                                                    // returns when every job is done
}

await runPool(size: 4, jobs: (0..<8).map { n in { print(n * n) } })

// Thread-based alternative: OperationQueue with maxConcurrentOperationCount = 4.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel

class WorkerPool(scope: CoroutineScope, size: Int) {
    private val jobs = Channel<suspend () -> Unit>(Channel.UNLIMITED)
    private val workers = List(size) {
        scope.launch(Dispatchers.Default) {
            for (job in jobs) {                      // ends when the channel is closed and drained
                try { job() } catch (e: Exception) { println("job failed: $e") }
            }
        }
    }

    fun submit(job: suspend () -> Unit) { jobs.trySend(job) }

    suspend fun shutdown() {
        jobs.close()                                  // no more jobs
        workers.joinAll()                             // wait for in-flight work
    }
}

fun main() = runBlocking {
    val pool = WorkerPool(this, 4)
    repeat(8) { n -> pool.submit { println(n * n) } }
    pool.shutdown()
}`,
      },
    },
    takeaway:
      'The three moving parts are a queue, N workers that loop on it, and a shutdown signal (close the channel or send one sentinel per worker). Run jobs outside any lock, and keep one failing job from killing a worker.',
  },
  {
    id: 'lru-cache',
    part: 'scratch',
    navLabel: 'LRU cache',
    title: 'An LRU cache',
    summary:
      'A least-recently-used cache holds a fixed number of entries and evicts the one untouched the longest. A hash map plus a doubly linked list gives O(1) get and put; most languages offer a shortcut that preserves access order.',
    snippets: {
      sql: {
        code: `-- Cache table with a last-used timestamp; evict the oldest rows beyond a size limit.
CREATE TABLE cache (key text PRIMARY KEY, value jsonb NOT NULL, last_used timestamptz NOT NULL DEFAULT now());

-- get: read and touch
UPDATE cache SET last_used = now() WHERE key = 'a' RETURNING value;

-- put: upsert, then evict beyond 100 entries
INSERT INTO cache (key, value) VALUES ('a', '1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, last_used = now();

DELETE FROM cache WHERE key IN (
  SELECT key FROM cache ORDER BY last_used DESC OFFSET 100
);`,
        note: 'O(log n) with an index on last_used; PostgreSQL itself uses a clock-sweep buffer cache internally.',
      },
      python: {
        code: `from collections import OrderedDict
from functools import lru_cache
from typing import Generic, Hashable, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")

class LRUCache(Generic[K, V]):
    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._capacity = capacity
        self._items: "OrderedDict[K, V]" = OrderedDict()   # hash map + doubly linked list in one

    def get(self, key: K) -> V | None:
        if key not in self._items:
            return None
        self._items.move_to_end(key)                         # mark as most recently used: O(1)
        return self._items[key]

    def put(self, key: K, value: V) -> None:
        self._items[key] = value
        self._items.move_to_end(key)
        if len(self._items) > self._capacity:
            self._items.popitem(last=False)                  # evict the least recently used

# Function results: @lru_cache(maxsize=128) memoises with the same policy.`,
      },
      typescript: {
        code: `class LRUCache<K, V> {
  // A Map iterates in insertion order, so the first key is always the least recently used.
  private items = new Map<K, V>();
  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new RangeError("capacity must be positive");
  }

  get(key: K): V | undefined {
    if (!this.items.has(key)) return undefined;
    const value = this.items.get(key)!;
    this.items.delete(key);              // re-insert to move it to the "most recent" end
    this.items.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    this.items.delete(key);
    this.items.set(key, value);
    if (this.items.size > this.capacity) {
      const oldest = this.items.keys().next().value as K;
      this.items.delete(oldest);         // evict the least recently used
    }
  }
}`,
      },
      spark: {
        code: `# Spark's block manager evicts cached partitions with an LRU policy when memory is tight.
frame = spark.read.parquet("events")
frame.persist()                      # MEMORY_AND_DISK: evicted partitions spill to disk, then recompute
frame.count()                        # materialises the cache
print(spark.sparkContext._jsc.sc().getRDDStorageInfo())   # what is cached and how much

# In-process caches for driver-side lookups: functools.lru_cache, or a broadcast variable for read-only data.`,
        note: 'The cluster-level cache is managed for you; implement an LRU only for driver-side lookups.',
      },
      rust: {
        code: `use std::collections::{HashMap, VecDeque};
use std::hash::Hash;

pub struct LruCache<K: Eq + Hash + Clone, V> {
    capacity: usize,
    items: HashMap<K, V>,
    order: VecDeque<K>,              // front = least recently used
}

impl<K: Eq + Hash + Clone, V> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "capacity must be positive");
        LruCache { capacity, items: HashMap::new(), order: VecDeque::new() }
    }

    fn touch(&mut self, key: &K) {
        if let Some(position) = self.order.iter().position(|existing| existing == key) {
            self.order.remove(position);          // O(n): a production cache uses an index-based linked list
        }
        self.order.push_back(key.clone());
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        if !self.items.contains_key(key) { return None; }
        self.touch(key);
        self.items.get(key)
    }

    pub fn put(&mut self, key: K, value: V) {
        self.touch(&key);
        self.items.insert(key, value);
        if self.items.len() > self.capacity {
            if let Some(oldest) = self.order.pop_front() { self.items.remove(&oldest); }
        }
    }
}
// The 'lru' crate gives O(1) operations. A true O(1) list needs indices into a Vec (or unsafe) because of ownership.`,
        note: 'This version is O(n) for touch to stay in safe Rust; the borrow checker makes a pointer-based linked list awkward.',
      },
      cpp: {
        code: `#include <list>
#include <optional>
#include <unordered_map>

template <typename K, typename V>
class LruCache {
public:
    explicit LruCache(std::size_t capacity) : capacity_(capacity) {}

    std::optional<V> get(const K& key) {
        auto it = index_.find(key);
        if (it == index_.end()) return std::nullopt;
        order_.splice(order_.begin(), order_, it->second);      // move node to the front: O(1), no copy
        return it->second->second;
    }

    void put(const K& key, V value) {
        if (auto it = index_.find(key); it != index_.end()) {
            it->second->second = std::move(value);
            order_.splice(order_.begin(), order_, it->second);
            return;
        }
        order_.emplace_front(key, std::move(value));
        index_[key] = order_.begin();
        if (index_.size() > capacity_) {
            index_.erase(order_.back().first);                   // evict from the back
            order_.pop_back();
        }
    }

private:
    std::size_t capacity_;
    std::list<std::pair<K, V>> order_;                           // front = most recently used
    std::unordered_map<K, typename std::list<std::pair<K, V>>::iterator> index_;
};`,
      },
      go: {
        code: `import "container/list"

type entry[K comparable, V any] struct {
    key   K
    value V
}

type LRUCache[K comparable, V any] struct {
    capacity int
    order    *list.List // front = most recently used
    index    map[K]*list.Element
}

func NewLRUCache[K comparable, V any](capacity int) *LRUCache[K, V] {
    return &LRUCache[K, V]{capacity: capacity, order: list.New(), index: map[K]*list.Element{}}
}

func (c *LRUCache[K, V]) Get(key K) (V, bool) {
    element, ok := c.index[key]
    if !ok {
        var zero V
        return zero, false
    }
    c.order.MoveToFront(element)
    return element.Value.(*entry[K, V]).value, true
}

func (c *LRUCache[K, V]) Put(key K, value V) {
    if element, ok := c.index[key]; ok {
        element.Value.(*entry[K, V]).value = value
        c.order.MoveToFront(element)
        return
    }
    c.index[key] = c.order.PushFront(&entry[K, V]{key, value})
    if c.order.Len() > c.capacity {
        oldest := c.order.Back()
        c.order.Remove(oldest)
        delete(c.index, oldest.Value.(*entry[K, V]).key)
    }
}
// Not safe for concurrent use: add a sync.Mutex.`,
      },
      swift: {
        code: `final class LRUCache<Key: Hashable, Value> {
    private final class Node {
        let key: Key
        var value: Value
        var previous: Node?
        weak var next: Node?          // weak breaks the retain cycle in the doubly linked list
        init(key: Key, value: Value) { self.key = key; self.value = value }
    }

    private let capacity: Int
    private var index: [Key: Node] = [:]
    private var head: Node?           // most recently used
    private weak var tail: Node?      // least recently used

    init(capacity: Int) { precondition(capacity > 0); self.capacity = capacity }

    func get(_ key: Key) -> Value? {
        guard let node = index[key] else { return nil }
        moveToFront(node)
        return node.value
    }

    func put(_ key: Key, _ value: Value) {
        if let node = index[key] { node.value = value; moveToFront(node); return }
        let node = Node(key: key, value: value)
        index[key] = node
        pushFront(node)
        if index.count > capacity, let oldest = tail {
            remove(oldest)
            index[oldest.key] = nil
        }
    }

    private func pushFront(_ node: Node) {
        node.next = head
        head?.previous = node
        head = node
        if tail == nil { tail = node }
    }

    private func remove(_ node: Node) {
        node.previous?.next = node.next
        node.next?.previous = node.previous
        if head === node { head = node.next }
        if tail === node { tail = node.previous }
        node.previous = nil
        node.next = nil
    }

    private func moveToFront(_ node: Node) { remove(node); pushFront(node) }
}`,
        note: 'The index dictionary owns every node; the forward link (next) is weak so the two-way links do not form a retain cycle.',
      },
      kotlin: {
        code: `class LruCache<K, V>(private val capacity: Int) {
    init { require(capacity > 0) { "capacity must be positive" } }

    // LinkedHashMap with accessOrder = true moves an entry to the end on every get/put.
    private val items = object : LinkedHashMap<K, V>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<K, V>): Boolean =
            size > capacity                                  // evict the least recently used
    }

    @Synchronized fun get(key: K): V? = items[key]
    @Synchronized fun put(key: K, value: V) { items[key] = value }
}

fun main() {
    val cache = LruCache<String, Int>(2)
    cache.put("a", 1); cache.put("b", 2)
    cache.get("a")              // "a" becomes most recent
    cache.put("c", 3)           // evicts "b"
    println(cache.get("b"))     // null
}`,
      },
    },
    takeaway:
      'O(1) LRU needs a hash map for lookup and a linked list for recency order. Some languages bundle the two (Python OrderedDict, Java LinkedHashMap); in Rust, ownership makes the pointer-based list the hard part.',
  },
  {
    id: 'event-emitter',
    part: 'scratch',
    navLabel: 'Event emitter',
    title: 'An event emitter',
    summary:
      'Publish-subscribe in one object: handlers register for a named event, emit calls each one with the payload, and registering returns a way to remove the handler. Decide how errors in a handler and removal during emit are handled.',
    snippets: {
      sql: {
        code: `-- Built in: LISTEN / NOTIFY is a publish-subscribe channel.
LISTEN order_created;                                     -- subscribe (per session)
NOTIFY order_created, '{"id": 42}';                       -- emit
SELECT pg_notify('order_created', '{"id": 43}');          -- emit from a function or trigger

UNLISTEN order_created;                                   -- unsubscribe
-- Payloads are limited to about 8000 bytes; send ids and let the listener fetch the rest.
-- Notifications are delivered at commit time and are not stored for sessions that were not listening.`,
      },
      python: {
        code: `from collections import defaultdict
from typing import Any, Callable

Handler = Callable[..., None]

class EventEmitter:
    def __init__(self) -> None:
        self._handlers: dict[str, list[Handler]] = defaultdict(list)

    def on(self, event: str, handler: Handler) -> Callable[[], None]:
        self._handlers[event].append(handler)
        return lambda: self._handlers[event].remove(handler)    # off()

    def emit(self, event: str, *args: Any) -> int:
        handlers = list(self._handlers.get(event, []))           # copy: a handler may remove itself
        for handler in handlers:
            try:
                handler(*args)
            except Exception as error:                            # one bad handler must not stop the rest
                print(f"handler for {event!r} failed: {error}")
        return len(handlers)

emitter = EventEmitter()
off = emitter.on("order", lambda order_id: print("order", order_id))
emitter.emit("order", 42)
off()`,
      },
      typescript: {
        code: `type Handler<Payload> = (payload: Payload) => void;

class Emitter<Events extends Record<string, unknown>> {
  private handlers: { [E in keyof Events]?: Set<Handler<Events[E]>> } = {};

  on<E extends keyof Events>(event: E, handler: Handler<Events[E]>): () => void {
    (this.handlers[event] ??= new Set()).add(handler);
    return () => this.handlers[event]?.delete(handler);
  }

  once<E extends keyof Events>(event: E, handler: Handler<Events[E]>): () => void {
    const off = this.on(event, (payload) => { off(); handler(payload); });
    return off;
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    for (const handler of [...(this.handlers[event] ?? [])]) {   // iterate a copy
      try { handler(payload); } catch (error) { console.error(\`handler for \${String(event)} failed\`, error); }
    }
  }
}

const bus = new Emitter<{ order: { id: number }; closed: void }>();   // event names and payloads are typed
bus.on("order", ({ id }) => console.log("order", id));
bus.emit("order", { id: 42 });`,
      },
      spark: {
        code: `# Spark emits events through listeners on the query and the application.
from pyspark.sql.streaming import StreamingQueryListener

class Reporter(StreamingQueryListener):
    def onQueryStarted(self, event): print("started", event.name)
    def onQueryProgress(self, event): print("rows/s", event.progress.processedRowsPerSecond)
    def onQueryTerminated(self, event): print("terminated", event.id)

spark.streams.addListener(Reporter())      # subscribe; spark.streams.removeListener(...) to unsubscribe`,
        note: 'Spark ships its own listener hooks rather than a general emitter.',
      },
      rust: {
        code: `use std::collections::HashMap;

type Handler<P> = Box<dyn FnMut(&P)>;

struct Emitter<P> {
    handlers: HashMap<String, Vec<(usize, Handler<P>)>>,
    next_id: usize,
}

impl<P> Emitter<P> {
    fn new() -> Self { Emitter { handlers: HashMap::new(), next_id: 0 } }

    fn on(&mut self, event: &str, handler: impl FnMut(&P) + 'static) -> usize {
        self.next_id += 1;
        self.handlers.entry(event.to_string()).or_default().push((self.next_id, Box::new(handler)));
        self.next_id                                   // handle for off()
    }

    fn off(&mut self, event: &str, id: usize) {
        if let Some(list) = self.handlers.get_mut(event) { list.retain(|(existing, _)| *existing != id); }
    }

    fn emit(&mut self, event: &str, payload: &P) -> usize {
        match self.handlers.get_mut(event) {
            Some(list) => { for (_, handler) in list.iter_mut() { handler(payload); } list.len() }
            None => 0,
        }
    }
}
// &mut self on emit means a handler cannot re-enter the emitter; the borrow checker forbids it.
// For cross-thread use, prefer a channel per subscriber (std::sync::mpsc or tokio::sync::broadcast).`,
        note: 'The borrow checker rules out the re-entrancy bugs that dynamic languages must guard against by hand.',
      },
      cpp: {
        code: `#include <functional>
#include <iostream>
#include <map>
#include <string>
#include <vector>

template <typename Payload>
class Emitter {
public:
    using Handler = std::function<void(const Payload&)>;

    int on(const std::string& event, Handler handler) {
        handlers_[event].emplace_back(++next_id_, std::move(handler));
        return next_id_;                                   // handle for off()
    }

    void off(const std::string& event, int id) {
        auto& list = handlers_[event];
        std::erase_if(list, [id](const auto& entry) { return entry.first == id; });   // C++20
    }

    std::size_t emit(const std::string& event, const Payload& payload) {
        auto it = handlers_.find(event);
        if (it == handlers_.end()) return 0;
        auto snapshot = it->second;                         // copy: a handler may call off()
        for (auto& [id, handler] : snapshot) {
            try { handler(payload); }
            catch (const std::exception& error) { std::cerr << "handler failed: " << error.what() << "\\n"; }
        }
        return snapshot.size();
    }

private:
    std::map<std::string, std::vector<std::pair<int, Handler>>> handlers_;
    int next_id_ = 0;
};

int main() {
    Emitter<int> bus;
    int id = bus.on("order", [](const int& order_id) { std::cout << "order " << order_id << "\\n"; });
    bus.emit("order", 42);
    bus.off("order", id);
}`,
      },
      go: {
        code: `type Handler[P any] func(payload P)

type Emitter[P any] struct {
    mu       sync.RWMutex
    handlers map[string]map[int]Handler[P]
    nextID   int
}

func NewEmitter[P any]() *Emitter[P] {
    return &Emitter[P]{handlers: map[string]map[int]Handler[P]{}}
}

func (e *Emitter[P]) On(event string, handler Handler[P]) (off func()) {
    e.mu.Lock()
    defer e.mu.Unlock()
    e.nextID++
    id := e.nextID
    if e.handlers[event] == nil {
        e.handlers[event] = map[int]Handler[P]{}
    }
    e.handlers[event][id] = handler
    return func() { e.mu.Lock(); delete(e.handlers[event], id); e.mu.Unlock() }
}

func (e *Emitter[P]) Emit(event string, payload P) int {
    e.mu.RLock()
    snapshot := make([]Handler[P], 0, len(e.handlers[event]))
    for _, handler := range e.handlers[event] {
        snapshot = append(snapshot, handler)
    }
    e.mu.RUnlock()                    // call handlers without holding the lock
    for _, handler := range snapshot {
        handler(payload)
    }
    return len(snapshot)
}
// Idiomatic Go often uses a channel per subscriber instead: ch := make(chan P, 16).`,
      },
      swift: {
        code: `import Foundation

final class Emitter<Payload> {
    typealias Handler = (Payload) -> Void
    private var handlers: [String: [UUID: Handler]] = [:]

    @discardableResult
    func on(_ event: String, _ handler: @escaping Handler) -> () -> Void {
        let id = UUID()
        handlers[event, default: [:]][id] = handler
        return { [weak self] in self?.handlers[event]?[id] = nil }       // off()
    }

    @discardableResult
    func emit(_ event: String, _ payload: Payload) -> Int {
        let snapshot = Array(handlers[event, default: [:]].values)        // copy before calling
        snapshot.forEach { $0(payload) }
        return snapshot.count
    }
}

let bus = Emitter<Int>()
let off = bus.on("order") { print("order", $0) }
bus.emit("order", 42)
off()
// In modern Swift, an AsyncStream per subscriber, or Combine's PassthroughSubject, plays this role.`,
      },
      kotlin: {
        code: `class Emitter<P> {
    private val handlers = mutableMapOf<String, MutableMap<Int, (P) -> Unit>>()
    private var nextId = 0

    @Synchronized
    fun on(event: String, handler: (P) -> Unit): () -> Unit {
        val id = ++nextId
        handlers.getOrPut(event) { mutableMapOf() }[id] = handler
        return { synchronized(this) { handlers[event]?.remove(id) } }       // off()
    }

    fun emit(event: String, payload: P): Int {
        val snapshot = synchronized(this) { handlers[event]?.values?.toList() ?: emptyList() }
        snapshot.forEach { handler ->
            runCatching { handler(payload) }.onFailure { println("handler for $event failed: $it") }
        }
        return snapshot.size
    }
}

fun main() {
    val bus = Emitter<Int>()
    val off = bus.on("order") { println("order $it") }
    bus.emit("order", 42)
    off()
}
// kotlinx.coroutines SharedFlow is the coroutine-native equivalent: MutableSharedFlow<P>().`,
      },
    },
    takeaway:
      'An emitter is a map from event names to handlers. Iterate over a copy while emitting, isolate handler errors, and return an off() function. Typed payloads (TypeScript generics, Rust and Go generics) catch mismatched events at compile time.',
  },
  {
    id: 'rate-limiter',
    part: 'scratch',
    navLabel: 'Token-bucket rate limiter',
    title: 'A token-bucket rate limiter',
    summary:
      'A bucket holds up to a fixed number of tokens and refills at a steady rate. Each request takes a token or is rejected. It allows short bursts while enforcing a long-run average. Compute the refill from elapsed time rather than running a timer.',
    snippets: {
      sql: {
        code: `-- Token bucket in one atomic statement: refill by elapsed time, then try to take a token.
CREATE TABLE buckets (
  key text PRIMARY KEY, tokens double precision NOT NULL, refilled_at timestamptz NOT NULL
);

WITH refilled AS (
  UPDATE buckets
  SET tokens = least(10, tokens + extract(epoch FROM now() - refilled_at) * 5),   -- capacity 10, 5 tokens/second
      refilled_at = now()
  WHERE key = 'user:42'
  RETURNING tokens
)
UPDATE buckets SET tokens = tokens - 1
WHERE key = 'user:42' AND (SELECT tokens FROM refilled) >= 1
RETURNING true AS allowed;           -- no row returned means the request is rejected`,
        note: 'The statements run in one transaction; the row lock serialises concurrent requests for the same key.',
      },
      python: {
        code: `import threading
import time

class TokenBucket:
    def __init__(self, capacity: float, refill_per_second: float) -> None:
        if capacity <= 0 or refill_per_second <= 0:
            raise ValueError("capacity and rate must be positive")
        self._capacity = capacity
        self._rate = refill_per_second
        self._tokens = capacity
        self._updated = time.monotonic()      # monotonic: unaffected by wall-clock changes
        self._lock = threading.Lock()

    def allow(self, cost: float = 1.0) -> bool:
        with self._lock:
            now = time.monotonic()
            self._tokens = min(self._capacity, self._tokens + (now - self._updated) * self._rate)
            self._updated = now
            if self._tokens >= cost:
                self._tokens -= cost
                return True
            return False

bucket = TokenBucket(capacity=10, refill_per_second=5)
print([bucket.allow() for _ in range(12)])    # first 10 True (burst), then False`,
      },
      typescript: {
        code: `class TokenBucket {
  private tokens: number;
  private updated: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = () => performance.now(),   // injectable clock for tests
  ) {
    if (capacity <= 0 || refillPerSecond <= 0) throw new RangeError("capacity and rate must be positive");
    this.tokens = capacity;
    this.updated = now();
  }

  allow(cost = 1): boolean {
    const current = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((current - this.updated) / 1000) * this.refillPerSecond);
    this.updated = current;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

const bucket = new TokenBucket(10, 5);
console.log(Array.from({ length: 12 }, () => bucket.allow()));     // 10 true, then false
// Single-threaded, so no lock is needed between synchronous statements.`,
      },
      spark: {
        code: `# Rate limiting a distributed job: cap the number of concurrent tasks and the rows per second.
spark = (SparkSession.builder
    .config("spark.executor.instances", "2")
    .config("spark.executor.cores", "2")           # at most 4 tasks hit the API at once
    .getOrCreate())

def call_api_limited(rows):
    import time
    min_interval = 1 / 5                            # 5 calls per second PER TASK
    last = 0.0
    for row in rows:
        wait = min_interval - (time.monotonic() - last)
        if wait > 0: time.sleep(wait)
        last = time.monotonic()
        yield call_api(row)                         # hypothetical external call

results = frame.rdd.mapPartitions(call_api_limited)
# Streaming sources also take maxOffsetsPerTrigger / maxFilesPerTrigger to cap batch size.`,
        note: 'Limits are per task, so the global rate is the per-task rate times the task slots.',
      },
      rust: {
        code: `use std::sync::Mutex;
use std::time::Instant;

pub struct TokenBucket {
    capacity: f64,
    refill_per_second: f64,
    state: Mutex<(f64, Instant)>,     // (tokens, last update) guarded together
}

impl TokenBucket {
    pub fn new(capacity: f64, refill_per_second: f64) -> Self {
        assert!(capacity > 0.0 && refill_per_second > 0.0, "capacity and rate must be positive");
        TokenBucket { capacity, refill_per_second, state: Mutex::new((capacity, Instant::now())) }
    }

    pub fn allow(&self, cost: f64) -> bool {
        let mut guard = self.state.lock().unwrap();
        let now = Instant::now();                            // monotonic clock
        let elapsed = now.duration_since(guard.1).as_secs_f64();
        guard.0 = (guard.0 + elapsed * self.refill_per_second).min(self.capacity);
        guard.1 = now;
        if guard.0 >= cost { guard.0 -= cost; true } else { false }
    }
}
// Share between threads with Arc<TokenBucket>; the Mutex makes allow(&self) safe to call concurrently.
// The 'governor' crate provides a production-grade implementation.`,
      },
      cpp: {
        code: `#include <algorithm>
#include <chrono>
#include <mutex>

class TokenBucket {
public:
    TokenBucket(double capacity, double refill_per_second)
        : capacity_(capacity), rate_(refill_per_second), tokens_(capacity), updated_(Clock::now()) {}

    bool allow(double cost = 1.0) {
        std::lock_guard lock(mutex_);
        auto now = Clock::now();
        std::chrono::duration<double> elapsed = now - updated_;
        tokens_ = std::min(capacity_, tokens_ + elapsed.count() * rate_);
        updated_ = now;
        if (tokens_ < cost) return false;
        tokens_ -= cost;
        return true;
    }

private:
    using Clock = std::chrono::steady_clock;      // monotonic
    double capacity_, rate_, tokens_;
    Clock::time_point updated_;
    std::mutex mutex_;
};`,
      },
      go: {
        code: `type TokenBucket struct {
    mu       sync.Mutex
    capacity float64
    rate     float64 // tokens per second
    tokens   float64
    updated  time.Time
}

func NewTokenBucket(capacity, ratePerSecond float64) *TokenBucket {
    return &TokenBucket{capacity: capacity, rate: ratePerSecond, tokens: capacity, updated: time.Now()}
}

func (b *TokenBucket) Allow(cost float64) bool {
    b.mu.Lock()
    defer b.mu.Unlock()
    now := time.Now() // includes a monotonic reading, so wall-clock jumps do not matter
    b.tokens = math.Min(b.capacity, b.tokens+now.Sub(b.updated).Seconds()*b.rate)
    b.updated = now
    if b.tokens < cost {
        return false
    }
    b.tokens -= cost
    return true
}
// golang.org/x/time/rate provides rate.Limiter (Allow, Wait, Reserve) for production use.`,
      },
      swift: {
        code: `import Foundation

actor TokenBucket {                       // an actor serialises access: no explicit lock
    private let capacity: Double
    private let refillPerSecond: Double
    private var tokens: Double
    private var updated: ContinuousClock.Instant
    private let clock = ContinuousClock()

    init(capacity: Double, refillPerSecond: Double) {
        precondition(capacity > 0 && refillPerSecond > 0)
        self.capacity = capacity
        self.refillPerSecond = refillPerSecond
        self.tokens = capacity
        self.updated = clock.now
    }

    func allow(cost: Double = 1) -> Bool {
        let now = clock.now
        let elapsed = now - updated
        let seconds = Double(elapsed.components.seconds) + Double(elapsed.components.attoseconds) / 1e18
        tokens = min(capacity, tokens + seconds * refillPerSecond)
        updated = now
        guard tokens >= cost else { return false }
        tokens -= cost
        return true
    }
}

let bucket = TokenBucket(capacity: 10, refillPerSecond: 5)
var results: [Bool] = []
for _ in 0..<12 { results.append(await bucket.allow()) }
print(results)`,
      },
      kotlin: {
        code: `class TokenBucket(
    private val capacity: Double,
    private val refillPerSecond: Double,
    private val nanoTime: () -> Long = System::nanoTime,       // injectable clock for tests
) {
    init { require(capacity > 0 && refillPerSecond > 0) { "capacity and rate must be positive" } }

    private var tokens = capacity
    private var updated = nanoTime()

    @Synchronized
    fun allow(cost: Double = 1.0): Boolean {
        val now = nanoTime()
        tokens = minOf(capacity, tokens + (now - updated) / 1e9 * refillPerSecond)
        updated = now
        if (tokens < cost) return false
        tokens -= cost
        return true
    }
}

fun main() {
    val bucket = TokenBucket(capacity = 10.0, refillPerSecond = 5.0)
    println(List(12) { bucket.allow() })       // 10 true, then false
}`,
      },
    },
    takeaway:
      'Refill lazily from elapsed monotonic time instead of running a timer thread, and protect the (tokens, timestamp) pair together. Inject the clock so tests do not sleep.',
  },
];
