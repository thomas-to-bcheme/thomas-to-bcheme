import type { Concept } from './types';

export const CONTROL_FLOW_CONCEPTS: Concept[] = [
  {
    id: 'loops',
    part: 'control-flow',
    navLabel: 'Loops',
    title: 'Loops and iteration',
    summary:
      'Most languages offer counted loops, condition loops, and iteration over a collection. Set-based systems replace the loop with a whole-dataset operation.',
    snippets: {
      sql: {
        code: `-- Set-based: describe the result, let the engine iterate.
SELECT sum(n) AS total FROM generate_series(1, 5) AS n;  -- 15

-- Procedural (PL/pgSQL), when a loop is truly needed:
-- FOR i IN 1..5 LOOP total := total + i; END LOOP;`,
        note: 'Prefer one set-based statement; row-by-row loops are usually far slower.',
      },
      python: {
        code: `total = 0
for n in range(1, 6):          # iterates an iterator; no index bookkeeping
    total += n

for index, name in enumerate(["a", "b"]):
    print(index, name)

while total > 10:              # condition loop
    total -= 5`,
      },
      typescript: {
        code: `let total = 0;
for (let n = 1; n <= 5; n++) total += n;     // classic counted loop

for (const name of ["a", "b"]) {             // values of an iterable
  console.log(name);
}
for (const key in { a: 1, b: 2 }) {          // keys (strings) of an object
  console.log(key);
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# No explicit loop: a transformation runs on every partition in parallel.
spark.range(1, 6).agg(F.sum("id").alias("total")).show()  # 15

# A driver-side Python loop only builds the plan; it does not touch the data.`,
        note: 'Looping over rows on the driver (collect) pulls all data into one machine.',
      },
      rust: {
        code: `let mut total = 0;
for n in 1..=5 {                    // inclusive range; the loop borrows no index
    total += n;
}

let items = vec!["a", "b"];
for (index, name) in items.iter().enumerate() {
    println!("{index} {name}");
}

let found = loop {                  // 'loop' is an expression that can return a value
    break 42;
};
let sum: i32 = (1..=5).sum();       // iterator adaptors compile to a tight loop`,
      },
      cpp: {
        code: `#include <vector>
#include <iostream>

int main() {
    int total = 0;
    for (int n = 1; n <= 5; ++n) total += n;

    std::vector<std::string> items{"a", "b"};
    for (const auto& name : items) {   // range-for: no copy with const auto&
        std::cout << name << "\\n";
    }
    while (total > 10) total -= 5;
}`,
      },
      go: {
        code: `total := 0
for n := 1; n <= 5; n++ { // the only loop keyword is 'for'
    total += n
}

items := []string{"a", "b"}
for index, name := range items { // range over slices, maps, strings, channels
    fmt.Println(index, name)
}

for total > 10 { // 'for' with only a condition is a while loop
    total -= 5
}`,
      },
      swift: {
        code: `var total = 0
for n in 1...5 { total += n }       // closed range

for (index, name) in ["a", "b"].enumerated() {
    print(index, name)
}

while total > 10 { total -= 5 }
repeat { total += 1 } while total < 3  // body runs at least once`,
      },
      kotlin: {
        code: `var total = 0
for (n in 1..5) total += n          // inclusive range

for ((index, name) in listOf("a", "b").withIndex()) {
    println("$index $name")
}

repeat(3) { println("tick $it") }   // a function, not a keyword
val sum = (1..5).sum()`,
      },
    },
    takeaway:
      'Iterating a collection directly is safer than managing an index. In SQL and Spark, the loop moves into the engine and you describe the whole operation instead.',
  },
  {
    id: 'branching',
    part: 'control-flow',
    navLabel: 'If / else',
    title: 'Conditionals and branching',
    summary:
      'Branching chooses between paths. In several languages the branch is an expression that produces a value.',
    snippets: {
      sql: {
        code: `SELECT score,
       CASE
         WHEN score >= 90 THEN 'A'
         WHEN score >= 80 THEN 'B'
         ELSE 'C'
       END AS grade
FROM results;`,
        note: 'CASE is an expression evaluated per row; the first matching WHEN wins.',
      },
      python: {
        code: `def grade(score: int) -> str:
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    return "C"

label = "pass" if score >= 50 else "fail"   # conditional expression`,
      },
      typescript: {
        code: `function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  return "C";
}

const label = score >= 50 ? "pass" : "fail";
const name = input ?? "anonymous";   // '??' only replaces null or undefined`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

graded = frame.withColumn(
    "grade",
    F.when(F.col("score") >= 90, "A")
     .when(F.col("score") >= 80, "B")
     .otherwise("C"),
)`,
      },
      rust: {
        code: `fn grade(score: u32) -> &'static str {
    // 'if' is an expression: both arms must have the same type.
    if score >= 90 {
        "A"
    } else if score >= 80 {
        "B"
    } else {
        "C"
    }
}

let label = if score >= 50 { "pass" } else { "fail" };`,
      },
      cpp: {
        code: `const char* grade(int score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    return "C";
}

const char* label = score >= 50 ? "pass" : "fail";

if (auto it = table.find(key); it != table.end()) { // C++17: init statement
    use(it->second);
}`,
      },
      go: {
        code: `func grade(score int) string {
    switch {            // switch with no subject: a cleaner if/else chain
    case score >= 90:
        return "A"
    case score >= 80:
        return "B"
    default:
        return "C"
    }
}

if value, ok := table[key]; ok { // init statement scopes 'value' to the if
    use(value)
}`,
        note: 'Go has no ternary operator; use if/else.',
      },
      swift: {
        code: `func grade(_ score: Int) -> String {
    if score >= 90 { return "A" }
    if score >= 80 { return "B" }
    return "C"
}

if let name = optionalName {       // unwrap an optional safely
    print(name)
}

func greet(_ name: String?) {
    guard let name else { return } // early exit keeps the happy path unindented
    print("hi \\(name)")
}`,
      },
      kotlin: {
        code: `fun grade(score: Int): String =
    if (score >= 90) "A"           // 'if' is an expression
    else if (score >= 80) "B"
    else "C"

val label = if (score >= 50) "pass" else "fail"

val bucket = when {                // 'when' without a subject
    score >= 90 -> "A"
    score >= 80 -> "B"
    else -> "C"
}`,
      },
    },
    takeaway:
      'When branches are expressions (Rust, Kotlin, SQL CASE), the compiler can check that every path produces a value, which removes uninitialised-variable bugs.',
  },
  {
    id: 'pattern-matching',
    part: 'control-flow',
    navLabel: 'Pattern matching',
    title: 'Pattern matching and switch',
    summary:
      'Pattern matching selects a branch by the shape of a value and can pull out its parts. Some languages check that you covered every case.',
    snippets: {
      sql: {
        code: `SELECT email,
       CASE
         WHEN email LIKE '%@example.com' THEN 'internal'
         WHEN email ~ '^[a-z]+@' THEN 'external'
         ELSE 'unknown'
       END AS kind
FROM users;`,
        note: 'SQL matches strings with LIKE and regular expressions; there is no structural matching.',
      },
      python: {
        code: `def describe(shape):
    match shape:                          # Python 3.10+
        case {"kind": "circle", "radius": r}:
            return f"circle {r}"
        case ("rect", w, h) if w == h:    # tuple pattern with a guard
            return f"square {w}"
        case ("rect", w, h):
            return f"rect {w}x{h}"
        case _:
            return "unknown"`,
      },
      typescript: {
        code: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {            // narrowing: 'shape' is refined inside each case
    case "circle": return Math.PI * shape.radius ** 2;
    case "rect":   return shape.width * shape.height;
    default: {
      const unreachable: never = shape; // compile error if a case is missing
      return unreachable;
    }
  }
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

tagged = frame.withColumn(
    "kind",
    F.when(F.col("email").endswith("@example.com"), "internal")
     .when(F.col("email").rlike("^[a-z]+@"), "external")
     .otherwise("unknown"),
)`,
      },
      rust: {
        code: `enum Shape {
    Circle { radius: f64 },
    Rect { width: f64, height: f64 },
}

fn area(shape: &Shape) -> f64 {
    match shape {                         // the compiler requires every variant
        Shape::Circle { radius } => std::f64::consts::PI * radius * radius,
        Shape::Rect { width, height } if width == height => width * width,
        Shape::Rect { width, height } => width * height,
    }
}`,
      },
      cpp: {
        code: `#include <variant>
#include <cmath>

struct Circle { double radius; };
struct Rect   { double width, height; };
using Shape = std::variant<Circle, Rect>;

// std::visit dispatches on the active alternative; no guard syntax.
double area(const Shape& shape) {
    return std::visit([](const auto& s) -> double {
        if constexpr (std::is_same_v<std::decay_t<decltype(s)>, Circle>)
            return 3.141592653589793 * s.radius * s.radius;
        else
            return s.width * s.height;
    }, shape);
}`,
        note: 'C++ has no match expression; switch only works on integral and enum values.',
      },
      go: {
        code: `type Shape interface{}
type Circle struct{ Radius float64 }
type Rect struct{ Width, Height float64 }

func area(shape Shape) float64 {
    switch value := shape.(type) { // type switch: 'value' has the matched type
    case Circle:
        return 3.141592653589793 * value.Radius * value.Radius
    case Rect:
        return value.Width * value.Height
    default:
        return 0
    }
}`,
      },
      swift: {
        code: `enum Shape {
    case circle(radius: Double)
    case rect(width: Double, height: Double)
}

func area(_ shape: Shape) -> Double {
    switch shape {                           // must be exhaustive
    case .circle(let radius):
        return Double.pi * radius * radius
    case .rect(let width, let height) where width == height:
        return width * width
    case .rect(let width, let height):
        return width * height
    }
}`,
      },
      kotlin: {
        code: `sealed interface Shape
data class Circle(val radius: Double) : Shape
data class Rect(val width: Double, val height: Double) : Shape

fun area(shape: Shape): Double = when (shape) { // exhaustive over a sealed type
    is Circle -> Math.PI * shape.radius * shape.radius
    is Rect   -> shape.width * shape.height     // smart cast: no explicit cast needed
}`,
      },
    },
    takeaway:
      'Model alternatives as a closed set of cases (enum, sealed type, tagged union). The compiler then flags the places you forgot to handle a new case.',
  },
  {
    id: 'short-circuit',
    part: 'control-flow',
    navLabel: 'Short-circuit & precedence',
    title: 'Short-circuit evaluation and operator precedence',
    summary:
      'In a && b, b is skipped when a is false. That makes guards like ptr != null && ptr.value == 5 safe, but only in languages that guarantee the order.',
    snippets: {
      sql: {
        code: `-- NOT safe: SQL does not guarantee the order of AND operands.
SELECT * FROM t WHERE b <> 0 AND a / b > 1;   -- may still divide by zero

-- Safe: CASE evaluates its branches in order.
SELECT * FROM t
WHERE CASE WHEN b <> 0 THEN a / b > 1 ELSE FALSE END;`,
        note: 'The planner may reorder predicates, so use CASE when order matters.',
      },
      python: {
        code: `node = None
if node and node.value == 5:     # 'and' stops at the first falsy operand
    print("five")

name = user_input or "anonymous" # 'or' returns the first truthy operand
# Precedence, high to low: not, and, or
print(True or False and False)   # True   (and binds tighter than or)`,
      },
      typescript: {
        code: `const node: { value: number } | null = null;
if (node && node.value === 5) { }      // short-circuit guard
if (node?.value === 5) { }             // optional chaining: same intent, shorter

console.log(false || true && false);   // false  (&& binds tighter than ||)
console.log(0 || "x", 0 ?? "x");       // "x" 0   (?? only skips null/undefined)`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Python's 'and' / 'or' do not work on Columns: use & and |, with parentheses,
# because & binds tighter than the comparisons.
ok = frame.filter((F.col("b") != 0) & (F.col("a") / F.col("b") > 1))

# The optimizer may reorder predicates. Guard explicitly:
safe = F.when(F.col("b") != 0, F.col("a") / F.col("b") > 1).otherwise(False)`,
      },
      rust: {
        code: `let node: Option<Node> = None;
if node.as_ref().is_some_and(|n| n.value == 5) { }   // && and || short-circuit

let a = true;
let evaluated = a || expensive();   // expensive() is never called
let eager = a | expensive();        // '|' on bools evaluates both sides`,
      },
      cpp: {
        code: `if (ptr != nullptr && ptr->value == 5) { }   // guaranteed left to right, stops early

// Precedence trap: == binds tighter than &.
if (flags & MASK == 0) { }     // parsed as flags & (MASK == 0): a bug
if ((flags & MASK) == 0) { }   // intended

bool r = a || b && c;          // && binds tighter: a || (b && c)`,
      },
      go: {
        code: `if ptr != nil && ptr.Value == 5 { // && and || short-circuit, left to right
    fmt.Println("five")
}

// Go has five precedence levels; && is above ||.
r := a || b && c // a || (b && c)`,
      },
      swift: {
        code: `let node: Node? = nil
if node != nil && node!.value == 5 { }   // short-circuits, but force-unwrapping is fragile
if node?.value == 5 { }                  // optional chaining is the safer form

let r = a || b && c   // && has higher precedence than ||`,
      },
      kotlin: {
        code: `val node: Node? = null
if (node != null && node.value == 5) { } // smart cast to non-null after the check
if (node?.value == 5) { }                // safe call

val r = a || b && c   // && binds tighter than ||`,
      },
    },
    takeaway:
      'Put the cheap or safety check on the left of && and ||. Do not rely on evaluation order in SQL or Spark: use CASE / when to guard.',
  },
  {
    id: 'recursion',
    part: 'control-flow',
    navLabel: 'Recursion & call stack',
    title: 'Recursion and the call stack',
    summary:
      'Each call pushes a stack frame. Without a base case, or with very deep input, the stack runs out. Some languages rewrite tail calls into loops.',
    snippets: {
      sql: {
        code: `-- sum_to(5) = 5 + 4 + 3 + 2 + 1
WITH RECURSIVE sum_to(n, total) AS (
  SELECT 1, 1                          -- base case
  UNION ALL
  SELECT n + 1, total + n + 1 FROM sum_to WHERE n < 5  -- recursive step with a stop
)
SELECT total FROM sum_to ORDER BY n DESC LIMIT 1;`,
        note: 'A recursive CTE is iterated by the engine, not nested on a call stack.',
      },
      python: {
        code: `import sys

def sum_to(n: int) -> int:
    if n == 0:             # base case
        return 0
    return n + sum_to(n - 1)

print(sys.getrecursionlimit())  # 1000 by default
# sum_to(100_000)               # RecursionError: Python does not optimise tail calls

def sum_to_iter(n: int) -> int:  # the loop version uses constant stack space
    total = 0
    for k in range(1, n + 1):
        total += k
    return total`,
      },
      typescript: {
        code: `function sumTo(n: number): number {
  if (n === 0) return 0;          // base case
  return n + sumTo(n - 1);
}

// sumTo(1_000_000);              // RangeError: Maximum call stack size exceeded
// Tail-call optimisation is part of the standard but most engines do not implement it.`,
      },
      spark: {
        code: `# Spark plans have no recursion. Iterate on the driver and cut the lineage.
frame = spark.range(1)
for step in range(10):
    frame = frame.withColumn("id", F.col("id") + 1)
    if step % 5 == 4:
        frame = frame.checkpoint()   # truncate the growing logical plan`,
        note: 'Long chains of transformations make the plan deep; checkpoint to keep planning cheap.',
      },
      rust: {
        code: `fn sum_to(n: u64) -> u64 {
    if n == 0 { return 0; }        // base case
    n + sum_to(n - 1)              // not a tail call: n + (result) happens after
}

// Rust does not guarantee tail-call optimisation. Deep input overflows the
// thread's stack (a few MB) and the process aborts.
fn sum_to_loop(n: u64) -> u64 {
    (1..=n).sum()                  // constant stack
}`,
      },
      cpp: {
        code: `unsigned long sum_to(unsigned long n) {
    if (n == 0) return 0;          // base case
    return n + sum_to(n - 1);
}

// The compiler may turn recursion into a loop at -O2, but it is not guaranteed.
// A very deep call overflows the stack (typically 1-8 MB): undefined behaviour in practice.`,
      },
      go: {
        code: `func sumTo(n uint64) uint64 {
    if n == 0 {
        return 0 // base case
    }
    return n + sumTo(n-1)
}

// Goroutine stacks start small and grow on demand (up to a 1 GB default limit),
// so deep recursion rarely fails early, but Go does not optimise tail calls.`,
      },
      swift: {
        code: `func sumTo(_ n: UInt64) -> UInt64 {
    if n == 0 { return 0 }   // base case
    return n + sumTo(n - 1)
}

// Swift does not guarantee tail-call optimisation. Very deep recursion crashes
// with a stack overflow; prefer a loop or reduce for large inputs.`,
      },
      kotlin: {
        code: `tailrec fun sumTo(n: Long, accumulator: Long = 0): Long =
    if (n == 0L) accumulator
    else sumTo(n - 1, accumulator + n)   // the recursive call is the last action

// 'tailrec' makes the compiler rewrite this into a loop, so sumTo(1_000_000) is safe.
// The compiler reports an error if the call is not actually in tail position.`,
      },
    },
    takeaway:
      'Every recursion needs a base case. If depth is unbounded, convert to a loop or an explicit stack, and know whether your language guarantees tail calls (Kotlin tailrec does; most others do not).',
  },
];
