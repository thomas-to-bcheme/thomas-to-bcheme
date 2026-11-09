import type { Concept } from './types';

export const ASYNC_CONCEPTS: Concept[] = [
  {
    id: 'event-loop',
    part: 'async',
    navLabel: 'Event loop & async/await',
    title: 'The event loop and async/await',
    summary:
      'One thread waits on many I/O operations through the operating system (epoll, kqueue) and resumes the task whose data is ready. await marks a point where a task hands control back to the loop. A CPU-heavy task inside the loop blocks everything else.',
    snippets: {
      sql: {
        code: `-- PostgreSQL does the waiting for you: LISTEN/NOTIFY delivers events to idle connections.
LISTEN order_created;                              -- this session now waits without polling
NOTIFY order_created, '{"id": 42}';                -- another session wakes every listener

-- The client library (asyncpg, node-postgres) surfaces the notification as an event
-- on its own event loop; the database connection itself blocks in a kernel wait.`,
        note: 'SQL has no event loop of its own; the nearest idea is server-side notification.',
      },
      python: {
        code: `import asyncio

async def fetch(label: str, delay: float) -> str:
    await asyncio.sleep(delay)          # suspends this task; the loop runs others meanwhile
    return label

async def main() -> None:
    first = await fetch("a", 1)         # sequential: takes 2 seconds in total
    second = await fetch("b", 1)
    print(first, second)

asyncio.run(main())                      # creates the event loop and runs main() to completion
# A blocking call such as time.sleep(1) or requests.get() inside a coroutine freezes the whole loop.`,
      },
      typescript: {
        code: `const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchLabel(label: string, ms: number): Promise<string> {
  await delay(ms);                       // yields to the event loop
  return label;
}

async function main() {
  const first = await fetchLabel("a", 1000);    // sequential: 2 seconds in total
  const second = await fetchLabel("b", 1000);
  console.log(first, second);
}
main();

// Node.js and browsers run one JavaScript thread per realm: a long synchronous loop
// (while (true) {}) blocks timers, I/O callbacks, and rendering until it ends.`,
      },
      spark: {
        code: `# Spark drives work with a scheduler, not an event loop in your code.
# Transformations are lazy; an action submits a job and the driver BLOCKS until it finishes.
total = orders.groupBy("customer_id").count().count()          # blocking action

# To keep the driver responsive, run actions from threads (Spark's scheduler is thread-safe)
# or use Structured Streaming, which runs a micro-batch loop for you:
query = (stream.writeStream.format("console").start())          # returns immediately
query.awaitTermination(timeout=10)`,
        note: 'The scheduler multiplexes many tasks onto executor cores, much as an event loop multiplexes callbacks.',
      },
      rust: {
        code: `use std::time::Duration;
use tokio::time::sleep;

async fn fetch(label: &str, delay_ms: u64) -> String {
    sleep(Duration::from_millis(delay_ms)).await;   // yields to the Tokio executor
    label.to_string()
}

#[tokio::main]
async fn main() {
    let first = fetch("a", 1000).await;             // sequential: 2 seconds
    let second = fetch("b", 1000).await;
    println!("{first} {second}");
}
// An async fn compiles to a state machine. It does nothing until it is polled (see the futures concept).
// Requires: tokio = { version = "1", features = ["macros", "rt-multi-thread", "time"] }`,
      },
      cpp: {
        code: `// C++20 coroutines are a language mechanism only: the standard library has no event loop.
// You supply a task type and a scheduler, or use a library (Boost.Asio, libuv, cppcoro).
#include <boost/asio.hpp>
#include <chrono>
#include <iostream>
namespace asio = boost::asio;

asio::awaitable<void> fetch(const char* label, std::chrono::milliseconds delay) {
    asio::steady_timer timer(co_await asio::this_coro::executor, delay);
    co_await timer.async_wait(asio::use_awaitable);      // suspends; the io_context runs other work
    std::cout << label << "\\n";
}

int main() {
    asio::io_context loop;                                // the event loop
    asio::co_spawn(loop, fetch("a", std::chrono::seconds(1)), asio::detached);
    loop.run();                                           // runs until no work remains
}
// Requires Boost.Asio (or standalone Asio) and -std=c++20.`,
        note: 'The language gives you co_await; the loop comes from a library.',
      },
      go: {
        code: `// Go has no async/await and no user-visible event loop. Blocking code is written as straight-line
// code; the runtime parks the goroutine and uses an internal netpoller (epoll/kqueue) to wake it.
func fetch(label string, delay time.Duration) string {
    time.Sleep(delay)         // parks THIS goroutine only; other goroutines keep running
    return label
}

func main() {
    first := fetch("a", time.Second)    // sequential: 2 seconds
    second := fetch("b", time.Second)
    fmt.Println(first, second)
}`,
        note: 'The scheduler and netpoller are built in, so ordinary blocking-style code scales.',
      },
      swift: {
        code: `func fetch(_ label: String, delay: Duration) async throws -> String {
    try await Task.sleep(for: delay)       // suspends; the thread is released to run other tasks
    return label
}

@main
struct Demo {
    static func main() async throws {
        let first = try await fetch("a", delay: .seconds(1))    // sequential: 2 seconds
        let second = try await fetch("b", delay: .seconds(1))
        print(first, second)
    }
}
// Swift concurrency runs tasks on a cooperative thread pool sized to the CPU count, not one loop.
// Never block a pool thread with a semaphore or sleep(): it can starve other tasks.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*

suspend fun fetch(label: String, delayMs: Long): String {
    delay(delayMs)                  // suspends the coroutine; the thread is free for other work
    return label
}

fun main() = runBlocking {          // bridges blocking main() into the coroutine world
    val first = fetch("a", 1000)    // sequential: 2 seconds
    val second = fetch("b", 1000)
    println("$first $second")
}
// Requires kotlinx-coroutines-core. Thread.sleep() would block the thread instead of suspending.`,
      },
    },
    takeaway:
      'await is a suspension point, not a wait: it lets the loop run something else. Keep CPU-bound work and blocking calls off the loop thread, or the whole program stalls.',
  },
  {
    id: 'futures-promises',
    part: 'async',
    navLabel: 'Futures & promises',
    title: 'Futures and promises',
    summary:
      'A future or promise is a placeholder for a value that will exist later. JavaScript promises start running immediately; Rust futures are lazy and do nothing until polled; Kotlin and Swift tie the work to a structured scope.',
    snippets: {
      sql: {
        code: `-- A query result is delivered when ready. Server-side cursors let the client fetch in pieces.
BEGIN;
DECLARE big_cursor CURSOR FOR SELECT * FROM events ORDER BY id;
FETCH 100 FROM big_cursor;           -- the next 100 rows, as soon as they are available
CLOSE big_cursor;
COMMIT;

-- Client drivers wrap this in a promise/future: await client.query('SELECT ...').`,
        note: 'The database has no future type; the client driver provides one.',
      },
      python: {
        code: `import asyncio

async def compute() -> int:
    await asyncio.sleep(0.1)
    return 42

async def main() -> None:
    task = asyncio.create_task(compute())     # scheduled to run NOW, concurrently
    print("doing other work")
    print(await task)                          # get the result; re-raises any exception

    future = asyncio.get_running_loop().create_future()   # a low-level, manually resolved future
    future.set_result("done")
    print(await future)

asyncio.run(main())
# A coroutine object (compute()) is lazy until awaited or wrapped in a task.`,
      },
      typescript: {
        code: `const slow = (value: number) => new Promise<number>((resolve) => setTimeout(() => resolve(value), 100));

// A Promise starts running as soon as it is created.
const promise = slow(42);
console.log("doing other work");

promise
  .then((value) => value + 1)               // chaining returns a new promise
  .catch((error) => { console.error(error); return 0; })
  .finally(() => console.log("cleanup"));

async function main() {
  console.log(await promise);                // 42
}
main();`,
      },
      spark: {
        code: `# Spark actions block, but you can overlap several jobs with ordinary Python futures,
# because the scheduler accepts jobs from multiple threads.
from concurrent.futures import ThreadPoolExecutor

def count(table):
    return spark.read.parquet(table).count()      # each call submits its own Spark job

with ThreadPoolExecutor(max_workers=3) as pool:
    futures = [pool.submit(count, name) for name in ("orders", "users", "events")]
    print([future.result() for future in futures])   # block until each job completes`,
      },
      rust: {
        code: `use std::future::Future;

// A Future is lazy: calling an async fn returns a state machine and runs NOTHING yet.
async fn compute() -> u32 { 42 }

#[tokio::main]
async fn main() {
    let future = compute();                    // not started
    println!("doing other work");
    let value = future.await;                  // polled to completion here
    println!("{value}");

    let handle = tokio::spawn(compute());      // spawn = start now, on the runtime
    println!("{}", handle.await.unwrap());     // JoinHandle<u32>; Err if the task panicked
}

// The trait: trait Future { type Output; fn poll(self: Pin<&mut Self>, cx: &mut Context) -> Poll<Self::Output>; }`,
      },
      cpp: {
        code: `#include <future>
#include <iostream>
#include <thread>

int compute() { return 42; }

int main() {
    // std::async starts work on another thread and returns a std::future.
    std::future<int> result = std::async(std::launch::async, compute);
    std::cout << "doing other work\\n";
    std::cout << result.get() << "\\n";        // BLOCKS until ready; rethrows exceptions

    std::promise<int> promise;                 // the producer side of a future
    std::future<int> consumer = promise.get_future();
    std::thread producer([&] { promise.set_value(7); });
    std::cout << consumer.get() << "\\n";
    producer.join();
}
// std::future has no .then(); composition needs coroutines or a library (folly, Boost.Asio).`,
      },
      go: {
        code: `// Go has no future type. A channel that delivers one value plays the role.
func compute() <-chan int {
    result := make(chan int, 1)       // buffered: the producer never blocks if nobody is listening yet
    go func() {
        time.Sleep(100 * time.Millisecond)
        result <- 42
    }()
    return result
}

func main() {
    future := compute()               // work has already started
    fmt.Println("doing other work")
    fmt.Println(<-future)             // receive = await the result
}`,
        note: 'A channel is a more general tool; the promise-like use is a one-shot channel.',
      },
      swift: {
        code: `func compute() async -> Int {
    try? await Task.sleep(for: .milliseconds(100))
    return 42
}

func run() async {
    async let value = compute()        // starts immediately as a child task
    print("doing other work")
    print(await value)                 // await the child's result

    let task = Task { await compute() }    // an unstructured task; you hold the handle
    print(await task.value)
}
// 'async let' child tasks are cancelled automatically if the enclosing scope exits without awaiting them.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*

suspend fun compute(): Int { delay(100); return 42 }

fun main() = runBlocking {
    val deferred: Deferred<Int> = async { compute() }    // Kotlin's future: starts immediately
    println("doing other work")
    println(deferred.await())                            // suspends until ready; rethrows exceptions

    val lazy = async(start = CoroutineStart.LAZY) { compute() }   // starts only on await() or start()
    println(lazy.await())
}`,
      },
    },
    takeaway:
      'Know whether your future is hot (starts at once: JavaScript, Python tasks, Kotlin async) or cold (starts on await/poll: Rust, Python bare coroutines). A forgotten cold future silently never runs.',
  },
  {
    id: 'io-fanout',
    part: 'async',
    navLabel: 'Concurrent I/O fan-out',
    title: 'Concurrent I/O fan-out (gather / join)',
    summary:
      'Start several independent waits together and collect all the results. Two one-second waits should take about one second, not two. Decide up front what happens when one of them fails.',
    snippets: {
      sql: {
        code: `-- One round trip carries many lookups: the server executes them together.
SELECT u.id, (SELECT count(*) FROM orders o WHERE o.user_id = u.id) AS orders,
              (SELECT count(*) FROM tickets t WHERE t.user_id = u.id) AS tickets
FROM users u WHERE u.id = ANY(ARRAY[1, 2, 3]);

-- Or pipeline several statements on one connection (libpq pipeline mode) to cut round trips.`,
        note: 'Batching into one statement or one pipeline is how SQL does fan-out.',
      },
      python: {
        code: `import asyncio

async def fetch(label: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return label

async def main() -> None:
    results = await asyncio.gather(fetch("a", 1), fetch("b", 1))      # about 1 second, not 2
    print(results)                                                     # ['a', 'b'] in call order

    # Python 3.11+: TaskGroup cancels siblings if one fails (structured concurrency).
    async with asyncio.TaskGroup() as group:
        first = group.create_task(fetch("c", 1))
        second = group.create_task(fetch("d", 1))
    print(first.result(), second.result())

    outcomes = await asyncio.gather(fetch("e", 1), asyncio.sleep(0, "x"), return_exceptions=True)

asyncio.run(main())`,
      },
      typescript: {
        code: `const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function fetchLabel(label: string, ms: number) { await delay(ms); return label; }

async function main() {
  // Promise.all starts both operations before awaiting either, and rejects on the first failure.
  const all = await Promise.all([fetchLabel("a", 1000), fetchLabel("b", 1000)]);   // about 1 second

  // allSettled waits for everything and reports each outcome, never rejecting.
  const settled = await Promise.allSettled([fetchLabel("c", 100), Promise.reject(new Error("boom"))]);

  // race resolves with the first promise to settle.
  const first = await Promise.race([fetchLabel("slow", 500), fetchLabel("fast", 50)]);
  console.log(all, settled.map((s) => s.status), first);
}
main();`,
      },
      spark: {
        code: `# Within a job, Spark already fans out across partitions. To run independent JOBS at once,
# submit them from separate threads and enable the FAIR scheduler.
from concurrent.futures import ThreadPoolExecutor, as_completed

spark.conf.set("spark.scheduler.mode", "FAIR")      # set before the session starts in a real deployment

def run(name):
    return name, spark.read.parquet(name).count()

with ThreadPoolExecutor(max_workers=4) as pool:
    jobs = [pool.submit(run, name) for name in ("orders", "users", "events")]
    for job in as_completed(jobs):
        print(job.result())`,
      },
      rust: {
        code: `use std::time::Duration;
use tokio::time::sleep;

async fn fetch(label: &str, delay_ms: u64) -> String {
    sleep(Duration::from_millis(delay_ms)).await;
    label.to_string()
}

#[tokio::main]
async fn main() {
    // join! runs the futures concurrently on this task: about 1 second.
    let (first, second) = tokio::join!(fetch("a", 1000), fetch("b", 1000));

    // try_join! stops at the first Err and drops (cancels) the others.
    let both: Result<(i32, i32), String> = tokio::try_join!(async { Ok(1) }, async { Ok(2) });

    // select! returns when the first branch finishes.
    tokio::select! {
        value = fetch("fast", 50) => println!("{value}"),
        value = fetch("slow", 500) => println!("{value}"),
    }
    println!("{first} {second} {both:?}");
}`,
      },
      cpp: {
        code: `#include <chrono>
#include <future>
#include <iostream>
#include <string>
#include <thread>

std::string fetch(std::string label, std::chrono::milliseconds delay) {
    std::this_thread::sleep_for(delay);           // blocking: needs a thread per wait
    return label;
}

int main() {
    using namespace std::chrono_literals;
    auto a = std::async(std::launch::async, fetch, "a", 1000ms);   // two threads, started together
    auto b = std::async(std::launch::async, fetch, "b", 1000ms);
    std::cout << a.get() << " " << b.get() << "\\n";               // about 1 second in total
}
// Without coroutines this costs a thread per in-flight wait; Asio's co_spawn avoids that.`,
      },
      go: {
        code: `func fetch(label string, delay time.Duration) string {
    time.Sleep(delay)
    return label
}

func main() {
    labels := []string{"a", "b", "c"}
    results := make([]string, len(labels))
    var group sync.WaitGroup
    for index, label := range labels {
        group.Add(1)
        go func() {                       // Go 1.22+: 'index' and 'label' are per-iteration variables
            defer group.Done()
            results[index] = fetch(label, time.Second)    // each goroutine writes its own slot: no race
        }()
    }
    group.Wait()                          // about 1 second in total
    fmt.Println(results)
}
// golang.org/x/sync/errgroup adds first-error cancellation: g.Go(func() error { ... }).`,
      },
      swift: {
        code: `func fetch(_ label: String, delay: Duration) async throws -> String {
    try await Task.sleep(for: delay)
    return label
}

func run() async throws {
    async let a = fetch("a", delay: .seconds(1))     // both start now
    async let b = fetch("b", delay: .seconds(1))
    print(try await a, try await b)                  // about 1 second

    let results = try await withThrowingTaskGroup(of: String.self) { group in
        for label in ["c", "d", "e"] {
            group.addTask { try await fetch(label, delay: .seconds(1)) }
        }
        var collected: [String] = []
        for try await value in group { collected.append(value) }   // arrives in completion order
        return collected
    }
    print(results)
}`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*

suspend fun fetch(label: String, delayMs: Long): String { delay(delayMs); return label }

fun main() = runBlocking {
    val (a, b) = coroutineScope {                 // returns when BOTH children finish
        val first = async { fetch("a", 1000) }
        val second = async { fetch("b", 1000) }
        first.await() to second.await()           // about 1 second in total
    }
    println("$a $b")

    val all = listOf("c", "d", "e").map { label -> async { fetch(label, 1000) } }.awaitAll()
    println(all)
}
// If one child throws, coroutineScope cancels its siblings and rethrows (structured concurrency).`,
      },
    },
    takeaway:
      'Start every independent wait before awaiting any of them. Choose the failure policy deliberately: fail fast and cancel the rest (try_join, TaskGroup, errgroup, coroutineScope) or collect every outcome (allSettled).',
  },
  {
    id: 'cancellation-timeouts',
    part: 'async',
    navLabel: 'Cancellation & timeouts',
    title: 'Cancellation and timeouts',
    summary:
      'Every wait that can hang needs a deadline, and every task you start needs a way to be stopped. Cancellation is usually cooperative: the task is asked to stop and must check or reach a suspension point.',
    snippets: {
      sql: {
        code: `-- The server enforces deadlines for you.
SET statement_timeout = '5s';                -- cancel any statement that runs longer
SET lock_timeout = '1s';                     -- give up waiting for a lock
SET idle_in_transaction_session_timeout = '30s';

SELECT pg_sleep(10);                          -- ERROR: canceling statement due to statement timeout
-- From another session: SELECT pg_cancel_backend(pid);   -- ask a running query to stop`,
      },
      python: {
        code: `import asyncio

async def slow() -> str:
    try:
        await asyncio.sleep(10)
        return "done"
    except asyncio.CancelledError:
        print("cleaning up")             # run cleanup, then re-raise so the cancel completes
        raise

async def main() -> None:
    try:
        async with asyncio.timeout(1):   # Python 3.11+; older: asyncio.wait_for(slow(), 1)
            await slow()
    except TimeoutError:
        print("timed out")

    task = asyncio.create_task(slow())
    await asyncio.sleep(0.1)
    task.cancel()                         # raises CancelledError inside the task at its next await

asyncio.run(main())`,
      },
      typescript: {
        code: `// AbortController is the standard cancellation signal for fetch and many Node APIs.
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });       // rejects with AbortError
  } finally {
    clearTimeout(timer);                                           // always release the timer
  }
}

// Modern shortcut: fetch(url, { signal: AbortSignal.timeout(3000) })

// A plain Promise cannot be cancelled. Promise.race only stops WAITING; the work continues.`,
      },
      spark: {
        code: `# Cancel running jobs by group, from another thread.
spark.sparkContext.setJobGroup("report-42", "nightly report", interruptOnCancel=True)
frame.count()                                       # job runs under the group "report-42"

# Elsewhere (a different thread):
spark.sparkContext.cancelJobGroup("report-42")      # kills the stages and interrupts tasks

# Time limits for reads and shuffles are settings, e.g.:
spark.conf.set("spark.network.timeout", "120s")`,
      },
      rust: {
        code: `use std::time::Duration;
use tokio::time::{sleep, timeout};
use tokio_util::sync::CancellationToken;

async fn slow() -> &'static str {
    sleep(Duration::from_secs(10)).await;
    "done"
}

#[tokio::main]
async fn main() {
    // timeout wraps a future and DROPS it on expiry. Dropping a future cancels it at its next .await.
    match timeout(Duration::from_secs(1), slow()).await {
        Ok(value) => println!("{value}"),
        Err(_) => println!("timed out"),
    }

    let token = CancellationToken::new();               // cooperative cancellation for long tasks
    let worker = tokio::spawn({
        let token = token.clone();
        async move {
            tokio::select! {
                _ = token.cancelled() => println!("stopping"),
                _ = slow() => {}
            }
        }
    });
    token.cancel();
    worker.await.unwrap();
}
// Requires tokio and tokio-util.`,
      },
      cpp: {
        code: `#include <chrono>
#include <future>
#include <iostream>
#include <stop_token>
#include <thread>

int main() {
    using namespace std::chrono_literals;

    // std::future::wait_for gives a deadline on WAITING; it cannot stop the work.
    auto work = std::async(std::launch::async, [] { std::this_thread::sleep_for(5s); return 1; });
    if (work.wait_for(1s) == std::future_status::timeout) std::cout << "timed out\\n";

    // C++20 std::jthread + stop_token: cooperative cancellation, joins on destruction.
    std::jthread worker([](std::stop_token stop) {
        while (!stop.stop_requested()) std::this_thread::sleep_for(10ms);
        std::cout << "stopping\\n";
    });
    std::this_thread::sleep_for(50ms);
    worker.request_stop();
}   // jthread joins here`,
      },
      go: {
        code: `func slow(ctx context.Context) (string, error) {
    select {
    case <-time.After(10 * time.Second):
        return "done", nil
    case <-ctx.Done():                 // cancelled or deadline exceeded
        return "", ctx.Err()
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()                     // always call cancel to release resources

    if _, err := slow(ctx); errors.Is(err, context.DeadlineExceeded) {
        fmt.Println("timed out")
    }
}
// context.Context is passed as the FIRST parameter of every function that blocks or does I/O.`,
      },
      swift: {
        code: `func slow() async throws -> String {
    try await Task.sleep(for: .seconds(10))    // throws CancellationError when the task is cancelled
    return "done"
}

func run() async {
    let task = Task { try await slow() }
    try? await Task.sleep(for: .milliseconds(100))
    task.cancel()                               // cooperative: takes effect at the next suspension point

    // Timeout: race the work against a sleeper inside a task group.
    let result = try? await withThrowingTaskGroup(of: String.self) { group in
        group.addTask { try await slow() }
        group.addTask { try await Task.sleep(for: .seconds(1)); throw CancellationError() }
        defer { group.cancelAll() }
        return try await group.next()!
    }
    print(result ?? "timed out")
}
// Long CPU loops should check Task.isCancelled or call try Task.checkCancellation().`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*

suspend fun slow(): String { delay(10_000); return "done" }

fun main() = runBlocking {
    val result = withTimeoutOrNull(1000) { slow() }       // null if the deadline passes
    println(result ?: "timed out")

    val job = launch {
        try {
            slow()
        } finally {
            println("cleaning up")        // finally blocks run on cancellation
        }
    }
    delay(100)
    job.cancelAndJoin()                   // cancel, then wait for cleanup to finish
}
// Cancellation is cooperative: a tight CPU loop must call ensureActive() or check isActive.`,
      },
    },
    takeaway:
      'Give every external wait a deadline and pass a cancellation handle down the call tree (AbortSignal, Context, CancellationToken, structured scopes). Cancelling a wait is not the same as stopping the work: check what actually halts.',
  },
];
