import type { Concept } from './types';

export const DS_ADVANCED_CONCEPTS: Concept[] = [
  {
    id: 'hashing',
    part: 'algorithms',
    navLabel: 'Hash maps',
    title: 'Hashing and hash maps',
    summary:
      'A hash map turns a key into an array index with a hash function, giving average constant-time lookup. Collisions are resolved by chaining or probing, and the table resizes as it fills. Example: count word frequency.',
    complexity: 'Average O(1) get/put · worst case O(n) · space O(n)',
    snippets: {
      sql: {
        code: `-- GROUP BY is typically executed as a HashAggregate: a hash table keyed by the group.
SELECT word, count(*) AS n
FROM words
GROUP BY word
ORDER BY n DESC;`,
        note: 'EXPLAIN shows HashAggregate; hash joins use the same structure.',
      },
      python: {
        code: `from collections import Counter

words = "to be or not to be".split()
counts = Counter(words)               # dict subclass: hash table keyed by word
print(counts["to"], counts.most_common(1))   # 2 [('to', 2)]

manual: dict[str, int] = {}
for word in words:
    manual[word] = manual.get(word, 0) + 1   # keys must be hashable (immutable)`,
      },
      typescript: {
        code: `const words = "to be or not to be".split(" ");
const counts = new Map<string, number>();     // Map keeps insertion order; keys may be any type
for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
console.log(counts.get("to"));                // 2

const asObject: Record<string, number> = Object.create(null); // plain objects inherit keys like "constructor"`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

counts = (words_df
    .groupBy("word")                  # hash aggregation, partial per partition, then a shuffle
    .count()
    .orderBy(F.desc("count")))`,
        note: 'Spark pre-aggregates inside each partition before shuffling, so only partial counts move.',
      },
      rust: {
        code: `use std::collections::HashMap;

let mut counts: HashMap<&str, u32> = HashMap::new();   // SipHash by default: DoS resistant, slower
for word in "to be or not to be".split_whitespace() {
    *counts.entry(word).or_insert(0) += 1;              // entry API: one lookup
}
println!("{:?}", counts.get("to"));                     // Some(2)`,
      },
      cpp: {
        code: `#include <sstream>
#include <string>
#include <unordered_map>

std::unordered_map<std::string, int> counts;
std::istringstream input("to be or not to be");
for (std::string word; input >> word;) ++counts[word];  // operator[] inserts a default 0
// counts.at("x") throws if missing; counts.find("x") returns end().`,
      },
      go: {
        code: `counts := map[string]int{}
for _, word := range strings.Fields("to be or not to be") {
    counts[word]++                  // a missing key reads as the zero value
}
fmt.Println(counts["to"])          // 2
if n, ok := counts["zzz"]; !ok { _ = n }   // distinguish missing from zero
// Iteration order of a Go map is deliberately randomised.`,
      },
      swift: {
        code: `var counts: [String: Int] = [:]
for word in "to be or not to be".split(separator: " ") {
    counts[String(word), default: 0] += 1
}
print(counts["to"] ?? 0)           // 2
// Keys must be Hashable. Swift seeds its hash per process, so iteration order varies between runs.`,
      },
      kotlin: {
        code: `val words = "to be or not to be".split(" ")
val counts = words.groupingBy { it }.eachCount()     // Map<String, Int>
println(counts["to"])                                 // 2

val mutable = HashMap<String, Int>()
for (word in words) mutable[word] = (mutable[word] ?: 0) + 1`,
      },
    },
    takeaway:
      'Reach for a hash map when you need fast lookup by key and do not need ordering. Keys must be immutable and hashable, and iteration order is often unspecified.',
  },
  {
    id: 'trees',
    part: 'algorithms',
    navLabel: 'Binary search tree',
    title: 'Trees: binary search tree',
    summary:
      'A binary search tree keeps smaller keys on the left and larger on the right, so search, insert, and ordered traversal are fast when the tree is balanced. In-order traversal visits keys in sorted order.',
    complexity: 'Balanced: search/insert O(log n) · degenerate (sorted input): O(n) · traversal O(n)',
    snippets: {
      sql: {
        code: `-- Hierarchies are stored as parent pointers and walked with a recursive CTE.
WITH RECURSIVE subtree AS (
  SELECT id, parent_id, name, 0 AS depth FROM categories WHERE id = 1
  UNION ALL
  SELECT c.id, c.parent_id, c.name, s.depth + 1
  FROM categories c JOIN subtree s ON c.parent_id = s.id
)
SELECT * FROM subtree ORDER BY depth;
-- Indexes are B-trees: a wide, balanced tree with many keys per node.`,
      },
      python: {
        code: `from dataclasses import dataclass
from typing import Optional

@dataclass
class Node:
    key: int
    left: Optional["Node"] = None
    right: Optional["Node"] = None

def insert(root: Optional[Node], key: int) -> Node:
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root

def in_order(root: Optional[Node]):
    if root:
        yield from in_order(root.left)
        yield root.key
        yield from in_order(root.right)`,
      },
      typescript: {
        code: `class TreeNode {
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(public key: number) {}
}

function insert(root: TreeNode | null, key: number): TreeNode {
  if (root === null) return new TreeNode(key);
  if (key < root.key) root.left = insert(root.left, key);
  else if (key > root.key) root.right = insert(root.right, key);
  return root;
}

function* inOrder(root: TreeNode | null): Generator<number> {
  if (root === null) return;
  yield* inOrder(root.left);
  yield root.key;
  yield* inOrder(root.right);
}`,
      },
      spark: {
        code: `# A tree does not distribute well. Flatten hierarchies into (id, parent_id) rows and
# compute depth with iterative joins, or use a path column.
tree = spark.createDataFrame([(1, None), (2, 1), (3, 1)], ["id", "parent_id"])
children = tree.alias("c").join(tree.alias("p"), F.col("c.parent_id") == F.col("p.id"))
# Sorted ranges: orderBy / range partitioning is how Spark gets a distributed ordered structure.`,
        note: 'Ordered data in Spark is range-partitioned files, not an in-memory BST.',
      },
      rust: {
        code: `#[derive(Debug)]
struct Node {
    key: i32,
    left: Option<Box<Node>>,
    right: Option<Box<Node>>,
}

fn insert(root: Option<Box<Node>>, key: i32) -> Option<Box<Node>> {
    match root {
        None => Some(Box::new(Node { key, left: None, right: None })),
        Some(mut node) => {
            if key < node.key { node.left = insert(node.left.take(), key); }
            else if key > node.key { node.right = insert(node.right.take(), key); }
            Some(node)
        }
    }
}

fn in_order(root: &Option<Box<Node>>, out: &mut Vec<i32>) {
    if let Some(node) = root {
        in_order(&node.left, out);
        out.push(node.key);
        in_order(&node.right, out);
    }
}`,
      },
      cpp: {
        code: `#include <memory>
#include <vector>

struct Node {
    int key;
    std::unique_ptr<Node> left, right;
    explicit Node(int k) : key(k) {}
};

void insert(std::unique_ptr<Node>& root, int key) {
    if (!root) { root = std::make_unique<Node>(key); return; }
    if (key < root->key) insert(root->left, key);
    else if (key > root->key) insert(root->right, key);
}

void in_order(const Node* root, std::vector<int>& out) {
    if (!root) return;
    in_order(root->left.get(), out);
    out.push_back(root->key);
    in_order(root->right.get(), out);
}
// std::map / std::set are balanced (red-black) trees from the standard library.`,
      },
      go: {
        code: `type Node struct {
    Key         int
    Left, Right *Node
}

func insert(root *Node, key int) *Node {
    if root == nil {
        return &Node{Key: key}
    }
    if key < root.Key {
        root.Left = insert(root.Left, key)
    } else if key > root.Key {
        root.Right = insert(root.Right, key)
    }
    return root
}

func inOrder(root *Node, visit func(int)) {
    if root == nil {
        return
    }
    inOrder(root.Left, visit)
    visit(root.Key)
    inOrder(root.Right, visit)
}`,
      },
      swift: {
        code: `final class Node {
    let key: Int
    var left: Node?
    var right: Node?
    init(_ key: Int) { self.key = key }
}

func insert(_ root: Node?, _ key: Int) -> Node {
    guard let root else { return Node(key) }
    if key < root.key { root.left = insert(root.left, key) }
    else if key > root.key { root.right = insert(root.right, key) }
    return root
}

func inOrder(_ root: Node?, _ visit: (Int) -> Void) {
    guard let root else { return }
    inOrder(root.left, visit)
    visit(root.key)
    inOrder(root.right, visit)
}`,
      },
      kotlin: {
        code: `class Node(val key: Int) {
    var left: Node? = null
    var right: Node? = null
}

fun insert(root: Node?, key: Int): Node {
    if (root == null) return Node(key)
    if (key < root.key) root.left = insert(root.left, key)
    else if (key > root.key) root.right = insert(root.right, key)
    return root
}

fun inOrder(root: Node?, visit: (Int) -> Unit) {
    if (root == null) return
    inOrder(root.left, visit)
    visit(root.key)
    inOrder(root.right, visit)
}
// java.util.TreeMap is a red-black tree: sorted keys, O(log n) operations.`,
      },
    },
    takeaway:
      'An unbalanced BST degrades to a linked list on sorted input. Production code uses self-balancing trees (red-black, AVL) or B-trees, which databases use for indexes.',
  },
  {
    id: 'tries',
    part: 'algorithms',
    navLabel: 'Trie',
    title: 'Trie (prefix tree)',
    summary:
      'A trie stores strings character by character along a path, so words that share a prefix share nodes. Lookup cost depends on the length of the word, not on how many words are stored.',
    complexity: 'Insert / search / prefix check O(L) for a word of length L · space O(total characters)',
    snippets: {
      sql: {
        code: `-- Prefix search served by a B-tree index with a pattern operator class.
CREATE INDEX idx_words_prefix ON words (word text_pattern_ops);
SELECT word FROM words WHERE word LIKE 'app%' ORDER BY word LIMIT 10;
-- pg_trgm or a GIN index supports substring search as well.`,
        note: 'The index is a B-tree rather than a trie, but answers the same prefix question.',
      },
      python: {
        code: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def starts_with(self, prefix: str) -> bool:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True`,
      },
      typescript: {
        code: `class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) node.children.set(ch, (next = new TrieNode()));
      node = next;
    }
    node.isWord = true;
  }

  startsWith(prefix: string): boolean {
    let node = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (!next) return false;
      node = next;
    }
    return true;
  }
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# No trie; prefix filters on sorted/partitioned columnar data use min/max statistics.
matches = words.filter(F.col("word").startswith("app"))
# For large-scale autocomplete, build the trie per partition with mapPartitions.`,
      },
      rust: {
        code: `use std::collections::HashMap;

#[derive(Default)]
struct TrieNode {
    children: HashMap<char, TrieNode>,    // each child is owned by its parent
    is_word: bool,
}

#[derive(Default)]
struct Trie { root: TrieNode }

impl Trie {
    fn insert(&mut self, word: &str) {
        let mut node = &mut self.root;
        for ch in word.chars() {
            node = node.children.entry(ch).or_default();
        }
        node.is_word = true;
    }

    fn starts_with(&self, prefix: &str) -> bool {
        let mut node = &self.root;
        for ch in prefix.chars() {
            match node.children.get(&ch) {
                Some(next) => node = next,
                None => return false,
            }
        }
        true
    }
}`,
      },
      cpp: {
        code: `#include <memory>
#include <string>
#include <unordered_map>

struct TrieNode {
    std::unordered_map<char, std::unique_ptr<TrieNode>> children;
    bool is_word = false;
};

class Trie {
public:
    void insert(const std::string& word) {
        TrieNode* node = &root_;
        for (char ch : word) {
            auto& child = node->children[ch];
            if (!child) child = std::make_unique<TrieNode>();
            node = child.get();
        }
        node->is_word = true;
    }
    bool starts_with(const std::string& prefix) const {
        const TrieNode* node = &root_;
        for (char ch : prefix) {
            auto it = node->children.find(ch);
            if (it == node->children.end()) return false;
            node = it->second.get();
        }
        return true;
    }
private:
    TrieNode root_;
};`,
      },
      go: {
        code: `type TrieNode struct {
    children map[rune]*TrieNode
    isWord   bool
}

func newNode() *TrieNode { return &TrieNode{children: map[rune]*TrieNode{}} }

type Trie struct{ root *TrieNode }

func NewTrie() *Trie { return &Trie{root: newNode()} }

func (t *Trie) Insert(word string) {
    node := t.root
    for _, ch := range word {
        next, ok := node.children[ch]
        if !ok {
            next = newNode()
            node.children[ch] = next
        }
        node = next
    }
    node.isWord = true
}

func (t *Trie) StartsWith(prefix string) bool {
    node := t.root
    for _, ch := range prefix {
        next, ok := node.children[ch]
        if !ok {
            return false
        }
        node = next
    }
    return true
}`,
      },
      swift: {
        code: `final class TrieNode {
    var children: [Character: TrieNode] = [:]
    var isWord = false
}

final class Trie {
    private let root = TrieNode()

    func insert(_ word: String) {
        var node = root
        for ch in word {
            if let next = node.children[ch] { node = next }
            else {
                let next = TrieNode()
                node.children[ch] = next
                node = next
            }
        }
        node.isWord = true
    }

    func startsWith(_ prefix: String) -> Bool {
        var node = root
        for ch in prefix {
            guard let next = node.children[ch] else { return false }
            node = next
        }
        return true
    }
}`,
      },
      kotlin: {
        code: `class TrieNode {
    val children = mutableMapOf<Char, TrieNode>()
    var isWord = false
}

class Trie {
    private val root = TrieNode()

    fun insert(word: String) {
        var node = root
        for (ch in word) node = node.children.getOrPut(ch) { TrieNode() }
        node.isWord = true
    }

    fun startsWith(prefix: String): Boolean {
        var node = root
        for (ch in prefix) node = node.children[ch] ?: return false
        return true
    }
}`,
      },
    },
    takeaway:
      'Choose a trie for prefix queries and autocomplete. The cost is memory: each node holds a map or an array of children.',
  },
  {
    id: 'heaps',
    part: 'algorithms',
    navLabel: 'Heap / priority queue',
    title: 'Heap and priority queue',
    summary:
      'A binary heap keeps the smallest (or largest) element at the root of an array-backed tree. You can read the extreme in O(1) and insert or remove it in O(log n). Example: the k smallest items.',
    complexity: 'Peek O(1) · push / pop O(log n) · build from n items O(n)',
    snippets: {
      sql: {
        code: `-- Top-N: the planner uses a bounded heap ("top-N heapsort") instead of sorting everything.
SELECT * FROM orders ORDER BY amount DESC LIMIT 5;
-- EXPLAIN ANALYZE: Sort Method: top-N heapsort  Memory: ...`,
      },
      python: {
        code: `import heapq

heap: list[int] = []
for value in (5, 1, 4):
    heapq.heappush(heap, value)       # min-heap stored in a plain list
print(heapq.heappop(heap))            # 1

print(heapq.nsmallest(2, [5, 1, 4, 2]))   # [1, 2]
heapq.heappush(heap, -7)              # max-heap trick: store negated values`,
      },
      typescript: {
        code: `// JavaScript has no built-in heap. A minimal binary min-heap:
class MinHeap {
  private data: number[] = [];
  push(value: number) {
    this.data.push(value);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent] <= this.data[i]) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }
  pop(): number | undefined {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0 && last !== undefined) {
      this.data[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < this.data.length && this.data[l] < this.data[smallest]) smallest = l;
        if (r < this.data.length && this.data[r] < this.data[smallest]) smallest = r;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
}`,
      },
      spark: {
        code: `# takeOrdered / orderBy().limit() keep a bounded heap per partition, then merge the winners.
smallest = rdd.takeOrdered(5)                          # 5 smallest
top = orders.orderBy(F.desc("amount")).limit(5)        # planned as TakeOrderedAndProject`,
      },
      rust: {
        code: `use std::cmp::Reverse;
use std::collections::BinaryHeap;

let mut max_heap = BinaryHeap::new();          // BinaryHeap is a MAX-heap
max_heap.extend([5, 1, 4]);
println!("{:?}", max_heap.pop());              // Some(5)

let mut min_heap = BinaryHeap::new();
for value in [5, 1, 4] { min_heap.push(Reverse(value)); }   // Reverse flips the order
println!("{:?}", min_heap.pop());              // Some(Reverse(1))`,
      },
      cpp: {
        code: `#include <functional>
#include <queue>
#include <vector>

std::priority_queue<int> max_heap;                       // max-heap by default
max_heap.push(5); max_heap.push(1); max_heap.push(4);
int largest = max_heap.top();                            // 5
max_heap.pop();

std::priority_queue<int, std::vector<int>, std::greater<int>> min_heap;   // min-heap`,
      },
      go: {
        code: `import "container/heap"

type IntHeap []int
func (h IntHeap) Len() int           { return len(h) }
func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }   // min-heap
func (h IntHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *IntHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *IntHeap) Pop() any {
    old := *h
    last := old[len(old)-1]
    *h = old[:len(old)-1]
    return last
}

h := &IntHeap{5, 1, 4}
heap.Init(h)
heap.Push(h, 0)
fmt.Println(heap.Pop(h))   // 0`,
      },
      swift: {
        code: `// The standard library has no heap; the swift-collections package provides one.
import Collections

var heap: Heap<Int> = [5, 1, 4]       // a min-max heap
heap.insert(0)
print(heap.popMin()!)                  // 0
print(heap.popMax()!)                  // 5`,
        note: 'Requires the swift-collections package.',
      },
      kotlin: {
        code: `import java.util.PriorityQueue

val minHeap = PriorityQueue<Int>()                       // min-heap by default
listOf(5, 1, 4).forEach(minHeap::add)
println(minHeap.poll())                                  // 1

val maxHeap = PriorityQueue<Int>(compareByDescending { it })`,
      },
    },
    takeaway:
      'For "the k best" problems keep a heap of size k instead of sorting everything: O(n log k). Check whether your language gives a min-heap or a max-heap by default.',
  },
  {
    id: 'graph-traversal',
    part: 'algorithms',
    navLabel: 'Graphs: BFS & DFS',
    title: 'Graphs: breadth-first and depth-first search',
    summary:
      'Store a graph as an adjacency list. Breadth-first search (BFS) uses a queue and finds the fewest hops in an unweighted graph; depth-first search (DFS) uses a stack or recursion and suits ordering and cycle detection. Example: BFS shortest hops.',
    complexity: 'Time O(V + E) · space O(V)',
    snippets: {
      sql: {
        code: `-- BFS as a recursive CTE: each iteration expands the frontier by one hop.
WITH RECURSIVE reach(node, hops) AS (
  SELECT 'A'::text, 0
  UNION
  SELECT e.dst, r.hops + 1 FROM edges e JOIN reach r ON e.src = r.node
  -- UNION (not UNION ALL) drops duplicate rows, which stops cycles from looping forever
)
SELECT node, min(hops) FROM reach GROUP BY node;`,
      },
      python: {
        code: `from collections import deque

def shortest_hops(graph: dict[str, list[str]], start: str, goal: str) -> int:
    queue = deque([(start, 0)])
    seen = {start}                           # mark when ENQUEUED, not when dequeued
    while queue:
        node, hops = queue.popleft()
        if node == goal:
            return hops
        for neighbour in graph.get(node, []):
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append((neighbour, hops + 1))
    return -1`,
      },
      typescript: {
        code: `function shortestHops(graph: Map<string, string[]>, start: string, goal: string): number {
  const queue: [string, number][] = [[start, 0]];
  const seen = new Set([start]);
  for (let head = 0; head < queue.length; head++) {     // index instead of shift(): O(1) dequeue
    const [node, hops] = queue[head];
    if (node === goal) return hops;
    for (const next of graph.get(node) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, hops + 1]);
      }
    }
  }
  return -1;
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Distributed BFS: expand the frontier with one join per hop, until it is empty.
frontier = spark.createDataFrame([("A",)], ["node"])
visited = frontier
for hop in range(1, 6):                                  # bound the iteration count
    frontier = (frontier.join(edges, frontier.node == edges.src)
                        .select(edges.dst.alias("node")).distinct()
                        .join(visited, "node", "left_anti"))
    if frontier.rdd.isEmpty(): break
    visited = visited.union(frontier)
# For heavy graph work use GraphFrames or GraphX.`,
        note: 'Each hop is a join (shuffle), so the lineage grows: checkpoint on long traversals.',
      },
      rust: {
        code: `use std::collections::{HashMap, HashSet, VecDeque};

fn shortest_hops(graph: &HashMap<&str, Vec<&str>>, start: &str, goal: &str) -> Option<usize> {
    let mut queue = VecDeque::from([(start, 0)]);
    let mut seen = HashSet::from([start]);
    while let Some((node, hops)) = queue.pop_front() {
        if node == goal { return Some(hops); }
        for &next in graph.get(node).into_iter().flatten() {
            if seen.insert(next) {                  // insert returns true if it was new
                queue.push_back((next, hops + 1));
            }
        }
    }
    None
}`,
      },
      cpp: {
        code: `#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

int shortest_hops(const std::unordered_map<std::string, std::vector<std::string>>& graph,
                  const std::string& start, const std::string& goal) {
    std::queue<std::pair<std::string, int>> queue;
    std::unordered_set<std::string> seen{start};
    queue.push({start, 0});
    while (!queue.empty()) {
        auto [node, hops] = queue.front();
        queue.pop();
        if (node == goal) return hops;
        auto it = graph.find(node);
        if (it == graph.end()) continue;
        for (const auto& next : it->second)
            if (seen.insert(next).second) queue.push({next, hops + 1});
    }
    return -1;
}`,
      },
      go: {
        code: `func shortestHops(graph map[string][]string, start, goal string) int {
    type item struct {
        node string
        hops int
    }
    queue := []item{{start, 0}}
    seen := map[string]bool{start: true}
    for len(queue) > 0 {
        current := queue[0]
        queue = queue[1:]
        if current.node == goal {
            return current.hops
        }
        for _, next := range graph[current.node] {
            if !seen[next] {
                seen[next] = true
                queue = append(queue, item{next, current.hops + 1})
            }
        }
    }
    return -1
}`,
      },
      swift: {
        code: `func shortestHops(_ graph: [String: [String]], from start: String, to goal: String) -> Int? {
    var queue = [(start, 0)]
    var head = 0
    var seen: Set<String> = [start]
    while head < queue.count {
        let (node, hops) = queue[head]
        head += 1
        if node == goal { return hops }
        for next in graph[node, default: []] where seen.insert(next).inserted {
            queue.append((next, hops + 1))
        }
    }
    return nil
}`,
      },
      kotlin: {
        code: `fun shortestHops(graph: Map<String, List<String>>, start: String, goal: String): Int {
    val queue = ArrayDeque<Pair<String, Int>>()
    queue.addLast(start to 0)
    val seen = mutableSetOf(start)
    while (queue.isNotEmpty()) {
        val (node, hops) = queue.removeFirst()
        if (node == goal) return hops
        for (next in graph[node].orEmpty()) {
            if (seen.add(next)) queue.addLast(next to hops + 1)
        }
    }
    return -1
}`,
      },
    },
    takeaway:
      'Always track visited nodes, or a cycle will loop forever. BFS gives shortest hops on unweighted graphs; swap the queue for a stack and you have DFS.',
  },
  {
    id: 'dijkstra',
    part: 'algorithms',
    navLabel: 'Dijkstra',
    title: 'Dijkstra’s shortest path',
    summary:
      'For graphs with non-negative edge weights, repeatedly settle the unvisited node with the smallest known distance, using a min-heap to find it. Stale heap entries are skipped rather than updated.',
    complexity: 'Time O((V + E) log V) with a binary heap · space O(V)',
    snippets: {
      sql: {
        code: `-- pgRouting provides Dijkstra inside PostgreSQL.
SELECT * FROM pgr_dijkstra(
  'SELECT id, source, target, cost FROM roads',
  1, 5, directed := true
);`,
        note: 'Needs the pgRouting extension; plain SQL is a poor fit for weighted shortest paths.',
      },
      python: {
        code: `import heapq

def dijkstra(graph: dict[str, list[tuple[str, int]]], source: str) -> dict[str, int]:
    dist = {source: 0}
    heap = [(0, source)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist.get(node, float("inf")):
            continue                                  # stale entry
        for neighbour, weight in graph.get(node, []):
            candidate = d + weight
            if candidate < dist.get(neighbour, float("inf")):
                dist[neighbour] = candidate
                heapq.heappush(heap, (candidate, neighbour))
    return dist`,
      },
      typescript: {
        code: `// Uses the MinHeap-style structure from the heap lesson, keyed by distance.
type Edge = [node: string, weight: number];

function dijkstra(graph: Map<string, Edge[]>, source: string): Map<string, number> {
  const dist = new Map<string, number>([[source, 0]]);
  const heap: [number, string][] = [[0, source]];       // replace with a real heap for large graphs
  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0]);                    // O(n log n) per pop: illustration only
    const [d, node] = heap.shift()!;
    if (d > (dist.get(node) ?? Infinity)) continue;
    for (const [next, weight] of graph.get(node) ?? []) {
      const candidate = d + weight;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        heap.push([candidate, next]);
      }
    }
  }
  return dist;
}`,
        note: 'The sort makes this O(V^2 log V); substitute a binary heap for production use.',
      },
      spark: {
        code: `# Single-source shortest paths in Spark: iterate relaxations (Bellman-Ford style) with joins.
dist = spark.createDataFrame([("A", 0)], ["node", "d"])
for _ in range(10):                                         # at most V - 1 rounds
    relaxed = (dist.join(edges, dist.node == edges.src)
                   .select(edges.dst.alias("node"), (F.col("d") + F.col("weight")).alias("d")))
    dist = dist.union(relaxed).groupBy("node").agg(F.min("d").alias("d"))
# GraphFrames offers shortestPaths for hop counts.`,
        note: 'Dijkstra’s sequential heap does not parallelise; Spark uses repeated relaxation instead.',
      },
      rust: {
        code: `use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};

fn dijkstra(graph: &HashMap<u32, Vec<(u32, u64)>>, source: u32) -> HashMap<u32, u64> {
    let mut dist: HashMap<u32, u64> = HashMap::from([(source, 0)]);
    let mut heap = BinaryHeap::from([Reverse((0u64, source))]);   // Reverse turns the max-heap into a min-heap
    while let Some(Reverse((d, node))) = heap.pop() {
        if d > *dist.get(&node).unwrap_or(&u64::MAX) { continue; }   // stale entry
        for &(next, weight) in graph.get(&node).into_iter().flatten() {
            let candidate = d + weight;
            if candidate < *dist.get(&next).unwrap_or(&u64::MAX) {
                dist.insert(next, candidate);
                heap.push(Reverse((candidate, next)));
            }
        }
    }
    dist
}`,
      },
      cpp: {
        code: `#include <functional>
#include <limits>
#include <queue>
#include <vector>

using Edge = std::pair<int, int>;                          // (neighbour, weight)

std::vector<long> dijkstra(const std::vector<std::vector<Edge>>& graph, int source) {
    const long inf = std::numeric_limits<long>::max();
    std::vector<long> dist(graph.size(), inf);
    using Item = std::pair<long, int>;                     // (distance, node)
    std::priority_queue<Item, std::vector<Item>, std::greater<Item>> heap;
    dist[source] = 0;
    heap.push({0, source});
    while (!heap.empty()) {
        auto [d, node] = heap.top();
        heap.pop();
        if (d > dist[node]) continue;                      // stale entry
        for (auto [next, weight] : graph[node]) {
            if (d + weight < dist[next]) {
                dist[next] = d + weight;
                heap.push({dist[next], next});
            }
        }
    }
    return dist;
}`,
      },
      go: {
        code: `type item struct {
    node, dist int
}
type pq []item
func (h pq) Len() int           { return len(h) }
func (h pq) Less(i, j int) bool { return h[i].dist < h[j].dist }
func (h pq) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *pq) Push(x any)        { *h = append(*h, x.(item)) }
func (h *pq) Pop() any {
    old := *h
    last := old[len(old)-1]
    *h = old[:len(old)-1]
    return last
}

func dijkstra(graph [][][2]int, source int) []int {
    dist := make([]int, len(graph))
    for i := range dist {
        dist[i] = math.MaxInt
    }
    dist[source] = 0
    h := &pq{{source, 0}}
    for h.Len() > 0 {
        current := heap.Pop(h).(item)
        if current.dist > dist[current.node] {
            continue
        }
        for _, edge := range graph[current.node] {
            candidate := current.dist + edge[1]
            if candidate < dist[edge[0]] {
                dist[edge[0]] = candidate
                heap.Push(h, item{edge[0], candidate})
            }
        }
    }
    return dist
}`,
      },
      swift: {
        code: `import Collections   // swift-collections: Heap

struct State: Comparable {
    let dist: Int, node: Int
    static func < (a: State, b: State) -> Bool { a.dist < b.dist }
}

func dijkstra(_ graph: [[(to: Int, weight: Int)]], source: Int) -> [Int] {
    var dist = [Int](repeating: .max, count: graph.count)
    dist[source] = 0
    var heap = Heap([State(dist: 0, node: source)])
    while let current = heap.popMin() {
        if current.dist > dist[current.node] { continue }      // stale entry
        for edge in graph[current.node] {
            let candidate = current.dist + edge.weight
            if candidate < dist[edge.to] {
                dist[edge.to] = candidate
                heap.insert(State(dist: candidate, node: edge.to))
            }
        }
    }
    return dist
}`,
        note: 'Requires the swift-collections package for Heap.',
      },
      kotlin: {
        code: `import java.util.PriorityQueue

fun dijkstra(graph: List<List<Pair<Int, Int>>>, source: Int): LongArray {
    val dist = LongArray(graph.size) { Long.MAX_VALUE }
    dist[source] = 0
    val heap = PriorityQueue<Pair<Long, Int>>(compareBy { it.first })
    heap.add(0L to source)
    while (heap.isNotEmpty()) {
        val (d, node) = heap.poll()
        if (d > dist[node]) continue                       // stale entry
        for ((next, weight) in graph[node]) {
            val candidate = d + weight
            if (candidate < dist[next]) {
                dist[next] = candidate
                heap.add(candidate to next)
            }
        }
    }
    return dist
}`,
      },
    },
    takeaway:
      'Dijkstra requires non-negative weights; with negative edges use Bellman-Ford. The "skip stale entries" trick avoids needing a decrease-key operation.',
  },
  {
    id: 'backtracking',
    part: 'algorithms',
    navLabel: 'Backtracking',
    title: 'Backtracking',
    summary:
      'Build a candidate one choice at a time: choose, explore, then undo the choice and try the next. Abandon a branch as soon as it cannot lead to a solution. Example: generate all subsets.',
    complexity: 'Subsets: time O(n * 2^n) · space O(n) recursion depth',
    snippets: {
      sql: {
        code: `-- Enumerate subsets of {1,2,3} with a bitmask instead of recursion.
SELECT mask,
       ARRAY(SELECT v FROM generate_series(1, 3) v WHERE (mask >> (v - 1)) & 1 = 1) AS subset
FROM generate_series(0, 7) AS mask;`,
        note: 'A bitmask enumerates all 2^n subsets declaratively; pruning is not expressible.',
      },
      python: {
        code: `def subsets(items: list[int]) -> list[list[int]]:
    result: list[list[int]] = []
    chosen: list[int] = []

    def explore(start: int) -> None:
        result.append(chosen.copy())              # record the current choice set
        for index in range(start, len(items)):
            chosen.append(items[index])           # choose
            explore(index + 1)                    # explore
            chosen.pop()                          # un-choose (backtrack)

    explore(0)
    return result`,
      },
      typescript: {
        code: `function subsets(items: number[]): number[][] {
  const result: number[][] = [];
  const chosen: number[] = [];

  function explore(start: number): void {
    result.push([...chosen]);                     // copy: 'chosen' keeps changing
    for (let index = start; index < items.length; index++) {
      chosen.push(items[index]);                  // choose
      explore(index + 1);                         // explore
      chosen.pop();                               // un-choose
    }
  }

  explore(0);
  return result;
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

# Enumerate all 2^n masks in parallel, then decode each into a subset.
masks = spark.range(0, 2 ** 3).withColumnRenamed("id", "mask")
subsets = masks.withColumn(
    "subset",
    F.expr("filter(sequence(1, 3), v -> ((mask >> (v - 1)) & 1) = 1)"),
)`,
        note: 'Search is flattened into data-parallel enumeration; pruning would need a custom approach.',
      },
      rust: {
        code: `fn subsets(items: &[i32]) -> Vec<Vec<i32>> {
    fn explore(items: &[i32], start: usize, chosen: &mut Vec<i32>, result: &mut Vec<Vec<i32>>) {
        result.push(chosen.clone());              // record
        for index in start..items.len() {
            chosen.push(items[index]);            // choose
            explore(items, index + 1, chosen, result);
            chosen.pop();                         // un-choose
        }
    }
    let mut result = Vec::new();
    explore(items, 0, &mut Vec::new(), &mut result);
    result
}`,
      },
      cpp: {
        code: `#include <vector>

void explore(const std::vector<int>& items, std::size_t start,
             std::vector<int>& chosen, std::vector<std::vector<int>>& result) {
    result.push_back(chosen);                     // copy of the current choice set
    for (std::size_t index = start; index < items.size(); ++index) {
        chosen.push_back(items[index]);           // choose
        explore(items, index + 1, chosen, result);
        chosen.pop_back();                        // un-choose
    }
}

std::vector<std::vector<int>> subsets(const std::vector<int>& items) {
    std::vector<std::vector<int>> result;
    std::vector<int> chosen;
    explore(items, 0, chosen, result);
    return result;
}`,
      },
      go: {
        code: `func subsets(items []int) [][]int {
    var result [][]int
    var chosen []int

    var explore func(start int)
    explore = func(start int) {
        snapshot := append([]int(nil), chosen...) // copy: append may share the backing array
        result = append(result, snapshot)
        for index := start; index < len(items); index++ {
            chosen = append(chosen, items[index]) // choose
            explore(index + 1)
            chosen = chosen[:len(chosen)-1]       // un-choose
        }
    }
    explore(0)
    return result
}`,
      },
      swift: {
        code: `func subsets(_ items: [Int]) -> [[Int]] {
    var result: [[Int]] = []
    var chosen: [Int] = []

    func explore(_ start: Int) {
        result.append(chosen)                     // arrays are values: this is a copy
        for index in start..<items.count {
            chosen.append(items[index])           // choose
            explore(index + 1)
            chosen.removeLast()                   // un-choose
        }
    }
    explore(0)
    return result
}`,
      },
      kotlin: {
        code: `fun subsets(items: List<Int>): List<List<Int>> {
    val result = mutableListOf<List<Int>>()
    val chosen = mutableListOf<Int>()

    fun explore(start: Int) {
        result.add(chosen.toList())               // snapshot copy
        for (index in start until items.size) {
            chosen.add(items[index])              // choose
            explore(index + 1)
            chosen.removeLast()                   // un-choose
        }
    }
    explore(0)
    return result
}`,
      },
    },
    takeaway:
      'The pattern is choose, explore, un-choose. The classic bug is recording a reference to the working list instead of a copy. Prune early to avoid exploring hopeless branches.',
  },
  {
    id: 'dynamic-programming',
    part: 'algorithms',
    navLabel: 'Dynamic programming',
    title: 'Dynamic programming',
    summary:
      'When a problem has overlapping subproblems and optimal substructure, solve each subproblem once and reuse the answer. Example: the number of ways to climb n stairs taking 1 or 2 steps at a time (a Fibonacci recurrence).',
    complexity: 'Naive recursion O(2^n) · memoised or bottom-up O(n) · rolling variables O(1) space',
    snippets: {
      sql: {
        code: `-- Bottom-up DP with a recursive CTE: each row is the next table entry.
WITH RECURSIVE ways(n, prev, curr) AS (
  SELECT 1, 0::numeric, 1::numeric
  UNION ALL
  SELECT n + 1, curr, prev + curr FROM ways WHERE n < 10
)
SELECT curr AS ways_to_climb_10 FROM ways WHERE n = 10;     -- 89`,
        note: 'numeric avoids overflow; the CTE carries the previous two values like a rolling DP table.',
      },
      python: {
        code: `from functools import lru_cache

@lru_cache(maxsize=None)          # top-down: memoisation
def ways_memo(n: int) -> int:
    return 1 if n <= 1 else ways_memo(n - 1) + ways_memo(n - 2)

def ways(n: int) -> int:          # bottom-up with O(1) space
    previous, current = 1, 1
    for _ in range(n - 1):
        previous, current = current, previous + current
    return current`,
      },
      typescript: {
        code: `function ways(n: number): number {
  let previous = 1;
  let current = 1;
  for (let step = 2; step <= n; step++) {
    [previous, current] = [current, previous + current];   // roll the table forward
  }
  return current;
}

const memo = new Map<number, number>();
function waysMemo(n: number): number {                       // top-down with a cache
  if (n <= 1) return 1;
  const cached = memo.get(n);
  if (cached !== undefined) return cached;
  const value = waysMemo(n - 1) + waysMemo(n - 2);
  memo.set(n, value);
  return value;
}`,
      },
      spark: {
        code: `from pyspark.sql import functions as F
from pyspark.sql.types import LongType

def ways(n):                       # the DP itself is sequential, so run it per row
    previous, current = 1, 1
    for _ in range(max(n - 1, 0)):
        previous, current = current, previous + current
    return current

ways_udf = F.udf(ways, LongType())
spark.range(1, 11).select("id", ways_udf("id").alias("ways"))`,
        note: 'Parallelism comes from many independent subproblems, not from one DP table.',
      },
      rust: {
        code: `fn ways(n: u32) -> u64 {
    let (mut previous, mut current) = (1u64, 1u64);
    for _ in 1..n {
        let next = previous + current;       // panics on overflow in debug builds
        previous = current;
        current = next;
    }
    current
}

fn ways_table(n: usize) -> u64 {
    let mut table = vec![1u64; n + 1];       // the full DP table, O(n) space
    for step in 2..=n {
        table[step] = table[step - 1] + table[step - 2];
    }
    table[n]
}`,
      },
      cpp: {
        code: `#include <vector>

unsigned long long ways(int n) {
    unsigned long long previous = 1, current = 1;     // wraps silently on overflow
    for (int step = 2; step <= n; ++step) {
        unsigned long long next = previous + current;
        previous = current;
        current = next;
    }
    return current;
}

unsigned long long ways_table(int n) {
    std::vector<unsigned long long> table(n + 1, 1);
    for (int step = 2; step <= n; ++step) table[step] = table[step - 1] + table[step - 2];
    return table[n];
}`,
      },
      go: {
        code: `func ways(n int) uint64 {
    previous, current := uint64(1), uint64(1)
    for step := 2; step <= n; step++ {
        previous, current = current, previous+current
    }
    return current
}

func waysTable(n int) uint64 {
    table := make([]uint64, n+1)
    table[0], table[1] = 1, 1
    for step := 2; step <= n; step++ {
        table[step] = table[step-1] + table[step-2]
    }
    return table[n]
}`,
      },
      swift: {
        code: `func ways(_ n: Int) -> UInt64 {
    var previous: UInt64 = 1
    var current: UInt64 = 1
    for _ in stride(from: 2, through: n, by: 1) {
        (previous, current) = (current, previous + current)   // traps on overflow
    }
    return current
}

func waysTable(_ n: Int) -> UInt64 {
    var table = [UInt64](repeating: 1, count: n + 1)
    for step in stride(from: 2, through: n, by: 1) {
        table[step] = table[step - 1] + table[step - 2]
    }
    return table[n]
}`,
      },
      kotlin: {
        code: `fun ways(n: Int): Long {
    var previous = 1L
    var current = 1L
    repeat(maxOf(n - 1, 0)) {
        val next = previous + current          // wraps silently on overflow
        previous = current
        current = next
    }
    return current
}

fun waysTable(n: Int): Long {
    val table = LongArray(n + 1) { 1L }
    for (step in 2..n) table[step] = table[step - 1] + table[step - 2]
    return table[n]
}`,
      },
    },
    takeaway:
      'Write the recurrence first, then pick top-down memoisation or a bottom-up table. Look at which previous entries each step needs: often a few rolling variables replace the whole table.',
  },
  {
    id: 'bit-manipulation',
    part: 'algorithms',
    navLabel: 'Bit manipulation',
    title: 'Bit manipulation',
    summary:
      'Operate directly on bits for speed and compact state. n & (n - 1) clears the lowest set bit, which gives a power-of-two test and a fast popcount; XOR cancels equal values, which finds the single unpaired number.',
    complexity: 'Power-of-two check O(1) · popcount O(set bits) · single number O(n) time, O(1) space',
    snippets: {
      sql: {
        code: `SELECT (n > 0 AND (n & (n - 1)) = 0) AS is_power_of_two
FROM (VALUES (8), (6)) AS t(n);                  -- true, false

-- bit_count (PostgreSQL 14+) counts set bits; bit_xor aggregates with XOR.
SELECT bit_count(5::bit(8)) AS ones;              -- 2
SELECT bit_xor(v) AS single FROM (VALUES (4), (1), (2), (1), (2)) AS t(v);   -- 4`,
      },
      python: {
        code: `def is_power_of_two(n: int) -> bool:
    return n > 0 and n & (n - 1) == 0

def single_number(values: list[int]) -> int:
    result = 0
    for value in values:
        result ^= value               # equal pairs cancel to 0
    return result

print(is_power_of_two(8), single_number([4, 1, 2, 1, 2]))   # True 4
print((13).bit_count(), bin(13))                            # 3 0b1101   (Python 3.10+)`,
      },
      typescript: {
        code: `const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

const singleNumber = (values: number[]): number =>
  values.reduce((result, value) => result ^ value, 0);

console.log(isPowerOfTwo(8), singleNumber([4, 1, 2, 1, 2]));   // true 4
// Bitwise operators work on 32-bit signed integers; use BigInt for larger values.`,
      },
      spark: {
        code: `from pyspark.sql import functions as F

nums.select(
    ((F.col("n") > 0) & (F.col("n").bitwiseAND(F.col("n") - 1) == 0)).alias("is_pow2"),
    F.bit_count("n").alias("ones"),                     # Spark 3.5+
)
# XOR across rows is not a built-in aggregate; use a UDAF or bit_xor in Spark SQL.`,
      },
      rust: {
        code: `fn is_power_of_two(n: u64) -> bool {
    n != 0 && n & (n - 1) == 0          // or n.is_power_of_two()
}

fn single_number(values: &[i32]) -> i32 {
    values.iter().fold(0, |result, &value| result ^ value)
}

fn main() {
    println!("{} {}", is_power_of_two(8), single_number(&[4, 1, 2, 1, 2]));   // true 4
    println!("{} {}", 13u32.count_ones(), 8u32.trailing_zeros());            // 3 3
}`,
      },
      cpp: {
        code: `#include <bit>
#include <cstdint>
#include <vector>

constexpr bool is_power_of_two(std::uint64_t n) { return n != 0 && (n & (n - 1)) == 0; }

int single_number(const std::vector<int>& values) {
    int result = 0;
    for (int value : values) result ^= value;
    return result;
}

// C++20: std::popcount(13u) == 3, std::has_single_bit(8u) == true`,
      },
      go: {
        code: `import "math/bits"

func isPowerOfTwo(n uint64) bool { return n != 0 && n&(n-1) == 0 }

func singleNumber(values []int) int {
    result := 0
    for _, value := range values {
        result ^= value
    }
    return result
}

// bits.OnesCount64(13) == 3, bits.TrailingZeros64(8) == 3`,
      },
      swift: {
        code: `func isPowerOfTwo(_ n: UInt64) -> Bool { n != 0 && n & (n - 1) == 0 }

func singleNumber(_ values: [Int]) -> Int {
    values.reduce(0, ^)               // the XOR operator passed as a function
}

print(isPowerOfTwo(8), singleNumber([4, 1, 2, 1, 2]))   // true 4
print(13.nonzeroBitCount, 8.trailingZeroBitCount)        // 3 3`,
      },
      kotlin: {
        code: `fun isPowerOfTwo(n: Long): Boolean = n > 0 && (n and (n - 1)) == 0L

fun singleNumber(values: IntArray): Int = values.fold(0) { result, value -> result xor value }

fun main() {
    println("\${isPowerOfTwo(8)} \${singleNumber(intArrayOf(4, 1, 2, 1, 2))}")   // true 4
    println(13.countOneBits())                                              // 3
}`,
      },
    },
    takeaway:
      'n & (n - 1) and XOR cancellation are small tricks with big wins. Mind operator precedence in C-family languages and the signed 32-bit limit in JavaScript.',
  },
];
