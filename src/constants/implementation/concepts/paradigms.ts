import type { Concept } from './types';

export const PARADIGM_CONCEPTS: Concept[] = [
  {
    id: 'generics',
    part: 'paradigms',
    navLabel: 'Generics & static dispatch',
    title: 'Generics and static dispatch',
    summary:
      'A generic function works for many types. The compiler either generates a specialised copy per type (monomorphisation: Rust, C++, Swift), shares one copy and erases the type (JVM, TypeScript), or boxes values at run time (Go uses a hybrid).',
    snippets: {
      sql: {
        code: `-- Polymorphic functions in PostgreSQL use pseudo-types such as anyelement.
CREATE FUNCTION largest(a anyelement, b anyelement) RETURNS anyelement
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN a > b THEN a ELSE b END $$;

SELECT largest(3, 7), largest('apple'::text, 'pear'::text);`,
        note: 'The concrete type is resolved when the query is planned, once, not per row.',
      },
      python: {
        code: `from typing import TypeVar

T = TypeVar("T", int, float, str)   # constrained type variable

def largest(a: T, b: T) -> T:
    return a if a > b else b

# Generics are a static-checker feature only: at run time this is one ordinary function.
print(largest(3, 7), largest("apple", "pear"))`,
      },
      typescript: {
        code: `function largest<T extends number | string>(a: T, b: T): T {
  return a > b ? a : b;
}

console.log(largest(3, 7), largest("apple", "pear"));
// Type parameters are erased at compile time: one JavaScript function, no per-type copies.
// largest(3, "x")   // compile error: arguments must share a type`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Column expressions are resolved against the schema once, at analysis time,
# and Catalyst generates specialised code per data type.
frame.select(F.greatest("a", "b").alias("largest"))   # works for ints, doubles, strings`,
        note: 'Typed Dataset[T] in Scala/Java carries the generic type; Python DataFrames are untyped rows.',
      },
      rust: {
        code: `fn largest<T: PartialOrd>(a: T, b: T) -> T {
    if a > b { a } else { b }
}

fn main() {
    println!("{} {}", largest(3, 7), largest("apple", "pear"));
}
// Monomorphisation: the compiler emits largest::<i32> and largest::<&str> as separate
// functions, each inlinable and optimised for its type. Cost: larger binaries.`,
      },
      cpp: {
        code: `#include <iostream>
#include <string>

template <typename T>
T largest(T a, T b) { return a > b ? a : b; }

// C++20 concepts state the requirement and give clear errors.
template <typename T>
concept Ordered = requires(T a, T b) { { a > b } -> std::convertible_to<bool>; };

template <Ordered T>
T largest_checked(T a, T b) { return a > b ? a : b; }

int main() {
    std::cout << largest(3, 7) << " " << largest(std::string("apple"), std::string("pear")) << "\\n";
}
// Each instantiation is compiled separately: no vtable, full inlining.`,
      },
      go: {
        code: `import "cmp"

func Largest[T cmp.Ordered](a, b T) T { // generics since Go 1.18
    if a > b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Largest(3, 7), Largest("apple", "pear"))
}
// Go "GC shape stenciling": types with the same memory shape share one compiled body,
// with a dictionary passed for the differences. Fewer copies than C++, a little slower.`,
      },
      swift: {
        code: `func largest<T: Comparable>(_ a: T, _ b: T) -> T {
    a > b ? a : b
}

print(largest(3, 7), largest("apple", "pear"))
// In optimised builds the compiler specialises generics per concrete type.
// 'any Comparable' (an existential) would instead dispatch through a witness table at run time.`,
      },
      kotlin: {
        code: `fun <T : Comparable<T>> largest(a: T, b: T): T = if (a > b) a else b

println("\${largest(3, 7)} \${largest("apple", "pear")}")
// JVM generics are erased: List<Int> and List<String> are the same class at run time.
// 'inline fun <reified T>' keeps the type available inside an inline function.`,
      },
    },
    takeaway:
      'Generics trade code size against speed and flexibility. Monomorphisation (Rust, C++, Swift) gives the fastest calls; erasure (TypeScript, JVM) keeps code small but loses the type at run time.',
  },
  {
    id: 'abstractions',
    part: 'paradigms',
    navLabel: 'Traits, protocols, interfaces',
    title: 'Declaring and implementing an abstraction',
    summary:
      'Every language lets you say "anything that can do X". The differences are who must declare it, whether it can be added after the fact, and whether the check happens at compile time.',
    snippets: {
      sql: {
        code: `-- A domain constrains a value; a composite type bundles fields; a view hides a table.
CREATE DOMAIN positive_amount AS numeric CHECK (VALUE > 0);

CREATE TYPE money_amount AS (amount positive_amount, currency char(3));

-- Behaviour is attached through functions that accept the type.
CREATE FUNCTION add_amounts(a money_amount, b money_amount) RETURNS money_amount
LANGUAGE sql AS $$ SELECT ROW((a).amount + (b).amount, (a).currency)::money_amount $$;`,
        note: 'There are no interfaces; constraints, types, and functions play the role of a contract.',
      },
      python: {
        code: `from abc import ABC, abstractmethod
from typing import Protocol

class Shape(ABC):                    # nominal: subclasses must inherit and implement
    @abstractmethod
    def area(self) -> float: ...

class HasArea(Protocol):             # structural: any object with .area() matches
    def area(self) -> float: ...

class Square:
    def __init__(self, side: float): self.side = side
    def area(self) -> float: return self.side ** 2

def total(shapes: list[HasArea]) -> float:
    return sum(shape.area() for shape in shapes)   # Square never mentions HasArea`,
      },
      typescript: {
        code: `interface Shape {
  area(): number;
}

class Square {
  constructor(private side: number) {}
  area() { return this.side ** 2; }   // no "implements" needed: structural typing
}

const total = (shapes: Shape[]) => shapes.reduce((sum, shape) => sum + shape.area(), 0);
console.log(total([new Square(2), { area: () => 3 }]));   // any object with the right shape`,
      },
      spark: {
        code: `# Spark exposes contracts through its own extension points rather than interfaces
# you implement in Python: UDFs, pandas UDFs, and Python data sources.
from pyspark.sql.functions import pandas_udf
import pandas as pd

@pandas_udf("double")
def area(side: pd.Series) -> pd.Series:   # vectorised: runs on a batch (Arrow) at a time
    return side ** 2

frame.select(area("side"))`,
        note: 'In Scala/Java you implement interfaces such as org.apache.spark.sql.expressions.Aggregator.',
      },
      rust: {
        code: `trait Shape {
    fn area(&self) -> f64;
    fn describe(&self) -> String {              // default method
        format!("area {:.2}", self.area())
    }
}

struct Square(f64);
impl Shape for Square {                        // explicit, and may live in another crate
    fn area(&self) -> f64 { self.0 * self.0 }
}

// You can implement your trait for a type you did not write (orphan rules permitting):
impl Shape for f64 {
    fn area(&self) -> f64 { self * self }
}

fn total(shapes: &[&dyn Shape]) -> f64 { shapes.iter().map(|s| s.area()).sum() }`,
      },
      cpp: {
        code: `#include <vector>
#include <memory>

// Nominal, run-time: an abstract base class with a pure virtual function.
struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
struct Square : Shape {
    explicit Square(double s) : side(s) {}
    double area() const override { return side * side; }
    double side;
};

// Structural, compile-time: a C++20 concept needs no base class.
template <typename T>
concept HasArea = requires(const T& t) { { t.area() } -> std::convertible_to<double>; };

template <HasArea T>
double twice_area(const T& shape) { return 2 * shape.area(); }`,
      },
      go: {
        code: `type Shape interface {
    Area() float64
}

type Square struct{ Side float64 }

func (s Square) Area() float64 { return s.Side * s.Side }   // no "implements": satisfied implicitly

func Total(shapes []Shape) float64 {
    sum := 0.0
    for _, shape := range shapes {
        sum += shape.Area()
    }
    return sum
}

var _ Shape = Square{}   // compile-time check that Square satisfies Shape`,
      },
      swift: {
        code: `protocol Shape {
    var area: Double { get }
}

extension Shape {                       // default implementation
    func describe() -> String { "area \\(area)" }
}

struct Square: Shape {
    let side: Double
    var area: Double { side * side }
}

// Retroactive conformance: add a protocol to a type you do not own.
extension Double: Shape { var area: Double { self * self } }

func total(_ shapes: [any Shape]) -> Double { shapes.reduce(0) { $0 + $1.area } }`,
      },
      kotlin: {
        code: `interface Shape {
    val area: Double
    fun describe() = "area $area"              // default method body
}

class Square(private val side: Double) : Shape {
    override val area get() = side * side
}

// Kotlin cannot make an existing class implement an interface, but extension functions add behaviour:
val Double.squareArea: Double get() = this * this

fun total(shapes: List<Shape>) = shapes.sumOf { it.area }`,
      },
    },
    takeaway:
      'Declare the smallest contract the caller needs. Rust traits and Swift protocols can be added to types after the fact; Go and TypeScript match by shape; C++, Kotlin, and Python ABCs require the type to name the interface.',
  },
  {
    id: 'delegation',
    part: 'paradigms',
    navLabel: 'Delegation & mixins',
    title: 'Delegation, mixins, and extension methods',
    summary:
      'Reuse behaviour without inheritance: forward calls to a contained object, mix in shared methods, or attach new methods to an existing type from the outside.',
    snippets: {
      sql: {
        code: `-- Reuse by composition: a view over other views, and functions that take a row type.
CREATE VIEW paid_orders AS SELECT * FROM orders WHERE status = 'paid';
CREATE VIEW paid_totals AS SELECT customer_id, sum(amount) AS total FROM paid_orders GROUP BY customer_id;

-- Add behaviour to an existing table type without changing it:
CREATE FUNCTION tax(o orders) RETURNS numeric LANGUAGE sql AS $$ SELECT o.amount * 0.0825 $$;
SELECT o.id, o.tax FROM orders o;      -- attribute-style call of tax(o)`,
      },
      python: {
        code: `class LoggingMixin:
    def log(self, message: str) -> None:
        print(f"[{type(self).__name__}] {message}")

class Repository:
    def save(self, item): ...

class AuditedRepository(LoggingMixin, Repository):   # method resolution order: left to right
    def save(self, item):
        self.log(f"saving {item}")
        super().save(item)

# Delegation instead: hold a Repository and forward only what you need.
class CachedRepository:
    def __init__(self, inner: Repository): self._inner = inner
    def save(self, item): self._inner.save(item)`,
      },
      typescript: {
        code: `// Mixin: a function that takes a class and returns an extended class.
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
  };
}

class User { constructor(public name: string) {} }
const TimestampedUser = Timestamped(User);
const user = new TimestampedUser("Ada");
console.log(user.name, user.createdAt);

// No extension methods: add behaviour with a standalone function, or a module-level helper.
const shout = (text: string) => text.toUpperCase() + "!";`,
      },
      spark: {
        code: `# Extension via monkey-patching: attach a reusable step to DataFrame.
from pyspark.sql import DataFrame

def with_tax(self: DataFrame, rate: float = 0.0825) -> DataFrame:
    return self.withColumn("tax", self.amount * rate)

DataFrame.with_tax = with_tax                 # visible to every DataFrame in this process

orders.with_tax().show()
orders.transform(lambda frame: with_tax(frame))   # the supported way: DataFrame.transform`,
        note: 'Prefer transform(): it composes explicitly and avoids global patches.',
      },
      rust: {
        code: `// An extension trait adds methods to an existing type.
trait StrExt {
    fn shout(&self) -> String;
}
impl StrExt for str {
    fn shout(&self) -> String { self.to_uppercase() + "!" }
}
println!("{}", "hi".shout());

// Delegation: forward to a field.
struct Logger;
impl Logger { fn log(&self, message: &str) { println!("{message}"); } }

struct Service { logger: Logger }
impl Service {
    fn log(&self, message: &str) { self.logger.log(message) }   // explicit forwarding
}
// The 'ambassador' and 'delegate' crates generate this boilerplate with macros.`,
      },
      cpp: {
        code: `#include <iostream>
#include <string>

// Mixin via CRTP: the base is a template on the derived class, so there is no vtable.
template <typename Derived>
struct Printable {
    void print() const { std::cout << static_cast<const Derived&>(*this).to_string() << "\\n"; }
};

struct Point : Printable<Point> {
    int x = 1, y = 2;
    std::string to_string() const { return "(" + std::to_string(x) + "," + std::to_string(y) + ")"; }
};

int main() { Point{}.print(); }

// Delegation: hold a member and forward. There are no extension methods;
// a free function (shout(text)) is the idiom, found through argument-dependent lookup.`,
      },
      go: {
        code: `type Logger struct{ Prefix string }

func (l Logger) Log(message string) { fmt.Println(l.Prefix + message) }

// Embedding promotes the inner type's methods: delegation without boilerplate.
type Service struct {
    Logger
    Name string
}

func main() {
    service := Service{Logger: Logger{Prefix: "[svc] "}, Name: "orders"}
    service.Log("started")      // calls service.Logger.Log
}
// Not inheritance: Logger.Log cannot call back into Service methods.`,
      },
      swift: {
        code: `// Extension: add methods and conformances to any type, even from the standard library.
extension String {
    func shout() -> String { uppercased() + "!" }
}
print("hi".shout())

// Protocol extension = a mixin with default behaviour.
protocol Logging {}
extension Logging {
    func log(_ message: String) { print("[\\(type(of: self))] \\(message)") }
}
struct Service: Logging {}
Service().log("started")`,
      },
      kotlin: {
        code: `// Extension function: resolved statically, no change to the String class.
fun String.shout() = uppercase() + "!"
println("hi".shout())

// Class delegation with 'by': the compiler generates all the forwarding methods.
interface Logger { fun log(message: String) }
class ConsoleLogger : Logger { override fun log(message: String) = println(message) }

class Service(logger: Logger) : Logger by logger {
    fun start() = log("started")
}`,
      },
    },
    takeaway:
      'Prefer delegation and extension over deep inheritance. Kotlin `by`, Go embedding, and Swift protocol extensions remove the boilerplate; Rust and C++ ask for a little more typing.',
  },
  {
    id: 'algebraic-data-types',
    part: 'paradigms',
    navLabel: 'Algebraic data types',
    title: 'Algebraic data types and sealed hierarchies',
    summary:
      'A sum type says a value is exactly one of several named variants, each with its own data. The compiler can then check that every variant is handled.',
    snippets: {
      sql: {
        code: `-- An enum is a closed set of labels; a CHECK or tagged table models variants with data.
CREATE TYPE payment_kind AS ENUM ('card', 'transfer');

CREATE TABLE payments (
  id    bigserial PRIMARY KEY,
  kind  payment_kind NOT NULL,
  card_last4 char(4),
  iban  text,
  CHECK ((kind = 'card'     AND card_last4 IS NOT NULL AND iban IS NULL) OR
         (kind = 'transfer' AND iban IS NOT NULL AND card_last4 IS NULL))
);`,
        note: 'The CHECK enforces "exactly one variant populated", which a sum type gives you for free.',
      },
      python: {
        code: `from dataclasses import dataclass

@dataclass(frozen=True)
class Card:
    last4: str

@dataclass(frozen=True)
class Transfer:
    iban: str

Payment = Card | Transfer            # union of variants

def describe(payment: Payment) -> str:
    match payment:
        case Card(last4=last4):
            return f"card ending {last4}"
        case Transfer(iban=iban):
            return f"transfer to {iban}"
    # type checkers (mypy, pyright) flag a missing case; Python itself does not`,
      },
      typescript: {
        code: `type Payment =
  | { kind: "card"; last4: string }
  | { kind: "transfer"; iban: string };

function describe(payment: Payment): string {
  switch (payment.kind) {
    case "card":     return \`card ending \${payment.last4}\`;
    case "transfer": return \`transfer to \${payment.iban}\`;
    default: {
      const unreachable: never = payment;   // compile error if a variant is added and not handled
      return unreachable;
    }
  }
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# A struct column per variant plus a tag column; Spark has no native sum type.
payments = payments.withColumn(
    "description",
    F.when(F.col("kind") == "card", F.concat(F.lit("card ending "), F.col("card.last4")))
     .when(F.col("kind") == "transfer", F.concat(F.lit("transfer to "), F.col("transfer.iban")))
     .otherwise(F.lit("unknown")),    # nothing forces you to cover every variant
)`,
      },
      rust: {
        code: `enum Payment {
    Card { last4: String },
    Transfer { iban: String },
}

fn describe(payment: &Payment) -> String {
    match payment {                     // non-exhaustive match is a compile error
        Payment::Card { last4 } => format!("card ending {last4}"),
        Payment::Transfer { iban } => format!("transfer to {iban}"),
    }
}
// Option<T> and Result<T, E> are ordinary enums in the standard library.
// An enum occupies the size of its largest variant plus a tag.`,
      },
      cpp: {
        code: `#include <string>
#include <variant>

struct Card     { std::string last4; };
struct Transfer { std::string iban; };
using Payment = std::variant<Card, Transfer>;

struct Describe {
    std::string operator()(const Card& c) const     { return "card ending " + c.last4; }
    std::string operator()(const Transfer& t) const { return "transfer to " + t.iban; }
};

std::string describe(const Payment& payment) {
    return std::visit(Describe{}, payment);   // a missing overload is a compile error
}`,
      },
      go: {
        code: `// Go has no sum types. The idiom is an interface plus a type switch.
type Payment interface{ isPayment() }

type Card struct{ Last4 string }
type Transfer struct{ IBAN string }

func (Card) isPayment()     {}   // unexported method "seals" the interface to this package
func (Transfer) isPayment() {}

func describe(p Payment) string {
    switch v := p.(type) {
    case Card:
        return "card ending " + v.Last4
    case Transfer:
        return "transfer to " + v.IBAN
    default:
        return "unknown"   // the compiler does not check exhaustiveness
    }
}`,
      },
      swift: {
        code: `enum Payment {
    case card(last4: String)
    case transfer(iban: String)
}

func describe(_ payment: Payment) -> String {
    switch payment {                 // must be exhaustive
    case .card(let last4):    return "card ending \\(last4)"
    case .transfer(let iban): return "transfer to \\(iban)"
    }
}
// Optional<T> is an enum with .some and .none. Add 'indirect' to allow recursive cases.`,
      },
      kotlin: {
        code: `sealed interface Payment
data class Card(val last4: String) : Payment
data class Transfer(val iban: String) : Payment

fun describe(payment: Payment): String = when (payment) {   // exhaustive over a sealed type
    is Card     -> "card ending \${payment.last4}"
    is Transfer -> "transfer to \${payment.iban}"
}`,
      },
    },
    takeaway:
      'Model "one of several things" as a sum type so impossible states cannot be represented and missed cases become compile errors. Go and Spark need a convention instead.',
  },
  {
    id: 'dependency-injection',
    part: 'paradigms',
    navLabel: 'Dependency injection',
    title: 'Dependency injection',
    summary:
      'Pass a component the collaborators it needs instead of letting it create or look them up. That makes it easy to swap in a fake for tests. No framework is required.',
    snippets: {
      sql: {
        code: `-- Parameterise behaviour through configuration the caller controls.
CREATE FUNCTION price_with_tax(amount numeric, rate numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT amount * (1 + rate) $$;

SELECT price_with_tax(100, 0.0825);                       -- production rate
SELECT price_with_tax(100, 0);                            -- test: no tax
-- Per-session settings (SET app.tax_rate = '0.0825') are the equivalent of injected config.`,
      },
      python: {
        code: `from typing import Protocol

class Clock(Protocol):
    def now(self) -> float: ...

class SystemClock:
    def now(self) -> float:
        import time
        return time.time()

class Greeter:
    def __init__(self, clock: Clock):         # the dependency is a constructor argument
        self._clock = clock
    def greet(self) -> str:
        return "morning" if self._clock.now() % 86400 < 43200 else "afternoon"

class FixedClock:
    def __init__(self, value: float): self._value = value
    def now(self) -> float: return self._value

assert Greeter(FixedClock(0)).greet() == "morning"   # test without patching time`,
      },
      typescript: {
        code: `interface Clock { now(): number }

class Greeter {
  constructor(private readonly clock: Clock = { now: () => Date.now() }) {}   // sensible default
  greet(): string {
    return this.clock.now() % 86_400_000 < 43_200_000 ? "morning" : "afternoon";
  }
}

console.log(new Greeter({ now: () => 0 }).greet());   // "morning": a fake, no mocking library`,
      },
      spark: {
        code: `# Inject the SparkSession and the paths instead of calling getOrCreate() inside the job.
from pyspark.sql import DataFrame, SparkSession

class DailyReport:
    def __init__(self, spark: SparkSession, source: str):
        self._spark = spark
        self._source = source

    def run(self) -> DataFrame:
        return self._spark.read.parquet(self._source).groupBy("day").count()

# Production: DailyReport(spark, "s3://bucket/events")
# Test:       DailyReport(local_spark, "tests/fixtures/events")`,
      },
      rust: {
        code: `trait Clock {
    fn now(&self) -> u64;
}

struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
    }
}

struct Greeter<C: Clock> { clock: C }          // static dispatch: no run-time cost
impl<C: Clock> Greeter<C> {
    fn greet(&self) -> &'static str {
        if self.clock.now() % 86_400 < 43_200 { "morning" } else { "afternoon" }
    }
}

struct FixedClock(u64);
impl Clock for FixedClock { fn now(&self) -> u64 { self.0 } }

assert_eq!(Greeter { clock: FixedClock(0) }.greet(), "morning");`,
      },
      cpp: {
        code: `#include <memory>

struct Clock {
    virtual ~Clock() = default;
    virtual long now() const = 0;
};

class Greeter {
public:
    explicit Greeter(std::shared_ptr<Clock> clock) : clock_(std::move(clock)) {}
    const char* greet() const { return clock_->now() % 86400 < 43200 ? "morning" : "afternoon"; }
private:
    std::shared_ptr<Clock> clock_;               // ownership is explicit in the type
};

struct FixedClock : Clock {
    long now() const override { return 0; }
};
// Greeter greeter(std::make_shared<FixedClock>());`,
      },
      go: {
        code: `type Clock interface {
    Now() int64
}

type Greeter struct{ clock Clock }

func NewGreeter(clock Clock) *Greeter { return &Greeter{clock: clock} }

func (g *Greeter) Greet() string {
    if g.clock.Now()%86400 < 43200 {
        return "morning"
    }
    return "afternoon"
}

type fixedClock int64
func (f fixedClock) Now() int64 { return int64(f) }

// In a test: NewGreeter(fixedClock(0)).Greet() == "morning"`,
      },
      swift: {
        code: `protocol Clock { func now() -> TimeInterval }

struct SystemClock: Clock {
    func now() -> TimeInterval { Date().timeIntervalSince1970 }
}

struct Greeter {
    let clock: any Clock
    func greet() -> String {
        clock.now().truncatingRemainder(dividingBy: 86_400) < 43_200 ? "morning" : "afternoon"
    }
}

struct FixedClock: Clock { func now() -> TimeInterval { 0 } }
assert(Greeter(clock: FixedClock()).greet() == "morning")`,
      },
      kotlin: {
        code: `fun interface Clock { fun now(): Long }       // SAM interface: a lambda can implement it

class Greeter(private val clock: Clock = Clock { System.currentTimeMillis() }) {
    fun greet() = if (clock.now() % 86_400_000 < 43_200_000) "morning" else "afternoon"
}

check(Greeter { 0L }.greet() == "morning")    // a fake clock is just a lambda`,
      },
    },
    takeaway:
      'Constructor injection is enough: depend on a small interface and pass the real or fake implementation in. DI containers and frameworks only automate the wiring.',
  },
  {
    id: 'strategy',
    part: 'paradigms',
    navLabel: 'Strategy via functions',
    title: 'The strategy pattern with first-class functions',
    summary:
      'A strategy is a swappable algorithm. In languages with first-class functions, the whole class hierarchy collapses into passing a function.',
    snippets: {
      sql: {
        code: `-- Choose the algorithm per row with CASE, or pass the choice as a parameter.
SELECT amount,
       CASE discount_kind
         WHEN 'percent' THEN amount * (1 - discount_value / 100)
         WHEN 'flat'    THEN amount - discount_value
         ELSE amount
       END AS final_price
FROM orders;`,
        note: 'The strategy is data (discount_kind) interpreted by one expression.',
      },
      python: {
        code: `from typing import Callable

Discount = Callable[[float], float]

def percent(rate: float) -> Discount:
    return lambda amount: amount * (1 - rate)

def flat(value: float) -> Discount:
    return lambda amount: max(amount - value, 0)

def checkout(amount: float, discount: Discount = lambda a: a) -> float:
    return discount(amount)

print(checkout(100, percent(0.1)), checkout(100, flat(15)))   # 90.0 85`,
      },
      typescript: {
        code: `type Discount = (amount: number) => number;

const percent = (rate: number): Discount => (amount) => amount * (1 - rate);
const flat = (value: number): Discount => (amount) => Math.max(amount - value, 0);

const checkout = (amount: number, discount: Discount = (a) => a) => discount(amount);

console.log(checkout(100, percent(0.1)), checkout(100, flat(15)));   // 90 85`,
      },
      spark: {
        code: `from pyspark.sql import Column, functions as F
from typing import Callable

Discount = Callable[[Column], Column]

def percent(rate: float) -> Discount:
    return lambda amount: amount * (1 - rate)

def flat(value: float) -> Discount:
    return lambda amount: F.greatest(amount - value, F.lit(0))

def checkout(frame, discount: Discount):
    return frame.withColumn("final", discount(F.col("amount")))   # strategies build Column expressions

checkout(orders, percent(0.1))`,
        note: 'The strategy returns an expression, so the optimizer still sees the whole plan (a UDF would hide it).',
      },
      rust: {
        code: `fn percent(rate: f64) -> impl Fn(f64) -> f64 {
    move |amount| amount * (1.0 - rate)           // closure owns 'rate'
}

fn flat(value: f64) -> impl Fn(f64) -> f64 {
    move |amount| (amount - value).max(0.0)
}

fn checkout(amount: f64, discount: impl Fn(f64) -> f64) -> f64 {
    discount(amount)                              // monomorphised per closure: inlined
}

// To store different strategies together, box them: Vec<Box<dyn Fn(f64) -> f64>>
println!("{} {}", checkout(100.0, percent(0.1)), checkout(100.0, flat(15.0)));`,
      },
      cpp: {
        code: `#include <algorithm>
#include <functional>
#include <iostream>

using Discount = std::function<double(double)>;       // type-erased: one allocation, an indirect call

Discount percent(double rate) { return [rate](double a) { return a * (1 - rate); }; }
Discount flat(double value)   { return [value](double a) { return std::max(a - value, 0.0); }; }

double checkout(double amount, const Discount& discount) { return discount(amount); }

// Zero-overhead alternative: template <typename F> double checkout(double a, F&& f) { return f(a); }

int main() { std::cout << checkout(100, percent(0.1)) << " " << checkout(100, flat(15)) << "\\n"; }`,
      },
      go: {
        code: `type Discount func(amount float64) float64

func Percent(rate float64) Discount {
    return func(amount float64) float64 { return amount * (1 - rate) }
}

func Flat(value float64) Discount {
    return func(amount float64) float64 { return math.Max(amount-value, 0) }
}

func Checkout(amount float64, discount Discount) float64 { return discount(amount) }

func main() {
    fmt.Println(Checkout(100, Percent(0.1)), Checkout(100, Flat(15))) // 90 85
}`,
      },
      swift: {
        code: `typealias Discount = (Double) -> Double

func percent(_ rate: Double) -> Discount { { amount in amount * (1 - rate) } }
func flat(_ value: Double) -> Discount { { amount in max(amount - value, 0) } }

func checkout(_ amount: Double, discount: Discount = { $0 }) -> Double { discount(amount) }

print(checkout(100, discount: percent(0.1)), checkout(100, discount: flat(15)))   // 90.0 85.0`,
      },
      kotlin: {
        code: `typealias Discount = (Double) -> Double

fun percent(rate: Double): Discount = { amount -> amount * (1 - rate) }
fun flat(value: Double): Discount = { amount -> maxOf(amount - value, 0.0) }

fun checkout(amount: Double, discount: Discount = { it }) = discount(amount)

println("\${checkout(100.0, percent(0.1))} \${checkout(100.0, flat(15.0))}")   // 90.0 85.0`,
      },
    },
    takeaway:
      'When the algorithm is one function, pass the function. Use an interface or trait only when a strategy needs several methods or its own state.',
  },
  {
    id: 'object-lifecycle',
    part: 'paradigms',
    navLabel: 'Object lifecycle',
    title: 'Object lifecycle: construction, equality, copying',
    summary:
      'Every language answers four questions for a type: how it is built, when it is cleaned up, when two values count as equal, and what copying one means.',
    snippets: {
      sql: {
        code: `-- Construction: INSERT with defaults and constraints. Equality: keys and IS NOT DISTINCT FROM.
CREATE TABLE points (id bigserial PRIMARY KEY, x int NOT NULL, y int NOT NULL, UNIQUE (x, y));

SELECT (1, 2) = (1, 2) AS same;                         -- row comparison: true
SELECT NULL IS NOT DISTINCT FROM NULL AS null_safe;     -- true (plain = would give NULL)

-- Copying: INSERT ... SELECT creates independent rows.
INSERT INTO points (x, y) SELECT x + 10, y FROM points;`,
      },
      python: {
        code: `from dataclasses import dataclass, field
import copy

@dataclass(frozen=True)              # generates __init__, __eq__, __hash__, __repr__
class Point:
    x: int
    y: int

@dataclass
class Path:
    points: list[Point] = field(default_factory=list)   # never use a bare [] default

a = Path([Point(1, 2)])
shallow = copy.copy(a)               # shares the list
deep = copy.deepcopy(a)              # independent
a.points.append(Point(3, 4))
print(len(shallow.points), len(deep.points))   # 2 1
print(Point(1, 2) == Point(1, 2), hash(Point(1, 2)) == hash(Point(1, 2)))   # True True`,
      },
      typescript: {
        code: `class Point {
  constructor(public readonly x: number, public readonly y: number) {}
  equals(other: Point) { return this.x === other.x && this.y === other.y; }
}

const a = new Point(1, 2);
const b = new Point(1, 2);
console.log(a === b, a.equals(b));          // false true: === compares identity

const original = { tags: ["x"] };
const shallow = { ...original };            // shares 'tags'
const deep = structuredClone(original);     // independent copy
original.tags.push("y");
console.log(shallow.tags.length, deep.tags.length);   // 2 1`,
      },
      spark: {
        code: `# DataFrames are immutable: "copy" is just another reference, and changes make new DataFrames.
a = spark.range(3)
b = a
c = a.withColumn("double", F.col("id") * 2)      # a, b unchanged

# Equality of rows is structural:
from pyspark.sql import Row
print(Row(x=1, y=2) == Row(x=1, y=2))             # True

# A true independent copy of data is a write: a.write.parquet("copy") then read it back.`,
      },
      rust: {
        code: `#[derive(Debug, Clone, PartialEq, Eq, Hash)]    // equality, hashing, and explicit deep copy
struct Point { x: i32, y: i32 }

struct Path { points: Vec<Point> }

impl Drop for Path {                            // destructor: runs at scope exit
    fn drop(&mut self) { println!("freeing {} points", self.points.len()); }
}

fn main() {
    let a = Path { points: vec![Point { x: 1, y: 2 }] };
    let copy = Path { points: a.points.clone() };   // clone() is explicit and deep
    println!("{}", Point { x: 1, y: 2 } == Point { x: 1, y: 2 });   // true
    // let moved = a; println!("{}", a.points.len());  // error: 'a' was moved
}`,
      },
      cpp: {
        code: `#include <iostream>
#include <vector>

struct Point {
    int x, y;
    bool operator==(const Point&) const = default;     // C++20 memberwise equality
};

struct Path {
    std::vector<Point> points;
    Path() = default;
    Path(const Path&) = default;                        // copy: deep, because vector copies elements
    Path(Path&&) noexcept = default;                    // move: steals the buffer
    ~Path() { std::cout << "freeing\\n"; }               // destructor runs at scope exit
};
// Rule of zero: if every member manages itself (vector, string, unique_ptr),
// write none of the five special members and the defaults are correct.`,
      },
      go: {
        code: `type Point struct{ X, Y int }

type Path struct{ Points []Point }

func main() {
    a := Point{1, 2}
    b := Point{1, 2}
    fmt.Println(a == b)               // true: structs of comparable fields compare by value

    p := Path{Points: []Point{{1, 2}}}
    q := p                            // copies the slice header: both share one backing array
    q.Points[0].X = 99
    fmt.Println(p.Points[0].X)        // 99

    r := Path{Points: slices.Clone(p.Points)}   // an independent copy
    _ = r
}
// No destructors: use defer for cleanup. Slices and maps cannot be compared with ==.`,
      },
      swift: {
        code: `struct Point: Hashable {            // value type: copied on assignment; Equatable/Hashable synthesised
    var x: Int
    var y: Int
}

final class Path {                   // reference type: assignment shares the instance
    var points: [Point] = []
    deinit { print("freeing") }      // runs when the last strong reference goes away
}

var a = Point(x: 1, y: 2)
var b = a
b.x = 99
print(a.x, a == Point(x: 1, y: 2))   // 1 true: b is an independent copy`,
      },
      kotlin: {
        code: `data class Point(val x: Int, val y: Int)       // equals, hashCode, toString, copy generated

class Path(val points: MutableList<Point> = mutableListOf())

fun main() {
    val a = Point(1, 2)
    println(a == Point(1, 2))                  // true: == calls equals
    println(a === Point(1, 2))                 // false: === is identity
    val moved = a.copy(x = 99)                 // copy with a change

    val path = Path(mutableListOf(a))
    val shallow = Path(path.points)            // shares the list
    val deep = Path(path.points.toMutableList())   // independent list (the Points are immutable)
}`,
      },
    },
    takeaway:
      'Decide for every type whether equality is by value or by identity, whether copies are shallow or deep, and what releases its resources. Value-typed, immutable data makes all four trivial.',
  },
];
