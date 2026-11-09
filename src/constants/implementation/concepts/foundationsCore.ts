import type { Concept } from './types';

export const FOUNDATIONS_CORE_CONCEPTS: Concept[] = [
  {
    id: 'mutability',
    part: 'foundations-core',
    navLabel: 'Mutability',
    title: 'Mutability',
    summary:
      'Can a value change after it is created, and can a name be re-pointed? These are two different questions, and languages answer them differently.',
    snippets: {
      sql: {
        code: `-- Data changes by set-based statements, usually inside a transaction.
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
UPDATE accounts SET balance = balance + 50 WHERE id = 2;
COMMIT;   -- ROLLBACK would undo both

-- MVCC: an UPDATE writes a new row version; readers keep seeing their snapshot.`,
        note: 'Mutation is a transaction on a table, not an assignment to a variable.',
      },
      python: {
        code: `name = "Ada"
# name[0] = "E"               # TypeError: str is immutable
point = (1, 2)                # tuple: immutable
numbers = [1, 2]              # list: mutable
numbers.append(3)

from dataclasses import dataclass
@dataclass(frozen=True)       # instances cannot be modified after creation
class Money:
    amount: int
    currency: str`,
      },
      typescript: {
        code: `const list = [1, 2];
list.push(3);                      // allowed: 'const' freezes the binding, not the array

const frozen: readonly number[] = [1, 2];
// frozen.push(3);                 // compile error: readonly array
const config = Object.freeze({ debug: false });   // enforced at run time too (shallow)

const next = { ...config, debug: true };          // update immutably by copying`,
      },
      spark: {
        code: `# RDDs and DataFrames are immutable. A transformation returns a new dataset.
raw = spark.read.parquet("orders")
cleaned = raw.filter("amount > 0")        # 'raw' is untouched
priced = cleaned.withColumn("tax", F.col("amount") * 0.0825)

# Immutability makes lineage replay possible: a lost partition is recomputed from its parents.`,
      },
      rust: {
        code: `let x = 5;
// x = 6;                         // error: cannot assign twice to immutable variable
let mut y = 5;                    // 'mut' is part of the binding and appears at every use
y = 6;

fn append(list: &mut Vec<i32>) { list.push(1); }   // &mut: exclusive, mutable access
let mut data = vec![];
append(&mut data);                // the caller must opt in explicitly`,
      },
      cpp: {
        code: `const int a = 5;                 // a = 6; is a compile error
int b = 5;
const int* p = &b;               // pointer to const int: cannot modify *p
int* const q = &b;               // const pointer: cannot re-point q
const int* const r = &b;         // both

void show(const std::string& text);   // promise not to modify the argument

class Account { double balance() const; };  // const member function: does not modify the object`,
      },
      go: {
        code: `const Max = 10         // only constants are immutable; there are no immutable variables
total := 0
total++

s := []int{1, 2, 3}
t := s                 // slices share the backing array
t[0] = 99
fmt.Println(s[0])      // 99

// Strings are immutable: s := "go"; s[0] = 'G' is a compile error.`,
      },
      swift: {
        code: `let fixed = [1, 2, 3]
// fixed.append(4)                 // error: 'let' collections are immutable
var growing = [1, 2, 3]
growing.append(4)

struct Point { var x: Int }
let p = Point(x: 1)
// p.x = 2                         // error: a 'let' struct is fully immutable
// Value semantics: assigning a struct copies it, so mutation never leaks to other names.`,
      },
      kotlin: {
        code: `val list = listOf(1, 2, 3)            // read-only view (List)
// list.add(4)                        // compile error: no add on List
val growing = mutableListOf(1, 2, 3)  // MutableList
growing.add(4)

data class Point(val x: Int)
val p = Point(1)
val moved = p.copy(x = 2)             // copy-with-change instead of mutating`,
      },
    },
    takeaway:
      'Prefer immutable data and make mutation explicit. It removes a whole class of aliasing bugs and makes concurrent code simpler to reason about.',
  },
  {
    id: 'type-systems',
    part: 'foundations-core',
    navLabel: 'Type systems',
    title: 'Type systems: static vs dynamic, strong vs weak',
    summary:
      'Static typing checks before the program runs; dynamic typing checks as it runs. Strong typing refuses implicit conversions between unrelated types; weak typing converts them.',
    snippets: {
      sql: {
        code: `-- Statically typed at plan time, strongly typed (no implicit text-to-number casts).
SELECT 1 + 1;                        -- ok
SELECT 1 + '2';                      -- ok: the unknown literal '2' is resolved as integer
-- SELECT 1 + '2'::text;             -- ERROR: operator does not exist: integer + text
SELECT 1 + CAST('2' AS integer);     -- explicit cast`,
      },
      python: {
        code: `def double(value):            # dynamic: the type is checked when the line runs
    return value * 2

print(double(3), double("ab"))   # 6 abab  -- duck typing: anything that supports *
# 1 + "2"                        # TypeError at run time -> strong typing

def double_typed(value: int) -> int:   # hints are checked by mypy/pyright, not by Python
    return value * 2`,
      },
      typescript: {
        code: `let id: number = 5;
// id = "five";                    // compile error: static checking
const value: unknown = JSON.parse("{}");
// value.name;                     // error: must narrow 'unknown' first
if (typeof value === "string") console.log(value.toUpperCase());

// Types are erased at run time, and JavaScript itself is weakly typed: "5" * 2 === 10.
// Structural typing: any object with the right shape is accepted.`,
      },
      spark: {
        code: `from pyspark.sql.types import StructType, StructField, StringType, IntegerType

# A DataFrame has a schema, checked when the query is analysed (before any data moves).
schema = StructType([StructField("name", StringType()), StructField("age", IntegerType())])
frame = spark.createDataFrame([("Ada", 36)], schema)
# frame.select("missing")        # AnalysisException: cannot resolve 'missing'

# The Dataset API (Scala/Java) adds compile-time types; Python's DataFrame is checked at analysis.`,
      },
      rust: {
        code: `let a: i32 = 5;
let b: i64 = 6;
// let c = a + b;                  // error: mismatched types: no implicit conversions
let c = a as i64 + b;              // explicit

// Static, strong, nominal, with inference and generics monomorphised at compile time.
fn largest<T: PartialOrd>(items: &[T]) -> &T {
    items.iter().fold(&items[0], |max, item| if item > max { item } else { max })
}`,
      },
      cpp: {
        code: `int a = 5;
double b = a;                       // implicit widening conversion is allowed
int c = 3.9;                        // narrowing is allowed (warning at best)
// int d{3.9};                      // error: brace-init rejects narrowing

template <typename T>
T largest(T x, T y) { return x > y ? x : y; }   // checked when instantiated, per type

auto z = largest(1, 2);             // type deduced at compile time`,
      },
      go: {
        code: `var a int = 5
var b int64 = 6
// c := a + b                      // compile error: mismatched types int and int64
c := int64(a) + b

// Structural typing for interfaces: a type satisfies an interface by having its methods.
type Stringer interface{ String() string }

func Largest[T int | float64](x, y T) T { // generics (Go 1.18+)
    if x > y { return x }
    return y
}`,
      },
      swift: {
        code: `let a: Int = 5
let b: Double = 2.5
// let c = a + b                   // error: no implicit Int to Double conversion
let c = Double(a) + b

func largest<T: Comparable>(_ x: T, _ y: T) -> T { x > y ? x : y }
// Static and strong, with type inference and protocol-constrained generics.`,
      },
      kotlin: {
        code: `val a: Int = 5
// val b: Long = a                 // compile error: no implicit widening
val b: Long = a.toLong()

val text: String = "hi"
// val maybe: String = null       // compile error: null is not a String
val maybe: String? = null         // nullable types are distinct types

fun <T : Comparable<T>> largest(x: T, y: T): T = if (x > y) x else y`,
      },
    },
    takeaway:
      'Static typing moves errors to compile time and enables optimisation; dynamic typing trades that for flexibility. Strong typing is independent: Python is dynamic but strong, JavaScript is dynamic and weak.',
  },
  {
    id: 'error-models',
    part: 'foundations-core',
    navLabel: 'Error models',
    title: 'Error handling models',
    summary:
      'Exceptions unwind the stack to a handler; result types and error values make failure part of the return and force the caller to look.',
    snippets: {
      sql: {
        code: `-- Errors abort the statement or transaction. PL/pgSQL can catch them:
DO $$
BEGIN
  INSERT INTO users(email) VALUES ('a@example.com');
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'already exists';
END $$;

-- In plain SQL: BEGIN; ... on error -> ROLLBACK;`,
      },
      python: {
        code: `import json

def load(path: str) -> dict:
    try:
        with open(path) as handle:         # 'with' guarantees the file is closed
            return json.load(handle)
    except FileNotFoundError:               # catch the specific exception
        return {}
    except json.JSONDecodeError as error:
        raise ValueError(f"bad config {path}") from error   # chain the cause
    finally:
        print("done")                       # always runs`,
      },
      typescript: {
        code: `async function load(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);  // fetch does not throw on 4xx/5xx
    return await response.json();
  } catch (cause) {
    // 'cause' is unknown: narrow before use
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(\`load failed: \${message}\`, { cause });
  }
}`,
      },
      spark: {
        code: `from pyspark.sql.utils import AnalysisException

try:
    frame = spark.read.parquet("missing/path")
except AnalysisException as error:        # raised on the driver, at planning time
    print("bad path:", error)

# Task failures on executors are retried (spark.task.maxFailures, default 4);
# when retries run out the job fails and the error surfaces on the driver.
# Bad rows: spark.read.option("mode", "PERMISSIVE" | "DROPMALFORMED" | "FAILFAST")`,
      },
      rust: {
        code: `use std::{fs, io, num::ParseIntError};

#[derive(Debug)]
enum LoadError { Io(io::Error), Parse(ParseIntError) }
impl From<io::Error> for LoadError { fn from(e: io::Error) -> Self { LoadError::Io(e) } }
impl From<ParseIntError> for LoadError { fn from(e: ParseIntError) -> Self { LoadError::Parse(e) } }

fn read_number(path: &str) -> Result<i32, LoadError> {
    let text = fs::read_to_string(path)?;   // '?' returns early with Err, converting via From
    Ok(text.trim().parse()?)
}
// No exceptions: panic! is for bugs, Result is for expected failures.`,
      },
      cpp: {
        code: `#include <fstream>
#include <stdexcept>
#include <optional>
#include <expected>   // C++23

int read_number(const std::string& path) {
    std::ifstream file(path);
    if (!file) throw std::runtime_error("cannot open " + path);   // unwinds the stack,
    int value; file >> value;                                      // destructors run (RAII)
    return value;
}

std::optional<int> maybe_number(const std::string& text);          // absence without exceptions
std::expected<int, std::string> parse(const std::string& text);    // value or error`,
      },
      go: {
        code: `func readNumber(path string) (int, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return 0, fmt.Errorf("read %s: %w", path, err) // wrap, keeping the cause
    }
    n, err := strconv.Atoi(strings.TrimSpace(string(data)))
    if err != nil {
        return 0, fmt.Errorf("parse %s: %w", path, err)
    }
    return n, nil
}

if _, err := readNumber("x"); errors.Is(err, os.ErrNotExist) { /* handle */ }`,
      },
      swift: {
        code: `enum LoadError: Error { case missing, invalid }

func readNumber(_ path: String) throws -> Int {
    guard let text = try? String(contentsOfFile: path, encoding: .utf8) else {
        throw LoadError.missing
    }
    guard let value = Int(text.trimmingCharacters(in: .whitespacesAndNewlines)) else {
        throw LoadError.invalid
    }
    return value
}

do { print(try readNumber("x")) }
catch LoadError.missing { print("missing") }
catch { print(error) }`,
      },
      kotlin: {
        code: `fun readNumber(path: String): Int =
    File(path).readText().trim().toInt()   // may throw IOException or NumberFormatException

val result: Result<Int> = runCatching { readNumber("x") }
println(result.getOrDefault(0))

val maybe: Int? = "12x".toIntOrNull()      // null instead of an exception
// Kotlin has no checked exceptions: signatures do not declare what they throw.`,
      },
    },
    takeaway:
      'Exceptions keep the happy path short but hide failures from signatures; Result and error values make every failure visible at the cost of more code. Pick one convention per codebase.',
  },
  {
    id: 'testing',
    part: 'foundations-core',
    navLabel: 'Testing',
    title: 'Native testing patterns',
    summary:
      'Each ecosystem ships a standard way to write and run tests. The structure that carries across all of them is arrange, act, assert.',
    snippets: {
      sql: {
        code: `-- pgTAP: unit tests that run inside PostgreSQL.
BEGIN;
SELECT plan(2);
SELECT has_table('orders');
SELECT results_eq(
  $$ SELECT sum(amount) FROM orders WHERE customer_id = 1 $$,
  $$ VALUES (150::numeric) $$,
  'customer 1 total'
);
SELECT * FROM finish();
ROLLBACK;     -- leaves no data behind`,
      },
      python: {
        code: `# test_math.py -- run with: pytest
import pytest

def divide(a: float, b: float) -> float:
    if b == 0:
        raise ZeroDivisionError("b must not be zero")
    return a / b

def test_divide():
    assert divide(6, 3) == 2            # arrange / act / assert

def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(1, 0)

@pytest.mark.parametrize("a,b,expected", [(6, 3, 2), (9, 3, 3)])
def test_cases(a, b, expected):
    assert divide(a, b) == expected`,
      },
      typescript: {
        code: `// math.test.ts -- run with: npx vitest (or the built-in 'node --test')
import { describe, it, expect } from "vitest";

const divide = (a: number, b: number) => {
  if (b === 0) throw new Error("b must not be zero");
  return a / b;
};

describe("divide", () => {
  it("divides", () => expect(divide(6, 3)).toBe(2));
  it("rejects zero", () => expect(() => divide(1, 0)).toThrow("zero"));
});`,
      },
      spark: {
        code: `# test_pipeline.py -- run with: pytest (needs pyspark installed)
import pytest
from pyspark.sql import SparkSession

@pytest.fixture(scope="session")
def spark():
    return SparkSession.builder.master("local[1]").appName("test").getOrCreate()

def test_filters_negative_amounts(spark):
    frame = spark.createDataFrame([(1, 10), (2, -5)], ["id", "amount"])   # arrange
    result = frame.filter("amount > 0")                                    # act
    assert [row.id for row in result.collect()] == [1]                     # assert`,
      },
      rust: {
        code: `pub fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 { Err("b must not be zero".into()) } else { Ok(a / b) }
}

#[cfg(test)]                       // compiled only for 'cargo test'
mod tests {
    use super::*;

    #[test]
    fn divides() {
        assert_eq!(divide(6.0, 3.0), Ok(2.0));
    }

    #[test]
    fn rejects_zero() {
        assert!(divide(1.0, 0.0).is_err());
    }
}`,
      },
      cpp: {
        code: `// GoogleTest -- build with CMake, link gtest_main
#include <gtest/gtest.h>
#include <stdexcept>

double divide(double a, double b) {
    if (b == 0) throw std::invalid_argument("b must not be zero");
    return a / b;
}

TEST(DivideTest, Divides) {
    EXPECT_DOUBLE_EQ(divide(6, 3), 2.0);
}

TEST(DivideTest, RejectsZero) {
    EXPECT_THROW(divide(1, 0), std::invalid_argument);
}`,
      },
      go: {
        code: `// math_test.go -- run with: go test ./...
package math

import "testing"

func TestDivide(t *testing.T) {
    cases := []struct {              // table-driven tests are the Go idiom
        name         string
        a, b, expect float64
    }{
        {"simple", 6, 3, 2},
        {"fraction", 1, 4, 0.25},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got, err := Divide(tc.a, tc.b)
            if err != nil || got != tc.expect {
                t.Fatalf("Divide(%v,%v) = %v, %v; want %v", tc.a, tc.b, got, err, tc.expect)
            }
        })
    }
}`,
      },
      swift: {
        code: `import Testing   // Swift Testing (XCTest is the older alternative)

func divide(_ a: Double, _ b: Double) throws -> Double {
    guard b != 0 else { throw DivisionError.byZero }
    return a / b
}
enum DivisionError: Error { case byZero }

@Test func divides() throws {
    #expect(try divide(6, 3) == 2)
}

@Test func rejectsZero() {
    #expect(throws: DivisionError.byZero) { try divide(1, 0) }
}`,
      },
      kotlin: {
        code: `// JUnit 5 with kotlin.test -- run with: ./gradlew test
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

fun divide(a: Double, b: Double): Double {
    require(b != 0.0) { "b must not be zero" }
    return a / b
}

class DivideTest {
    @Test fun divides() = assertEquals(2.0, divide(6.0, 3.0))

    @Test fun rejectsZero() {
        assertFailsWith<IllegalArgumentException> { divide(1.0, 0.0) }
    }
}`,
      },
    },
    takeaway:
      'Use the ecosystem’s native runner, keep tests small and independent, and cover failure paths as well as the happy path. Property-based tools (Hypothesis, proptest, fast-check) generate the inputs you did not think of.',
  },
];
