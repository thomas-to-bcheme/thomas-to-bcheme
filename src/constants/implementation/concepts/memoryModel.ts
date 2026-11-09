import type { Concept } from './types';

export const MEMORY_MODEL_CONCEPTS: Concept[] = [
  {
    id: 'stack-heap',
    part: 'memory-model',
    navLabel: 'Stack vs heap',
    title: 'Stack versus heap allocation',
    summary:
      'The stack holds one frame per active call: fast to allocate, released automatically on return. The heap holds data of unknown size or lifetime and must be freed by someone.',
    snippets: {
      sql: {
        code: `-- The engine owns memory. Work areas are sized by settings, not by your code.
SET work_mem = '64MB';       -- per sort/hash operation; spills to disk when exceeded
EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_id, count(*) FROM orders GROUP BY customer_id;
-- Look for 'Sort Method: external merge  Disk: ...' = the work area overflowed.`,
        note: 'No stack or heap you can touch; the closest control is work_mem and shared buffers.',
      },
      python: {
        code: `import sys

a = 5                      # every value is an object on the heap; 'a' is a reference
b = [1, 2, 3]
print(sys.getsizeof(a), sys.getsizeof(b))   # object headers add overhead (28 and 88 bytes here)
print(id(a), id(b))        # identity ~ the object's address

# Only the interpreter's call frames use the C stack; your objects always live on the heap.`,
      },
      typescript: {
        code: `// V8 keeps small integers and references in registers or on the stack;
// objects, arrays, strings, and closures live on the garbage-collected heap.
const small = 5;                        // primitive: stored by value
const object = { name: "Ada" };         // allocated on the heap; 'object' is a reference

function frame(n: number): number { return n <= 0 ? 0 : 1 + frame(n - 1); }
// Each call adds a stack frame; the limit is roughly 10,000 frames.`,
      },
      spark: {
        code: `# Spark splits executor memory into execution (shuffles, joins, sorts)
# and storage (cached data), both on the JVM heap plus optional off-heap.
spark = (SparkSession.builder
    .config("spark.executor.memory", "4g")
    .config("spark.memory.fraction", "0.6")      # share used for execution + storage
    .config("spark.memory.offHeap.enabled", "true")
    .config("spark.memory.offHeap.size", "2g")
    .getOrCreate())`,
      },
      rust: {
        code: `fn main() {
    let number: i32 = 5;                 // stack: fixed size, freed when the frame returns
    let array = [0u8; 4];                // stack: size known at compile time
    let boxed = Box::new(5);             // heap: 'boxed' (a pointer) is on the stack
    let growable = vec![1, 2, 3];        // heap buffer; ptr, len, capacity on the stack
    println!("{} {}", std::mem::size_of_val(&growable), std::mem::size_of_val(&array)); // 24 4
}   // 'boxed' and 'growable' are freed here, deterministically, in reverse order`,
      },
      cpp: {
        code: `#include <memory>
#include <vector>

void example() {
    int number = 5;                              // stack
    int array[4] = {0};                          // stack
    int* raw = new int(5);                       // heap: you must delete it
    delete raw;
    auto owned = std::make_unique<int>(5);       // heap, freed automatically at scope exit
    std::vector<int> values{1, 2, 3};            // control block on stack, buffer on heap
}   // locals destroyed in reverse order; a leaked 'new' is never freed`,
      },
      go: {
        code: `type Point struct{ X, Y int }

func onStack() int {
    p := Point{1, 2}        // stays on the goroutine stack if it does not escape
    return p.X
}

func onHeap() *Point {
    p := Point{1, 2}
    return &p               // 'p' escapes: the compiler allocates it on the heap
}
// Inspect decisions with: go build -gcflags=-m`,
      },
      swift: {
        code: `struct Point { var x = 0, y = 0 }    // value type: typically stored inline on the stack
class Node { var value = 0 }         // reference type: allocated on the heap, managed by ARC

func demo() {
    let point = Point()              // stack (or inline in its owner)
    let node = Node()                // heap; 'node' is a pointer on the stack
    print(point.x, node.value)
}   // node's retain count drops to zero here and it is freed`,
      },
      kotlin: {
        code: `// On the JVM, local primitives and references live in stack frames;
// every object (including arrays and boxed numbers) lives on the garbage-collected heap.
fun demo() {
    val number = 5                   // primitive int in the frame
    val list = mutableListOf(1, 2)   // reference in the frame, ArrayList on the heap
    val boxed: Int? = 5              // nullable Int is a boxed java.lang.Integer on the heap
}
// Escape analysis in the JIT can sometimes allocate short-lived objects on the stack.`,
      },
    },
    takeaway:
      'Stack allocation is just moving a pointer, and it is freed by returning. Heap allocation costs more, can fragment, and needs an owner: manual, ownership-based, reference-counted, or garbage collected.',
  },
  {
    id: 'pointers-aliasing',
    part: 'memory-model',
    navLabel: 'Pointers & aliasing',
    title: 'Pointers, references, and aliasing',
    summary:
      'A pointer is a memory address. Aliasing means two names reach the same memory; when one of them writes, readers can see surprising results or race.',
    snippets: {
      sql: {
        code: `-- No pointers. Aliasing appears as two names for one table in a self-join,
-- which are independent row streams at run time.
SELECT a.id, b.id AS parent_id
FROM nodes a
JOIN nodes b ON b.id = a.parent_id;

-- Row identity is a key, not an address (ctid exists, but is not stable).`,
        note: 'Keys play the role of references; the engine controls where rows physically live.',
      },
      python: {
        code: `a = [1, 2, 3]
b = a                  # an alias: both names reference the SAME list
b.append(4)
print(a)               # [1, 2, 3, 4]
print(a is b)          # True: identity comparison
c = a.copy()           # independent shallow copy
print(a is c, a == c)  # False True`,
      },
      typescript: {
        code: `const a = { items: [1, 2, 3] };
const b = a;                        // alias
b.items.push(4);
console.log(a.items);               // [1, 2, 3, 4]

const c = structuredClone(a);       // deep copy
const d = { ...a };                 // shallow copy: d.items is STILL the same array
console.log(a === b, a === c, a.items === d.items); // true false true`,
      },
      spark: {
        code: `# DataFrames are immutable descriptions, so aliases cannot disturb each other.
a = spark.range(5)
b = a
c = b.withColumn("double", F.col("id") * 2)   # a new DataFrame; 'a' and 'b' unchanged
# Mutable shared state across tasks is not allowed; use Accumulators or aggregate instead.`,
        note: 'Immutability removes aliasing hazards in a distributed setting.',
      },
      rust: {
        code: `let mut value = 5;
let reader1 = &value;            // shared borrows may alias freely...
let reader2 = &value;
println!("{reader1} {reader2}");

let writer = &mut value;         // ...but a mutable borrow must be the ONLY one
*writer += 1;
// println!("{reader1}");        // error: cannot use a shared borrow after a mutable one begins
// Rule: many readers XOR one writer. This is what rules out data races at compile time.`,
      },
      cpp: {
        code: `int value = 5;
int* p = &value;          // p holds the address of value
int* q = p;               // alias: p and q point to the same int
*q = 6;
std::cout << *p;          // 6

int array[3] = {10, 20, 30};
int* cursor = array;
cursor += 1;              // pointer arithmetic: advances by sizeof(int) bytes
std::cout << *cursor;     // 20
// array[3] or *(cursor + 5) is out of bounds: undefined behaviour, no check.`,
      },
      go: {
        code: `value := 5
p := &value               // pointer to value
q := p                    // alias
*q = 6
fmt.Println(*p)           // 6

a := []int{1, 2, 3}
b := a                    // b shares a's backing array
b[0] = 99
fmt.Println(a[0])         // 99
// No pointer arithmetic; the unsafe package is the escape hatch.`,
      },
      swift: {
        code: `final class Box { var value = 0 }
let a = Box()
let b = a                  // alias: both reference the same instance
b.value = 5
print(a.value)             // 5

var x = [1, 2, 3]
var y = x                  // value semantics: copy-on-write makes y independent
y.append(4)
print(x, y)                // [1, 2, 3] [1, 2, 3, 4]`,
      },
      kotlin: {
        code: `val a = mutableListOf(1, 2, 3)
val b = a                  // alias: references to the same list
b.add(4)
println(a)                 // [1, 2, 3, 4]
println(a === b)           // true: referential equality

val c = a.toMutableList()  // independent copy
println(a == c)            // true: structural equality`,
      },
    },
    takeaway:
      'Aliasing plus mutation is the root of data races and iterator-invalidation bugs. Rust forbids it by default; elsewhere you manage it with immutability, copies, or locks.',
  },
  {
    id: 'memory-management',
    part: 'memory-model',
    navLabel: 'Who frees memory',
    title: 'Memory management models',
    summary:
      'Heap memory has to be released. The model that decides when ranges from manual, to ownership at compile time, to reference counting, to a tracing garbage collector.',
    snippets: {
      sql: {
        code: `-- The database manages buffers. MVCC leaves dead row versions that VACUUM reclaims.
VACUUM (VERBOSE) orders;
SELECT relname, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'orders';`,
        note: 'Engine-managed. Cleanup is a maintenance process, not an allocation you control.',
      },
      python: {
        code: `import gc, sys

x = []
print(sys.getrefcount(x))   # reference counting frees an object as soon as the count hits zero

a, b = [], []
a.append(b); b.append(a)    # a reference cycle: counts never reach zero
del a, b
print(gc.collect())         # the cycle collector finds and frees the unreachable cycle`,
      },
      typescript: {
        code: `// V8 uses a generational, tracing garbage collector: it finds unreachable objects
// by tracing from roots, so cycles are collected naturally.
let cache: Record<string, object> = {};
function leak(key: string) { cache[key] = new Array(1_000_000); }  // reachable forever: a leak
// Fix: delete entries, or use WeakMap / WeakRef so the GC may reclaim them.
const weak = new WeakMap<object, string>();`,
      },
      spark: {
        code: `# Executors run on the JVM, so objects are garbage collected, but large datasets
# are stored in compact binary form (Tungsten) to reduce GC pressure.
frame.persist()          # keep partitions in memory/disk across actions
frame.count()
frame.unpersist()        # release the cache explicitly
# Long GC pauses show up in the Spark UI under the executor's GC Time.`,
      },
      rust: {
        code: `struct Resource;
impl Drop for Resource {
    fn drop(&mut self) { println!("freed"); }
}

fn main() {
    let first = Resource;
    let second = first;          // ownership moves; 'first' is no longer usable
    {
        let _inner = Resource;
    }                            // 'freed' printed here: deterministic, at scope end
}   // 'second' dropped here. No GC, no manual free, no double free.`,
      },
      cpp: {
        code: `#include <memory>

struct Resource { ~Resource() { /* release */ } };

void example() {
    auto unique = std::make_unique<Resource>();     // sole owner, freed at scope exit
    auto shared = std::make_shared<Resource>();     // reference counted
    auto copy = shared;                             // count = 2
}   // RAII: destructors run in reverse order of construction

// Manual: Resource* r = new Resource; ... delete r;  // forget it and you leak`,
      },
      go: {
        code: `type Resource struct{ data []byte }

func use() {
    r := &Resource{data: make([]byte, 1<<20)}
    _ = r
}   // no free call: a concurrent mark-sweep GC reclaims 'r' once it is unreachable

// Tune with GOGC or runtime/debug.SetGCPercent; observe with runtime.ReadMemStats.`,
      },
      swift: {
        code: `final class Owner { var child: Child? }
final class Child { weak var owner: Owner? }   // 'weak' breaks the retain cycle

var owner: Owner? = Owner()
owner?.child = Child()
owner?.child?.owner = owner
owner = nil                // ARC: retain count reaches zero, deinit runs immediately
// With a strong back-reference, both objects would leak.`,
      },
      kotlin: {
        code: `// JVM tracing garbage collector (G1 by default, ZGC for low latency).
class Resource : AutoCloseable {
    override fun close() = println("released")
}

fun main() {
    Resource().use { /* work */ }   // 'use' closes deterministically; GC is for memory only
}
// Finalizers/GC timing are not guaranteed, so release files and sockets explicitly.`,
      },
    },
    takeaway:
      'Choose by cost: manual and RAII are exact and cheap but demand discipline; ARC is deterministic but can leak cycles; tracing GC is convenient but adds pauses and memory overhead.',
  },
];
