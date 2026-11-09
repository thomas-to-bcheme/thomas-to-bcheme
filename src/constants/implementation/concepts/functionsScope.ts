import type { Concept } from './types';

export const FUNCTIONS_SCOPE_CONCEPTS: Concept[] = [
  {
    id: 'functions',
    part: 'functions-scope',
    navLabel: 'Functions',
    title: 'Functions and first-class functions',
    summary:
      'A function takes inputs and returns a value. When functions are values too, you can store them, pass them, and return them.',
    snippets: {
      sql: {
        code: `-- A scalar SQL function (PostgreSQL).
CREATE FUNCTION add_tax(price numeric, rate numeric DEFAULT 0.0825)
RETURNS numeric
LANGUAGE sql IMMUTABLE            -- same inputs, same output: the planner may cache it
AS $$ SELECT price * (1 + rate) $$;

SELECT add_tax(100);`,
        note: 'Functions are database objects called inside queries, not first-class values.',
      },
      python: {
        code: `def add_tax(price: float, rate: float = 0.0825) -> float:
    return price * (1 + rate)

apply = add_tax              # functions are objects: assign them
prices = [10.0, 20.0]
print(list(map(apply, prices)))
print(sorted(prices, key=lambda price: -price))  # pass a function as an argument`,
      },
      typescript: {
        code: `const addTax = (price: number, rate = 0.0825): number => price * (1 + rate);

const apply: (price: number) => number = addTax;   // a function type
const prices = [10, 20];
console.log(prices.map((price) => addTax(price)));

function compose<A, B, C>(f: (a: A) => B, g: (b: B) => C) {
  return (value: A) => g(f(value));                // returns a function
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType

@F.udf(returnType=DoubleType())     # a Python UDF: runs row by row in a Python worker
def add_tax(price):
    return price * 1.0825

# Prefer built-in column expressions: the optimizer sees through them, not through a UDF.
frame.select((F.col("price") * 1.0825).alias("total"))`,
        note: 'A UDF is opaque to the optimizer and crosses a JVM/Python boundary; use built-ins where possible.',
      },
      rust: {
        code: `fn add_tax(price: f64, rate: f64) -> f64 {
    price * (1.0 + rate)          // last expression, no semicolon, is the return value
}

fn apply(f: fn(f64, f64) -> f64, price: f64) -> f64 {
    f(price, 0.0825)              // fn pointers: plain functions as values
}

let result = apply(add_tax, 100.0);`,
      },
      cpp: {
        code: `#include <functional>
#include <vector>
#include <algorithm>

double add_tax(double price, double rate = 0.0825) {
    return price * (1 + rate);
}

int main() {
    std::function<double(double, double)> apply = add_tax; // type-erased callable
    std::vector<double> prices{10, 20};
    std::sort(prices.begin(), prices.end(),
              [](double a, double b) { return a > b; });   // lambda as an argument
}`,
      },
      go: {
        code: `func addTax(price, rate float64) float64 {
    return price * (1 + rate)
}

func divide(a, b float64) (float64, error) { // multiple return values
    if b == 0 {
        return 0, errors.New("divide by zero")
    }
    return a / b, nil
}

apply := addTax // functions are values
fmt.Println(apply(100, 0.0825))`,
      },
      swift: {
        code: `func addTax(_ price: Double, rate: Double = 0.0825) -> Double {
    price * (1 + rate)               // single-expression body: implicit return
}

let apply: (Double, Double) -> Double = { price, rate in addTax(price, rate: rate) }
let sorted = [10.0, 20.0].sorted { $0 > $1 }   // trailing closure, shorthand arguments`,
      },
      kotlin: {
        code: `fun addTax(price: Double, rate: Double = 0.0825): Double = price * (1 + rate)

val apply: (Double) -> Double = ::addTax          // function reference
val sorted = listOf(10.0, 20.0).sortedByDescending { it }

fun twice(action: () -> Unit) { action(); action() } // higher-order function
twice { println("hi") }`,
      },
    },
    takeaway:
      'Treating functions as values (maps, sorts, callbacks) is the basis of closures and higher-order design. SQL and Spark push you toward built-in expressions the optimizer understands.',
  },
  {
    id: 'closures',
    part: 'functions-scope',
    navLabel: 'Closures',
    title: 'Closures',
    summary:
      'A closure is a function plus the variables it captured from where it was defined. Languages differ in whether capture shares, copies, or moves them.',
    snippets: {
      sql: {
        code: `-- No closures. A correlated subquery reads a column from the outer row,
-- which is the nearest analogue to capturing an enclosing variable.
SELECT o.id,
       (SELECT count(*) FROM items i WHERE i.order_id = o.id) AS item_count
FROM orders o;`,
        note: 'There is no way to build a function value at run time in SQL.',
      },
      python: {
        code: `def make_counter():
    count = 0
    def increment():
        nonlocal count      # rebind the captured variable, not a new local
        count += 1
        return count
    return increment

counter = make_counter()
print(counter(), counter())   # 1 2  -- the closure keeps 'count' alive after make_counter returns`,
      },
      typescript: {
        code: `function makeCounter() {
  let count = 0;
  return () => ++count;      // captures the variable 'count' by reference
}
const counter = makeCounter();
console.log(counter(), counter());   // 1 2

// Classic trap: 'var' is function-scoped, so all callbacks share one variable.
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j)); // 0 1 2`,
      },
      spark: {
        code: `threshold = 10                       # a driver variable

# The lambda is pickled and shipped to executors with a COPY of 'threshold'.
rdd = spark.sparkContext.parallelize([5, 15, 25])
print(rdd.filter(lambda value: value > threshold).collect())

threshold = 100                      # later changes on the driver do not reach tasks already shipped`,
        note: 'Captured values are serialized to executors; mutating a captured variable inside a task is lost.',
      },
      rust: {
        code: `fn make_counter() -> impl FnMut() -> u32 {
    let mut count = 0;
    move || {                 // 'move' transfers ownership of 'count' into the closure
        count += 1;
        count
    }
}

let mut counter = make_counter();
println!("{} {}", counter(), counter());   // 1 2
// Closure traits: Fn (reads), FnMut (mutates), FnOnce (consumes captured values).`,
      },
      cpp: {
        code: `#include <functional>

auto make_counter() {
    int count = 0;
    return [count]() mutable {   // [count] copies; [&count] would dangle after return
        return ++count;
    };
}

auto counter = make_counter();
// counter() -> 1, counter() -> 2
// Capturing by reference a local that has gone out of scope is undefined behaviour.`,
      },
      go: {
        code: `func makeCounter() func() int {
    count := 0
    return func() int {      // captures 'count' by reference; escape analysis moves it to the heap
        count++
        return count
    }
}

counter := makeCounter()
fmt.Println(counter(), counter()) // 1 2`,
      },
      swift: {
        code: `func makeCounter() -> () -> Int {
    var count = 0
    return {                  // 'count' is captured by reference (boxed on the heap)
        count += 1
        return count
    }
}

let counter = makeCounter()
print(counter(), counter())   // 1 2
// Closures stored beyond the call must be marked @escaping; use [weak self] to avoid cycles.`,
      },
      kotlin: {
        code: `fun makeCounter(): () -> Int {
    var count = 0
    return { ++count }        // captured var is wrapped in a Ref object on the heap
}

val counter = makeCounter()
println("\${counter()} \${counter()}")  // 1 2`,
      },
    },
    takeaway:
      'Know what your closure captured and for how long: shared references keep data alive (and can race), copies can go stale, and moved values are gone from the original scope.',
  },
  {
    id: 'scope',
    part: 'functions-scope',
    navLabel: 'Scope',
    title: 'Lexical scope and lifetime',
    summary:
      'Scope is where a name is visible. Lifetime is how long the value exists. In most languages scope is decided by where the code is written, not where it runs.',
    snippets: {
      sql: {
        code: `-- A CTE name is visible only within the one statement that defines it.
WITH recent AS (SELECT * FROM orders WHERE created_at > now() - interval '7 days')
SELECT count(*) FROM recent;

-- 'recent' does not exist after the semicolon.
-- A column alias defined in SELECT is NOT visible in the WHERE of the same query.`,
      },
      python: {
        code: `x = "global"

def outer():
    x = "enclosing"
    def inner():
        print(x)              # LEGB lookup: Local, Enclosing, Global, Built-in
    inner()                   # prints 'enclosing'

for item in range(3):
    pass
print(item)                   # 2  -- loops do not create a scope; only functions/classes do`,
      },
      typescript: {
        code: `let x = "outer";
{
  let x = "block";            // shadows the outer 'x' within this block
  console.log(x);             // block
}
console.log(x);               // outer

console.log(hoisted);         // undefined: 'var' is hoisted to the top of its function
var hoisted = 1;
// console.log(later);        // ReferenceError: 'let' is in the temporal dead zone
let later = 2;`,
      },
      spark: {
        code: `frame.createOrReplaceTempView("orders")        # visible to this SparkSession only
spark.sql("SELECT count(*) FROM orders").show()

frame.createOrReplaceGlobalTempView("orders_all")  # visible across sessions, in global_temp.*
spark.sql("SELECT count(*) FROM global_temp.orders_all").show()`,
        note: 'The analogue of scope is where a named view is registered.',
      },
      rust: {
        code: `let x = 5;
{
    let x = x * 2;            // shadowing: a NEW binding, may even change the type
    println!("{x}");          // 10
}
println!("{x}");              // 5

let reference;
{
    let inner = 42;
    reference = &inner;       // error[E0597]: 'inner' does not live long enough
}
// println!("{reference}");   // the borrow checker rejects a reference outliving its scope`,
      },
      cpp: {
        code: `int x = 1;
{
    int x = 2;                // shadows the outer x
    std::cout << x;           // 2
}                             // inner x destroyed here (destructors run at scope exit)

int* dangling() {
    int local = 7;
    return &local;            // compiles (maybe a warning); the pointer is invalid after return
}`,
      },
      go: {
        code: `x := "outer"
if true {
    x := "inner"              // := in a new block declares a NEW variable
    fmt.Println(x)
}
fmt.Println(x)                // outer

func pointer() *int {
    local := 7
    return &local             // safe in Go: escape analysis moves 'local' to the heap
}`,
      },
      swift: {
        code: `let x = "outer"
do {
    let x = "inner"           // shadows within the block
    print(x)
}
print(x)                      // outer

func process() {
    defer { print("cleanup") } // runs when the scope exits, however it exits
    print("work")
}`,
      },
      kotlin: {
        code: `val x = "outer"
fun demo() {
    val x = "inner"           // shadows (the compiler warns)
    println(x)
}

val value = run {
    val temp = 21             // 'temp' is visible only inside this scope function
    temp * 2
}`,
      },
    },
    takeaway:
      'Names are resolved by where code is written. Scope decides visibility; the language’s memory model decides whether the value outlives the scope (Rust rejects it, Go moves it to the heap, C++ leaves a dangling pointer).',
  },
  {
    id: 'evaluation-strategies',
    part: 'functions-scope',
    navLabel: 'Pass by value / reference',
    title: 'Evaluation strategies: value, reference, and sharing',
    summary:
      'Passing an argument either copies it, hands over a reference to the caller’s variable, or (in Python and Java-style languages) shares a reference to the object.',
    snippets: {
      sql: {
        code: `-- Arguments to a SQL function are passed by value (IN).
-- PL/pgSQL also supports OUT and INOUT parameters, which return values to the caller.
CREATE FUNCTION double_it(IN x integer, OUT result integer)
LANGUAGE sql AS $$ SELECT x * 2 $$;`,
        note: 'The closest idea is IN / OUT / INOUT parameter modes.',
      },
      python: {
        code: `def append_item(items, value):
    items.append(value)       # mutates the SAME list object the caller passed
    items = ["new"]           # rebinding the local name does not affect the caller

data = [1]
append_item(data, 2)
print(data)                   # [1, 2]

def bump(n):
    n += 1                    # ints are immutable: this rebinds the local name only
count = 5
bump(count)
print(count)                  # 5`,
        note: 'Pass-by-sharing (object reference): the callee gets a copy of the reference, not of the object.',
      },
      typescript: {
        code: `function mutate(list: number[], count: number) {
  list.push(4);               // the caller sees this: the array reference is copied, not the array
  count += 1;                 // numbers are copied: the caller does not see this
  list = [];                  // rebinding the local parameter does not affect the caller
}
const list = [1, 2, 3];
let count = 0;
mutate(list, count);
console.log(list, count);     // [1, 2, 3, 4] 0`,
      },
      spark: {
        code: `# Driver objects passed into a task are SERIALIZED and copied to each executor.
counts = {"seen": 0}
def tag(row):
    counts["seen"] += 1       # mutates the executor's copy only
    return row

rdd.map(tag).count()
print(counts["seen"])         # 0 on the driver: use an Accumulator to count across tasks`,
        note: 'Distribution adds a fourth strategy: copy by serialization.',
      },
      rust: {
        code: `fn consume(text: String) {}              // takes ownership: the caller can no longer use it
fn read(text: &String) -> usize { text.len() }     // shared borrow: read-only
fn change(text: &mut String) { text.push('!'); }   // exclusive borrow: one writer

let mut text = String::from("hi");
read(&text);
change(&mut text);
consume(text);                           // moved
// println!("{text}");                   // error: value used after move`,
      },
      cpp: {
        code: `void by_value(std::string s) {}             // copy (or move, if given an rvalue)
void by_ref(std::string& s) { s += "!"; }   // alias to the caller's object
void by_const_ref(const std::string& s) {}  // no copy, read-only: the default for big objects
void by_pointer(std::string* s) { if (s) *s += "?"; } // address; may be null

std::string text = "hi";
by_ref(text);
by_pointer(&text);`,
      },
      go: {
        code: `type Box struct{ Value int }

func byValue(b Box)     { b.Value = 99 }  // always a copy: the caller is unchanged
func byPointer(b *Box)  { b.Value = 99 }  // copy of the pointer: the caller's Box changes

box := Box{Value: 1}
byValue(box)
fmt.Println(box.Value) // 1
byPointer(&box)
fmt.Println(box.Value) // 99
// Slices, maps, and channels are small headers that point at shared data.`,
      },
      swift: {
        code: `struct Point { var x = 0 }          // value type: copied on assignment and when passed
class Box { var value = 0 }         // reference type: references are copied, the object is shared

func change(_ point: Point, _ box: Box, _ n: inout Int) {
    var local = point
    local.x = 9                      // caller's 'point' unchanged
    box.value = 9                    // caller's 'box' changed
    n += 1                           // 'inout' writes back to the caller's variable
}
var n = 0
change(Point(), Box(), &n)`,
      },
      kotlin: {
        code: `fun change(list: MutableList<Int>, n: Int) {
    list.add(4)        // the caller sees it: the reference is passed by value
    // n = n + 1       // compile error: parameters are read-only (val)
}
val list = mutableListOf(1, 2, 3)
change(list, 0)
println(list)          // [1, 2, 3, 4]
// Kotlin has no pass-by-reference for locals; return a new value or wrap it in an object.`,
      },
    },
    takeaway:
      'Ask two questions at each call: is the argument copied or aliased, and can the callee mutate it? Rust encodes the answers in the type; Python, TypeScript, and Kotlin share object references; Go and Swift separate value types from pointers.',
  },
];
