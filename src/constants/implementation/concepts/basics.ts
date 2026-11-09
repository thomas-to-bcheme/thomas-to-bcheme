import type { Concept } from './types';

export const BASICS_CONCEPTS: Concept[] = [
  {
    id: 'variables',
    part: 'basics',
    navLabel: 'Variables',
    title: 'Variables',
    summary:
      'A variable is a name for a value. Languages differ on whether the name is bound to a memory slot, to an object, or to a column in a result.',
    snippets: {
      sql: {
        code: `-- A CTE names a value for the rest of one statement.
WITH inputs AS (SELECT 10 AS count, 'Ada' AS name)
SELECT count + 1 AS next_count, name FROM inputs;

-- Procedural extensions (PL/pgSQL) have real variables:
-- DECLARE total integer := 0;
-- BEGIN total := total + 1; END;`,
        note: 'Plain SQL is declarative: names refer to columns of a result set, not memory slots.',
      },
      python: {
        code: `count = 10          # the name 'count' is bound to an int object on the heap
count = count + 1   # rebinding: the name now points at a different int object
name: str = "Ada"   # annotations document intent; Python does not enforce them`,
      },
      typescript: {
        code: `let count = 10;          // block-scoped, reassignable
count = count + 1;
const name: string = "Ada"; // binding cannot be reassigned (the object can still change)`,
      },
      spark: {
        code: `from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.getOrCreate()
frame = spark.createDataFrame([(10, "Ada")], ["count", "name"])

# DataFrames are immutable: this returns a NEW DataFrame, 'frame' is unchanged.
next_frame = frame.withColumn("count", F.col("count") + 1)`,
        note: 'Driver-side Python variables hold plans, not data; the data lives on executors.',
      },
      rust: {
        code: `let count = 10;        // immutable binding; i32 inferred, stored on the stack
let mut total = 0;     // 'mut' opts in to reassignment
total += count;
let name: &str = "Ada"; // string literal: a pointer and length into read-only data`,
      },
      cpp: {
        code: `int count = 10;               // typically 4 bytes on the stack
count = count + 1;            // overwrites the same memory location
auto name = std::string{"Ada"}; // type deduced; characters may live on the heap`,
      },
      go: {
        code: `count := 10            // short declaration; type inferred as int
var total int          // declared without a value: zero value (0)
total += count
name := "Ada"`,
      },
      swift: {
        code: `var count = 10     // 'var' is mutable
count += 1
let name = "Ada"   // 'let' is immutable; the compiler enforces it`,
      },
      kotlin: {
        code: `var count = 10     // 'var' is reassignable
count += 1
val name = "Ada"   // 'val' is a read-only reference`,
      },
    },
    takeaway:
      'Decide up front whether a name can be reassigned. Rust, Swift, and Kotlin default or encourage immutable bindings, which makes code easier to reason about.',
  },
  {
    id: 'data-types',
    part: 'basics',
    navLabel: 'Data types',
    title: 'Primitive data types and sizes',
    summary:
      'Primitive types map directly to bits. Knowing the width tells you the range, the memory used, and when arithmetic overflows.',
    snippets: {
      sql: {
        code: `SELECT 42::integer      AS int4,      -- 32-bit
       42::bigint       AS int8,      -- 64-bit
       3.14::numeric(5,2) AS exact,   -- exact decimal, safe for money
       3.14::double precision AS approx, -- 64-bit binary float
       TRUE             AS flag;`,
        note: 'Types are declared per column; numeric is exact decimal, double precision is binary floating point.',
      },
      python: {
        code: `big = 2 ** 100          # int has arbitrary precision: it never overflows
ratio = 0.1 + 0.2       # float is a 64-bit binary float
print(ratio)            # 0.30000000000000004
print(type(big), type(ratio))`,
      },
      typescript: {
        code: `const whole = 42;            // 'number' is always a 64-bit float
const huge = 2n ** 100n;     // 'bigint' for arbitrary-size integers
console.log(0.1 + 0.2);      // 0.30000000000000004
console.log(Number.MAX_SAFE_INTEGER); // 9007199254740991 (2^53 - 1)`,
      },
      spark: {
        code: `from pyspark.sql.types import IntegerType, LongType, DoubleType, DecimalType, StructType, StructField

schema = StructType([
    StructField("id", LongType()),          # 64-bit
    StructField("age", IntegerType()),      # 32-bit
    StructField("score", DoubleType()),     # 64-bit binary float
    StructField("price", DecimalType(10, 2)), # exact decimal for money
])`,
      },
      rust: {
        code: `let a: i32 = -5;      // signed 32-bit
let b: u8 = 255;      // unsigned 8-bit: 0..=255
let c: i64 = 1 << 40;
let d: f64 = 3.14;    // 64-bit float
let e: char = 'é';    // a Unicode scalar value: 4 bytes
println!("{} {}", i32::MAX, u8::MAX);`,
      },
      cpp: {
        code: `#include <cstdint>
#include <iostream>

int main() {
    std::int32_t a = -5;      // fixed width: exactly 32 bits
    std::uint8_t b = 255;
    double d = 3.14;
    // Plain 'int' and 'long' widths depend on the platform; sizeof tells you.
    std::cout << sizeof(int) << " " << sizeof(long) << " " << sizeof(double) << "\\n";
}`,
      },
      go: {
        code: `var a int32 = -5
var b uint8 = 255
var c int64 = 1 << 40
var d float64 = 3.14
var e rune = 'é'   // rune is an alias for int32: one Unicode code point
var f int          // 'int' is 32 or 64 bits depending on the platform`,
      },
      swift: {
        code: `let a: Int32 = -5
let b: UInt8 = 255
let c: Int = 1 << 40     // Int is 64-bit on modern platforms
let d: Double = 3.14
let e: Character = "é"   // a single user-perceived character`,
      },
      kotlin: {
        code: `val a: Int = -5          // 32-bit
val b: Long = 1L shl 40  // 64-bit
val c: Double = 3.14
val d: Char = 'é'        // a UTF-16 code unit
val e: Byte = 127        // signed 8-bit: -128..127
val f: UByte = 255u      // unsigned types exist too (UByte, UInt, ULong)`,
      },
    },
    takeaway:
      'Fixed-width integers overflow; floats round. Use exact decimal types for money, and check whether your language promotes, wraps, or traps on overflow.',
  },
  {
    id: 'constants',
    part: 'basics',
    navLabel: 'Constants',
    title: 'Constants',
    summary:
      'A constant is a value that is fixed for the life of the program. Some languages evaluate it at compile time, others only forbid reassignment.',
    snippets: {
      sql: {
        code: `-- No constants in plain SQL; name a fixed value once in a CTE.
WITH config AS (SELECT 0.0825 AS tax_rate)
SELECT price * (1 + tax_rate) AS total
FROM orders, config;`,
        note: 'Closest analogue: a one-row CTE or a settings table.',
      },
      python: {
        code: `from typing import Final

MAX_USERS: Final = 100   # convention: UPPER_CASE; Final is checked by type checkers only
# MAX_USERS = 200        # allowed at runtime! Python has no true constants`,
      },
      typescript: {
        code: `const MAX_USERS = 100;                       // binding cannot change
const ROLES = ["admin", "user"] as const;    // readonly tuple of literal types
type Role = typeof ROLES[number];            // "admin" | "user"`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

TAX_RATE = 0.0825                          # a driver-side Python constant
priced = orders.withColumn("total", F.col("price") * F.lit(1 + TAX_RATE))

# Large read-only lookup data: ship once per executor with a broadcast variable.
rates = spark.sparkContext.broadcast({"CA": 0.0725, "NY": 0.04})`,
      },
      rust: {
        code: `const MAX_USERS: u32 = 100;       // evaluated at compile time, inlined at each use
static GREETING: &str = "hello";  // one fixed memory address for the whole program`,
      },
      cpp: {
        code: `constexpr int kMaxUsers = 100;     // computed at compile time
const double kTaxRate = 0.0825;    // read-only, may be computed at run time`,
      },
      go: {
        code: `const MaxUsers = 100   // untyped constant: adapts to the type it is used with

const (
    Read  = 1 << iota // 1
    Write              // 2
    Exec               // 4
)`,
      },
      swift: {
        code: `let maxUsers = 100            // a constant binding
struct Config {
    static let taxRate = 0.0825 // one shared constant for the type
}`,
      },
      kotlin: {
        code: `const val MAX_USERS = 100        // compile-time constant (top level or in an object)
val startedAt = System.nanoTime() // 'val' is read-only but computed at run time`,
      },
    },
    takeaway:
      'Prefer compile-time constants for fixed values: the compiler can inline them and reject accidental changes.',
  },
  {
    id: 'operators',
    part: 'basics',
    navLabel: 'Operators',
    title: 'Arithmetic and logical operators',
    summary:
      'The same symbol can mean different things: integer or float division, and a remainder with different signs for negative numbers.',
    snippets: {
      sql: {
        code: `SELECT 7 / 2   AS int_div,   -- 3   (both operands integers)
       7 / 2.0 AS dec_div,   -- 3.5
       7 % 2   AS remainder, -- 1
       -7 % 2  AS neg_rem;   -- -1 (sign follows the dividend)`,
        note: 'PostgreSQL semantics. Division of two integers is integer division.',
      },
      python: {
        code: `print(7 / 2)    # 3.5   true division always returns a float
print(7 // 2)   # 3     floor division
print(-7 // 2)  # -4    floors toward negative infinity
print(-7 % 2)   # 1     remainder takes the sign of the divisor
print(2 ** 10)  # 1024`,
      },
      typescript: {
        code: `console.log(7 / 2);          // 3.5  (all numbers are floats)
console.log(Math.trunc(7 / 2)); // 3
console.log(-7 % 2);         // -1   remainder takes the sign of the dividend
console.log(2 ** 10);        // 1024`,
      },
      spark: {
        code: `spark.sql("""
  SELECT 7 / 2   AS true_div,    -- 3.5  '/' is always fractional
         7 DIV 2 AS int_div,     -- 3
         7 % 2   AS remainder
""").show()`,
        note: 'Spark SQL: / yields a fractional result; use DIV for integer division.',
      },
      rust: {
        code: `println!("{}", 7 / 2);              // 3   integer division truncates
println!("{}", -7 / 2);             // -3
println!("{}", -7 % 2);             // -1  remainder takes the sign of the dividend
println!("{}", (-7_i32).rem_euclid(2)); // 1   always non-negative
let sum = 250_u8.checked_add(10);   // None: overflow is explicit, not silent`,
      },
      cpp: {
        code: `#include <iostream>

int main() {
    std::cout << 7 / 2 << "\\n";   // 3   truncates toward zero
    std::cout << -7 / 2 << "\\n";  // -3
    std::cout << -7 % 2 << "\\n";  // -1
    std::cout << 7 / 2.0 << "\\n"; // 3.5
    // Signed integer overflow is undefined behaviour; unsigned wraps around.
}`,
      },
      go: {
        code: `fmt.Println(7 / 2)    // 3   integer division truncates
fmt.Println(-7 / 2)   // -3
fmt.Println(-7 % 2)   // -1
fmt.Println(7 / 2.0)  // 3.5 (untyped constants: the float form wins)`,
      },
      swift: {
        code: `print(7 / 2)        // 3
print(-7 / 2)       // -3
print(-7 % 2)       // -1
print(7.0 / 2.0)    // 3.5
let wrapped = UInt8.max &+ 1 // 0: '&+' wraps; plain '+' traps on overflow`,
      },
      kotlin: {
        code: `println(7 / 2)                // 3
println(-7 / 2)               // -3
println(-7 % 2)               // -1
println(Math.floorMod(-7, 2)) // 1
println(7 / 2.0)              // 3.5`,
      },
    },
    takeaway:
      'Check three things for every numeric operator: integer versus float division, the sign of the remainder, and what happens on overflow.',
  },
  {
    id: 'booleans',
    part: 'basics',
    navLabel: 'Booleans',
    title: 'Booleans and truthiness',
    summary:
      'Some languages only allow a real boolean in a condition; others treat numbers, empty strings, or null as true or false.',
    snippets: {
      sql: {
        code: `SELECT NULL = NULL   AS eq,     -- NULL, not true
       NULL IS NULL  AS is_null, -- true
       TRUE AND NULL AS a,       -- NULL
       FALSE AND NULL AS b;      -- false`,
        note: 'SQL has three truth values: true, false, and unknown (NULL). WHERE keeps only rows that are true.',
      },
      python: {
        code: `print(bool([]), bool(""), bool(0), bool(None))  # all False
print(bool([0]), bool("0"))                      # True True
print(1 and "x")      # 'x'   'and'/'or' return an operand, not a bool`,
      },
      typescript: {
        code: `console.log(Boolean(0), Boolean(""), Boolean(null));  // false false false
console.log(Boolean([]), Boolean("0"));               // true true  (empty array is truthy)
console.log(1 === 1.0, "1" == 1, "1" === 1);          // true true false`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Column booleans are three-valued like SQL; combine with & | ~ and parentheses.
adults = frame.filter((F.col("age") >= 18) & F.col("active"))
unknown = frame.filter(F.col("age").isNull())`,
      },
      rust: {
        code: `let flag: bool = true;
// if 1 { }            // compile error: a condition must be a bool
let ready = flag && !false;
println!("{}", ready as u8); // bool to integer needs an explicit cast`,
      },
      cpp: {
        code: `int count = 3;
if (count) { }          // legal: nonzero converts implicitly to true
bool flag = count > 0;  // prefer an explicit comparison
int *ptr = nullptr;
if (!ptr) { }           // a null pointer converts to false`,
      },
      go: {
        code: `ready := true
// if 1 { }           // compile error: non-bool used as condition
if ready && !false {
    fmt.Println("ok")
}`,
      },
      swift: {
        code: `let ready = true
// if 1 { }            // compile error: Int is not Bool
if ready && !false {
    print("ok")
}`,
      },
      kotlin: {
        code: `val ready = true
// if (1) { }           // compile error: Int is not Boolean
if (ready && !false) {
    println("ok")
}`,
      },
    },
    takeaway:
      'Strict booleans prevent a class of bugs; where truthiness exists, learn its list of falsy values, and remember SQL adds a third state.',
  },
  {
    id: 'string-primitives',
    part: 'basics',
    navLabel: 'String primitives',
    title: 'String primitives: bytes, code points, characters',
    summary:
      'The length of "héllo" depends on what you count: bytes, UTF-16 units, code points, or user-perceived characters.',
    snippets: {
      sql: {
        code: `SELECT length('héllo')       AS chars,  -- 5
       octet_length('héllo') AS bytes;  -- 6 in a UTF-8 database`,
      },
      python: {
        code: `text = "héllo"
print(len(text))                  # 5  code points
print(len(text.encode("utf-8")))  # 6  bytes
print(len("\\U0001F600"))          # 1  one emoji code point`,
        note: 'str is a sequence of Unicode code points; encode() produces bytes.',
      },
      typescript: {
        code: `const text = "héllo";
console.log(text.length);        // 5   UTF-16 code units
console.log("😀".length);        // 2   an emoji needs a surrogate pair
console.log([..."😀"].length);   // 1   iterating yields code points`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

frame.select(
    F.length("text").alias("chars"),
    F.octet_length("text").alias("bytes"),
)`,
      },
      rust: {
        code: `let text = "héllo";
println!("{}", text.len());             // 6   bytes (strings are UTF-8)
println!("{}", text.chars().count());   // 5   Unicode scalar values
// let c = text[1];                     // compile error: no byte indexing into UTF-8
let first_two = &text[..1];             // slices are by byte offset; must land on a boundary`,
      },
      cpp: {
        code: `#include <string>
#include <iostream>

int main() {
    std::string text = "héllo";           // bytes, in the source encoding (usually UTF-8)
    std::cout << text.size() << "\\n";      // 6  bytes, not characters
    // The standard library has no built-in code point iteration;
    // use a library such as ICU for Unicode-aware work.
}`,
      },
      go: {
        code: `text := "héllo"
fmt.Println(len(text))                    // 6  bytes (strings are UTF-8 byte slices)
fmt.Println(utf8.RuneCountInString(text)) // 5  runes (code points)
for index, r := range text {              // range decodes runes; index is a byte offset
    fmt.Println(index, string(r))
}`,
      },
      swift: {
        code: `let text = "héllo"
print(text.count)          // 5  grapheme clusters (what a reader sees as characters)
print(text.utf8.count)     // 6  bytes
// let c = text[1]         // compile error: Strings are not indexed by Int`,
      },
      kotlin: {
        code: `val text = "héllo"
println(text.length)                          // 5  UTF-16 code units
println(text.toByteArray(Charsets.UTF_8).size) // 6  bytes
println("😀".length)                           // 2  surrogate pair`,
      },
    },
    takeaway:
      'There is no single "length" of a string. Always ask whether you need bytes (storage), code points (parsing), or characters (display).',
  },
  {
    id: 'type-conversion',
    part: 'basics',
    navLabel: 'Casting & coercion',
    title: 'Type conversion, casting, and coercion',
    summary:
      'Converting between types can widen safely, narrow and lose data, or silently coerce. Static languages mostly force you to say so.',
    snippets: {
      sql: {
        code: `SELECT CAST(3.9 AS integer)  AS rounded,    -- 4  (PostgreSQL rounds)
       '5'::integer + 1      AS parsed,     -- 6
       CAST('abc' AS integer);              -- ERROR: invalid input syntax
-- 70000::smallint raises "smallint out of range" instead of wrapping.`,
        note: 'PostgreSQL errors on lossy or invalid casts instead of silently wrapping.',
      },
      python: {
        code: `print(int(3.9))        # 3   truncates toward zero
print(int("5") + 1)    # 6   explicit parse
# "5" + 1              # TypeError: no implicit str/int coercion
print(1 + True)        # 2   bool is a subclass of int`,
      },
      typescript: {
        code: `console.log("5" + 1);          // "51"  + concatenates when one side is a string
console.log("5" * 1);          // 5     * coerces to number
console.log(Number("abc"));    // NaN   failed parse does not throw
console.log(Math.trunc(3.9));  // 3
// Types are erased at runtime: 'as number' on a string does not convert anything.`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Default mode: an invalid cast yields NULL, not an error.
frame.select(F.col("raw").cast("int").alias("parsed"))

# With spark.sql.ansi.enabled=true, an invalid cast raises an error instead.`,
      },
      rust: {
        code: `let a = 3.9_f64 as i32;          // 3   'as' truncates toward zero
let b = 300_i32 as u8;           // 44  wraps: keeps the low 8 bits (0x12C -> 0x2C)
let c = u8::try_from(300_i32);   // Err(..) : checked conversion
let d = i64::from(5_i32);        // widening is lossless, so From exists
// let e: i64 = 5_i32;           // compile error: no implicit widening`,
      },
      cpp: {
        code: `#include <cstdint>

double d = 3.9;
int a = d;                    // 3, narrowing allowed silently (warning at best)
// int b{d};                  // error: brace-init rejects narrowing
auto c = static_cast<std::uint8_t>(300); // 44, wraps (unsigned conversion is defined)
// Signed overflow, by contrast, is undefined behaviour.`,
      },
      go: {
        code: `f := 3.9
a := int(f)              // 3, conversions are always explicit
var big int32 = 300
b := uint8(big)          // 44, wraps at run time
// c := uint8(300)       // compile error: constant 300 overflows uint8
// var d int64 = big     // compile error: no implicit widening`,
      },
      swift: {
        code: `let a = Int(3.9)                       // 3
let b = UInt8(exactly: 300)            // nil: checked conversion
let c = UInt8(truncatingIfNeeded: 300) // 44: explicit wrap
// let d = UInt8(300)                  // traps (crashes) at run time`,
      },
      kotlin: {
        code: `val a = 3.9.toInt()          // 3
val b = 300.toByte()         // 44, wraps
val small: Int = 5
// val big: Long = small     // compile error: no implicit widening
val big: Long = small.toLong()`,
      },
    },
    takeaway:
      'Narrowing loses bits and coercion hides bugs. Prefer checked conversions (try_from, exactly:) where the value comes from outside your program.',
  },
  {
    id: 'bitwise',
    part: 'basics',
    navLabel: 'Bitwise operations',
    title: 'Bitwise operations and flags',
    summary:
      'AND, OR, XOR, NOT, and shifts operate on individual bits, which lets a single integer hold many on/off flags.',
    snippets: {
      sql: {
        code: `-- Flags: READ = 1, WRITE = 2, EXEC = 4
SELECT 1 | 2        AS grant_rw,     -- 3  OR sets bits
       3 & 2 <> 0   AS can_write,    -- true  AND tests a bit
       3 & ~2       AS revoke_write, -- 1  AND NOT clears a bit
       1 << 3       AS shifted;      -- 8`,
      },
      python: {
        code: `READ, WRITE, EXEC = 1, 2, 4
perms = READ | WRITE             # set
can_write = bool(perms & WRITE)  # test
perms &= ~WRITE                  # clear
perms ^= EXEC                    # toggle
print(bin(perms), 1 << 3)        # 0b101 8`,
      },
      typescript: {
        code: `const READ = 1, WRITE = 2, EXEC = 4;
let perms = READ | WRITE;        // bitwise ops convert to 32-bit signed integers
const canWrite = (perms & WRITE) !== 0;
perms &= ~WRITE;
console.log(1 << 31);            // -2147483648: bit 31 is the sign bit
console.log(-1 >>> 0);           // 4294967295: '>>>' shifts in zeros`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

READ, WRITE = 1, 2
frame.select(
    (F.col("perms").bitwiseAND(WRITE) != 0).alias("can_write"),
    F.col("perms").bitwiseOR(READ).alias("with_read"),
    F.shiftleft("perms", 3).alias("shifted"),
)`,
      },
      rust: {
        code: `const READ: u8 = 1;
const WRITE: u8 = 2;
const EXEC: u8 = 4;

let mut perms = READ | WRITE;
let can_write = perms & WRITE != 0;
perms &= !WRITE;              // '!' is bitwise NOT on integers
perms ^= EXEC;
println!("{:03b} {}", perms, perms.count_ones());`,
      },
      cpp: {
        code: `#include <bitset>
#include <cstdint>
#include <iostream>

constexpr std::uint8_t kRead = 1, kWrite = 2, kExec = 4;

int main() {
    std::uint8_t perms = kRead | kWrite;
    bool can_write = (perms & kWrite) != 0;  // parentheses: == binds tighter than &
    perms &= static_cast<std::uint8_t>(~kWrite);
    std::cout << std::bitset<8>(perms) << " " << can_write << "\\n";
}`,
      },
      go: {
        code: `const (
    Read uint8 = 1 << iota // 1
    Write                  // 2
    Exec                   // 4
)

perms := Read | Write
canWrite := perms&Write != 0
perms &^= Write            // '&^' is AND NOT: clear a bit
fmt.Printf("%03b %v\\n", perms, canWrite)`,
      },
      swift: {
        code: `struct Permissions: OptionSet {
    let rawValue: UInt8
    static let read  = Permissions(rawValue: 1 << 0)
    static let write = Permissions(rawValue: 1 << 1)
    static let exec  = Permissions(rawValue: 1 << 2)
}

var perms: Permissions = [.read, .write]
let canWrite = perms.contains(.write)
perms.remove(.write)`,
      },
      kotlin: {
        code: `const val READ = 1
const val WRITE = 2
const val EXEC = 4

var perms = READ or WRITE            // infix functions, not symbols
val canWrite = (perms and WRITE) != 0
perms = perms and WRITE.inv()        // clear
perms = perms xor EXEC               // toggle
println(1 shl 3)                     // 8`,
      },
    },
    takeaway:
      'Bit flags pack many booleans into one word: set with OR, test with AND, clear with AND NOT, toggle with XOR. Mind operator precedence around & and ==.',
  },
];
