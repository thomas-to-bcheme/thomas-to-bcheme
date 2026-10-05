import type { AiMlModel } from '../../types';

/**
 * Association Rules (Apriori / FP-Growth) — frequent-itemset mining and the
 * "if X then Y" rules read off it.
 *
 * Sits in the structure group because it is the unsupervised question asked of
 * SETS rather than of vectors: k-means and PCA need coordinates, a ratings
 * matrix needs a user-by-item grid, and this needs nothing but the knowledge of
 * which items occurred together. That makes it the cleanest example in the
 * hub of a method whose similarity is set overlap (Jaccard and its asymmetric
 * relatives support, confidence and lift), and the cleanest example of an
 * entry whose objective is not a loss at all — it is a feasible set, enumerated
 * exhaustively under thresholds.
 */
export const ASSOCIATION_RULES: AiMlModel = {
  slug: 'association-rules',
  name: 'Association Rules (Apriori / FP-Growth)',
  aliases: [
    'Association Rule',
    'Apriori',
    'FP-Growth',
    'Market basket analysis',
    'Frequent itemset mining',
    'Association rule mining',
    'Eclat',
  ],
  category: 'classical-ml',
  group: 'structure',
  kind: 'technique',

  paradigms: ['unsupervised'],
  // 'ranking' because rules are ranked by lift or confidence and the dominant
  // use is "frequently bought together". 'anomaly-detection' because
  // applications.featured['anomaly-detection'] claims an adapted fit: a
  // transaction that violates a near-certain rule is a defensible outlier.
  taskTypes: ['ranking', 'anomaly-detection'],
  paradigmNote:
    'Unsupervised: there is no target column and no labelled examples, only a collection of transactions. It is a technique rather than a fitted model — nothing is parameterized and nothing generalizes. The output is a table of statements that are TRUE of the data you mined, and whether they hold for tomorrow’s baskets is a separate claim the algorithm does not make.',

  intuition:
    'A transaction is a set of items — a basket, a session, a patient’s diagnosis codes — and the question is which items keep turning up together. Count how often every combination appears, keep the combinations that appear often enough (high support), and from each frequent combination read off rules of the form X ⇒ Y whose confidence — of the baskets containing X, the fraction that also contain Y — is high enough to act on. There are no coordinates, no vectors and no distances here: a basket is an unordered bag with no magnitude, so every comparison is an overlap of sets. The one structural fact that makes this tractable is that a combination can only be frequent if all of its sub-combinations are, which lets the search discard most of an astronomically large lattice without ever counting it. What the method cannot do is tell you why items co-occur, and the first number everyone reaches for, confidence, is misleading whenever the consequent is popular — which is why lift exists.',

  objective: {
    kind: 'constrained-program',
    expression: {
      formula:
        '\\begin{aligned} \\operatorname{supp}(S) &= \\frac{\\lvert \\{ t \\in \\mathcal{T} : S \\subseteq t \\} \\rvert}{\\lvert \\mathcal{T} \\rvert} \\\\ \\mathcal{R} &= \\left\\{ X \\Rightarrow Y \\;:\\; X \\cap Y = \\varnothing,\\ \\operatorname{supp}(X \\cup Y) \\ge \\sigma,\\ \\frac{\\operatorname{supp}(X \\cup Y)}{\\operatorname{supp}(X)} \\ge \\gamma \\right\\} \\end{aligned}',
      symbols: [
        { symbol: '\\mathcal{T}', meaning: 'the multiset of transactions; each t is a SET of items drawn from the item vocabulary, so quantity, order and repeats are all discarded before mining starts' },
        { symbol: '\\operatorname{supp}(S)', meaning: 'the fraction of transactions that contain every item of S — the only quantity ever counted, and everything else is a ratio of these' },
        { symbol: '\\sigma', meaning: 'minimum support (minsup): the frequency floor an itemset must clear. It is the single parameter that controls how much of the lattice is explored, and therefore the runtime' },
        { symbol: '\\gamma', meaning: 'minimum confidence (minconf): the floor on supp(X ∪ Y) / supp(X), the conditional frequency of Y given X. Asymmetric — it reads X ⇒ Y and says nothing about Y ⇒ X' },
        { symbol: 'X \\Rightarrow Y', meaning: 'a rule: disjoint itemsets, antecedent and consequent. "Implies" is a statement about co-occurrence in the mined data, not about causation or about any individual basket' },
        { symbol: '\\mathcal{R}', meaning: 'the feasible set — every rule satisfying both thresholds. It is the OUTPUT, enumerated exhaustively; there is no objective value being optimized over it' },
      ],
    },
    reading:
      'Return every rule X ⇒ Y whose itemset appears in at least a fraction σ of the transactions and whose confidence is at least γ. Nothing is minimised or maximised: the thresholds define a feasible set and the algorithm lists all of it, exactly and deterministically, with no local optima and no randomness. That is why "constrained program" is the honest label and "loss" is not — a loss implies a scalar being driven down by fitting, a model with parameters that could be better or worse, and a generalization gap, and none of that exists here. The closest thing to an objective is the post-hoc ranking of the surviving rules by lift, supp(X ∪ Y) / (supp(X)·supp(Y)), which is the observed co-occurrence divided by what independence would predict. Confidence alone is the number to distrust: if Y sits in 80 percent of all baskets, then nearly any X yields a confidence near 0.8 by chance, and lift near 1 is what exposes that.',
  },

  optimization: {
    method: 'Level-wise breadth-first search pruned by downward closure (Apriori); candidate-free FP-tree growth as the alternative (FP-Growth)',
    updateRule: {
      formula:
        'F_{k+1} = \\left\\{ c \\in C_{k+1} : \\operatorname{supp}(c) \\ge \\sigma \\right\\}, \\qquad C_{k+1} = \\left\\{ A \\cup B : A, B \\in F_k,\\ \\lvert A \\cap B \\rvert = k-1,\\ \\text{every } k\\text{-subset of } A \\cup B \\text{ lies in } F_k \\right\\}',
      symbols: [
        { symbol: 'F_k', meaning: 'the frequent itemsets of size k — the survivors of level k, and the only inputs the next level is allowed to use' },
        { symbol: 'C_{k+1}', meaning: 'candidate (k+1)-itemsets, built by joining two frequent k-itemsets that share k−1 items and then pruned: every k-subset must itself be frequent' },
        { symbol: 'S \\subseteq S\' \\Rightarrow \\operatorname{supp}(S) \\ge \\operatorname{supp}(S\')', meaning: 'downward closure, also called the anti-monotone property: adding an item can only lower support. This is the entire reason the search is feasible' },
        { symbol: '\\operatorname{supp}(c) \\ge \\sigma', meaning: 'the one database scan per level: count each surviving candidate and keep it if it clears the floor' },
      ],
    },
    rationale:
      'The lattice of all itemsets over m items has 2^m nodes, which is not enumerable for any real catalogue, so the method cannot count everything. Downward closure rescues it: if a set is infrequent then every superset is too, so the moment a set fails its support test its entire upward cone is deleted from the search without being visited. Apriori exploits that breadth-first — frequent k-itemsets generate (k+1)-candidates, a candidate with any infrequent subset is discarded before it is counted, and the survivors are counted in one pass over the data. Its cost is the candidate set itself, which can be enormous at low support. FP-Growth removes it: two passes compress the database into a prefix tree (the FP-tree) in which transactions that share a frequent-item prefix share a path, and mining then recurses on each item’s conditional tree, growing patterns directly with no candidate ever generated. Eclat takes a third route, storing for each item the set of transaction ids that contain it, so the support of a union is the size of an intersection. All three return exactly the same set of frequent itemsets — they differ only in how they avoid counting what cannot qualify, which is why the choice is an engineering decision about memory and data shape, never a modelling one. Rule generation is then a cheap second stage: for each frequent itemset, every split into antecedent and consequent has its confidence read off two stored supports, and downward closure guarantees that both are already known.',
    hyperparameters: [
      { name: 'minsup (σ)', role: 'The support floor, and the dial that controls everything: runtime, memory, and how many rules come out. Halving it can multiply the frequent itemsets by orders of magnitude, so it is chosen from what the downstream consumer can use rather than from a statistical rule', typicalRange: '0.0001 to 0.05 on retail baskets; 0.01 to 0.2 on dense data such as survey or log features; often set as an absolute count so that every rule rests on at least a few dozen baskets' },
      { name: 'minconf (γ)', role: 'The confidence floor on each rule. A weak filter on its own, because it is inflated by popular consequents — treat it as a first cut and rank or filter by lift', typicalRange: '0.2 to 0.8' },
      { name: 'min lift / conviction', role: 'The filter that actually separates signal from popularity. Lift above 1 means Y appears more often with X than independence predicts; conviction adds the direction, scoring how often the rule would be wrong if X and Y were independent', typicalRange: 'lift 1.2 to 3 as a floor; lift in the tens usually means a rare pair, so check the support behind it' },
      { name: 'max itemset length', role: 'Caps the depth of the lattice. Most deployed recommenders use pairs and triples, and the cap is also what bounds worst-case behaviour on very wide baskets', typicalRange: '2 to 4' },
      { name: 'item granularity', role: 'SKU, brand, or category. Coarser levels raise every support at the cost of specificity, and a taxonomy lets you mine across levels — the single most effective lever against a long tail of items too rare to ever clear minsup' },
      { name: 'algorithm', role: 'Apriori, Eclat, or FP-Growth. Same output; FP-Growth wins on dense data with many frequent items, Apriori and Eclat are simpler and competitive when minsup is high and baskets are short' },
    ],
    convergence:
      'Terminates and is exact: every itemset meeting the support floor is returned, every one that does not is not, and the answer is independent of algorithm, order and initialization — there is nothing to converge to and no local optimum to get stuck in. The failure modes are therefore about cost and meaning, not optimization. Cost: the worst case is exponential in the number of items, and in practice the runtime is governed almost entirely by minsup — a threshold set a little too low produces millions of frequent itemsets, and a single long basket of 40 items contributes up to 2^40 subsets. Rule explosion: the number of rules is far larger than the number of itemsets, since every frequent itemset of size k splits into 2^k − 2 candidate rules, and most of them are redundant restatements. Meaning: with thousands of candidate rules tested against a threshold, some clear it by chance, and the output carries no p-value or correction by default, so spurious rules are expected rather than exceptional. Hold out transactions, or apply a multiple-testing correction, before treating any rule as a finding.',
    complexity:
      'Worst case O(2^m) itemsets for m distinct items — a property of the output space, not of a bad implementation. Apriori makes one pass over the database per level, so up to L passes for the longest frequent itemset of length L, with candidate generation and the subset-membership prune dominating at low support. FP-Growth makes exactly two passes to build the tree, whose size is bounded by the total number of frequent-item occurrences and is usually far smaller thanks to prefix sharing, then recurses on conditional trees; memory is the tree, which is the binding constraint on dense data. Eclat stores m tid-bitsets of n/64 words each, and a support count is an AND plus a popcount. Rule generation costs O(F · 2^L) for F frequent itemsets of length up to L, which is why a cap on length matters even though mining itself is cheap.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'A transaction is an unordered set with no timestamp semantics, so there is no series to extrapolate and no target to predict — the output is a set of co-occurrence statements, not a forecast. The ordered cousin, sequential pattern mining (GSP, PrefixSpan), keeps order and is a different algorithm; and any seasonality in the rules appears only if you mine separate windows and compare them by hand.',
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Mine rules on a trusted-clean window, keep only the near-certain ones (confidence close to 1, high support), then score a new transaction by the rules it violates: the antecedent X is present but the consequent Y is absent. A transaction that breaks several strong rules, or one very strong rule, is the anomaly, and the broken rule is a human-readable explanation of why. It is an invariant-checking detector, not a density model, and it only catches violations of regularities that were frequent enough to be mined.',
        where: [
          'Configuration and log invariant mining: "service A started ⇒ service B started", with a missing consequent flagged as a fault',
          'Claims and billing audits, where a procedure code that almost always travels with another is billed without it',
          'Intrusion and policy checks over sets of flags or permissions, where a combination that never co-occurs in normal traffic appears',
        ],
        why: 'The appeal is explainability: the alert is a sentence an analyst can read and dispute, which a density score or a forest’s path length is not. The limitation is just as specific. It detects only the absence of an expected item, never the presence of an unexpected one, so a rare novel combination that violates no mined rule is invisible; and it inherits every weakness of the mining, including that a rule mined from contaminated data is a rule that encodes the anomaly as normal. Use it for known-structure data where invariants are the thing you care about, and a density or isolation method where novelty is.',
        featurization: [
          'Mine on a window confirmed clean, or the anomalies you are looking for become frequent and are learned as normal',
          'Keep only rules with confidence near 1 and ample support; a rule at 0.7 is violated by 30 percent of normal transactions',
          'Prefer closed or maximal itemsets and de-duplicate redundant rules, or one underlying violation is reported as dozens of alerts',
          'Weight each violated rule by its lift or conviction, so that violating a rule between rare items counts for more than violating one between common ones',
        ],
        evaluation:
          'Precision@k against confirmed incidents, with PR-AUC rather than ROC-AUC, and a per-rule false-positive rate on held-out clean data — a rule that fires on a few percent of normal baskets is a noise source regardless of its confidence on the training window. Compare against an isolation forest on the same data; if the rules add nothing, the invariants are not what is breaking.',
        pitfalls: [
          'Reading a missing consequent as an anomaly when it is simply an out-of-stock or a not-yet-logged event',
          'Rules mined from a window containing the incident, which rewrites the incident as the rule',
          'No coverage of novel items at all: an item never seen in mining belongs to no rule and so can never violate one',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Mining is search, not optimization, so the honest fit is as an INPUT to an optimizer. The rules supply the affinity coefficients — which pairs of products are bought together, with what lift — and a separate model uses them: shelf-adjacency or planogram layout as an assignment problem with affinity weights, or bundle selection as a knapsack over candidate bundles scored by lift and margin. The decision, its constraints and its objective live in that second stage; this one produces its data.',
        where: [
          'Retail store layout and shelf adjacency, where co-purchase affinity feeds a placement or assignment model',
          'Bundle and promotion design, where candidate bundles are the high-lift itemsets, ranked by margin',
          'Warehouse slotting, where items that ship together are placed near the pick path together',
        ],
        why: 'It is worth including only because the data it produces is the right shape for a combinatorial optimizer and expensive to get any other way; claiming more would be dishonest. The rules describe what people DID buy together under the existing layout and promotions, not what they would buy under a new one — a layout placing two items together changes the co-purchase rate it was based on. Treat the rules as a prior to be tested by experiment, and the optimizer as the entry that does the deciding.',
        featurization: [
          'Mine at the granularity of the decision: category-level rules to place aisles, SKU-level rules to place facings',
          'Attach margin and shelf space to each candidate itemset before it reaches the optimizer; support alone optimizes for volume',
          'Restrict to pairs and triples, the sizes a layout can physically act on',
        ],
        evaluation:
          'Not the rule metrics: the layout or bundle has to be evaluated by incremental revenue or attach rate in a controlled test against the existing arrangement. A rule table that looks excellent and moves no sales has described the data and not the lever.',
        pitfalls: [
          'Treating observed co-purchase as the effect of putting items together, which confounds layout with the existing layout',
          'Optimizing for support, which just rediscovers the best sellers and recommends putting milk next to bread',
          'Mining across stores with different assortments and layouts as though baskets were exchangeable',
        ],
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'The classic use: "frequently bought together". Mine rules over order baskets, index them by antecedent, and at request time take the items in the user’s current cart, look up rules whose antecedent is contained in it, and rank the consequents not already present by lift (or confidence for conservative lists). It is a rule-based item-to-item recommender that depends only on the current basket, so it needs no user history at all.',
        where: [
          'Cart-page and product-page "frequently bought together" modules in e-commerce',
          'Grocery and retail cross-sell suggestions at checkout and in coupon targeting',
          'Next-best-offer and bundle suggestions where the unit is an order, not a user profile',
          'Content and feature co-usage ("customers who use A also enable B") in software products',
        ],
        why: 'Pick this over a learned recommender when the signal is the current basket, when cold-start users are common (it needs nothing but the cart), and when the recommendation has to be explained in one line to a merchandiser. It is also trivially cheap to serve. Choose collaborative filtering instead when you have rich per-user history, because the contrast is exact: association rules compute the same recommendations for every user holding the same basket, and so contain no personalization at all, whereas matrix factorization and item-based nearest neighbours tailor to the individual. The similarity here is set overlap — Jaccard, its asymmetric relatives confidence and lift, over the sets of baskets in which items occur — which is why no embedding, normalization or coordinate system is involved. Cosine on binary vectors is close kin to lift, and swapping to a Euclidean distance on basket indicator vectors would make large baskets look far from everything.',
        featurization: [
          'Define the transaction deliberately: order, session, or customer-day each give different rules, and a mismatch with the serving context is the most common source of useless output',
          'Collapse quantity to presence, and drop non-product items such as bags, shipping and gift wrap before mining',
          'De-duplicate near-identical SKUs (colour, size variants) up to a parent item, or support is split across variants and nothing clears minsup',
          'Remove or down-weight blockbuster items, which otherwise appear as the consequent of every rule',
        ],
        evaluation:
          'Offline: hit-rate@k or recall@k by holding one item out of each held-out basket and checking whether it is in the top-k suggestions, against a top-popular baseline — which a rule set must beat, and often barely does on short lists. Online: attach rate and incremental revenue in an A/B test, since an offline hit on an item the shopper would have bought anyway is not value.',
        pitfalls: [
          'High-confidence rules whose consequent is the most popular item, which any popularity baseline already recommends',
          'Recommending items complementary in the data because the layout or a promotion put them together',
          'Stale rules after a catalogue change, serving suggestions for discontinued or out-of-stock products',
          'Rule explosion handed straight to a merchandiser who cannot review tens of thousands of lines',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Mine class association rules from labelled cases: itemsets of categorical attributes and behavioural flags (new device, mismatched billing country, high-value first order) restricted to have the confirmed-fraud label as consequent. The surviving rules, ranked by lift against the base fraud rate, become candidate screening rules for a rule engine or an analyst queue, each one human-readable and auditable.',
        where: [
          'Candidate rule discovery for payment-fraud rule engines, reviewed by an analyst before deployment',
          'Insurance and claims triage, where co-occurring attributes of confirmed-abuse cases form screening heuristics',
          'Compliance monitoring, where combinations of flags that preceded past violations are surfaced',
        ],
        why: 'It is viable rather than primary because a gradient-boosted tree or a logistic regression on the same attributes will usually beat a rule set at detection, and the case for rules is regulatory and operational: a rule is auditable, reviewable line by line, and can be shipped into an existing rule engine without a model-serving stack. The failure mode to expect is class imbalance — fraud is rare, so a useful rule has low absolute support and minsup must be set on the fraud-only subset, which makes spurious rules far likelier.',
        featurization: [
          'Discretize continuous attributes into bands before mining, since the method sees only presence of items; the band edges are a modelling decision that changes the rules',
          'Mine on the fraud subset against the base population and rank by lift rather than confidence, since the consequent is the rare class',
          'Use a time-ordered split and only labels that have matured — chargebacks arrive weeks after the transaction',
        ],
        evaluation:
          'Precision and recall at the action threshold on a time-forward holdout, plus the rule’s false-positive volume in absolute terms, which is what an analyst queue feels. Compare against a tree ensemble on the same features; a rule is worth keeping when it is auditable and nearly as good, not when it is merely interpretable.',
        pitfalls: [
          'Multiple-testing: thousands of candidate rules on a rare class yields rules that fit noise, so validate on later data',
          'Rules that encode how the previous system flagged cases, learning the old rule engine rather than the fraud',
          'Adversaries adapting to a published rule, which decays faster than a model’s opaque decision boundary',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Mining is the training. It is a batch job whose cost is set almost entirely by minsup and by basket length rather than by the row count: millions of short baskets mine in seconds to minutes, while a low support floor on long baskets can run out of memory in a candidate set or a conditional tree. Cap the itemset length, set support as an absolute count, and mine at a coarser item level first. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'A lookup: given a basket, find rules whose antecedent is a subset of it and rank their consequents. Precompute for each item the top-N consequents, or index rules by antecedent items, and serving is a few hash lookups — microseconds, with a model that is a table of a few hundred thousand rules. Pairs-only rules reduce to an item-to-item neighbour list, which is cheap to cache and trivial to explain.',
    retrainingCadence:
      'Nightly to weekly for a retail catalogue, and on every assortment change for a fast-moving one, since the rule table is a snapshot of co-purchase and goes stale with seasons, promotions and new products. Mining is cheap enough that the constraint is the review process for the rules, not the compute.',
    driftAndMonitoring: [
      'Track the support and confidence of the top rules on fresh transactions against their mined values — a rule whose measured confidence has dropped is no longer true',
      'Monitor the share of live baskets that match at least one rule (coverage), which falls when the catalogue changes faster than the rules',
      'Watch the number of rules per mining run; a sudden jump means a threshold, item-mapping or data change rather than new insight',
      'Measure attach rate or click-through for rule-driven suggestions against a popularity baseline, since rules can decay into recommending bestsellers',
    ],
    productionGotchas: [
      'Rule explosion: report only closed or maximal itemsets and de-duplicate redundant rules (a rule is redundant if a more general antecedent already attains the same confidence), or no human can review the output',
      'The definition of a transaction — order, session, customer-day — silently decides the rules, and the mining unit must match the serving unit',
      'A single very long basket (a B2B order of 200 lines) can blow up the lattice; cap basket length or sample before mining',
      'Item identifiers must be stable across mining and serving; remapping SKUs invalidates every stored rule without any error',
      'Popularity bias: the top rules are dominated by best sellers, so rank by lift or conviction and apply a minimum support for the consequent as well',
      'Spurious rules from multiple testing are normal; validate on a held-out period before promoting any rule, and never present a rule as a causal effect',
    ],
  },

  assumptions: [
    'Transactions are SETS: quantity, order and repeat purchases are discarded before mining, which is only acceptable when presence is what matters',
    'Items are atomic symbols with no internal structure — there are no coordinates, and similarity is nothing more than co-occurrence overlap',
    'Frequency is a proxy for importance, so a valuable but rare combination is invisible below minsup (the rare-item problem), however strongly the items are associated',
    'Transactions are exchangeable and the co-occurrence pattern is stable across the mined window, so the rules transfer to future baskets',
    'The item vocabulary and granularity are fixed and consistent: a SKU that changes ID or a variant split across versions silently dilutes support',
    'The thresholds are meaningful, which they are not by default — there is no statistical principle that fixes minsup or minconf, so they encode a business decision about how many rules can be acted on',
  ],

  pros: [
    {
      point: 'Exact and exhaustive: every rule meeting the thresholds is returned',
      context:
        'No initialization, no local optima and no randomness — the same data and thresholds always give the same rules, which makes the method easy to test and to audit. The guarantee is about the search; whether the rules are TRUE of future data is a separate matter the algorithm is silent on.',
    },
    {
      point: 'Output is a human-readable sentence, not a coefficient',
      context:
        'A merchandiser, a compliance reviewer or a fraud analyst can read, dispute and veto each rule, and ship it into a rule engine without a model-serving stack. Decisive in regulated or review-heavy settings; irrelevant when only predictive accuracy is graded.',
    },
    {
      point: 'Needs no labels, no user history and no feature engineering beyond defining a transaction',
      context:
        'A basket and an item list are the whole input, so it works on cold-start users, anonymous sessions and tabular categorical data alike. It stops being an advantage the moment per-user history is rich enough for collaborative filtering to personalize.',
    },
    {
      point: 'Downward closure makes an exponential space tractable in practice',
      context:
        'Pruning whole upward cones the moment a subset fails means the work follows what is frequent rather than what is possible, and FP-Growth and Eclat reduce the constant factors further. It holds when minsup is set sensibly and baskets are short; it does not rescue a threshold set too low.',
    },
  ],

  cons: [
    {
      point: 'Rule explosion: the output is usually far too large to use',
      context:
        'A frequent itemset of size k splits into 2^k − 2 candidate rules and most are redundant restatements of each other. Closed or maximal itemsets, a lift floor, a length cap and redundancy elimination are all required, and without them the table is a data dump rather than an answer.',
    },
    {
      point: 'Spurious rules from multiple testing, with no significance attached',
      context:
        'Test tens of thousands of candidate rules against a threshold and some clear it by chance, yet the output carries no p-value or correction. Validate on a held-out period or apply a correction such as Bonferroni or a permutation test before treating any rule as real, especially on rare classes.',
    },
    {
      point: 'Popularity bias: confidence rewards popular consequents',
      context:
        'If Y is in 80 percent of baskets then nearly any X implies it with confidence near 0.8. Lift (observed over independent expectation) and conviction correct for this; a table ranked by confidence is mostly a list of best sellers.',
    },
    {
      point: 'No personalization, and no signal below the support floor',
      context:
        'Two users holding the same basket receive the same suggestions, whatever their history, and the long tail of rare items never clears minsup, so the catalogue it covers is the head. Matrix factorization and item-based nearest neighbours address the first; taxonomies or coarser item levels address the second, only partly.',
    },
    {
      point: 'Co-occurrence is not causation, and the rules are a snapshot',
      context:
        'Items that sell together because a promotion or the store layout put them together will not keep selling together when moved, so a rule is evidence about the past and a poor basis for an intervention without an experiment.',
    },
  ],

  relatedSlugs: [
    'matrix-factorization',
    'content-based-filtering',
    'k-nearest-neighbours',
    'naive-bayes',
    'hierarchical-clustering',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Association rules by Apriori - support counting and rule generation, literally.

A transaction is a SET of items. support(S) is the fraction of transactions that
contain S, and every other quantity here is a ratio of supports. The search is
level-wise: frequent k-itemsets generate (k+1)-candidates, a candidate with any
infrequent subset is discarded unseen (downward closure), and the survivors are
counted in one pass over the data.
"""

from itertools import combinations


def support(itemset, transactions):
    """Fraction of transactions that contain every item of itemset."""
    containing = 0
    for transaction in transactions:
        if itemset <= transaction:
            containing += 1
    return containing / len(transactions)


def frequent_itemsets(transactions, min_support):
    """Return {frozenset: support} for every itemset with support >= min_support."""
    items = set()
    for transaction in transactions:
        for item in transaction:
            items.add(item)

    frequent = {}
    level = []
    for item in sorted(items):
        candidate = frozenset([item])
        candidate_support = support(candidate, transactions)
        if candidate_support >= min_support:
            frequent[candidate] = candidate_support
            level.append(candidate)

    size = 1
    while level:
        # Join: two frequent k-itemsets whose union has k+1 items form a candidate.
        candidates = set()
        for left in level:
            for right in level:
                union = left | right
                if len(union) == size + 1:
                    candidates.add(union)

        next_level = []
        for candidate in candidates:
            # Prune by downward closure: every k-subset must already be frequent.
            all_subsets_frequent = True
            for item in candidate:
                if (candidate - {item}) not in frequent:
                    all_subsets_frequent = False
                    break
            if not all_subsets_frequent:
                continue

            candidate_support = support(candidate, transactions)
            if candidate_support >= min_support:
                frequent[candidate] = candidate_support
                next_level.append(candidate)

        level = next_level
        size += 1

    return frequent


def generate_rules(frequent, min_confidence):
    """Split each frequent itemset into every antecedent => consequent pair."""
    rules = []
    for itemset, itemset_support in frequent.items():
        if len(itemset) < 2:
            continue

        members = sorted(itemset)
        for size in range(1, len(members)):
            for antecedent_items in combinations(members, size):
                antecedent = frozenset(antecedent_items)
                consequent = itemset - antecedent

                # Downward closure guarantees both subsets were counted.
                confidence = itemset_support / frequent[antecedent]
                if confidence < min_confidence:
                    continue

                lift = confidence / frequent[consequent]
                if confidence == 1.0:
                    conviction = float("inf")
                else:
                    conviction = (1.0 - frequent[consequent]) / (1.0 - confidence)

                # Jaccard of the two transaction-id sets: the symmetric relative
                # of confidence, normalized by the union rather than by X alone.
                jaccard = itemset_support / (
                    frequent[antecedent] + frequent[consequent] - itemset_support
                )

                rules.append(
                    {
                        "antecedent": antecedent,
                        "consequent": consequent,
                        "support": itemset_support,
                        "confidence": confidence,
                        "lift": lift,
                        "conviction": conviction,
                        "jaccard": jaccard,
                    }
                )

    return rules`,
        profile: 'One full scan of the database per candidate per level, in interpreter loops over Python sets; the candidate set, not the data, is what blows up at low support.',
      },
      'make-it-right': {
        code: `"""Association rules - typed Apriori with prefix join, subset prune, immutable rules."""

from __future__ import annotations

import math
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from itertools import combinations

Itemset = tuple[int, ...]   # sorted ascending, no duplicates


@dataclass(frozen=True)
class Rule:
    antecedent: Itemset
    consequent: Itemset
    support: float
    confidence: float
    lift: float
    conviction: float
    jaccard: float


@dataclass(frozen=True)
class MiningResult:
    counts: dict[Itemset, int]
    n_transactions: int
    rules: tuple[Rule, ...]


def _join(level: Sequence[Itemset]) -> list[Itemset]:
    """F_k x F_k join on a shared (k-1)-prefix.

    Items are kept sorted and the level is lexicographically sorted, so every
    candidate is generated exactly once, and the scan can stop at the first
    tuple whose prefix differs rather than comparing all pairs.
    """
    candidates: list[Itemset] = []
    for index, left in enumerate(level):
        for right in level[index + 1 :]:
            if left[:-1] != right[:-1]:
                break
            candidates.append(left + (right[-1],))
    return candidates


def _all_subsets_frequent(candidate: Itemset, previous: set[Itemset]) -> bool:
    """Downward closure: every k-subset of a (k+1)-candidate must be frequent."""
    return all(
        candidate[:skip] + candidate[skip + 1 :] in previous
        for skip in range(len(candidate))
    )


def frequent_itemsets(
    transactions: Sequence[frozenset[int]],
    min_support: float,
    max_length: int = 4,
) -> dict[Itemset, int]:
    """Counts of every itemset with support >= min_support. Raises ValueError."""
    if not transactions:
        raise ValueError("need at least one transaction")
    if not 0.0 < min_support <= 1.0:
        raise ValueError(f"min_support must lie in (0, 1], got {min_support}")
    if max_length < 1:
        raise ValueError(f"max_length must be at least 1, got {max_length}")

    min_count = math.ceil(min_support * len(transactions))

    singles: dict[int, int] = {}
    for transaction in transactions:
        for item in transaction:
            singles[item] = singles.get(item, 0) + 1

    counts: dict[Itemset, int] = {
        (item,): count for item, count in sorted(singles.items()) if count >= min_count
    }
    level: list[Itemset] = list(counts)

    # Bounded by max_length: the lattice is exponential, so depth is a guard.
    for _ in range(max_length - 1):
        if not level:
            break

        previous = set(level)
        next_level: list[Itemset] = []
        for candidate in _join(level):
            if not _all_subsets_frequent(candidate, previous):
                continue
            candidate_set = frozenset(candidate)
            count = sum(1 for transaction in transactions if candidate_set <= transaction)
            if count >= min_count:
                counts[candidate] = count
                next_level.append(candidate)
        level = next_level

    return counts


def generate_rules(
    counts: dict[Itemset, int],
    n_transactions: int,
    min_confidence: float,
    min_lift: float = 1.0,
) -> tuple[Rule, ...]:
    """Every rule clearing both floors, ranked by lift then confidence."""
    if not 0.0 <= min_confidence <= 1.0:
        raise ValueError(f"min_confidence must lie in [0, 1], got {min_confidence}")

    rules: list[Rule] = []
    for itemset, itemset_count in counts.items():
        if len(itemset) < 2:
            continue

        for size in range(1, len(itemset)):
            for antecedent in combinations(itemset, size):
                consequent = tuple(item for item in itemset if item not in antecedent)
                antecedent_count = counts.get(antecedent)
                consequent_count = counts.get(consequent)
                if antecedent_count is None or consequent_count is None:
                    continue   # unreachable under downward closure; fail soft

                confidence = itemset_count / antecedent_count
                consequent_support = consequent_count / n_transactions
                lift = confidence / consequent_support
                if confidence < min_confidence or lift < min_lift:
                    continue

                conviction = (
                    math.inf
                    if confidence >= 1.0
                    else (1.0 - consequent_support) / (1.0 - confidence)
                )
                rules.append(
                    Rule(
                        antecedent=antecedent,
                        consequent=consequent,
                        support=itemset_count / n_transactions,
                        confidence=confidence,
                        lift=lift,
                        conviction=conviction,
                        jaccard=itemset_count
                        / (antecedent_count + consequent_count - itemset_count),
                    )
                )

    rules.sort(key=lambda rule: (rule.lift, rule.confidence), reverse=True)
    return tuple(rules)


def mine(
    baskets: Iterable[Iterable[int]],
    min_support: float,
    min_confidence: float,
    max_length: int = 4,
) -> MiningResult:
    transactions = [frozenset(basket) for basket in baskets]
    counts = frequent_itemsets(transactions, min_support, max_length)
    rules = generate_rules(counts, len(transactions), min_confidence)
    return MiningResult(counts=counts, n_transactions=len(transactions), rules=rules)`,
        rationale:
          'The structural change is the join. The work version compares every pair of frequent itemsets and deduplicates through a set; here itemsets are sorted tuples and the level is kept lexicographically sorted, so the classic F_k × F_k join on a shared prefix generates each candidate exactly once and stops scanning at the first prefix mismatch. The prune becomes a membership test against the previous level, depth is bounded by max_length because the lattice is exponential, and supports are kept as integer counts so thresholds compare exactly rather than through float division. Results are frozen dataclasses with lift, conviction and Jaccard attached, rules are ranked by lift rather than left in dict order, and every parameter is validated before any counting starts.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'Python standard library',
        profile: 'Still one scan of the transactions per candidate per level, but with each candidate generated once and the prune a single hash probe per subset.',
      },
      'make-it-fast': {
        code: `"""Association rules - vertical bitsets, depth-first Eclat, preallocated scratch.

Horizontal Apriori rescans every transaction for every candidate. Storing the
data VERTICALLY inverts that: item i keeps one bit per transaction saying
whether it is present, so the support of an itemset is the popcount of the AND
of its items' bitsets. No candidate is counted by scanning the data again.

Needs NumPy >= 2.0 for np.bitwise_count.
"""

from itertools import combinations

import numpy as np
from numpy.typing import NDArray

Bitsets = NDArray[np.uint64]


def pack_vertical(transactions: list[list[int]], n_items: int) -> Bitsets:
    """(n_items, words): row i is item i's transaction-id bitset."""
    n = len(transactions)
    lengths = np.fromiter((len(t) for t in transactions), dtype=np.int64, count=n)
    rows = np.concatenate([np.asarray(t, dtype=np.int64) for t in transactions])
    columns = np.repeat(np.arange(n, dtype=np.int64), lengths)

    words = (n + 63) // 64
    dense = np.zeros((n_items, words * 64), dtype=np.uint8)
    dense[rows, columns] = 1          # scatter every (item, transaction) at once
    packed = np.packbits(dense, axis=1, bitorder="little")
    return np.ascontiguousarray(packed).view(np.uint64)


class EclatMiner:
    """Depth-first frequent-itemset mining over a vertical bitset index."""

    def __init__(self, vertical: Bitsets, min_count: int, max_length: int) -> None:
        if max_length < 1:
            raise ValueError(f"max_length must be at least 1, got {max_length}")
        self._vertical = np.ascontiguousarray(vertical, dtype=np.uint64)
        self._min_count = min_count
        self._max_length = max_length
        # One scratch bitset per depth, allocated once: the search never
        # allocates, and a child never overwrites its parent's buffer.
        self._scratch = np.empty(
            (max_length + 1, self._vertical.shape[1]), dtype=np.uint64
        )
        self.found: dict[tuple[int, ...], int] = {}

    def mine(self) -> dict[tuple[int, ...], int]:
        counts = np.bitwise_count(self._vertical).sum(axis=1)
        frequent = [int(item) for item in np.flatnonzero(counts >= self._min_count)]

        for position, item in enumerate(frequent):
            self.found[(item,)] = int(counts[item])
            np.copyto(self._scratch[1], self._vertical[item])
            self._extend((item,), 1, frequent[position + 1 :])
        return self.found

    def _extend(self, prefix: tuple[int, ...], depth: int, tail: list[int]) -> None:
        if depth >= self._max_length or not tail:
            return

        parent = self._scratch[depth]
        child = self._scratch[depth + 1]

        # Pass 1: which tail items survive? Each AND writes into the SAME child
        # buffer and only the count is kept, so no per-item array is retained.
        survivors: list[int] = []
        for item in tail:
            np.bitwise_and(parent, self._vertical[item], out=child)
            if int(np.bitwise_count(child).sum()) >= self._min_count:
                survivors.append(item)

        # Pass 2: recompute each survivor's bitset and recurse. Siblings share
        # the buffer, so the intersection is redone rather than stored.
        for position, item in enumerate(survivors):
            np.bitwise_and(parent, self._vertical[item], out=child)
            extended = prefix + (item,)
            self.found[extended] = int(np.bitwise_count(child).sum())
            self._extend(extended, depth + 1, survivors[position + 1 :])


def generate_rules(
    counts: dict[tuple[int, ...], int],
    n_transactions: int,
    min_confidence: float,
    min_lift: float = 1.0,
) -> list[tuple[tuple[int, ...], tuple[int, ...], float, float]]:
    """(antecedent, consequent, confidence, lift); output-bound, so left in Python."""
    rules = []
    for itemset, itemset_count in counts.items():
        for size in range(1, len(itemset)):
            for antecedent in combinations(itemset, size):
                consequent = tuple(item for item in itemset if item not in antecedent)
                confidence = itemset_count / counts[antecedent]
                lift = confidence * n_transactions / counts[consequent]
                if confidence >= min_confidence and lift >= min_lift:
                    rules.append((antecedent, consequent, confidence, lift))
    rules.sort(key=lambda rule: rule[3], reverse=True)
    return rules`,
        rationale:
          'The data layout changes, and with it the whole cost model. Horizontal Apriori scans every transaction for every candidate; here each item stores one bit per transaction, so the support of an itemset is a popcount over the AND of its items’ bitsets and the database is never rescanned. Building the index replaces the per-transaction Python loop with one scatter and a packbits. The search becomes depth-first (Eclat) so a prefix’s intersection is reused by every extension of it, with one scratch bitset per depth allocated up front and written in place. Siblings share a buffer, so a survivor’s intersection is recomputed rather than stored — one extra AND to keep memory at depth times words instead of siblings times words. Rule generation is output-bound, so it stays in plain Python.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Support counting is no longer a loop over transactions: 64 transactions are tested per word by an AND, and building the index is one fancy-indexed scatter plus packbits instead of a per-transaction loop.',
            tradeoff: 'The dense uint8 staging array costs n_items times n bytes before packing, which is the memory ceiling on a wide catalogue — pack in chunks or build from a sparse form there.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'The index is one C-contiguous uint64 matrix, so each item’s bitset is a contiguous row and every AND and popcount streams sequential memory with no dtype conversion.',
            tradeoff: 'A bitset index is inefficient on very sparse items, where a sorted list of transaction ids is far smaller than n/64 words — hybrid representations exist for exactly that long tail.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'One scratch bitset per depth is allocated up front and every intersection is written with out=, so the recursion performs no allocation at all, however many itemsets it visits.',
            tradeoff: 'Depth-indexed buffers are shared by siblings, so survivors’ intersections are recomputed rather than cached, and the miner holds mutable state — it is not reentrant or thread-safe.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'Each support count is n/64 word ANDs plus popcounts and no database scan; recursion allocates nothing. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Association rules by Apriori - support counting and rule generation, literally.
#include <cstddef>
#include <map>
#include <set>
#include <vector>

using Itemset = std::set<int>;
using Transaction = std::set<int>;

struct Rule {
  Itemset antecedent;
  Itemset consequent;
  double support;
  double confidence;
  double lift;
};

// support(S): the fraction of transactions that contain every item of S.
double Support(const Itemset& itemset, const std::vector<Transaction>& transactions) {
  std::size_t containing = 0;
  for (const Transaction& transaction : transactions) {
    bool contains_all = true;
    for (int item : itemset) {
      if (transaction.count(item) == 0) {
        contains_all = false;
        break;
      }
    }
    if (contains_all) ++containing;
  }
  return static_cast<double>(containing) / static_cast<double>(transactions.size());
}

std::map<Itemset, double> FrequentItemsets(const std::vector<Transaction>& transactions,
                                           double min_support) {
  std::set<int> items;
  for (const Transaction& transaction : transactions) {
    for (int item : transaction) items.insert(item);
  }

  std::map<Itemset, double> frequent;
  std::vector<Itemset> level;
  for (int item : items) {
    const Itemset candidate{item};
    const double candidate_support = Support(candidate, transactions);
    if (candidate_support >= min_support) {
      frequent[candidate] = candidate_support;
      level.push_back(candidate);
    }
  }

  std::size_t size = 1;
  while (!level.empty()) {
    // Join: two frequent k-itemsets whose union has k+1 items form a candidate.
    std::set<Itemset> candidates;
    for (const Itemset& left : level) {
      for (const Itemset& right : level) {
        Itemset merged = left;
        merged.insert(right.begin(), right.end());
        if (merged.size() == size + 1) candidates.insert(merged);
      }
    }

    std::vector<Itemset> next_level;
    for (const Itemset& candidate : candidates) {
      // Prune by downward closure: every k-subset must already be frequent.
      bool all_subsets_frequent = true;
      for (int item : candidate) {
        Itemset subset = candidate;
        subset.erase(item);
        if (frequent.count(subset) == 0) {
          all_subsets_frequent = false;
          break;
        }
      }
      if (!all_subsets_frequent) continue;

      const double candidate_support = Support(candidate, transactions);
      if (candidate_support >= min_support) {
        frequent[candidate] = candidate_support;
        next_level.push_back(candidate);
      }
    }

    level = next_level;
    ++size;
  }
  return frequent;
}

std::vector<Rule> GenerateRules(const std::map<Itemset, double>& frequent,
                                double min_confidence) {
  std::vector<Rule> rules;
  for (const auto& [itemset, itemset_support] : frequent) {
    if (itemset.size() < 2) continue;

    const std::vector<int> members(itemset.begin(), itemset.end());
    const std::size_t full = std::size_t{1} << members.size();

    // Every non-empty proper subset is an antecedent: a bitmask over the members.
    for (std::size_t mask = 1; mask + 1 < full; ++mask) {
      Itemset antecedent;
      Itemset consequent;
      for (std::size_t bit = 0; bit < members.size(); ++bit) {
        if (((mask >> bit) & 1U) != 0U) {
          antecedent.insert(members[bit]);
        } else {
          consequent.insert(members[bit]);
        }
      }

      // Downward closure guarantees both subsets were counted.
      const double confidence = itemset_support / frequent.at(antecedent);
      if (confidence < min_confidence) continue;

      const double lift = confidence / frequent.at(consequent);
      rules.push_back(Rule{antecedent, consequent, itemset_support, confidence, lift});
    }
  }
  return rules;
}`,
        profile: 'A full scan per candidate per level through node-based std::set lookups, with a heap allocation for every itemset copy.',
      },
      'make-it-right': {
        code: `// Association rules - sorted-vector itemsets, prefix join, validated input, no copies of the data.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <functional>
#include <map>
#include <span>
#include <stdexcept>
#include <vector>

using Item = int;
using Itemset = std::vector<Item>;   // sorted ascending, no duplicates

class Apriori {
 public:
  // Rule generation enumerates 2^k antecedents, so the itemset width is capped.
  static constexpr std::size_t kMaxLength = 20;

  Apriori(double min_support, std::size_t max_length)
      : min_support_(min_support), max_length_(max_length) {
    if (!(min_support_ > 0.0 && min_support_ <= 1.0)) {
      throw std::invalid_argument("min_support must lie in (0, 1]");
    }
    if (max_length_ == 0 || max_length_ > kMaxLength) {
      throw std::invalid_argument("max_length must lie in [1, kMaxLength]");
    }
  }

  // Every transaction must be strictly ascending. Validated before any
  // counting or allocation, so a malformed basket cannot corrupt the counts.
  [[nodiscard]] std::map<Itemset, std::size_t> Mine(
      std::span<const Itemset> transactions) const {
    if (transactions.empty()) throw std::invalid_argument("no transactions");
    for (const Itemset& transaction : transactions) {
      const bool is_strictly_ascending =
          std::adjacent_find(transaction.begin(), transaction.end(),
                             std::greater_equal<Item>{}) == transaction.end();
      if (!is_strictly_ascending) {
        throw std::invalid_argument("transaction is not sorted and duplicate-free");
      }
    }

    const auto min_count = static_cast<std::size_t>(
        std::ceil(min_support_ * static_cast<double>(transactions.size())));

    std::map<Item, std::size_t> singles;
    for (const Itemset& transaction : transactions) {
      for (const Item item : transaction) ++singles[item];
    }

    std::map<Itemset, std::size_t> counts;
    std::vector<Itemset> level;   // lexicographically sorted
    for (const auto& [item, count] : singles) {
      if (count < min_count) continue;
      counts.emplace(Itemset{item}, count);
      level.push_back(Itemset{item});
    }

    for (std::size_t length = 1; length < max_length_ && !level.empty(); ++length) {
      std::vector<Itemset> next_level;

      for (std::size_t left = 0; left < level.size(); ++left) {
        for (std::size_t right = left + 1; right < level.size(); ++right) {
          // Join on a shared (k-1)-prefix; the level is sorted, so the first
          // mismatch ends this left item's candidates.
          if (!std::equal(level[left].begin(), level[left].end() - 1, level[right].begin())) {
            break;
          }
          Itemset candidate = level[left];
          candidate.push_back(level[right].back());

          if (!AllSubsetsFrequent(candidate, level)) continue;

          const std::size_t count = CountContaining(candidate, transactions);
          if (count >= min_count) {
            counts.emplace(candidate, count);
            next_level.push_back(std::move(candidate));
          }
        }
      }
      level = std::move(next_level);
    }
    return counts;
  }

 private:
  // Downward closure: each k-subset of a (k+1)-candidate must be frequent.
  [[nodiscard]] static bool AllSubsetsFrequent(const Itemset& candidate,
                                               const std::vector<Itemset>& level) {
    Itemset subset;
    subset.reserve(candidate.size() - 1);
    for (std::size_t skip = 0; skip < candidate.size(); ++skip) {
      subset.clear();
      for (std::size_t position = 0; position < candidate.size(); ++position) {
        if (position != skip) subset.push_back(candidate[position]);
      }
      if (!std::binary_search(level.begin(), level.end(), subset)) return false;
    }
    return true;
  }

  [[nodiscard]] static std::size_t CountContaining(const Itemset& candidate,
                                                   std::span<const Itemset> transactions) {
    return static_cast<std::size_t>(std::count_if(
        transactions.begin(), transactions.end(), [&candidate](const Itemset& transaction) {
          return std::includes(transaction.begin(), transaction.end(), candidate.begin(),
                               candidate.end());
        }));
  }

  double min_support_;
  std::size_t max_length_;
};`,
        rationale:
          'Itemsets become sorted std::vector<int> instead of node-based std::set<int>, which turns every copy, comparison and subset test into a walk over contiguous memory instead of a pointer chase. The join then exploits the ordering: the level is lexicographically sorted, so candidates sharing a (k-1)-prefix are adjacent and the scan breaks at the first mismatch instead of comparing every pair. Subset checks use std::includes over two sorted ranges rather than a hash probe per item, and the prune is a binary search in the previous level. The constructor and Mine validate everything — support range, itemset width, and that each transaction really is sorted and duplicate-free — before any counting, so malformed input fails fast. The kMaxLength cap is a guard against the 2^k blow-up in rule generation, not a style choice.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
          'No raw new/delete; std::vector and smart pointers instead',
        ],
        profile: 'Contiguous sorted vectors with prefix-join candidate generation; each count is a std::includes merge over two sorted ranges rather than hash probes. Still scans the transactions per candidate.',
      },
      'make-it-fast': {
        code: `// Association rules - vertical tid-bitsets, fused AND+popcount, OpenMP over top-level items.
// Build: g++ -std=c++20 -O3 -march=native -fopenmp
// -march=native lets std::popcount compile to the POPCNT instruction.
#include <bit>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

#include <omp.h>

struct FrequentItemset {
  std::vector<std::uint32_t> items;
  std::uint32_t count;
};

// Row-major (n_items, words): an item's transaction-id bitset is one contiguous row.
class VerticalIndex {
 public:
  VerticalIndex(std::size_t n_items, std::size_t n_transactions)
      : n_items_(n_items), words_((n_transactions + 63) / 64), bits_(n_items * words_, 0) {}

  void Set(std::size_t item, std::size_t tid) {
    bits_[item * words_ + tid / 64] |= std::uint64_t{1} << (tid % 64);
  }
  [[nodiscard]] std::span<const std::uint64_t> Row(std::size_t item) const {
    return {bits_.data() + item * words_, words_};
  }
  [[nodiscard]] std::size_t n_items() const noexcept { return n_items_; }
  [[nodiscard]] std::size_t words() const noexcept { return words_; }

 private:
  std::size_t n_items_;
  std::size_t words_;
  std::vector<std::uint64_t> bits_;
};

// Fused: the intersection is counted as it is produced and never written, so the
// many candidates that fail the support test cost no memory traffic beyond the reads.
inline std::uint32_t AndCount(std::span<const std::uint64_t> a, std::span<const std::uint64_t> b) {
  std::uint32_t total = 0;
  for (std::size_t word = 0; word < a.size(); ++word) {
    total += static_cast<std::uint32_t>(std::popcount(a[word] & b[word]));
  }
  return total;
}

inline void AndInto(std::span<const std::uint64_t> a, std::span<const std::uint64_t> b,
                    std::vector<std::uint64_t>& out) {
  for (std::size_t word = 0; word < a.size(); ++word) out[word] = a[word] & b[word];
}

void Extend(const VerticalIndex& index, std::vector<std::uint32_t>& prefix,
            std::span<const std::uint64_t> prefix_bits, std::span<const std::uint32_t> tail,
            std::uint32_t min_count, std::size_t max_length, std::vector<FrequentItemset>& out) {
  if (prefix.size() >= max_length) return;

  // Pass 1: count only. A failing candidate never materializes a bitset.
  std::vector<std::uint32_t> survivors;
  std::vector<std::uint32_t> survivor_counts;
  for (const std::uint32_t item : tail) {
    const std::uint32_t count = AndCount(prefix_bits, index.Row(item));
    if (count < min_count) continue;
    survivors.push_back(item);
    survivor_counts.push_back(count);
  }

  // Pass 2: materialize the child only for survivors, then recurse.
  std::vector<std::uint64_t> child(prefix_bits.size());
  for (std::size_t position = 0; position < survivors.size(); ++position) {
    AndInto(prefix_bits, index.Row(survivors[position]), child);
    prefix.push_back(survivors[position]);
    out.push_back({prefix, survivor_counts[position]});
    Extend(index, prefix, child, std::span<const std::uint32_t>(survivors).subspan(position + 1),
           min_count, max_length, out);
    prefix.pop_back();
  }
}

std::vector<FrequentItemset> Mine(const VerticalIndex& index, std::uint32_t min_count,
                                  std::size_t max_length) {
  std::vector<std::uint32_t> items;
  std::vector<std::uint32_t> item_counts;
  for (std::size_t item = 0; item < index.n_items(); ++item) {
    std::uint32_t count = 0;
    for (const std::uint64_t word : index.Row(item)) {
      count += static_cast<std::uint32_t>(std::popcount(word));
    }
    if (count < min_count) continue;
    items.push_back(static_cast<std::uint32_t>(item));
    item_counts.push_back(count);
  }

  std::vector<std::vector<FrequentItemset>> per_thread(
      static_cast<std::size_t>(omp_get_max_threads()));

  // Top-level subtrees are independent, and wildly unequal in size: item 0's tail
  // holds every other item, the last item's holds none. Dynamic scheduling is not
  // optional here.
#pragma omp parallel for schedule(dynamic)
  for (std::ptrdiff_t position = 0; position < static_cast<std::ptrdiff_t>(items.size());
       ++position) {
    auto& out = per_thread[static_cast<std::size_t>(omp_get_thread_num())];
    const std::uint32_t item = items[static_cast<std::size_t>(position)];

    std::vector<std::uint32_t> prefix{item};
    out.push_back({prefix, item_counts[static_cast<std::size_t>(position)]});
    Extend(index, prefix, index.Row(item),
           std::span<const std::uint32_t>(items).subspan(static_cast<std::size_t>(position) + 1),
           min_count, max_length, out);
  }

  std::vector<FrequentItemset> merged;
  for (auto& part : per_thread) {
    merged.insert(merged.end(), std::make_move_iterator(part.begin()),
                  std::make_move_iterator(part.end()));
  }
  return merged;
}`,
        rationale:
          'The layout changes from horizontal to vertical: each item owns a contiguous row of transaction bits, so the support of a union is the popcount of an AND, and the database is never rescanned. Counting is then fused with the intersection — a candidate that fails the support test, which is most of them, is counted word by word and never written anywhere — and a child bitset is materialized only for survivors, in a second pass. Top-level items root independent subtrees of wildly different sizes, so they are distributed across threads with dynamic scheduling and per-thread output vectors that merge once at the end, with no lock on the hot path.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'AndCount computes the AND and its popcount in a single pass over two rows without writing the intersection, so the failing majority of candidates generate no stores at all and only survivors pay for a materialized bitset.',
            tradeoff: 'A surviving candidate’s intersection is computed twice, once to count and once to materialize, trading extra arithmetic for the stores avoided; it loses when nearly every candidate survives, which is exactly the dense low-support regime.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The subtrees rooted at each top-level frequent item share only read-only index data, so they run on separate threads with private output vectors merged once afterwards.',
            tradeoff: 'Subtree sizes are extremely skewed, so speedup is capped by the largest subtree rather than by core count, and dynamic scheduling adds overhead; each thread also holds its own result vector, so peak memory grows with threads.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'std::popcount lowers to the hardware POPCNT instruction and the AND-popcount loop is autovectorized only when the target ISA is known to the compiler.',
            tradeoff: 'A binary built with -march=native will not run on an older CPU than the build host, so deploy by building on, or for, the target hardware rather than shipping one artifact.',
          },
        ],
        libraryName: 'OpenMP + std::popcount',
        profile: 'Each support count is n/64 word ANDs and popcounts with no database scan; failed candidates write nothing. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Association rules by Apriori - support counting and rule generation, literally.

use std::collections::{BTreeSet, HashMap};

pub type Itemset = BTreeSet<u32>;

pub struct Rule {
    pub antecedent: Itemset,
    pub consequent: Itemset,
    pub support: f64,
    pub confidence: f64,
    pub lift: f64,
}

/// support(S): the fraction of transactions that contain every item of S.
fn support(itemset: &Itemset, transactions: &[Itemset]) -> f64 {
    let mut containing = 0;
    for transaction in transactions {
        if itemset.is_subset(transaction) {
            containing += 1;
        }
    }
    containing as f64 / transactions.len() as f64
}

pub fn frequent_itemsets(transactions: &[Itemset], min_support: f64) -> HashMap<Itemset, f64> {
    let mut items = BTreeSet::new();
    for transaction in transactions {
        for item in transaction {
            items.insert(*item);
        }
    }

    let mut frequent: HashMap<Itemset, f64> = HashMap::new();
    let mut level: Vec<Itemset> = Vec::new();
    for item in &items {
        let mut candidate = Itemset::new();
        candidate.insert(*item);
        let candidate_support = support(&candidate, transactions);
        if candidate_support >= min_support {
            frequent.insert(candidate.clone(), candidate_support);
            level.push(candidate);
        }
    }

    let mut size = 1;
    while !level.is_empty() {
        // Join: two frequent k-itemsets whose union has k+1 items form a candidate.
        let mut candidates: BTreeSet<Itemset> = BTreeSet::new();
        for left in &level {
            for right in &level {
                let union: Itemset = left.union(right).cloned().collect();
                if union.len() == size + 1 {
                    candidates.insert(union);
                }
            }
        }

        let mut next_level = Vec::new();
        for candidate in candidates {
            // Prune by downward closure: every k-subset must already be frequent.
            let mut all_subsets_frequent = true;
            for item in &candidate {
                let mut subset = candidate.clone();
                subset.remove(item);
                if !frequent.contains_key(&subset) {
                    all_subsets_frequent = false;
                    break;
                }
            }
            if !all_subsets_frequent {
                continue;
            }

            let candidate_support = support(&candidate, transactions);
            if candidate_support >= min_support {
                frequent.insert(candidate.clone(), candidate_support);
                next_level.push(candidate);
            }
        }

        level = next_level;
        size += 1;
    }

    frequent
}

pub fn generate_rules(frequent: &HashMap<Itemset, f64>, min_confidence: f64) -> Vec<Rule> {
    let mut rules = Vec::new();
    for (itemset, &itemset_support) in frequent {
        if itemset.len() < 2 {
            continue;
        }

        let members: Vec<u32> = itemset.iter().cloned().collect();
        let full: u64 = 1 << members.len();

        // Every non-empty proper subset is an antecedent: a bitmask over the members.
        for mask in 1..full - 1 {
            let mut antecedent = Itemset::new();
            let mut consequent = Itemset::new();
            for bit in 0..members.len() {
                if (mask >> bit) & 1 == 1 {
                    antecedent.insert(members[bit]);
                } else {
                    consequent.insert(members[bit]);
                }
            }

            // Downward closure guarantees both subsets were counted.
            let confidence = itemset_support / frequent[&antecedent];
            if confidence < min_confidence {
                continue;
            }
            let lift = confidence / frequent[&consequent];

            rules.push(Rule { antecedent, consequent, support: itemset_support, confidence, lift });
        }
    }
    rules
}`,
        profile: 'A full scan per candidate per level over node-based BTreeSets, with a heap allocation for every itemset clone and bounds-checked indexing in the rule loop.',
      },
      'make-it-right': {
        code: `//! Association rules - typed errors, validated newtypes, sorted-slice Apriori.

use std::collections::BTreeMap;
use std::fmt;

/// Rule generation enumerates 2^k antecedents, so itemset width is capped.
pub const MAX_LENGTH: usize = 20;

#[derive(Debug, PartialEq)]
pub enum MiningError {
    NoTransactions,
    UnsortedTransaction { index: usize },
    MinSupport(f64),
    MinConfidence(f64),
    MaxLength(usize),
}

impl fmt::Display for MiningError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoTransactions => write!(f, "no transactions"),
            Self::UnsortedTransaction { index } => {
                write!(f, "transaction {index} is not sorted and duplicate-free")
            }
            Self::MinSupport(value) => write!(f, "min_support {value} outside (0, 1]"),
            Self::MinConfidence(value) => write!(f, "min_confidence {value} outside [0, 1]"),
            Self::MaxLength(value) => write!(f, "max_length {value} outside [1, {MAX_LENGTH}]"),
        }
    }
}

impl std::error::Error for MiningError {}

/// Support floor. A newtype because min_support and min_confidence are both
/// bare f64 at every call site, and transposing them is silent.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MinSupport(f64);

impl MinSupport {
    pub fn new(value: f64) -> Result<Self, MiningError> {
        if value > 0.0 && value <= 1.0 {
            Ok(Self(value))
        } else {
            Err(MiningError::MinSupport(value))
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MinConfidence(f64);

impl MinConfidence {
    pub fn new(value: f64) -> Result<Self, MiningError> {
        if (0.0..=1.0).contains(&value) {
            Ok(Self(value))
        } else {
            Err(MiningError::MinConfidence(value))
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Rule {
    pub antecedent: Vec<u32>,
    pub consequent: Vec<u32>,
    pub support: f64,
    pub confidence: f64,
    pub lift: f64,
}

/// needle and haystack are both sorted ascending, so one forward pass suffices.
fn is_subset(needle: &[u32], haystack: &[u32]) -> bool {
    let mut remaining = haystack.iter();
    needle.iter().all(|item| remaining.any(|candidate| candidate == item))
}

/// F_k x F_k join on a shared (k-1)-prefix. The level is sorted, so each
/// candidate is generated once and the inner scan stops at the first mismatch.
fn join(level: &[Vec<u32>]) -> Vec<Vec<u32>> {
    let mut candidates = Vec::new();
    for (index, left) in level.iter().enumerate() {
        let prefix = &left[..left.len() - 1];
        for right in &level[index + 1..] {
            if &right[..right.len() - 1] != prefix {
                break;
            }
            let mut candidate = Vec::with_capacity(left.len() + 1);
            candidate.extend_from_slice(left);
            candidate.push(right[right.len() - 1]);
            candidates.push(candidate);
        }
    }
    candidates
}

/// Downward closure: each k-subset of a (k+1)-candidate must be frequent.
fn all_subsets_frequent(candidate: &[u32], level: &[Vec<u32>]) -> bool {
    (0..candidate.len()).all(|skip| {
        let subset: Vec<u32> = candidate
            .iter()
            .enumerate()
            .filter(|(position, _)| *position != skip)
            .map(|(_, item)| *item)
            .collect();
        level.binary_search(&subset).is_ok()
    })
}

pub fn mine(
    transactions: &[Vec<u32>],
    min_support: MinSupport,
    max_length: usize,
) -> Result<BTreeMap<Vec<u32>, usize>, MiningError> {
    if transactions.is_empty() {
        return Err(MiningError::NoTransactions);
    }
    if max_length == 0 || max_length > MAX_LENGTH {
        return Err(MiningError::MaxLength(max_length));
    }
    if let Some(index) = transactions
        .iter()
        .position(|transaction| transaction.windows(2).any(|pair| pair[0] >= pair[1]))
    {
        return Err(MiningError::UnsortedTransaction { index });
    }

    let min_count = (min_support.0 * transactions.len() as f64).ceil() as usize;

    let mut singles: BTreeMap<u32, usize> = BTreeMap::new();
    for item in transactions.iter().flatten() {
        *singles.entry(*item).or_insert(0) += 1;
    }

    let mut counts: BTreeMap<Vec<u32>, usize> = BTreeMap::new();
    let mut level: Vec<Vec<u32>> = Vec::new();
    for (item, count) in singles {
        if count >= min_count {
            counts.insert(vec![item], count);
            level.push(vec![item]);
        }
    }

    while level.first().is_some_and(|first| first.len() < max_length) {
        let mut next_level = Vec::new();
        for candidate in join(&level)
            .into_iter()
            .filter(|candidate| all_subsets_frequent(candidate, &level))
        {
            let count = transactions
                .iter()
                .filter(|transaction| is_subset(&candidate, transaction))
                .count();
            if count >= min_count {
                counts.insert(candidate.clone(), count);
                next_level.push(candidate);
            }
        }
        level = next_level;
    }

    Ok(counts)
}

pub fn generate_rules(
    counts: &BTreeMap<Vec<u32>, usize>,
    n_transactions: usize,
    min_confidence: MinConfidence,
) -> Vec<Rule> {
    let n = n_transactions as f64;
    let mut rules = Vec::new();

    for (itemset, &itemset_count) in counts.iter().filter(|(itemset, _)| itemset.len() >= 2) {
        let full: u32 = 1 << itemset.len();
        for mask in 1..full - 1 {
            let (antecedent, consequent): (Vec<(usize, u32)>, Vec<(usize, u32)>) = itemset
                .iter()
                .copied()
                .enumerate()
                .partition(|(bit, _)| (mask >> bit) & 1 == 1);
            let antecedent: Vec<u32> = antecedent.into_iter().map(|(_, item)| item).collect();
            let consequent: Vec<u32> = consequent.into_iter().map(|(_, item)| item).collect();

            let (Some(&antecedent_count), Some(&consequent_count)) =
                (counts.get(&antecedent), counts.get(&consequent))
            else {
                continue; // unreachable under downward closure
            };

            let confidence = itemset_count as f64 / antecedent_count as f64;
            if confidence < min_confidence.0 {
                continue;
            }
            rules.push(Rule {
                antecedent,
                consequent,
                support: itemset_count as f64 / n,
                confidence,
                lift: confidence / (consequent_count as f64 / n),
            });
        }
    }

    rules.sort_by(|a, b| b.lift.total_cmp(&a.lift));
    rules
}`,
        rationale:
          'Errors become a typed enum returned from the boundary instead of panics, and the two bare f64 floors become validated newtypes so a swapped support and confidence is a compile error rather than a silent wrong answer. The data structures change to what the algorithm actually needs: itemsets are sorted Vec<u32>, so subset testing is one forward pass over two sorted slices and the join walks adjacent prefixes instead of comparing every pair, and candidates are built with with_capacity rather than cloned and edited. The prune is a binary search in the previous level, rule generation partitions an iterator instead of indexing with a loop counter, a missing subset count is skipped with let-else rather than indexed and unwrapped, and results are sorted by lift with a total order that tolerates NaN.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'Sorted-slice itemsets with prefix-join candidates and a merge-style subset test; still scans the transactions per candidate, but with no per-candidate heap churn from set clones.',
      },
      'make-it-fast': {
        code: `//! Association rules - vertical bitsets, fused AND+popcount, rayon over top-level items.

use rayon::prelude::*;

/// Row-major (n_items, words): an item's transaction-id bitset is one contiguous row.
pub struct VerticalIndex {
    n_items: usize,
    words: usize,
    bits: Vec<u64>,
}

impl VerticalIndex {
    pub fn new(transactions: &[Vec<u32>], n_items: usize) -> Self {
        let words = transactions.len().div_ceil(64);
        let mut bits = vec![0_u64; n_items * words];
        for (tid, transaction) in transactions.iter().enumerate() {
            for &item in transaction {
                bits[item as usize * words + tid / 64] |= 1_u64 << (tid % 64);
            }
        }
        Self { n_items, words, bits }
    }

    #[inline]
    pub fn row(&self, item: u32) -> &[u64] {
        let start = item as usize * self.words;
        &self.bits[start..start + self.words]
    }
}

/// Fused: the intersection is counted as it is produced and never written, so
/// the candidates that fail the support test cost reads only.
#[inline]
fn and_count(a: &[u64], b: &[u64]) -> u32 {
    a.iter().zip(b).map(|(x, y)| (x & y).count_ones()).sum()
}

fn extend(
    index: &VerticalIndex,
    prefix: &mut Vec<u32>,
    prefix_bits: &[u64],
    tail: &[u32],
    min_count: u32,
    max_length: usize,
    out: &mut Vec<(Vec<u32>, u32)>,
) {
    if prefix.len() >= max_length {
        return;
    }

    // Pass 1: count only. A failing candidate never materializes a bitset.
    let mut survivors: Vec<(u32, u32)> = Vec::with_capacity(tail.len());
    for &item in tail {
        let count = and_count(prefix_bits, index.row(item));
        if count >= min_count {
            survivors.push((item, count));
        }
    }
    let tail_items: Vec<u32> = survivors.iter().map(|&(item, _)| item).collect();

    // Pass 2: materialize the child only for survivors, then recurse.
    let mut child = vec![0_u64; prefix_bits.len()];
    for (position, &(item, count)) in survivors.iter().enumerate() {
        for (slot, (a, b)) in child.iter_mut().zip(prefix_bits.iter().zip(index.row(item))) {
            *slot = a & b;
        }
        prefix.push(item);
        out.push((prefix.clone(), count));
        extend(index, prefix, &child, &tail_items[position + 1..], min_count, max_length, out);
        prefix.pop();
    }
}

/// Top-level subtrees are independent and wildly unequal in size; rayon's work
/// stealing balances them without any hand-tuned schedule.
pub fn mine(index: &VerticalIndex, min_count: u32, max_length: usize) -> Vec<(Vec<u32>, u32)> {
    let frequent: Vec<(u32, u32)> = (0..index.n_items as u32)
        .map(|item| (item, index.row(item).iter().map(|word| word.count_ones()).sum::<u32>()))
        .filter(|&(_, count)| count >= min_count)
        .collect();
    let items: Vec<u32> = frequent.iter().map(|&(item, _)| item).collect();

    frequent
        .par_iter()
        .enumerate()
        .flat_map_iter(|(position, &(item, count))| {
            let mut out = Vec::with_capacity(16);
            out.push((vec![item], count));
            let mut prefix = vec![item];
            extend(
                index,
                &mut prefix,
                index.row(item),
                &items[position + 1..],
                min_count,
                max_length,
                &mut out,
            );
            out
        })
        .collect()
}`,
        rationale:
          'The layout changes from horizontal to vertical: an item is one contiguous row of transaction bits, so the support of a union is the popcount of an AND and the database is never rescanned. Counting is fused with the intersection, so a candidate that fails the support test — most of them — is read but never written, and a child bitset is allocated once per frame and filled only for survivors. The independent top-level subtrees go to rayon, whose work stealing handles the severe imbalance between them without a tuned schedule, and each task collects its results into its own Vec so no lock is held in the hot path.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Subtrees rooted at each frequent item read the same immutable index and write only to their own output, so par_iter plus flat_map_iter parallelizes the search with no locking and balances the skew by work stealing.',
            tradeoff: 'Speedup is capped by the largest subtree, since the first item’s subtree is far bigger than the rest, and every task holds its own result vector, so peak memory grows with parallelism.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Each item’s bitset is a &[u64] borrowed from one flat Vec, so the AND and popcount stream sequential memory and the index is a single allocation rather than a Vec of Vecs.',
            tradeoff: 'The flat layout makes the shape implicit: a wrong n_items or an item id beyond it is a panic or a silent misread, not a type error, and the index cannot grow without being rebuilt.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The survivor list is sized to the tail it is filtered from, and each task’s output starts with room, removing the repeated growth-and-copy that dominates a deep recursion of small vectors.',
            tradeoff: 'The tail length is only an upper bound on survivors, so most frames over-reserve; the waste is bounded by the tail but is real memory held across the recursion.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Each support count is n/64 word ANDs with hardware popcount and no database scan; failed candidates write nothing. Illustrative, not a measured benchmark.',
      },
    },
  },
};
