import type { LanguageTraits } from './types';

/**
 * The defining runtime characteristics of each language. Shape is
 * { languageId, traits[] }, one entry per language, in curriculum order.
 */
export const LANGUAGE_TRAITS: LanguageTraits[] = [
  {
    languageId: 'rust',
    traits: [
      {
        id: 'ownership',
        title: 'Ownership',
        summary:
          'Every value has exactly one owner. When the owner goes out of scope the value is dropped, and assigning or passing a non-Copy value moves ownership. That gives deterministic cleanup with no garbage collector.',
        snippet: {
          code: `fn main() {
    let a = String::from("hello");   // 'a' owns a heap buffer
    let b = a;                       // MOVE: ownership transfers to 'b'
    // println!("{a}");              // error[E0382]: borrow of moved value: 'a'
    println!("{b}");

    let n = 5;
    let m = n;                       // i32 is Copy: both remain valid
    println!("{n} {m}");

    takes(b);                        // 'b' moved into the function
    // println!("{b}");              // error: value moved
}   // nothing to free here: 'takes' already dropped it

fn takes(text: String) { println!("{text}"); }   // 'text' dropped at the closing brace`,
          note: 'Prevents double free and use-after-free at compile time.',
        },
      },
      {
        id: 'borrowing',
        title: 'Borrowing',
        summary:
          'References borrow a value without taking ownership. You may have any number of shared (&T) references or exactly one mutable (&mut T) reference, never both at once. This rule rules out data races.',
        snippet: {
          code: `fn length(text: &String) -> usize { text.len() }      // shared borrow: read only
fn shout(text: &mut String) { text.push('!'); }       // mutable borrow: exclusive

fn main() {
    let mut s = String::from("hi");
    let r1 = &s;
    let r2 = &s;                    // many readers are fine
    println!("{} {} {}", r1, r2, length(&s));

    let w = &mut s;                 // r1 and r2 are no longer used, so this is allowed
    shout(w);
    // let r3 = &s; shout(w);       // error[E0502]: cannot borrow as immutable, already mutable
    println!("{s}");
}`,
          note: 'The rule is "many readers XOR one writer", checked at compile time.',
        },
      },
      {
        id: 'lifetimes',
        title: 'Lifetimes',
        summary:
          'A lifetime is the region of code in which a reference is valid. Annotations tell the compiler how the lifetimes of inputs and outputs relate, so a reference can never outlive the data it points to.',
        snippet: {
          code: `// The returned reference lives no longer than the shorter of the two inputs.
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() >= y.len() { x } else { y }
}

fn main() {
    let outer = String::from("long string");
    let result;
    {
        let inner = String::from("short");
        result = longest(outer.as_str(), inner.as_str());
        println!("{result}");        // fine here: both inputs are alive
    }
    // println!("{result}");         // error[E0597]: 'inner' does not live long enough
}

struct Parser<'a> { input: &'a str }  // a struct that borrows must name the lifetime`,
          note: 'Lifetimes are erased after checking: they cost nothing at run time.',
        },
      },
    ],
  },
  {
    languageId: 'cpp',
    traits: [
      {
        id: 'raii',
        title: 'RAII',
        summary:
          'Resource Acquisition Is Initialization ties a resource (memory, file, lock) to an object’s lifetime. The constructor acquires it and the destructor releases it, so cleanup happens on every exit path, including exceptions.',
        snippet: {
          code: `#include <fstream>
#include <mutex>
#include <memory>

std::mutex mutex;

void work() {
    std::lock_guard<std::mutex> lock(mutex);   // locks now, unlocks on scope exit
    std::ofstream file("out.txt");             // closes on scope exit
    auto buffer = std::make_unique<char[]>(1024); // freed on scope exit
    risky();                                    // even if this throws, all three are released
}   // destructors run in reverse order of construction`,
          note: 'No finally blocks and no manual free: scope is the cleanup mechanism.',
        },
      },
      {
        id: 'move-semantics',
        title: 'Move semantics',
        summary:
          'Moving transfers the contents of an object to another instead of copying them. A moved-from object is left valid but unspecified. This makes returning and storing large objects cheap.',
        snippet: {
          code: `#include <string>
#include <utility>
#include <vector>

std::vector<int> make() {
    std::vector<int> values(1'000'000, 7);
    return values;                   // moved (or elided): the buffer is not copied
}

int main() {
    std::string a = "a long string that lives on the heap........";
    std::string b = a;               // COPY: allocates and duplicates the characters
    std::string c = std::move(a);    // MOVE: steals the buffer; 'a' is now empty/unspecified
    std::vector<std::string> names;
    names.push_back(std::move(c));   // no copy into the vector
}`,
          note: 'std::move is just a cast to an rvalue reference; the move constructor does the work.',
        },
      },
    ],
  },
  {
    languageId: 'go',
    traits: [
      {
        id: 'goroutines',
        title: 'Goroutines',
        summary:
          'A goroutine is a lightweight task scheduled by the Go runtime onto a small pool of OS threads. Each starts with a stack of a few kilobytes, so hundreds of thousands can run at once.',
        snippet: {
          code: `package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    for id := 1; id <= 3; id++ {
        wg.Add(1)
        go func(n int) {          // 'go' starts a goroutine; the call returns immediately
            defer wg.Done()
            fmt.Println("worker", n)
        }(id)                     // pass id: do not capture a shared loop variable (pre-Go 1.22)
    }
    wg.Wait()                     // block until all goroutines finish
}`,
          note: 'The runtime multiplexes goroutines (M:N scheduling), so blocking one does not block a thread.',
        },
      },
      {
        id: 'channels',
        title: 'Channels (CSP)',
        summary:
          'Channels are typed pipes for passing values between goroutines. This is the CSP model: share memory by communicating, instead of communicating by sharing memory under a lock.',
        snippet: {
          code: `func main() {
    jobs := make(chan int)            // unbuffered: send blocks until a receiver is ready
    results := make(chan int, 3)      // buffered: holds up to 3 values

    go func() {
        defer close(jobs)             // closing signals "no more values"
        for n := 1; n <= 3; n++ {
            jobs <- n
        }
    }()

    for n := range jobs {             // receive until the channel is closed
        results <- n * n
    }
    close(results)
    for square := range results {
        fmt.Println(square)
    }

    select {                          // wait on several channels
    case value := <-results:
        fmt.Println(value)
    case <-time.After(time.Second):
        fmt.Println("timeout")
    }
}`,
          note: 'Always know which goroutine closes a channel; sending on a closed channel panics.',
        },
      },
      {
        id: 'implicit-interfaces',
        title: 'Implicit interfaces',
        summary:
          'A type satisfies an interface by having the required methods. It never declares that it does. Interfaces are defined where they are used, and kept small.',
        snippet: {
          code: `type Reader interface {           // defined by the consumer
    Read(p []byte) (int, error)
}

type File struct{}
func (File) Read(p []byte) (int, error) { return 0, io.EOF }   // no 'implements' anywhere

func consume(r Reader) {}

func main() {
    consume(File{})               // File satisfies Reader structurally
    var _ Reader = File{}         // compile-time assertion that it does
}`,
          note: 'Decouples packages: a library can accept an interface it has never imported.',
        },
      },
    ],
  },
  {
    languageId: 'swift',
    traits: [
      {
        id: 'arc',
        title: 'ARC',
        summary:
          'Automatic Reference Counting inserts retain and release calls at compile time. An object is freed the moment its count reaches zero. Reference cycles are not collected, so use weak or unowned references to break them.',
        snippet: {
          code: `final class Person {
    let name: String
    var apartment: Apartment?
    init(name: String) { self.name = name }
    deinit { print("\\(name) freed") }
}
final class Apartment {
    weak var tenant: Person?          // weak: does not add to the retain count
    deinit { print("apartment freed") }
}

var person: Person? = Person(name: "Ada")
let flat = Apartment()
person?.apartment = flat
flat.tenant = person
person = nil                          // prints "Ada freed": no leak because the back-reference is weak`,
          note: 'Deterministic like RAII, with no GC pauses, but cycles are your responsibility.',
        },
      },
      {
        id: 'optionals',
        title: 'Optionals',
        summary:
          'A value that may be absent has a distinct type, Optional<T>, written T?. The compiler forces you to unwrap it before use, which removes null-pointer crashes from ordinary code.',
        snippet: {
          code: `let numbers = ["1", "x"]
let parsed: [Int?] = numbers.map { Int($0) }     // [Optional(1), nil]

var name: String? = "Ada"
if let name {                                     // unwrap safely
    print(name.count)
}
let length = name?.count ?? 0                     // optional chaining + default
// let bad = name!.count                          // force unwrap: crashes if nil

func first(_ items: [Int]) -> Int? { items.first }
guard let value = first([]) else { print("empty"); return }`,
        },
      },
      {
        id: 'value-vs-reference',
        title: 'Value vs reference semantics',
        summary:
          'Structs, enums, and the standard collections are value types: assignment copies (lazily, using copy-on-write). Classes are reference types: assignment shares the instance. Choose by whether identity matters.',
        snippet: {
          code: `struct PointValue { var x = 0 }
final class PointRef { var x = 0 }

var a = PointValue(); var b = a
b.x = 5
print(a.x, b.x)        // 0 5   independent copies

let c = PointRef(); let d = c
d.x = 5
print(c.x, d.x)        // 5 5   one shared instance

var list1 = [1, 2, 3]
var list2 = list1      // no copy yet (copy-on-write)
list2.append(4)        // the buffer is copied now, because it is mutated`,
        },
      },
    ],
  },
  {
    languageId: 'kotlin',
    traits: [
      {
        id: 'null-safety',
        title: 'Null safety',
        summary:
          'Nullability is part of the type: String cannot hold null, String? can. The compiler rejects unsafe dereferences and smart-casts after a null check.',
        snippet: {
          code: `fun length(text: String?): Int {
    // text.length                      // compile error: 'text' may be null
    if (text != null) return text.length   // smart cast to String inside the branch
    return 0
}

val user: User? = findUser()
val city = user?.address?.city ?: "unknown"   // safe calls plus the Elvis operator
val forced = user!!.name                       // '!!' throws NullPointerException if null`,
        },
      },
      {
        id: 'data-classes',
        title: 'Data classes',
        summary:
          'A data class generates equals, hashCode, toString, copy, and destructuring from its constructor properties, removing boilerplate for value-holding types.',
        snippet: {
          code: `data class User(val name: String, val age: Int)

val ada = User("Ada", 36)
val older = ada.copy(age = 37)             // copy with one change
println(ada)                               // User(name=Ada, age=36)
println(ada == User("Ada", 36))            // true: structural equality
val (name, age) = ada                      // destructuring`,
        },
      },
      {
        id: 'structured-coroutines',
        title: 'Structured coroutines',
        summary:
          'Coroutines are lightweight suspendable functions. Structured concurrency ties each coroutine to a scope: the parent waits for its children, and cancelling or failing one propagates through the scope.',
        snippet: {
          code: `import kotlinx.coroutines.*

suspend fun fetch(label: String): String {
    delay(1000)                              // suspends without blocking a thread
    return label
}

fun main() = runBlocking {
    coroutineScope {                         // returns only when ALL children finish
        val first = async { fetch("a") }
        val second = async { fetch("b") }
        println("\${first.await()} \${second.await()}")   // ~1 second, not 2
    }
}   // if one child throws, its sibling is cancelled automatically`,
          note: 'Requires the kotlinx-coroutines library; suspend functions are compiled to state machines.',
        },
      },
    ],
  },
  {
    languageId: 'python',
    traits: [
      {
        id: 'duck-typing',
        title: 'Duck typing',
        summary:
          'Python cares about what an object can do, not what class it has. If it has the method you call, it works; if not, you get an error at the point of use.',
        snippet: {
          code: `class Duck:
    def speak(self): return "quack"

class Robot:
    def speak(self): return "beep"

def announce(thing):
    print(thing.speak())      # no type check: anything with .speak() works

announce(Duck()); announce(Robot())
# announce(42)                # AttributeError at run time

from typing import Protocol
class Speaker(Protocol):      # optional: static checkers can verify the same idea
    def speak(self) -> str: ...`,
        },
      },
      {
        id: 'comprehensions',
        title: 'List and dict comprehensions',
        summary:
          'A comprehension builds a collection from an iterable in a single expression, with an optional filter. It is usually clearer and faster than appending in a loop.',
        snippet: {
          code: `numbers = range(10)
squares = [n * n for n in numbers if n % 2 == 0]       # [0, 4, 16, 36, 64]
lookup  = {n: n * n for n in numbers}                  # dict comprehension
unique  = {n % 3 for n in numbers}                     # set comprehension
pairs   = [(a, b) for a in range(2) for b in "xy"]     # nested loops, left to right`,
        },
      },
      {
        id: 'generators',
        title: 'Generators and yield',
        summary:
          'A function containing yield returns a lazy iterator that produces one value at a time and keeps its local state between calls. Memory use stays constant however long the sequence is.',
        snippet: {
          code: `def fibonacci():
    a, b = 0, 1
    while True:
        yield a               # pause here; resume on the next request
        a, b = b, a + b

from itertools import islice
print(list(islice(fibonacci(), 8)))        # [0, 1, 1, 2, 3, 5, 8, 13]

total = sum(n * n for n in range(1_000_000))   # generator expression: no list in memory`,
        },
      },
    ],
  },
  {
    languageId: 'typescript',
    traits: [
      {
        id: 'structural-typing',
        title: 'Structural typing',
        summary:
          'Compatibility depends on the shape of a type (its members), not on its declared name. Any value with the right properties is accepted.',
        snippet: {
          code: `interface Point { x: number; y: number }
interface Pixel { x: number; y: number; color: string }

function norm(point: Point) { return Math.hypot(point.x, point.y); }

const pixel: Pixel = { x: 3, y: 4, color: "red" };
console.log(norm(pixel));      // 5: Pixel has every member Point requires

// Excess property checks apply only to fresh object literals:
// norm({ x: 3, y: 4, color: "red" });   // error: object literal may only specify known properties`,
        },
      },
      {
        id: 'union-narrowing',
        title: 'Union type narrowing',
        summary:
          'A union type lists the possible shapes of a value. Checks such as typeof, in, or a discriminant field narrow it to one member inside each branch, and an exhaustiveness check makes a missing case a compile error.',
        snippet: {
          code: `type Result =
  | { status: "ok"; value: number }
  | { status: "error"; message: string };

function show(result: Result): string {
  if (result.status === "ok") return String(result.value);   // narrowed to the ok variant
  return result.message;                                      // narrowed to the error variant
}

function size(input: string | string[]): number {
  return typeof input === "string" ? input.length : input.length;   // typeof narrows
}`,
        },
      },
    ],
  },
  {
    languageId: 'sql',
    traits: [
      {
        id: 'set-based',
        title: 'Set-based relational thinking',
        summary:
          'You describe the result you want over whole sets of rows. The optimizer chooses scans, indexes, join order, and parallelism. A row-by-row loop usually means fighting the engine.',
        snippet: {
          code: `-- Declarative: total per customer, top 3 customers, in one statement.
SELECT customer_id, sum(amount) AS total
FROM orders
WHERE created_at >= date '2026-01-01'
GROUP BY customer_id
ORDER BY total DESC
LIMIT 3;

-- Ask the planner how it will do it:
EXPLAIN ANALYZE SELECT customer_id, sum(amount) FROM orders GROUP BY customer_id;`,
        },
      },
      {
        id: 'null-logic',
        title: 'NULL and three-valued logic',
        summary:
          'NULL means unknown, so comparisons with it yield unknown, not true or false. A WHERE clause keeps only rows that are true, which silently drops rows with NULLs.',
        snippet: {
          code: `SELECT NULL = NULL;              -- NULL (unknown), not true
SELECT NULL IS NULL;             -- true
SELECT 1 NOT IN (2, NULL);       -- NULL: one unknown makes the whole test unknown

-- Rows with NULL region are excluded by BOTH of these:
SELECT * FROM t WHERE region = 'EU';
SELECT * FROM t WHERE region <> 'EU';

-- Include them explicitly:
SELECT * FROM t WHERE region IS DISTINCT FROM 'EU';
SELECT coalesce(region, 'unknown') FROM t;`,
        },
      },
    ],
  },
  {
    languageId: 'spark',
    traits: [
      {
        id: 'lazy-dag',
        title: 'Lazy evaluation and the DAG',
        summary:
          'Transformations do not run when you call them. Spark records them as a directed acyclic graph (DAG) and executes the optimized plan only when an action such as count or write demands a result.',
        snippet: {
          code: `from pyspark.sql import functions as F

orders = spark.read.parquet("orders")                    # nothing read yet
big = orders.filter(F.col("amount") > 100)               # still just a plan
totals = big.groupBy("customer_id").agg(F.sum("amount")) # still just a plan

totals.explain(True)     # shows the logical and physical plan Catalyst produced
totals.count()           # ACTION: now the job is planned, split into stages, and run`,
          note: 'Laziness lets the optimizer push filters down and prune columns before reading data.',
        },
      },
      {
        id: 'immutability-lineage',
        title: 'Immutability and lineage',
        summary:
          'RDDs and DataFrames never change. Each transformation creates a new dataset that remembers its parents. If a partition is lost, Spark recomputes it from lineage instead of restoring a copy.',
        snippet: {
          code: `rdd = spark.sparkContext.parallelize(range(10), 4)
doubled = rdd.map(lambda n: n * 2)        # a new RDD; 'rdd' is unchanged
evens = doubled.filter(lambda n: n % 4 == 0)

print(evens.toDebugString().decode())     # prints the lineage graph
evens.cache()                             # keep it, so recomputation is not needed each time`,
        },
      },
      {
        id: 'shuffle',
        title: 'Shuffle mechanics',
        summary:
          'Narrow transformations (map, filter) work within a partition. Wide ones (groupBy, join, repartition) must move data across the network so rows with the same key meet. That shuffle is the dominant cost of most Spark jobs.',
        snippet: {
          code: `from pyspark.sql import functions as F

narrow = orders.filter("amount > 0")                      # no data movement
wide = orders.groupBy("customer_id").count()              # shuffle: hash-partition by key

# Reduce the cost: broadcast the small side so the large side is not shuffled.
joined = orders.join(F.broadcast(customers), "customer_id")

spark.conf.set("spark.sql.shuffle.partitions", "200")     # number of post-shuffle partitions`,
          note: 'Check the Spark UI stage view for shuffle read/write sizes and skewed tasks.',
        },
      },
    ],
  },
];
