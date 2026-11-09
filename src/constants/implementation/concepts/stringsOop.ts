import type { Concept } from './types';

export const STRINGS_OOP_CONCEPTS: Concept[] = [
  {
    id: 'string-manipulation',
    part: 'strings-oop',
    navLabel: 'String manipulation',
    title: 'String manipulation',
    summary:
      'Strings are immutable in most of these languages, so every edit builds a new string. Know how to split, join, search, and format.',
    snippets: {
      sql: {
        code: `SELECT upper('ada lovelace')                    AS shout,
       split_part('a,b,c', ',', 2)              AS second,      -- 'b'
       replace('a-b-c', '-', '+')               AS replaced,
       position('love' IN 'ada lovelace')       AS found_at,    -- 5
       'Hello, ' || 'Ada'                       AS joined,
       format('%s has %s items', 'cart', 3)     AS formatted;`,
      },
      python: {
        code: `text = "ada lovelace"
print(text.upper(), text.title())           # ADA LOVELACE  Ada Lovelace
print(text.split(" "))                      # ['ada', 'lovelace']
print("-".join(["a", "b", "c"]))            # a-b-c  (join is O(n); repeated += can be O(n^2))
print(text.replace("ada", "grace"))
print(f"{text!r} has {len(text)} chars")    # f-string formatting`,
      },
      typescript: {
        code: `const text = "ada lovelace";
console.log(text.toUpperCase());
console.log(text.split(" "));               // ["ada", "lovelace"]
console.log(["a", "b", "c"].join("-"));
console.log(text.replaceAll("a", "A"));
console.log(text.includes("love"), text.indexOf("love"));
console.log(\`\${text} has \${text.length} chars\`);  // template literal`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

frame.select(
    F.upper("name").alias("shout"),
    F.split("name", " ").alias("parts"),
    F.regexp_replace("name", "a", "A").alias("replaced"),
    F.concat_ws("-", "first", "last").alias("joined"),
)`,
      },
      rust: {
        code: `let text = String::from("ada lovelace");     // owned, growable UTF-8
println!("{}", text.to_uppercase());
let parts: Vec<&str> = text.split(' ').collect(); // borrowed slices into 'text': no copy
let joined = ["a", "b", "c"].join("-");
let replaced = text.replace("ada", "grace");
let mut builder = String::new();
builder.push_str("hello");                    // amortised O(1) append
println!("{text} has {} bytes", text.len());`,
      },
      cpp: {
        code: `#include <string>
#include <string_view>
#include <algorithm>
#include <format>      // C++20

std::string text = "ada lovelace";
std::transform(text.begin(), text.end(), text.begin(),
               [](unsigned char c) { return std::toupper(c); }); // ASCII only
std::string_view view = text;               // non-owning view: no copy
auto position = text.find("love");          // npos if absent
text += "!";                                // std::string is mutable
auto message = std::format("{} has {} bytes", text, text.size());`,
      },
      go: {
        code: `text := "ada lovelace"
fmt.Println(strings.ToUpper(text))
fmt.Println(strings.Split(text, " "))       // []string{"ada", "lovelace"}
fmt.Println(strings.Join([]string{"a", "b", "c"}, "-"))
fmt.Println(strings.Contains(text, "love"))

var builder strings.Builder                 // avoids quadratic copying from repeated +
builder.WriteString("hello")
fmt.Println(builder.String(), fmt.Sprintf("%s has %d bytes", text, len(text)))`,
      },
      swift: {
        code: `let text = "ada lovelace"
print(text.uppercased())
print(text.split(separator: " "))          // [Substring]: views into the original
print(["a", "b", "c"].joined(separator: "-"))
print(text.replacingOccurrences(of: "ada", with: "grace")) // needs Foundation
print(text.contains("love"))
print("\\(text) has \\(text.count) characters")  // string interpolation`,
      },
      kotlin: {
        code: `val text = "ada lovelace"
println(text.uppercase())
println(text.split(" "))                      // [ada, lovelace]
println(listOf("a", "b", "c").joinToString("-"))
println(text.replace("ada", "grace"))
println("love" in text)
val builder = StringBuilder().append("hello") // mutable buffer for many appends
println("$text has \${text.length} chars")`,
      },
    },
    takeaway:
      'Strings are usually immutable, so a loop that appends builds a new string each time. Use the language’s builder or join to keep concatenation linear.',
  },
  {
    id: 'classes-encapsulation',
    part: 'strings-oop',
    navLabel: 'Classes & encapsulation',
    title: 'Classes, objects, and encapsulation',
    summary:
      'A class bundles data with the methods that operate on it and hides the internals behind a small public interface.',
    snippets: {
      sql: {
        code: `-- Encapsulation by privilege: expose a view, hide the table.
CREATE TABLE account_private (id serial PRIMARY KEY, owner text, balance numeric);
CREATE VIEW account_public AS SELECT id, owner FROM account_private;
REVOKE ALL ON account_private FROM app_user;
GRANT SELECT ON account_public TO app_user;`,
        note: 'No classes. Views, functions, and privileges play the role of a public interface.',
      },
      python: {
        code: `class Account:
    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner
        self._balance = balance         # leading underscore: private BY CONVENTION only

    @property
    def balance(self) -> float:         # read access through a property
        return self._balance

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

account = Account("Ada")
account.deposit(50)`,
      },
      typescript: {
        code: `class Account {
  #balance = 0;                         // # fields are truly private at run time

  constructor(public readonly owner: string) {}

  get balance(): number {
    return this.#balance;
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error("amount must be positive");
    this.#balance += amount;
  }
}`,
      },
      spark: {
        code: `# Spark has no object model of its own: use ordinary Python classes on the driver
# and keep them out of closures that run on executors (they must be picklable).
class Pipeline:
    def __init__(self, source: str):
        self._source = source

    def run(self, spark):
        return spark.read.parquet(self._source).filter("amount > 0")`,
        note: 'Wrap transformations in classes for structure; the data itself stays in DataFrames.',
      },
      rust: {
        code: `pub struct Account {
    owner: String,
    balance: f64,                     // private: fields are private to the module by default
}

impl Account {
    pub fn new(owner: &str) -> Self {
        Account { owner: owner.to_string(), balance: 0.0 }
    }

    pub fn deposit(&mut self, amount: f64) -> Result<(), String> {
        if amount <= 0.0 { return Err("amount must be positive".into()); }
        self.balance += amount;
        Ok(())
    }

    pub fn balance(&self) -> f64 { self.balance }
}`,
      },
      cpp: {
        code: `#include <stdexcept>
#include <string>

class Account {
public:
    explicit Account(std::string owner) : owner_(std::move(owner)) {}

    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("amount must be positive");
        balance_ += amount;
    }
    double balance() const { return balance_; }   // const: does not modify the object

private:
    std::string owner_;
    double balance_ = 0.0;                        // members laid out contiguously in memory
};`,
      },
      go: {
        code: `type Account struct {
    Owner   string // exported: capital letter
    balance float64 // unexported: visible only inside the package
}

func NewAccount(owner string) *Account { return &Account{Owner: owner} }

func (a *Account) Deposit(amount float64) error { // pointer receiver: mutates the value
    if amount <= 0 {
        return errors.New("amount must be positive")
    }
    a.balance += amount
    return nil
}

func (a *Account) Balance() float64 { return a.balance }`,
      },
      swift: {
        code: `final class Account {
    let owner: String
    private(set) var balance: Double = 0   // readable outside, writable only inside

    init(owner: String) { self.owner = owner }

    func deposit(_ amount: Double) throws {
        guard amount > 0 else { throw AccountError.invalidAmount }
        balance += amount
    }
}

enum AccountError: Error { case invalidAmount }`,
      },
      kotlin: {
        code: `class Account(val owner: String) {
    var balance: Double = 0.0
        private set                     // public getter, private setter

    fun deposit(amount: Double) {
        require(amount > 0) { "amount must be positive" }
        balance += amount
    }
}

data class Point(val x: Int, val y: Int)   // equals, hashCode, toString, copy generated`,
      },
    },
    takeaway:
      'Keep state private and expose behaviour. Enforcement ranges from convention (Python), to compile-time (Rust, Kotlin, Swift, C++), to run-time privacy (# fields in JavaScript).',
  },
  {
    id: 'dynamic-dispatch',
    part: 'strings-oop',
    navLabel: 'Interfaces & vtables',
    title: 'Interfaces, abstract classes, and dynamic dispatch',
    summary:
      'Calling a method through an interface needs a runtime lookup (a vtable) unless the compiler knows the concrete type, in which case it can inline the call.',
    snippets: {
      sql: {
        code: `-- No dispatch on type of a row. The nearest idea: a polymorphic function
-- resolved by argument types at planning time (overloading).
CREATE FUNCTION area(r double precision) RETURNS double precision
  LANGUAGE sql AS $$ SELECT pi() * r * r $$;
CREATE FUNCTION area(w double precision, h double precision) RETURNS double precision
  LANGUAGE sql AS $$ SELECT w * h $$;`,
        note: 'Overloads are chosen once when the query is planned, not per row.',
      },
      python: {
        code: `from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

class Square(Shape):
    def __init__(self, side: float): self.side = side
    def area(self) -> float: return self.side ** 2

# Every call looks the method up through the instance's class (a dict lookup), at run time.
shapes: list[Shape] = [Square(2)]
print([shape.area() for shape in shapes])`,
      },
      typescript: {
        code: `interface Shape {
  area(): number;
}

class Square implements Shape {
  constructor(private side: number) {}
  area() { return this.side ** 2; }
}

const shapes: Shape[] = [new Square(2)];
// 'interface' is erased at run time. The call resolves through the object's prototype chain.`,
      },
      spark: {
        code: `# Spark SQL resolves a function once, at analysis time, from the column types.
# There is no per-row virtual dispatch: the generated code calls the concrete operation.
frame.selectExpr("abs(delta)", "length(name)")`,
        note: 'Catalyst compiles expressions to specialised code, avoiding dynamic dispatch in the hot loop.',
      },
      rust: {
        code: `trait Shape {
    fn area(&self) -> f64;
}
struct Square(f64);
impl Shape for Square {
    fn area(&self) -> f64 { self.0 * self.0 }
}

fn static_dispatch<T: Shape>(shape: &T) -> f64 { shape.area() } // monomorphised: one copy per type, can inline
fn dynamic_dispatch(shape: &dyn Shape) -> f64 { shape.area() } // fat pointer: data pointer + vtable pointer

let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Square(2.0))];`,
      },
      cpp: {
        code: `struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;   // goes through the vtable
};
struct Square : Shape {
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }
    double side_;
};

// Each object of a class with virtual methods holds a hidden vptr to its class's vtable.
// A virtual call = load vptr, load slot, indirect jump: cannot be inlined, may miss the cache.
std::unique_ptr<Shape> shape = std::make_unique<Square>(2.0);
double a = shape->area();

// CRTP / templates give static dispatch with no vtable.
template <typename T> double total(const T& shape) { return shape.area(); }`,
      },
      go: {
        code: `type Shape interface {
    Area() float64
}

type Square struct{ Side float64 }

func (s Square) Area() float64 { return s.Side * s.Side }

// An interface value is two words: a pointer to the type's method table (itab) and a pointer to the data.
var shape Shape = Square{2}
fmt.Println(shape.Area()) // dynamic call through the itab`,
      },
      swift: {
        code: `protocol Shape {
    func area() -> Double
}
struct Square: Shape {
    let side: Double
    func area() -> Double { side * side }
}

func total<T: Shape>(_ shape: T) -> Double { shape.area() }   // generic: specialised, can inline
func totalAny(_ shape: any Shape) -> Double { shape.area() }  // existential: dispatch via a witness table`,
      },
      kotlin: {
        code: `interface Shape {
    fun area(): Double
}

class Square(private val side: Double) : Shape {
    override fun area() = side * side
}

// On the JVM an interface call is invokeinterface. The JIT often inlines it when
// only one implementation is loaded; with several, it falls back to a table lookup.
val shapes: List<Shape> = listOf(Square(2.0))`,
      },
    },
    takeaway:
      'Dynamic dispatch buys flexibility at the cost of an indirect call and lost inlining. Where the type is known at compile time (generics, templates, monomorphisation) the call is free.',
  },
  {
    id: 'composition-inheritance',
    part: 'strings-oop',
    navLabel: 'Composition vs inheritance',
    title: 'Composition versus inheritance',
    summary:
      'Inheritance couples a subclass to its parent’s internals. Composition assembles behaviour from parts, which keeps changes local.',
    snippets: {
      sql: {
        code: `-- Table inheritance exists in PostgreSQL but is rarely recommended.
-- Prefer composition: separate tables joined by a foreign key.
CREATE TABLE person  (id serial PRIMARY KEY, name text);
CREATE TABLE employee (person_id int PRIMARY KEY REFERENCES person(id), salary numeric);

SELECT p.name, e.salary FROM person p JOIN employee e ON e.person_id = p.id;`,
        note: 'The relational analogue of composition is a foreign key.',
      },
      python: {
        code: `# Inheritance: Stack is-a list, so it exposes every list method (insert, sort, ...).
class BadStack(list):
    def push(self, item): self.append(item)

# Composition: Stack has-a list and exposes only what it means to.
class Stack:
    def __init__(self):
        self._items: list = []
    def push(self, item): self._items.append(item)
    def pop(self): return self._items.pop()`,
      },
      typescript: {
        code: `interface Logger { log(message: string): void }

class ConsoleLogger implements Logger {
  log(message: string) { console.log(message); }
}

class OrderService {
  constructor(private readonly logger: Logger) {}   // composed in, swappable in tests
  place(id: string) { this.logger.log(\`placed \${id}\`); }
}

new OrderService(new ConsoleLogger()).place("42");`,
      },
      spark: {
        code: `# Compose small DataFrame -> DataFrame functions instead of a class hierarchy.
def clean(frame):  return frame.filter("amount > 0")
def enrich(frame): return frame.withColumn("tax", frame.amount * 0.0825)

result = frame.transform(clean).transform(enrich)`,
        note: 'DataFrame.transform chains functions: composition by function.',
      },
      rust: {
        code: `// Rust has no struct inheritance. Reuse comes from composition plus traits.
trait Logger { fn log(&self, message: &str); }

struct ConsoleLogger;
impl Logger for ConsoleLogger {
    fn log(&self, message: &str) { println!("{message}"); }
}

struct OrderService<L: Logger> { logger: L }   // generic over any Logger
impl<L: Logger> OrderService<L> {
    fn place(&self, id: &str) { self.logger.log(&format!("placed {id}")); }
}`,
      },
      cpp: {
        code: `#include <memory>

// The fragile base class problem: changing Base::run() can silently break every Derived.
struct Base {
    virtual void run() { step(); step(); }
    virtual void step() {}
};

// Composition: hold a collaborator behind an interface.
struct Logger { virtual void log(const std::string&) = 0; virtual ~Logger() = default; };
class OrderService {
public:
    explicit OrderService(std::unique_ptr<Logger> logger) : logger_(std::move(logger)) {}
    void place(const std::string& id) { logger_->log("placed " + id); }
private:
    std::unique_ptr<Logger> logger_;
};`,
      },
      go: {
        code: `// Go has no inheritance. Embedding promotes the inner type's methods (composition).
type Logger struct{}
func (Logger) Log(message string) { fmt.Println(message) }

type OrderService struct {
    Logger            // embedded: OrderService.Log is promoted
}

func (s OrderService) Place(id string) { s.Log("placed " + id) }

// Embedding is NOT inheritance: there is no virtual dispatch back into OrderService.`,
      },
      swift: {
        code: `protocol Logging { func log(_ message: String) }

extension Logging {
    func warn(_ message: String) { log("WARN: " + message) }  // shared behaviour without a base class
}

struct ConsoleLogger: Logging {
    func log(_ message: String) { print(message) }
}

struct OrderService<L: Logging> {
    let logger: L
    func place(_ id: String) { logger.log("placed \\(id)") }
}`,
      },
      kotlin: {
        code: `interface Logger { fun log(message: String) }

class ConsoleLogger : Logger {
    override fun log(message: String) = println(message)
}

// Delegation: 'by logger' forwards the interface to a composed object, with no boilerplate.
class OrderService(private val logger: Logger) : Logger by logger {
    fun place(id: String) = log("placed $id")
}

// Classes are final by default: you must write 'open' to allow inheritance.`,
      },
    },
    takeaway:
      'Reach for composition first. Inheritance is justified for a true is-a relationship you control; elsewhere a change in the parent can break every child (the fragile base class problem). Module 2 (Paradigms) goes deeper: generics, delegation, sum types, dependency injection, and object lifecycle.',
  },
];
