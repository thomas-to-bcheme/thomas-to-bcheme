import type { Concept } from './types';

export const PARALLELISM_CONCEPTS: Concept[] = [
  {
    id: 'os-threads',
    part: 'parallelism',
    navLabel: 'OS threads',
    title: 'OS threads',
    summary:
      'A thread is the operating system’s unit of scheduling, with its own stack (often 1 to 8 MB) and a context-switch cost. Several threads can run at the same instant on separate cores, sharing the process’s heap.',
    snippets: {
      sql: {
        code: `-- Each client connection is served by its own backend process or thread; the server schedules them.
SELECT pid, state, query FROM pg_stat_activity WHERE state <> 'idle';

-- Intra-query parallelism: the planner starts worker processes for large scans.
SET max_parallel_workers_per_gather = 4;
EXPLAIN SELECT count(*) FROM big_table;     -- look for "Gather" and "Parallel Seq Scan"`,
        note: 'You do not create threads; you size connection pools and parallel-worker limits.',
      },
      python: {
        code: `import threading
from concurrent.futures import ProcessPoolExecutor

def work(n: int) -> int:
    return sum(i * i for i in range(n))

# Threads share memory, but the GIL lets only one run Python bytecode at a time (until free-threaded builds):
threads = [threading.Thread(target=work, args=(2_000_000,)) for _ in range(4)]
for thread in threads: thread.start()
for thread in threads: thread.join()              # no speed-up for CPU-bound work, fine for I/O

# For CPU-bound parallelism use processes, each with its own interpreter and GIL:
if __name__ == "__main__":
    with ProcessPoolExecutor() as pool:
        print(list(pool.map(work, [2_000_000] * 4)))`,
      },
      typescript: {
        code: `// JavaScript runs one thread per realm. Worker threads add real parallelism, with separate heaps.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

if (isMainThread) {
  const worker = new Worker(__filename, { workerData: 2_000_000 });
  worker.on("message", (sum) => console.log("sum", sum));
  worker.on("error", (error) => console.error(error));
} else {
  let sum = 0;
  for (let i = 0; i < workerData; i++) sum += i * i;
  parentPort!.postMessage(sum);          // data is copied (structured clone) unless transferred
}
// SharedArrayBuffer + Atomics shares memory between workers when you need it.`,
      },
      spark: {
        code: `# Parallelism is partitions: each partition is processed by one task on one core.
frame = spark.range(0, 1_000_000, numPartitions=8)
print(frame.rdd.getNumPartitions())                    # 8 tasks can run at once

# Executors are JVM processes; each runs several tasks in parallel threads.
spark = (SparkSession.builder
    .config("spark.executor.instances", "4")
    .config("spark.executor.cores", "4")                # 4 task threads per executor
    .getOrCreate())`,
      },
      rust: {
        code: `use std::thread;

fn work(n: u64) -> u64 { (0..n).map(|i| i * i).sum() }

fn main() {
    // Scoped threads may borrow local data safely: they are guaranteed to finish before the scope ends.
    let data = vec![2_000_000u64; 4];
    let totals: Vec<u64> = thread::scope(|scope| {
        let handles: Vec<_> = data.iter().map(|&n| scope.spawn(move || work(n))).collect();
        handles.into_iter().map(|handle| handle.join().unwrap()).collect()
    });
    println!("{totals:?}");

    let detached = thread::spawn(|| work(1000));      // 'static closure: cannot borrow locals
    println!("{}", detached.join().unwrap());
}
// Each thread is a real OS thread. Rayon (par_iter) manages a pool for you.`,
      },
      cpp: {
        code: `#include <iostream>
#include <numeric>
#include <thread>
#include <vector>

unsigned long long work(unsigned long long n) {
    unsigned long long sum = 0;
    for (unsigned long long i = 0; i < n; ++i) sum += i * i;
    return sum;
}

int main() {
    std::vector<unsigned long long> totals(4);
    std::vector<std::jthread> threads;                 // C++20: joins automatically on destruction
    for (std::size_t index = 0; index < totals.size(); ++index) {
        threads.emplace_back([&totals, index] { totals[index] = work(2'000'000); });   // one slot each
    }
    threads.clear();                                   // join all
    for (auto t : totals) std::cout << t << " ";
    std::cout << "\\n" << std::thread::hardware_concurrency() << " hardware threads\\n";
}
// Compile with -pthread. A std::thread destroyed before join() calls std::terminate.`,
      },
      go: {
        code: `// Go multiplexes goroutines onto a small pool of OS threads (GOMAXPROCS, default = CPU count).
func work(n uint64) uint64 {
    var sum uint64
    for i := uint64(0); i < n; i++ {
        sum += i * i
    }
    return sum
}

func main() {
    fmt.Println(runtime.NumCPU(), runtime.GOMAXPROCS(0))
    totals := make([]uint64, 4)
    var group sync.WaitGroup
    for index := range totals {
        group.Add(1)
        go func() {
            defer group.Done()
            totals[index] = work(2_000_000)       // separate slots: no data race
        }()
    }
    group.Wait()
    fmt.Println(totals)
}
// You rarely create OS threads yourself; runtime.LockOSThread pins a goroutine to one when required.`,
      },
      swift: {
        code: `import Foundation

func work(_ n: UInt64) -> UInt64 {
    var sum: UInt64 = 0
    for i in 0..<n { sum &+= i &* i }
    return sum
}

// Grand Central Dispatch: submit work to a system-managed thread pool.
var totals = [UInt64](repeating: 0, count: 4)
totals.withUnsafeMutableBufferPointer { buffer in
    let pointer = buffer.baseAddress!            // raw pointer so iterations can write distinct slots
    DispatchQueue.concurrentPerform(iterations: 4) { index in
        pointer[index] = work(2_000_000)
    }
}
print(totals)
// Prefer Swift concurrency (Task, TaskGroup) for new code; Thread is available but rarely needed.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*
import kotlin.concurrent.thread

fun work(n: Long): Long { var sum = 0L; for (i in 0 until n) sum += i * i; return sum }

fun main() {
    val totals = LongArray(4)
    val threads = (0 until 4).map { index ->
        thread { totals[index] = work(2_000_000) }         // a platform thread, started immediately
    }
    threads.forEach { it.join() }
    println(totals.toList())

    // CPU-bound coroutine work runs on Dispatchers.Default (a pool sized to the CPU count).
    runBlocking {
        val sums = (0 until 4).map { async(Dispatchers.Default) { work(2_000_000) } }.awaitAll()
        println(sums)
    }
}`,
      },
    },
    takeaway:
      'Use threads for CPU-bound parallelism and size them to the core count. Each thread costs stack memory and context switches, which is why I/O-heavy servers prefer coroutines or an event loop.',
  },
  {
    id: 'coroutines-green',
    part: 'parallelism',
    navLabel: 'Coroutines & green threads',
    title: 'Coroutines and green threads',
    summary:
      'A coroutine is a function that can pause and resume. A runtime schedules huge numbers of them onto few OS threads, so each costs kilobytes instead of megabytes. Stackful designs (goroutines, virtual threads) keep ordinary code; stackless ones (async/await) compile to state machines.',
    snippets: {
      sql: {
        code: `-- A server handles many connections with a small worker pool. Use a pooler so thousands
-- of clients share dozens of backends (PgBouncer, transaction pooling).
SHOW max_connections;                       -- each backend is a heavy OS process in PostgreSQL
SELECT count(*) FROM pg_stat_activity;      -- compare with the pool size, not the client count`,
        note: 'Pooling is the database analogue of multiplexing light tasks onto few threads.',
      },
      python: {
        code: `import asyncio

async def worker(n: int) -> int:
    await asyncio.sleep(1)                 # all 10,000 waits overlap on ONE thread
    return n

async def main() -> None:
    results = await asyncio.gather(*(worker(n) for n in range(10_000)))   # about 1 second
    print(len(results))

asyncio.run(main())
# Generators (yield) are the ancestor: they also pause and resume, one value at a time.
# Greenlets (gevent) provide stackful green threads as a third-party option.`,
      },
      typescript: {
        code: `// Async functions are stackless coroutines compiled to state machines.
async function worker(n: number): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return n;
}

async function main() {
  const results = await Promise.all(Array.from({ length: 10_000 }, (_, n) => worker(n)));
  console.log(results.length);               // about 1 second
}
main();

// Generators expose the same mechanism by hand: function* produces values lazily and resumes at yield.
function* counter() { let n = 0; while (true) yield n++; }`,
      },
      spark: {
        code: `# Spark tasks are lightweight units scheduled onto a fixed number of cores.
# Many more partitions than cores is normal; tasks queue and run as cores free up.
frame = spark.range(0, 10_000_000, numPartitions=2000)    # 2000 tasks
total = frame.count()                                     # runs a few dozen at a time

# Pandas UDFs and Python workers add process-level parallelism, not coroutines.`,
      },
      rust: {
        code: `use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() {
    let handles: Vec<_> = (0..10_000)
        .map(|n| tokio::spawn(async move {        // each task is a few hundred bytes of state
            sleep(Duration::from_secs(1)).await;
            n
        }))
        .collect();

    let mut total = 0u64;
    for handle in handles { total += handle.await.unwrap(); }
    println!("{total}");                           // about 1 second
}
// Stackless: an async fn's state machine holds only the variables live across .await points.
// Requires tokio with the "full" feature (or rt-multi-thread, macros, time).`,
      },
      cpp: {
        code: `#include <coroutine>
#include <iostream>

// A minimal generator: a stackless C++20 coroutine that yields values on demand.
struct Generator {
    struct promise_type {
        int current = 0;
        Generator get_return_object() { return Generator{std::coroutine_handle<promise_type>::from_promise(*this)}; }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(int value) { current = value; return {}; }
        void return_void() {}
        void unhandled_exception() { std::terminate(); }
    };
    std::coroutine_handle<promise_type> handle;
    ~Generator() { if (handle) handle.destroy(); }
    bool next() { handle.resume(); return !handle.done(); }
};

Generator counter() { for (int n = 0;; ++n) co_yield n; }

int main() {
    auto gen = counter();
    for (int i = 0; i < 3 && gen.next(); ++i) std::cout << gen.handle.promise().current << " ";
}
// The language supplies the mechanism; scheduling and task types come from a library.`,
        note: 'C++20 coroutines are a low-level building block; most code uses a library on top.',
      },
      go: {
        code: `func main() {
    var group sync.WaitGroup
    var total atomic.Int64
    for n := 0; n < 100_000; n++ {         // 100,000 goroutines, about 2 KB of stack each at the start
        group.Add(1)
        go func() {
            defer group.Done()
            time.Sleep(time.Second)        // parks the goroutine; the OS thread runs another
            total.Add(1)
        }()
    }
    group.Wait()
    fmt.Println(total.Load())              // about 1 second in total
}
// Stackful and growable: the runtime scheduler (M:N) multiplexes goroutines onto OS threads,
// and the netpoller wakes goroutines blocked on I/O.`,
      },
      swift: {
        code: `func worker(_ n: Int) async -> Int {
    try? await Task.sleep(for: .seconds(1))
    return n
}

func run() async {
    let total = await withTaskGroup(of: Int.self) { group in
        for n in 0..<10_000 { group.addTask { await worker(n) } }   // tasks, not threads
        var sum = 0
        for await value in group { sum += value }
        return sum
    }
    print(total)       // about 1 second
}
// Tasks run on a cooperative pool with roughly one thread per core, so never block a thread inside one.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*

fun main() = runBlocking {
    val results = (0 until 100_000).map { n ->
        async {                          // a coroutine is an object holding its state, not a thread
            delay(1000)
            n
        }
    }.awaitAll()
    println(results.size)                // about 1 second, on one thread

    // JDK 21 virtual threads give stackful green threads to ordinary blocking code:
    // Executors.newVirtualThreadPerTaskExecutor().use { executor -> executor.submit { Thread.sleep(1000) } }
}`,
      },
    },
    takeaway:
      'Light tasks make "one task per request" affordable. Stackful runtimes (Go, JDK virtual threads) keep blocking-style code; stackless ones (async/await) are cheaper still but spread the async keyword through your call tree.',
  },
  {
    id: 'channels',
    part: 'parallelism',
    navLabel: 'Channels & message passing',
    title: 'Channels and message passing',
    summary:
      'Instead of sharing memory under a lock, tasks communicate by sending values over a typed queue. Ownership of the value moves with the message, so only one task touches it at a time.',
    snippets: {
      sql: {
        code: `-- Message passing through the database: a queue table consumed with SKIP LOCKED,
-- or LISTEN/NOTIFY for wake-ups.
INSERT INTO jobs (payload) VALUES ('{"task": "email"}');
NOTIFY jobs_channel;

-- Consumer: claim one job without blocking other consumers.
SELECT id, payload FROM jobs WHERE done = false
ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1;`,
      },
      python: {
        code: `import queue
import threading

jobs: "queue.Queue[int | None]" = queue.Queue(maxsize=10)     # bounded: put() blocks when full (back-pressure)
results: "queue.Queue[int]" = queue.Queue()

def consumer() -> None:
    while (job := jobs.get()) is not None:      # None is the "no more work" sentinel
        results.put(job * job)
        jobs.task_done()

worker = threading.Thread(target=consumer)
worker.start()
for n in range(5): jobs.put(n)
jobs.put(None)
worker.join()
print([results.get() for _ in range(results.qsize())])

# asyncio.Queue is the coroutine-friendly version: await queue.put(x), await queue.get().`,
      },
      typescript: {
        code: `import { Worker, MessageChannel } from "node:worker_threads";

// A MessageChannel is a pair of connected ports; messages are structured-cloned (copied).
const { port1, port2 } = new MessageChannel();
port1.on("message", (value: number) => { console.log("received", value); port1.close(); });
port2.postMessage(42);

// Transfer ownership instead of copying large buffers:
const buffer = new ArrayBuffer(1024);
port2.postMessage(buffer, [buffer]);      // 'buffer' is now detached (length 0) on this side

// Within one thread, an async queue can be built from promises (or use an async iterator).`,
      },
      spark: {
        code: `# Structured Streaming reads a message queue (Kafka) and processes it in micro-batches.
stream = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "orders")
    .load())

query = (stream.selectExpr("CAST(value AS STRING) AS body")
    .writeStream.format("console")
    .option("checkpointLocation", "/tmp/checkpoints/orders")     # offsets are tracked for restart
    .start())`,
        note: 'Between tasks, Spark moves data through shuffle files and network transfers, not channels.',
      },
      rust: {
        code: `use std::sync::mpsc;
use std::thread;

fn main() {
    let (sender, receiver) = mpsc::channel::<u32>();       // multi-producer, single-consumer

    let producers: Vec<_> = (0..3)
        .map(|id| {
            let sender = sender.clone();                    // each producer gets its own sender
            thread::spawn(move || {
                for n in 0..3 { sender.send(id * 10 + n).unwrap(); }   // the value MOVES into the channel
            })
        })
        .collect();
    drop(sender);                                           // close our copy so the loop below can end

    for value in receiver { println!("got {value}"); }      // ends when every sender is dropped
    for producer in producers { producer.join().unwrap(); }
}
// Bounded: mpsc::sync_channel(n). Async: tokio::sync::mpsc. Multi-consumer: crossbeam or flume.`,
      },
      cpp: {
        code: `#include <condition_variable>
#include <mutex>
#include <optional>
#include <queue>

// The standard library has no channel. A bounded queue is built from a mutex and condition variable.
template <typename T>
class Channel {
public:
    explicit Channel(std::size_t capacity) : capacity_(capacity) {}

    void send(T value) {
        std::unique_lock lock(mutex_);
        not_full_.wait(lock, [&] { return queue_.size() < capacity_; });   // back-pressure
        queue_.push(std::move(value));
        not_empty_.notify_one();
    }

    std::optional<T> receive() {
        std::unique_lock lock(mutex_);
        not_empty_.wait(lock, [&] { return !queue_.empty(); });
        T value = std::move(queue_.front());
        queue_.pop();
        not_full_.notify_one();
        return value;
    }
private:
    std::mutex mutex_;
    std::condition_variable not_full_, not_empty_;
    std::queue<T> queue_;
    std::size_t capacity_;
};`,
        note: 'No close semantics here; a production channel also needs a way to signal "no more values".',
      },
      go: {
        code: `func main() {
    jobs := make(chan int)              // unbuffered: send blocks until a receiver is ready
    results := make(chan int, 10)       // buffered: holds up to 10 values

    go func() {
        defer close(jobs)               // the SENDER closes; receivers see the end
        for n := 1; n <= 5; n++ {
            jobs <- n
        }
    }()

    var group sync.WaitGroup
    for worker := 0; worker < 3; worker++ {
        group.Add(1)
        go func() {
            defer group.Done()
            for job := range jobs {     // loop until jobs is closed and drained
                results <- job * job
            }
        }()
    }
    go func() { group.Wait(); close(results) }()

    for square := range results { fmt.Println(square) }
}
// "Do not communicate by sharing memory; share memory by communicating." Sending on a closed channel panics.`,
      },
      swift: {
        code: `// AsyncStream is the built-in channel-like type for async sequences.
let (stream, continuation) = AsyncStream.makeStream(of: Int.self, bufferingPolicy: .bufferingNewest(10))

Task {
    for n in 1...5 { continuation.yield(n) }       // produce
    continuation.finish()                          // signal the end
}

Task {
    for await value in stream {                    // consume until finished
        print(value * value)
    }
}
// For many producers and consumers, actors serialise access to shared state instead.
actor Counter { private(set) var value = 0; func increment() { value += 1 } }`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel

fun main() = runBlocking {
    val jobs = Channel<Int>(capacity = 10)        // buffered; Channel.RENDEZVOUS (0) is unbuffered
    val results = Channel<Int>(Channel.UNLIMITED)

    val workers = List(3) {
        launch {
            for (job in jobs) results.send(job * job)     // receive until closed
        }
    }

    launch { for (n in 1..5) jobs.send(n); jobs.close() }  // close = no more values
    workers.joinAll()
    results.close()
    for (square in results) println(square)
}
// Flow is the cold, declarative alternative: flowOf(1, 2, 3).map { it * it }.collect { println(it) }`,
      },
    },
    takeaway:
      'Message passing moves ownership instead of sharing it, which removes most data races by design. Bound the queue so a fast producer cannot exhaust memory, and decide who closes it.',
  },
  {
    id: 'mutexes',
    part: 'parallelism',
    navLabel: 'Mutexes & locks',
    title: 'Mutexes and locks',
    summary:
      'A mutex lets one thread at a time into a critical section. Keep it short, always release it (scope guards do this for you), and acquire several locks in a fixed order.',
    snippets: {
      sql: {
        code: `-- Row locks serialise writers to the same row; MVCC lets readers proceed without locking.
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;      -- take the row lock
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
COMMIT;                                                     -- the lock is released at COMMIT

-- Application-level mutex: an advisory lock keyed by a number.
SELECT pg_advisory_xact_lock(42);       -- held until the transaction ends`,
      },
      python: {
        code: `import threading

counter = 0
lock = threading.Lock()

def increment() -> None:
    global counter
    for _ in range(100_000):
        with lock:                    # acquired on entry, released on exit even if an exception occurs
            counter += 1              # read-modify-write is NOT atomic without the lock

threads = [threading.Thread(target=increment) for _ in range(4)]
for thread in threads: thread.start()
for thread in threads: thread.join()
print(counter)                         # 400000

# threading.RLock allows the same thread to re-acquire; asyncio.Lock protects coroutines, not threads.`,
      },
      typescript: {
        code: `// Single-threaded code needs no mutex between synchronous statements, but an await can
// interleave other tasks in the middle of a read-modify-write.
let balance = 100;
async function withdraw(amount: number) {
  const current = balance;                   // read
  await new Promise((resolve) => setTimeout(resolve, 10));   // other tasks run here
  balance = current - amount;                // write: may overwrite someone else's update
}
await Promise.all([withdraw(10), withdraw(10)]);
console.log(balance);                         // 90, not 80: a lost update

// A promise-chain mutex serialises the critical section:
let tail: Promise<unknown> = Promise.resolve();
const exclusive = <T>(task: () => Promise<T>) => (tail = tail.then(task, task)) as Promise<T>;`,
      },
      spark: {
        code: `# Tasks must not share mutable state. Use accumulators for write-only counters
# and broadcast variables for read-only data; locks across executors do not exist.
errors = spark.sparkContext.accumulator(0)

def validate(row):
    if row.amount < 0:
        errors.add(1)              # merged on the driver; reliable only inside actions

orders.foreach(validate)
print(errors.value)`,
      },
      rust: {
        code: `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0u32));        // Mutex OWNS the data it protects

    let handles: Vec<_> = (0..4)
        .map(|_| {
            let counter = Arc::clone(&counter);
            thread::spawn(move || {
                for _ in 0..100_000 {
                    *counter.lock().unwrap() += 1;    // the guard unlocks when it goes out of scope
                }
            })
        })
        .collect();
    for handle in handles { handle.join().unwrap(); }
    println!("{}", *counter.lock().unwrap());         // 400000
}
// You cannot reach the data without locking. A thread that panics while holding the lock "poisons" it.
// RwLock allows many readers or one writer.`,
      },
      cpp: {
        code: `#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

int main() {
    long counter = 0;
    std::mutex mutex;

    std::vector<std::jthread> threads;
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&] {
            for (int i = 0; i < 100'000; ++i) {
                std::lock_guard<std::mutex> guard(mutex);   // RAII: released at scope exit
                ++counter;
            }
        });
    }
    threads.clear();                                         // join
    std::cout << counter << "\\n";                            // 400000
}
// The mutex and the data are separate objects: nothing stops you touching counter without locking.
// std::scoped_lock(a, b) locks several mutexes without deadlock. Compile with -pthread.`,
      },
      go: {
        code: `type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()          // runs on every return path
    c.count++
}

func main() {
    var counter SafeCounter
    var group sync.WaitGroup
    for t := 0; t < 4; t++ {
        group.Add(1)
        go func() {
            defer group.Done()
            for i := 0; i < 100_000; i++ { counter.Increment() }
        }()
    }
    group.Wait()
    fmt.Println(counter.count)   // 400000
}
// Never copy a struct containing a Mutex. sync.RWMutex allows many readers. Run tests with: go test -race`,
      },
      swift: {
        code: `import Foundation

// Preferred: an actor serialises access to its state; the compiler enforces it.
actor Counter {
    private var count = 0
    func increment() { count += 1 }
    func value() -> Int { count }
}

// Classic lock for synchronous code:
final class LockedCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0
    func increment() { lock.lock(); defer { lock.unlock() }; count += 1 }
}

let counter = Counter()
await withTaskGroup(of: Void.self) { group in
    for _ in 0..<4 { group.addTask { for _ in 0..<100_000 { await counter.increment() } } }
}
print(await counter.value())     // 400000`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

fun main() = runBlocking {
    var counter = 0
    val mutex = Mutex()                      // suspends instead of blocking a thread

    withContext(Dispatchers.Default) {
        repeat(4) {
            launch {
                repeat(100_000) {
                    mutex.withLock { counter++ }      // released even on exception
                }
            }
        }
    }
    println(counter)                          // 400000
}
// For plain threads: synchronized(lock) { ... } or ReentrantLock().withLock { ... }.`,
      },
    },
    takeaway:
      'Locks protect invariants, so lock for as short a time as possible and never hold one across slow I/O or an unknown callback. Prefer designs where the data is owned by one task (channels, actors).',
  },
  {
    id: 'atomics',
    part: 'parallelism',
    navLabel: 'Atomics',
    title: 'Atomic operations',
    summary:
      'An atomic read-modify-write completes indivisibly, so a shared counter or flag needs no lock. Memory ordering decides what other threads may observe around it; sequentially consistent is the safe default.',
    snippets: {
      sql: {
        code: `-- A single UPDATE is atomic: the read-modify-write happens under the row lock.
UPDATE counters SET value = value + 1 WHERE name = 'visits' RETURNING value;

-- Compare-and-swap with a version column (optimistic concurrency):
UPDATE accounts SET balance = 50, version = version + 1
WHERE id = 1 AND version = 7;          -- 0 rows updated means someone else got there first

-- Sequences hand out unique numbers atomically: SELECT nextval('order_id_seq');`,
      },
      python: {
        code: `import itertools
import threading

# CPython has no public atomic integer. "counter += 1" is NOT atomic (load, add, store).
# next() on itertools.count is atomic in CPython because it runs as one C call:
ids = itertools.count()
def worker() -> None:
    for _ in range(100_000):
        next(ids)

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(next(ids))                # 400000

# This relies on CPython's implementation (the GIL). For portable code use a Lock, or
# multiprocessing.Value with its lock, or a queue.`,
        note: 'A CPython implementation detail rather than a language guarantee.',
      },
      typescript: {
        code: `// Atomics works on typed arrays backed by a SharedArrayBuffer, shared between worker threads.
const shared = new Int32Array(new SharedArrayBuffer(4));

Atomics.add(shared, 0, 1);                       // atomic fetch-and-add on index 0
Atomics.compareExchange(shared, 0, 1, 5);        // set to 5 only if it is currently 1
console.log(Atomics.load(shared, 0));            // 5

// Workers can block on a value: Atomics.wait(shared, 0, 5) and be woken by Atomics.notify(shared, 0).
// In a single thread you do not need atomics; they exist for worker threads.`,
      },
      spark: {
        code: `# Spark exposes atomic-like aggregation, not shared memory.
# Accumulators are merged on the driver, so they behave like an atomic add across tasks.
seen = spark.sparkContext.accumulator(0)
orders.foreach(lambda row: seen.add(1))
print(seen.value)

# Prefer a plain aggregation, which is deterministic and retry-safe:
orders.count()`,
        note: 'Accumulators in transformations can double-count when tasks are retried; use them inside actions.',
      },
      rust: {
        code: `use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(AtomicUsize::new(0));
    let stop = Arc::new(AtomicBool::new(false));

    let handles: Vec<_> = (0..4)
        .map(|_| {
            let counter = Arc::clone(&counter);
            thread::spawn(move || {
                for _ in 0..100_000 { counter.fetch_add(1, Ordering::Relaxed); }   // a pure counter needs no ordering
            })
        })
        .collect();
    for handle in handles { handle.join().unwrap(); }
    println!("{}", counter.load(Ordering::Relaxed));    // 400000

    stop.store(true, Ordering::Release);                // publish a flag...
    assert!(stop.load(Ordering::Acquire));              // ...Acquire/Release order the data written before it
    let swapped = counter.compare_exchange(400_000, 0, Ordering::SeqCst, Ordering::SeqCst);
    println!("{swapped:?}");
}`,
      },
      cpp: {
        code: `#include <atomic>
#include <iostream>
#include <thread>
#include <vector>

int main() {
    std::atomic<long> counter{0};
    std::atomic<bool> ready{false};

    std::vector<std::jthread> threads;
    for (int t = 0; t < 4; ++t)
        threads.emplace_back([&] {
            for (int i = 0; i < 100'000; ++i) counter.fetch_add(1, std::memory_order_relaxed);
        });
    threads.clear();
    std::cout << counter.load() << "\\n";               // 400000

    ready.store(true, std::memory_order_release);
    long expected = 400'000;
    counter.compare_exchange_strong(expected, 0);       // compare-and-swap
}
// The default memory_order_seq_cst is the safest. A plain "long" read by two threads is a data race (UB).`,
      },
      go: {
        code: `func main() {
    var counter atomic.Int64          // Go 1.19+ typed atomics
    var ready atomic.Bool
    var group sync.WaitGroup

    for t := 0; t < 4; t++ {
        group.Add(1)
        go func() {
            defer group.Done()
            for i := 0; i < 100_000; i++ { counter.Add(1) }
        }()
    }
    group.Wait()
    fmt.Println(counter.Load())       // 400000

    ready.Store(true)
    swapped := counter.CompareAndSwap(400_000, 0)
    fmt.Println(swapped)
}
// Go's atomics are sequentially consistent. atomic.Value stores an arbitrary value for lock-free reads.`,
      },
      swift: {
        code: `import Synchronization   // Swift 6 / macOS 15+

let counter = Atomic<Int>(0)
let ready = Atomic<Bool>(false)

await withTaskGroup(of: Void.self) { group in
    for _ in 0..<4 {
        group.addTask {
            for _ in 0..<100_000 { counter.add(1, ordering: .relaxed) }
        }
    }
}
print(counter.load(ordering: .relaxed))        // 400000
ready.store(true, ordering: .releasing)
let (exchanged, _) = counter.compareExchange(expected: 400_000, desired: 0, ordering: .sequentiallyConsistent)
print(exchanged)
// Older code uses the swift-atomics package or OSAllocatedUnfairLock.`,
      },
      kotlin: {
        code: `import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.concurrent.thread

fun main() {
    val counter = AtomicLong()
    val ready = AtomicBoolean(false)

    val threads = List(4) {
        thread { repeat(100_000) { counter.incrementAndGet() } }
    }
    threads.forEach { it.join() }
    println(counter.get())                    // 400000

    ready.set(true)
    println(counter.compareAndSet(400_000, 0))
}
// @Volatile makes a plain field visible to other threads but does NOT make count++ atomic.`,
      },
    },
    takeaway:
      'Use an atomic for one shared number or flag, and a lock when several values must change together. Start with sequentially consistent ordering and relax it only with a measured reason.',
  },
  {
    id: 'races-deadlocks',
    part: 'parallelism',
    navLabel: 'Data races & deadlock',
    title: 'Data races and deadlock',
    summary:
      'A data race is an unsynchronised access to shared memory where at least one access is a write. Deadlock is two tasks each holding a lock the other needs. Both are about the order and scope of shared access.',
    snippets: {
      sql: {
        code: `-- Deadlock: two transactions lock the same rows in opposite order.
-- Session A:  BEGIN; UPDATE accounts SET balance = balance - 1 WHERE id = 1;
-- Session B:  BEGIN; UPDATE accounts SET balance = balance - 1 WHERE id = 2;
-- Session A:         UPDATE accounts SET balance = balance + 1 WHERE id = 2;   -- waits for B
-- Session B:         UPDATE accounts SET balance = balance + 1 WHERE id = 1;   -- waits for A
-- PostgreSQL detects the cycle after deadlock_timeout and aborts one transaction.

-- Fix: always touch rows in a fixed order.
UPDATE accounts SET balance = balance + CASE id WHEN 1 THEN -1 ELSE 1 END
WHERE id IN (1, 2);          -- one statement locks both rows in a consistent order`,
      },
      python: {
        code: `import threading

lock_a, lock_b = threading.Lock(), threading.Lock()

def transfer_ab() -> None:
    with lock_a:
        with lock_b: ...           # takes A then B

def transfer_ba() -> None:
    with lock_b:
        with lock_a: ...           # takes B then A: can deadlock against transfer_ab

# Fix 1: a global lock order. Fix 2: acquire with a timeout and back off.
def safe() -> None:
    for first, second in ((lock_a, lock_b),):
        if first.acquire(timeout=1):
            try:
                if second.acquire(timeout=1):
                    second.release()
            finally:
                first.release()`,
      },
      typescript: {
        code: `// No data race on a single thread, but an await splits a "read, compute, write" into pieces.
let inventory = 5;

async function reserve() {
  if (inventory > 0) {                         // check
    await new Promise((resolve) => setTimeout(resolve, 10));   // another task runs here
    inventory -= 1;                             // act: may drive inventory negative
  }
}
await Promise.all([reserve(), reserve(), reserve(), reserve(), reserve(), reserve()]);
console.log(inventory);                          // -1: a time-of-check/time-of-use bug

// Fix: do check and update in the same synchronous step, or serialise with an async mutex.`,
      },
      spark: {
        code: `# Shared mutable state across tasks is the classic Spark bug.
total = 0
def add(row):
    global total
    total += row.amount          # each executor mutates its OWN copy of 'total'

orders.foreach(add)
print(total)                     # 0 on the driver: no race, just a wrong answer

# Correct: aggregate.
from pyspark.sql import functions as F
orders.agg(F.sum("amount")).first()[0]`,
        note: 'Distribution replaces the data race with a silent isolation bug.',
      },
      rust: {
        code: `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let mut count = 0;
    // thread::spawn(|| { count += 1; });   // error: closure may outlive 'count', and it is borrowed mutably
    // let shared = Rc::new(Mutex::new(0)); // error: Rc<..> cannot be sent between threads safely (not Send)

    let shared = Arc::new(Mutex::new(0));    // Arc is Send + Sync; the compiler checks this
    let handles: Vec<_> = (0..4)
        .map(|_| { let shared = Arc::clone(&shared); thread::spawn(move || *shared.lock().unwrap() += 1) })
        .collect();
    for handle in handles { handle.join().unwrap(); }
    count += *shared.lock().unwrap();
    println!("{count}");
}
// Safe Rust has no data races: Send and Sync make sharing unsafe types a compile error.
// Deadlock is still possible. Lock in a fixed order, or lock one thing at a time.`,
      },
      cpp: {
        code: `#include <mutex>
#include <thread>

std::mutex a, b;
int shared_value = 0;

void racy() { ++shared_value; }                 // data race when two threads call it: undefined behaviour

void deadlock_prone() {
    std::lock_guard<std::mutex> first(a);
    std::lock_guard<std::mutex> second(b);      // another thread locking b then a deadlocks us
}

void safe() {
    std::scoped_lock both(a, b);                // C++17: locks both with a deadlock-avoidance algorithm
    ++shared_value;
}
// Detect races with ThreadSanitizer: g++ -fsanitize=thread -g file.cpp`,
      },
      go: {
        code: `var counter int

func racy() {
    var group sync.WaitGroup
    for i := 0; i < 1000; i++ {
        group.Add(1)
        go func() {
            defer group.Done()
            counter++                  // DATA RACE: unsynchronised read-modify-write
        }()
    }
    group.Wait()
}

// Detect it:  go run -race main.go  /  go test -race ./...
// Fix with sync/atomic, a Mutex, or by confining the variable to one goroutine and using channels.

// Deadlock: the runtime reports "fatal error: all goroutines are asleep - deadlock!"
// when every goroutine is blocked, for example on an unbuffered channel nobody reads.`,
      },
      swift: {
        code: `// Swift 6 strict concurrency turns data races into compile-time errors.
final class Unsafe { var count = 0 }          // a mutable class is not Sendable

func risky(_ shared: Unsafe) {
    Task { shared.count += 1 }               // error in Swift 6: capture of non-Sendable type 'Unsafe'
}

actor Safe {                                  // an actor isolates its mutable state
    var count = 0
    func increment() { count += 1 }
}

// Actors avoid data races but not logical races: state can change across an 'await',
// so re-check conditions after every suspension point. Actor re-entrancy can also cause ordering bugs.`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*

var counter = 0

fun main() = runBlocking {
    withContext(Dispatchers.Default) {
        repeat(1000) { launch { counter++ } }        // DATA RACE: ++ is load, add, store
    }
    println(counter)                                  // usually less than 1000

    val safe = java.util.concurrent.atomic.AtomicInteger()
    withContext(Dispatchers.Default) { repeat(1000) { launch { safe.incrementAndGet() } } }
    println(safe.get())                               // 1000
}
// Confine mutable state to a single-thread dispatcher or an actor-like coroutine, or guard it with Mutex.
// Lock ordering applies to ReentrantLock/synchronized exactly as in Java.`,
      },
    },
    takeaway:
      'Avoid the race by not sharing mutable state (copy, move, confine, immutable), or by guarding it. Avoid deadlock with one global lock order, one lock at a time, or timeouts. Use race detectors in tests.',
  },
  {
    id: 'worker-pool',
    part: 'parallelism',
    navLabel: 'Worker pool & parallel map',
    title: 'Worker pools and parallel map',
    summary:
      'Start a fixed number of workers and feed them jobs, rather than spawning a thread per item. Parallel map applies a function to every element across the pool and returns results in order.',
    snippets: {
      sql: {
        code: `-- The engine parallelises a scan across workers for you.
SET max_parallel_workers_per_gather = 4;
EXPLAIN (ANALYZE) SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id;
-- Gather -> Partial HashAggregate -> Parallel Seq Scan: each worker scans part of the table.

-- Client side: a connection pool bounds how many queries run at once (PgBouncer, HikariCP, pgxpool).`,
      },
      python: {
        code: `from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def square(n: int) -> int:
    return n * n

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=8) as pool:           # I/O-bound work
        print(list(pool.map(square, range(10))))              # results in input order

    with ProcessPoolExecutor() as pool:                       # CPU-bound work: one process per core
        print(list(pool.map(square, range(10), chunksize=2)))  # chunksize reduces per-item overhead`,
      },
      typescript: {
        code: `// Limit concurrency with a small worker loop over a shared index (one thread, async I/O).
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;                 // safe: no await between read and increment
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;                            // in input order
}

const doubled = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => n * 2);
// CPU-bound work needs worker_threads (or a library such as piscina).`,
      },
      spark: {
        code: `# Spark IS a parallel map: each partition is processed by a task on the executor pool.
rdd = spark.sparkContext.parallelize(range(10), numSlices=4)
squares = rdd.map(lambda n: n * n).collect()          # order preserved

# mapPartitions amortises per-task setup (connections, models) across a whole partition:
def square_partition(numbers):
    for n in numbers:
        yield n * n

rdd.mapPartitions(square_partition).collect()

frame = spark.range(10).withColumn("sq", F.col("id") * F.col("id"))   # prefer built-in expressions`,
      },
      rust: {
        code: `use rayon::prelude::*;

fn main() {
    // Rayon: a global work-stealing thread pool sized to the CPU count.
    let squares: Vec<u64> = (0..10u64).into_par_iter().map(|n| n * n).collect();   // order preserved
    let total: u64 = (0..1_000_000u64).into_par_iter().sum();
    println!("{squares:?} {total}");

    // A pool with an explicit size:
    let pool = rayon::ThreadPoolBuilder::new().num_threads(4).build().unwrap();
    pool.install(|| (0..10).into_par_iter().for_each(|n| println!("{n}")));
}
// Requires: rayon = "1". Because closures must be Send and data Sync, the compiler rejects racy code.
// Async I/O pools: tokio::task::JoinSet or futures::stream::StreamExt::buffer_unordered(limit).`,
      },
      cpp: {
        code: `#include <algorithm>
#include <execution>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> values(10);
    std::iota(values.begin(), values.end(), 0);

    // C++17 parallel algorithms: the library chooses the threads (needs TBB with libstdc++).
    std::vector<int> squares(values.size());
    std::transform(std::execution::par, values.begin(), values.end(), squares.begin(),
                   [](int n) { return n * n; });

    long total = std::reduce(std::execution::par, squares.begin(), squares.end(), 0L);
}
// Link with -ltbb on GCC. For an explicit pool use a library (Boost.Asio thread_pool, TBB, taskflow)
// or build one from std::jthread, a queue, and a condition variable (see the "Built from scratch" module).`,
      },
      go: {
        code: `func main() {
    jobs := make(chan int)
    results := make([]int, 10)                 // each worker writes distinct indices: no race
    var group sync.WaitGroup

    workerCount := runtime.NumCPU()            // size the pool to the CPU count
    for w := 0; w < workerCount; w++ {
        group.Add(1)
        go func() {
            defer group.Done()
            for index := range jobs { results[index] = index * index }
        }()
    }
    for index := range results { jobs <- index }
    close(jobs)                                // workers drain and exit
    group.Wait()
    fmt.Println(results)
}
// golang.org/x/sync/errgroup with SetLimit(n) bounds concurrency and collects the first error.`,
      },
      swift: {
        code: `func square(_ n: Int) async -> Int { n * n }

func parallelMap(_ items: [Int], limit: Int) async -> [Int] {
    await withTaskGroup(of: (Int, Int).self) { group in
        var results = [Int](repeating: 0, count: items.count)
        var next = 0
        func addNext() {
            guard next < items.count else { return }
            let index = next; next += 1
            group.addTask { (index, await square(items[index])) }
        }
        for _ in 0..<limit { addNext() }              // seed 'limit' tasks
        for await (index, value) in group {
            results[index] = value                    // keep input order
            addNext()                                 // start the next as one finishes
        }
        return results
    }
}
print(await parallelMap(Array(0..<10), limit: 4))
// Synchronous alternative: DispatchQueue.concurrentPerform(iterations:).`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

suspend fun <T, R> List<T>.parallelMap(limit: Int, transform: suspend (T) -> R): List<R> = coroutineScope {
    val permits = Semaphore(limit)                       // bound concurrency
    map { item -> async { permits.withPermit { transform(item) } } }.awaitAll()   // input order
}

fun main() = runBlocking {
    val squares = (0 until 10).toList().parallelMap(limit = 4) { n -> delay(10); n * n }
    println(squares)
}
// For a fixed thread pool: Executors.newFixedThreadPool(8).asCoroutineDispatcher(),
// or limitedParallelism(8) on Dispatchers.Default / Dispatchers.IO.`,
      },
    },
    takeaway:
      'Size a pool to the work: about the core count for CPU-bound jobs, larger for I/O waits. Use a library parallel map where one exists (Rayon, ProcessPoolExecutor, errgroup), and keep each worker writing its own output slot.',
  },
];
