import type { Concept } from './types';

export const DS_FUNDAMENTAL_CONCEPTS: Concept[] = [
  {
    id: 'arrays',
    part: 'algorithms',
    navLabel: 'Arrays & slices',
    title: 'Arrays and slices',
    summary:
      'An array stores elements side by side in memory, so index access is one address calculation and sequential scans are cache friendly. Inserting in the middle shifts everything after it.',
    complexity: 'Index O(1) · append O(1) amortised · insert/delete in middle O(n) · space O(n)',
    snippets: {
      sql: {
        code: `-- PostgreSQL array column: 1-based indexing.
SELECT (ARRAY[10, 20, 30])[2]              AS second,     -- 20
       array_append(ARRAY[10, 20], 30)     AS appended,   -- {10,20,30}
       array_length(ARRAY[10, 20, 30], 1)  AS len;
SELECT unnest(ARRAY[10, 20, 30]) AS element;               -- one row per element`,
        note: 'Rows are the usual collection in SQL; arrays are for small, fixed-shape lists inside a row.',
      },
      python: {
        code: `values = [10, 20, 30]
print(values[1])          # 20     O(1) index
values.append(40)         # O(1) amortised: the buffer over-allocates and grows geometrically
values.insert(1, 15)      # O(n): shifts every later element right
print(values[1:3])        # slicing COPIES: [15, 20]`,
      },
      typescript: {
        code: `const values = [10, 20, 30];
values.push(40);                      // O(1) amortised
values.splice(1, 0, 15);              // O(n): insert at index 1
console.log(values.slice(1, 3));      // copy: [15, 20]

const packed = new Float64Array(1000); // typed array: truly contiguous 8-byte numbers`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

frame = spark.createDataFrame([([10, 20, 30],)], ["values"])
frame.select(
    F.element_at("values", 2).alias("second"),     # 1-based: 20
    F.size("values").alias("len"),
    F.explode("values").alias("element"),           # one row per element
)`,
      },
      rust: {
        code: `let mut values = vec![10, 20, 30];  // Vec: pointer, length, capacity on the stack; buffer on the heap
values.push(40);                     // O(1) amortised
values.insert(1, 15);                // O(n)
let window: &[i32] = &values[1..3];  // a slice BORROWS part of the buffer: no copy
println!("{window:?} {}", values[0]); // index is bounds checked`,
      },
      cpp: {
        code: `#include <vector>

std::vector<int> values{10, 20, 30};   // one contiguous block of ints
values.push_back(40);                  // O(1) amortised; may reallocate and move everything
values.insert(values.begin() + 1, 15); // O(n)
int* raw = values.data();              // the underlying array: raw[1] == 15
// values[10] is NOT bounds checked; values.at(10) throws std::out_of_range`,
      },
      go: {
        code: `values := []int{10, 20, 30}      // slice header: pointer, length, capacity
values = append(values, 40)       // may allocate a new array and copy when capacity runs out
window := values[1:3]             // shares the SAME backing array: no copy
window[0] = 99
fmt.Println(values[1], len(values), cap(values))   // 99 ...`,
      },
      swift: {
        code: `var values = [10, 20, 30]
values.append(40)                  // O(1) amortised
values.insert(15, at: 1)           // O(n)
let window = values[1..<3]         // ArraySlice: shares storage with 'values'
var copy = values                  // value semantics: copy-on-write defers the real copy
copy[0] = 0                        // the buffer is duplicated now`,
      },
      kotlin: {
        code: `val values = mutableListOf(10, 20, 30)   // ArrayList: boxed Integers
values.add(40)
values.add(1, 15)                         // O(n)
val window = values.subList(1, 3)         // a view of the same list
val packed = IntArray(1000)               // primitive int[]: contiguous, no boxing`,
      },
    },
    takeaway:
      'Contiguous memory is why arrays beat linked structures in practice. Know whether a slice copies (Python, JS) or shares (Rust, Go, Swift), because that decides who sees later writes.',
  },
  {
    id: 'two-pointers',
    part: 'algorithms',
    navLabel: 'Two pointers',
    title: 'Two pointers',
    summary:
      'Walk a sorted array from both ends (or with a slow and a fast index) to replace a nested O(n^2) search with one pass. Example: find two numbers that add up to a target.',
    complexity: 'Time O(n) · space O(1)',
    snippets: {
      sql: {
        code: `-- Set-based: a self-join finds the pair; the planner picks a merge or hash join.
SELECT a.n AS first, b.n AS second
FROM nums a JOIN nums b ON a.n < b.n AND a.n + b.n = 9;`,
        note: 'SQL has no pointers; a join expresses the same search declaratively.',
      },
      python: {
        code: `def pair_with_sum(sorted_values: list[int], target: int):
    left, right = 0, len(sorted_values) - 1
    while left < right:
        total = sorted_values[left] + sorted_values[right]
        if total == target:
            return left, right
        if total < target:
            left += 1             # need a bigger sum: move the low end up
        else:
            right -= 1            # need a smaller sum: move the high end down
    return None`,
      },
      typescript: {
        code: `function pairWithSum(values: number[], target: number): [number, number] | null {
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    const total = values[left] + values[right];
    if (total === target) return [left, right];
    if (total < target) left++;
    else right--;
  }
  return null;
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Express the search as a join; Spark chooses a sort-merge or broadcast join.
a, b = nums.alias("a"), nums.alias("b")
pairs = a.join(b, (F.col("a.n") < F.col("b.n")) & (F.col("a.n") + F.col("b.n") == 9))`,
        note: 'There is no pointer walk across a distributed dataset; use joins.',
      },
      rust: {
        code: `fn pair_with_sum(values: &[i32], target: i32) -> Option<(usize, usize)> {
    if values.is_empty() { return None; }
    let (mut left, mut right) = (0, values.len() - 1);
    while left < right {
        let total = values[left] + values[right];
        match total.cmp(&target) {
            std::cmp::Ordering::Equal => return Some((left, right)),
            std::cmp::Ordering::Less => left += 1,
            std::cmp::Ordering::Greater => right -= 1,
        }
    }
    None
}`,
      },
      cpp: {
        code: `#include <optional>
#include <utility>
#include <vector>

std::optional<std::pair<int, int>> pair_with_sum(const std::vector<int>& values, int target) {
    if (values.empty()) return std::nullopt;
    int left = 0, right = static_cast<int>(values.size()) - 1;
    while (left < right) {
        int total = values[left] + values[right];
        if (total == target) return std::make_pair(left, right);
        if (total < target) ++left; else --right;
    }
    return std::nullopt;
}`,
      },
      go: {
        code: `func pairWithSum(values []int, target int) (int, int, bool) {
    left, right := 0, len(values)-1
    for left < right {
        total := values[left] + values[right]
        switch {
        case total == target:
            return left, right, true
        case total < target:
            left++
        default:
            right--
        }
    }
    return 0, 0, false
}`,
      },
      swift: {
        code: `func pairWithSum(_ values: [Int], target: Int) -> (Int, Int)? {
    guard !values.isEmpty else { return nil }
    var left = 0, right = values.count - 1
    while left < right {
        let total = values[left] + values[right]
        if total == target { return (left, right) }
        if total < target { left += 1 } else { right -= 1 }
    }
    return nil
}`,
      },
      kotlin: {
        code: `fun pairWithSum(values: IntArray, target: Int): Pair<Int, Int>? {
    var left = 0
    var right = values.size - 1
    while (left < right) {
        val total = values[left] + values[right]
        when {
            total == target -> return left to right
            total < target -> left++
            else -> right--
        }
    }
    return null
}`,
      },
    },
    takeaway:
      'Sorting plus two pointers turns an O(n^2) pair search into O(n) with no extra memory. The pattern needs sorted input or a monotonic property.',
  },
  {
    id: 'sliding-window',
    part: 'algorithms',
    navLabel: 'Sliding window',
    title: 'Sliding window',
    summary:
      'Keep a running value over a moving range: add the element entering the window and subtract the one leaving. Example: the maximum sum of any k consecutive elements.',
    complexity: 'Time O(n) · space O(1)',
    snippets: {
      sql: {
        code: `-- Window frame: the engine maintains the running sum for you.
SELECT day,
       sum(amount) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling_3
FROM sales;`,
        note: 'Window functions are the SQL form of a sliding window.',
      },
      python: {
        code: `def max_window_sum(values: list[int], k: int) -> int:
    if k <= 0 or k > len(values):
        raise ValueError("k out of range")
    window = sum(values[:k])
    best = window
    for index in range(k, len(values)):
        window += values[index] - values[index - k]   # slide: add new, drop old
        best = max(best, window)
    return best`,
      },
      typescript: {
        code: `function maxWindowSum(values: number[], k: number): number {
  if (k <= 0 || k > values.length) throw new RangeError("k out of range");
  let window = values.slice(0, k).reduce((sum, n) => sum + n, 0);
  let best = window;
  for (let index = k; index < values.length; index++) {
    window += values[index] - values[index - k];
    best = Math.max(best, window);
  }
  return best;
}`,
      },
      spark: {
        code: `from pyspark.sql import Window, functions as F

frame_window = Window.orderBy("day").rowsBetween(-2, 0)
rolling = sales.withColumn("rolling_3", F.sum("amount").over(frame_window))
# A global ORDER BY window pulls all rows into one partition: add partitionBy where you can.`,
      },
      rust: {
        code: `fn max_window_sum(values: &[i64], k: usize) -> Option<i64> {
    if k == 0 || k > values.len() { return None; }
    let mut window: i64 = values[..k].iter().sum();
    let mut best = window;
    for index in k..values.len() {
        window += values[index] - values[index - k];
        best = best.max(window);
    }
    Some(best)
}
// Idiomatic alternative: values.windows(k).map(|w| w.iter().sum::<i64>()).max()   // O(n*k)`,
      },
      cpp: {
        code: `#include <algorithm>
#include <numeric>
#include <vector>

long max_window_sum(const std::vector<long>& values, std::size_t k) {
    if (k == 0 || k > values.size()) return 0;
    long window = std::accumulate(values.begin(), values.begin() + k, 0L);
    long best = window;
    for (std::size_t index = k; index < values.size(); ++index) {
        window += values[index] - values[index - k];
        best = std::max(best, window);
    }
    return best;
}`,
      },
      go: {
        code: `func maxWindowSum(values []int, k int) int {
    if k <= 0 || k > len(values) {
        return 0
    }
    window := 0
    for index := 0; index < k; index++ {
        window += values[index]
    }
    best := window
    for index := k; index < len(values); index++ {
        window += values[index] - values[index-k]
        if window > best {
            best = window
        }
    }
    return best
}`,
      },
      swift: {
        code: `func maxWindowSum(_ values: [Int], k: Int) -> Int? {
    guard k > 0, k <= values.count else { return nil }
    var window = values[..<k].reduce(0, +)
    var best = window
    for index in k..<values.count {
        window += values[index] - values[index - k]
        best = max(best, window)
    }
    return best
}`,
      },
      kotlin: {
        code: `fun maxWindowSum(values: IntArray, k: Int): Int {
    require(k in 1..values.size) { "k out of range" }
    var window = values.take(k).sum()
    var best = window
    for (index in k until values.size) {
        window += values[index] - values[index - k]
        best = maxOf(best, window)
    }
    return best
}`,
      },
    },
    takeaway:
      'Update the window incrementally instead of recomputing it: that is the difference between O(n) and O(n*k).',
  },
  {
    id: 'stack',
    part: 'algorithms',
    navLabel: 'Stack',
    title: 'Stack',
    summary:
      'Last in, first out. Push and pop at one end. Stacks track nested structure: function calls, undo history, and matching brackets.',
    complexity: 'push / pop / peek O(1) · space O(n)',
    snippets: {
      sql: {
        code: `-- No stack type. A table with a monotonic id and "ORDER BY id DESC LIMIT 1" acts as one.
CREATE TABLE stack_items (id bigserial PRIMARY KEY, value text);
INSERT INTO stack_items (value) VALUES ('a'), ('b');                     -- push
DELETE FROM stack_items
WHERE id = (SELECT max(id) FROM stack_items) RETURNING value;           -- pop`,
        note: 'Shown to illustrate the idea; a database table is rarely the right place for a stack.',
      },
      python: {
        code: `stack: list[str] = []
stack.append("a")        # push  O(1) amortised
stack.append("b")
top = stack[-1]          # peek
item = stack.pop()       # pop   O(1)

def balanced(text: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs and (not stack or stack.pop() != pairs[ch]):
            return False
    return not stack`,
      },
      typescript: {
        code: `const stack: string[] = [];
stack.push("a");               // push
stack.push("b");
const top = stack[stack.length - 1];   // peek
const item = stack.pop();      // pop: string | undefined when empty

function balanced(text: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const open: string[] = [];
  for (const ch of text) {
    if ("([{".includes(ch)) open.push(ch);
    else if (ch in pairs && open.pop() !== pairs[ch]) return false;
  }
  return open.length === 0;
}`,
      },
      spark: {
        code: `# Stacks are inherently sequential and in-memory: keep them on the driver
# or inside a per-partition function, not across the cluster.
def balanced_partition(rows):
    stack = []
    for (text,) in rows:
        for ch in text:
            if ch in "([{": stack.append(ch)
            elif stack: stack.pop()
    yield len(stack) == 0

result = frame.select("text").rdd.mapPartitions(balanced_partition).collect()`,
        note: 'Each partition runs its own stack; a cross-partition match would need a different algorithm.',
      },
      rust: {
        code: `let mut stack: Vec<char> = Vec::new();
stack.push('a');                 // push
let top = stack.last();          // peek: Option<&char>
let item = stack.pop();          // pop: Option<char>, so empty is handled by the type

fn balanced(text: &str) -> bool {
    let mut open = Vec::new();
    for ch in text.chars() {
        match ch {
            '(' | '[' | '{' => open.push(ch),
            ')' => if open.pop() != Some('(') { return false },
            ']' => if open.pop() != Some('[') { return false },
            '}' => if open.pop() != Some('{') { return false },
            _ => {}
        }
    }
    open.is_empty()
}`,
      },
      cpp: {
        code: `#include <stack>
#include <string>

std::stack<char> stack;      // adapter over std::deque by default
stack.push('a');
char top = stack.top();      // undefined behaviour if empty: check empty() first
stack.pop();                 // pop() returns void: peek and remove are separate

bool balanced(const std::string& text) {
    std::stack<char> open;
    for (char ch : text) {
        if (ch == '(' || ch == '[' || ch == '{') open.push(ch);
        else if (ch == ')' || ch == ']' || ch == '}') {
            if (open.empty()) return false;
            char top = open.top(); open.pop();
            if ((ch == ')' && top != '(') || (ch == ']' && top != '[') || (ch == '}' && top != '{')) return false;
        }
    }
    return open.empty();
}`,
      },
      go: {
        code: `stack := []rune{}
stack = append(stack, 'a')            // push
top := stack[len(stack)-1]            // peek (panics if empty)
stack = stack[:len(stack)-1]          // pop: shrink the slice

func balanced(text string) bool {
    pairs := map[rune]rune{')': '(', ']': '[', '}': '{'}
    var open []rune
    for _, ch := range text {
        switch ch {
        case '(', '[', '{':
            open = append(open, ch)
        case ')', ']', '}':
            if len(open) == 0 || open[len(open)-1] != pairs[ch] {
                return false
            }
            open = open[:len(open)-1]
        }
    }
    return len(open) == 0
}`,
      },
      swift: {
        code: `var stack: [Character] = []
stack.append("a")                     // push
let top = stack.last                  // peek: Character?
let item = stack.popLast()            // pop: Character?

func balanced(_ text: String) -> Bool {
    let pairs: [Character: Character] = [")": "(", "]": "[", "}": "{"]
    var open: [Character] = []
    for ch in text {
        if "([{".contains(ch) { open.append(ch) }
        else if let match = pairs[ch] {
            if open.popLast() != match { return false }
        }
    }
    return open.isEmpty
}`,
      },
      kotlin: {
        code: `val stack = ArrayDeque<Char>()       // kotlin.collections.ArrayDeque
stack.addLast('a')                    // push
val top = stack.lastOrNull()          // peek
val item = stack.removeLastOrNull()   // pop

fun balanced(text: String): Boolean {
    val pairs = mapOf(')' to '(', ']' to '[', '}' to '{')
    val open = ArrayDeque<Char>()
    for (ch in text) {
        if (ch in "([{") open.addLast(ch)
        else if (ch in pairs && open.removeLastOrNull() != pairs[ch]) return false
    }
    return open.isEmpty()
}`,
      },
    },
    takeaway:
      'Use a stack when you need to remember what to come back to. Check how your language reports popping an empty stack (Option, null, exception, or undefined behaviour).',
  },
  {
    id: 'queue',
    part: 'algorithms',
    navLabel: 'Queue',
    title: 'Queue',
    summary:
      'First in, first out. Enqueue at the back and dequeue from the front. A queue drives breadth-first search, schedulers, and buffers between producers and consumers.',
    complexity: 'enqueue / dequeue O(1) with a deque or ring buffer · O(n) with a plain array shift',
    snippets: {
      sql: {
        code: `-- A job queue in PostgreSQL: many workers dequeue without blocking each other.
WITH next_job AS (
  SELECT id FROM jobs
  WHERE status = 'pending'
  ORDER BY id
  FOR UPDATE SKIP LOCKED     -- skip rows another worker already holds
  LIMIT 1
)
UPDATE jobs SET status = 'running'
WHERE id IN (SELECT id FROM next_job)
RETURNING *;`,
      },
      python: {
        code: `from collections import deque

queue = deque()
queue.append("a")        # enqueue  O(1)
queue.append("b")
front = queue[0]         # peek
item = queue.popleft()   # dequeue  O(1)  (list.pop(0) would be O(n))`,
      },
      typescript: {
        code: `// Array.shift() is O(n) in the worst case. Track a head index for O(1) dequeue.
class Queue<T> {
  private items: T[] = [];
  private head = 0;
  enqueue(item: T) { this.items.push(item); }
  dequeue(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head++];
    if (this.head > 1024 && this.head * 2 > this.items.length) {   // reclaim memory occasionally
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }
  get size() { return this.items.length - this.head; }
}`,
      },
      spark: {
        code: `# Spark Structured Streaming reads a queue-like source (Kafka) in order, per partition.
stream = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "host:9092")
    .option("subscribe", "jobs")
    .load())`,
        note: 'In a cluster the queue is an external system; Spark consumes it.',
      },
      rust: {
        code: `use std::collections::VecDeque;

let mut queue: VecDeque<&str> = VecDeque::new();   // growable ring buffer
queue.push_back("a");        // enqueue
queue.push_back("b");
let front = queue.front();   // peek
let item = queue.pop_front(); // dequeue: Option<&str>`,
      },
      cpp: {
        code: `#include <queue>

std::queue<int> queue;     // adapter over std::deque
queue.push(1);             // enqueue
queue.push(2);
int front = queue.front(); // undefined if empty: check empty()
queue.pop();               // dequeue (returns void)`,
      },
      go: {
        code: `// A buffered channel is a thread-safe FIFO queue.
queue := make(chan string, 16)
queue <- "a"               // enqueue (blocks if full)
queue <- "b"
item := <-queue            // dequeue (blocks if empty)

// A plain slice also works: items = append(items, x); x, items = items[0], items[1:]`,
      },
      swift: {
        code: `// The standard library has no deque; the swift-collections package provides Deque.
import Collections

var queue: Deque<String> = []
queue.append("a")              // enqueue
queue.append("b")
let item = queue.popFirst()    // dequeue: String?`,
        note: 'Requires the swift-collections package. Array.removeFirst() is O(n).',
      },
      kotlin: {
        code: `val queue = ArrayDeque<String>()   // kotlin.collections.ArrayDeque: a ring buffer
queue.addLast("a")                 // enqueue
queue.addLast("b")
val front = queue.firstOrNull()    // peek
val item = queue.removeFirstOrNull() // dequeue`,
      },
    },
    takeaway:
      'Do not dequeue with array.shift() or list.pop(0) in a hot loop: it shifts every element. Use a deque or ring buffer.',
  },
  {
    id: 'linked-list',
    part: 'algorithms',
    navLabel: 'Linked list',
    title: 'Singly linked list',
    summary:
      'Each node stores a value and a pointer to the next node. Inserting at the head is O(1), but reaching the k-th node is O(k) and every node is a separate allocation, so traversal is cache unfriendly.',
    complexity: 'Prepend O(1) · search O(n) · access by index O(n) · space O(n) plus a pointer per node',
    snippets: {
      sql: {
        code: `-- An adjacency list: each row points at the next. A recursive CTE walks the chain.
WITH RECURSIVE chain AS (
  SELECT id, value, next_id FROM nodes WHERE id = 1
  UNION ALL
  SELECT n.id, n.value, n.next_id FROM nodes n JOIN chain c ON n.id = c.next_id
)
SELECT value FROM chain;`,
      },
      python: {
        code: `from dataclasses import dataclass
from typing import Optional

@dataclass
class Node:
    value: int
    next: Optional["Node"] = None

head = None
for value in (3, 2, 1):
    head = Node(value, head)       # prepend O(1)

node = head
while node:                         # traverse O(n)
    print(node.value)
    node = node.next`,
      },
      typescript: {
        code: `interface ListNode<T> { value: T; next: ListNode<T> | null }

let head: ListNode<number> | null = null;
for (const value of [3, 2, 1]) head = { value, next: head };   // prepend

for (let node = head; node !== null; node = node.next) {        // traverse
  console.log(node.value);
}`,
      },
      spark: {
        code: `# A linked list does not distribute: following pointers is inherently sequential.
# Model the links as a table and iterate joins, or use GraphFrames for graph algorithms.
links = spark.createDataFrame([(1, 2), (2, 3), (3, None)], ["id", "next_id"])
# One hop per join; the lineage grows with every iteration, so checkpoint periodically.`,
        note: 'Avoid pointer chasing on a cluster; reshape the problem into joins or aggregations.',
      },
      rust: {
        code: `struct Node {
    value: i32,
    next: Option<Box<Node>>,       // Box gives the recursive type a known size
}

let mut head: Option<Box<Node>> = None;
for value in [3, 2, 1] {
    head = Some(Box::new(Node { value, next: head.take() }));   // prepend
}

let mut cursor = &head;
while let Some(node) = cursor {
    println!("{}", node.value);
    cursor = &node.next;           // borrow, do not move
}`,
        note: 'Ownership makes linked structures awkward: each node has exactly one owner.',
      },
      cpp: {
        code: `#include <memory>
#include <iostream>

struct Node {
    int value;
    std::unique_ptr<Node> next;     // owns the rest of the list; freed automatically
};

std::unique_ptr<Node> head;
for (int value : {3, 2, 1}) {
    auto node = std::make_unique<Node>(Node{value, std::move(head)});
    head = std::move(node);          // prepend
}
for (Node* cursor = head.get(); cursor; cursor = cursor->next.get())
    std::cout << cursor->value << "\\n";
// Very long lists can overflow the stack in the recursive destructor chain.`,
      },
      go: {
        code: `type Node struct {
    Value int
    Next  *Node
}

var head *Node
for _, value := range []int{3, 2, 1} {
    head = &Node{Value: value, Next: head}   // prepend; the GC frees unreachable nodes
}
for node := head; node != nil; node = node.Next {
    fmt.Println(node.Value)
}`,
      },
      swift: {
        code: `final class Node {
    var value: Int
    var next: Node?
    init(_ value: Int, next: Node? = nil) { self.value = value; self.next = next }
}

var head: Node? = nil
for value in [3, 2, 1] { head = Node(value, next: head) }   // prepend

var cursor = head
while let node = cursor {
    print(node.value)
    cursor = node.next
}`,
      },
      kotlin: {
        code: `class Node(val value: Int, var next: Node? = null)

var head: Node? = null
for (value in listOf(3, 2, 1)) head = Node(value, head)    // prepend

var cursor = head
while (cursor != null) {
    println(cursor.value)
    cursor = cursor.next
}`,
      },
    },
    takeaway:
      'In practice a dynamic array beats a linked list for almost everything because of cache locality. Linked lists earn their place for O(1) splicing and when elements must never move.',
  },
  {
    id: 'binary-search',
    part: 'algorithms',
    navLabel: 'Binary search',
    title: 'Binary search',
    summary:
      'In a sorted array, compare with the middle element and discard half of the range each step. Use a half-open range and compute the midpoint as low + (high - low) / 2 to avoid overflow.',
    complexity: 'Time O(log n) · space O(1)',
    snippets: {
      sql: {
        code: `-- A B-tree index IS binary search over sorted pages: O(log n) page reads.
CREATE INDEX idx_users_email ON users (email);
EXPLAIN SELECT * FROM users WHERE email = 'ada@example.com';
-- Index Scan using idx_users_email ...`,
        note: 'The planner uses the index when it is selective enough.',
      },
      python: {
        code: `from bisect import bisect_left

def search(sorted_values: list[int], target: int) -> int:
    low, high = 0, len(sorted_values)         # half-open [low, high)
    while low < high:
        mid = low + (high - low) // 2
        if sorted_values[mid] < target:
            low = mid + 1
        else:
            high = mid
    return low if low < len(sorted_values) and sorted_values[low] == target else -1

index = bisect_left([1, 3, 5, 7], 5)          # the standard-library version: 2`,
      },
      typescript: {
        code: `function search(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length;                    // half-open [low, high)
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (sorted[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low < sorted.length && sorted[low] === target ? low : -1;
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Columnar files (Parquet/ORC) store min/max per row group. Filtering on a column that
# the data is sorted by lets Spark skip whole row groups: a coarse binary-search effect.
events = spark.read.parquet("events")          # written sorted by event_time
events.filter(F.col("event_time") >= "2026-01-01").explain()   # look for PushedFilters`,
        note: 'No in-memory binary search across partitions; data skipping plays the same role.',
      },
      rust: {
        code: `fn search(sorted: &[i32], target: i32) -> Option<usize> {
    let (mut low, mut high) = (0, sorted.len());
    while low < high {
        let mid = low + (high - low) / 2;
        if sorted[mid] < target { low = mid + 1 } else { high = mid }
    }
    (low < sorted.len() && sorted[low] == target).then_some(low)
}

// Standard library: [1, 3, 5, 7].binary_search(&5)  ->  Ok(2)`,
      },
      cpp: {
        code: `#include <algorithm>
#include <vector>

long search(const std::vector<int>& sorted, int target) {
    std::size_t low = 0, high = sorted.size();
    while (low < high) {
        std::size_t mid = low + (high - low) / 2;      // no overflow
        if (sorted[mid] < target) low = mid + 1; else high = mid;
    }
    return (low < sorted.size() && sorted[low] == target) ? static_cast<long>(low) : -1;
}

// Standard library: std::lower_bound(sorted.begin(), sorted.end(), target)`,
      },
      go: {
        code: `import "sort"

func search(sorted []int, target int) int {
    index := sort.SearchInts(sorted, target)    // first index where sorted[i] >= target
    if index < len(sorted) && sorted[index] == target {
        return index
    }
    return -1
}`,
      },
      swift: {
        code: `func search(_ sorted: [Int], target: Int) -> Int? {
    var low = 0, high = sorted.count
    while low < high {
        let mid = low + (high - low) / 2
        if sorted[mid] < target { low = mid + 1 } else { high = mid }
    }
    return (low < sorted.count && sorted[low] == target) ? low : nil
}`,
      },
      kotlin: {
        code: `val sorted = listOf(1, 3, 5, 7)
val index = sorted.binarySearch(5)       // 2; a negative value encodes the insertion point
// Manual version:
fun search(values: IntArray, target: Int): Int {
    var low = 0
    var high = values.size
    while (low < high) {
        val mid = low + (high - low) / 2
        if (values[mid] < target) low = mid + 1 else high = mid
    }
    return if (low < values.size && values[low] == target) low else -1
}`,
      },
    },
    takeaway:
      'Binary search is also the idea behind every B-tree index. The classic bug is the midpoint overflow and off-by-one range handling, which a half-open range avoids.',
  },
  {
    id: 'sorting',
    part: 'algorithms',
    navLabel: 'Sorting',
    title: 'Sorting',
    summary:
      'Comparison sorts cannot beat O(n log n). Libraries use hybrids (Timsort in Python, introsort in C++) and offer stable and unstable variants. Stable means equal keys keep their original order.',
    complexity: 'Time O(n log n) typical · space O(1) to O(n) depending on the algorithm',
    snippets: {
      sql: {
        code: `SELECT name, score FROM results ORDER BY score DESC, name ASC;
-- Small sorts run in memory (quicksort); too large for work_mem, they spill to disk
-- as an external merge sort. EXPLAIN ANALYZE shows "Sort Method".`,
      },
      python: {
        code: `people = [("Ada", 36), ("Grace", 45), ("Alan", 36)]
by_age = sorted(people, key=lambda person: person[1])   # Timsort: stable, O(n log n)
people.sort(key=lambda person: (-person[1], person[0])) # in place, multiple keys
print(by_age)                                            # Ada stays before Alan`,
      },
      typescript: {
        code: `const numbers = [10, 9, 1, 100];
console.log([...numbers].sort());                // [1, 10, 100, 9]  default sort is LEXICOGRAPHIC
console.log([...numbers].sort((a, b) => a - b)); // [1, 9, 10, 100]  pass a comparator
// Array.prototype.sort is required to be stable (ES2019).
console.log(numbers.toSorted((a, b) => b - a));  // non-mutating copy (ES2023)`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# orderBy is a GLOBAL sort: Spark samples the data, range-partitions it (a shuffle),
# then sorts each partition. sortWithinPartitions avoids the shuffle.
results.orderBy(F.col("score").desc(), "name")
results.sortWithinPartitions("score")`,
      },
      rust: {
        code: `let mut people = vec![("Ada", 36), ("Grace", 45), ("Alan", 36)];
people.sort_by_key(|&(_, age)| age);          // stable merge sort
people.sort_unstable_by(|a, b| b.1.cmp(&a.1)); // faster, may reorder equal keys

let mut scores = vec![2.5, 1.5];
// scores.sort();                               // error: f64 is not Ord (NaN)
scores.sort_by(|a, b| a.total_cmp(b));`,
      },
      cpp: {
        code: `#include <algorithm>
#include <vector>

std::vector<std::pair<std::string, int>> people{{"Ada", 36}, {"Grace", 45}, {"Alan", 36}};

std::sort(people.begin(), people.end(),          // introsort: not stable
          [](const auto& a, const auto& b) { return a.second < b.second; });
std::stable_sort(people.begin(), people.end(),   // keeps the order of equal keys
          [](const auto& a, const auto& b) { return a.second < b.second; });`,
      },
      go: {
        code: `people := []struct {
    Name string
    Age  int
}{{"Ada", 36}, {"Grace", 45}, {"Alan", 36}}

sort.SliceStable(people, func(i, j int) bool { return people[i].Age < people[j].Age })

nums := []int{3, 1, 2}
slices.Sort(nums)           // Go 1.21+: generic, pattern-defeating quicksort`,
      },
      swift: {
        code: `var people = [("Ada", 36), ("Grace", 45), ("Alan", 36)]
people.sort { $0.1 < $1.1 }                // in place; stable since Swift 5
let byAge = people.sorted { $0.1 > $1.1 }  // new array`,
      },
      kotlin: {
        code: `data class Person(val name: String, val age: Int)
val people = listOf(Person("Ada", 36), Person("Grace", 45), Person("Alan", 36))

val byAge = people.sortedBy { it.age }                         // stable
val byAgeThenName = people.sortedWith(compareBy({ -it.age }, { it.name }))`,
      },
    },
    takeaway:
      'Use the library sort and pass a key or comparator. Know whether it is stable, and remember that sorting distributed data costs a shuffle.',
  },
];
