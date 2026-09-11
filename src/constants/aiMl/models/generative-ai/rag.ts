import type { AiMlModel } from '../../types';

/**
 * Retrieval-augmented generation — the entry that is mostly a systems
 * problem wearing a model's clothes.
 *
 * Formulated honestly it is a marginal likelihood over retrieved
 * documents, and formulated honestly it also trains nothing: almost every
 * deployment bolts a frozen retriever to a frozen generator. That gap
 * between the equation and the practice is the most useful thing this
 * entry has to say, because the failures all live in the gap.
 */
export const RAG: AiMlModel = {
  slug: 'rag',
  name: 'Retrieval-Augmented Generation',
  aliases: ['RAG', 'Retrieve-then-generate', 'Grounded generation', 'Open-book QA', 'Context augmentation'],
  category: 'generative-ai',
  group: 'representation-retrieval',
  kind: 'technique',

  paradigms: ['self-supervised', 'supervised'],
  taskTypes: ['generation', 'ranking', 'sequence-modeling', 'classification'],
  paradigmNote:
    'Listed against both paradigms because the two components are trained differently and usually elsewhere — the retriever contrastively on pairs, the generator on next-token likelihood — and in the overwhelming majority of deployments neither is trained at all. That is the honest characterization: this is an inference-time architecture, and treating it as a model to be trained is a category error that leads teams to fine-tune when they should be fixing chunking.',

  intuition:
    'A language model knows what was in its training data, approximately, with no way to tell you which parts it is confident about and no way to learn something new without retraining. Retrieval fixes both by moving knowledge out of the weights and into an index: fetch the relevant passages, put them in the context, and ask the model to answer from them. Updating knowledge becomes updating a database. Citations become possible because the passages are right there. What makes this deceptively hard is that the system is only as good as its worst stage, and the worst stage is almost always retrieval — if the right passage is not in the context, no amount of generator quality recovers it, and the model will produce a fluent answer anyway.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        'p(y \\mid x) = \\sum_{z \\in \\mathcal{Z}(x)} p_\\eta(z \\mid x)\\, p_\\theta(y \\mid x, z), \\quad \\mathcal{Z}(x) = \\text{top-}k \\text{ retrieved}',
      symbols: [
        { symbol: 'p_\\eta(z \\mid x)', meaning: 'retriever distribution over documents — in practice a similarity score, not a calibrated probability' },
        { symbol: 'p_\\theta(y \\mid x, z)', meaning: 'generator likelihood given the query and one retrieved document' },
        { symbol: '\\mathcal{Z}(x)', meaning: 'the retrieved set: a top-k truncation of the corpus, which is where the approximation bites' },
        { symbol: 'k', meaning: 'documents retrieved; the marginalization is over these only, and everything else gets probability zero' },
      ],
    },
    reading:
      'A marginal likelihood: the probability of an answer is a retriever-weighted average of the probability the generator assigns given each retrieved document. Written this way the technique is a genuine latent-variable model with the document as the latent, and the original formulation trained both components through that marginal. Almost nobody does that. The standard deployment concatenates the top-k documents into one prompt, which is not this equation at all — it is a single forward pass over a concatenation, and the marginalization has quietly become string formatting. Two consequences worth stating. Any document outside the top-k has probability exactly zero, so a retrieval miss is unrecoverable rather than merely unlikely, which is why retrieval recall bounds the whole system. And because the retriever score is a similarity rather than a calibrated probability, the weights in that sum are not probabilities either, so the equation is a description of the intent rather than of the arithmetic any production system performs.',
  },

  optimization: {
    method: 'Usually none: a frozen retriever and a frozen generator, tuned through chunking, k, and reranking rather than through gradients',
    updateRule: {
      formula:
        '\\text{answer} = p_\\theta\\bigl(y \\mid x, \\text{rerank}_m\\bigl(\\text{hybrid}(\\text{dense}_k(x), \\text{lexical}_k(x))\\bigr)\\bigr)',
      symbols: [
        { symbol: '\\text{dense}_k', meaning: 'embedding retrieval, strong on paraphrase and weak on exact identifiers' },
        { symbol: '\\text{lexical}_k', meaning: 'BM25 or similar, strong on exact terms and weak on paraphrase — the complement, not the legacy' },
        { symbol: '\\text{rerank}_m', meaning: 'cross-encoder scoring of the merged candidates, reducing k to m for the context' },
        { symbol: 'm', meaning: 'documents that reach the prompt; small, because generator attention degrades with irrelevant context' },
      ],
    },
    rationale:
      'The pipeline is the model, and each stage exists because the previous one has a specific weakness. Dense retrieval misses exact matches on identifiers, part numbers and rare terms, so a lexical index runs alongside it — hybrid retrieval is standard practice rather than legacy baggage, and dropping it is one of the most common self-inflicted regressions in this area. The merged candidate list is then reranked by a cross-encoder, which is far more accurate per pair and cannot be precomputed, so it is affordable only on a short list; this is exactly the complementarity that makes the two-stage design worth its complexity. Reranking down to a handful of documents matters for a reason that surprises people: more context is not better. Generators attend unevenly across a long context, degrade when relevant material sits in the middle, and are measurably distracted by plausible-but-irrelevant passages. So the tuning loop here is chunk size, k, and m — not learning rates, and the instinct to fine-tune the generator when the pipeline underperforms is usually misdirected effort.',
    hyperparameters: [
      { name: 'chunk size', role: 'The most consequential and least examined choice. Too small loses the context a passage needs; too large dilutes the embedding', typicalRange: '200 to 1000 tokens' },
      { name: 'chunk overlap', role: 'Guards against an answer straddling a boundary, at the cost of duplicate retrievals crowding out diversity', typicalRange: '0 to 20%' },
      { name: 'retrieved k', role: 'Candidates entering the reranker. Bounds the whole system: a miss here is unrecoverable', typicalRange: '20 to 200' },
      { name: 'context m', role: 'Documents reaching the prompt. Small, because irrelevant context measurably degrades the answer', typicalRange: '3 to 10' },
      { name: 'hybrid weight', role: 'Dense against lexical. Should be tuned on queries with rare terms, where the two disagree most', typicalRange: '0.3 to 0.7' },
      { name: 'reranker depth', role: 'How far down the candidate list the cross-encoder scores. Latency scales linearly with it', typicalRange: '20 to 100' },
    ],
    convergence:
      'There is nothing to converge, which makes the failure taxonomy the substance of this section. Retrieval failure is first and dominant: the correct passage is not in the context, and the generator answers fluently anyway, so the visible symptom is a confident wrong answer and the actual cause is one stage upstream. Chunking failure is second and the most underrated — an answer that spans a boundary is retrievable as two half-answers, neither of which scores well, and this is invisible unless retrieval is evaluated separately from answer quality. Third is context degradation: passing more documents helps up to a point and then hurts, with relevant material in the middle of a long context getting less attention than material at either end. Fourth is grounding failure, where the passage is present and correct and the model still contradicts it, which is rarer than commonly claimed but real and not fixable by prompting alone. Fifth is staleness: the index reflects a corpus snapshot and a document deleted upstream stays answerable, which is a compliance problem rather than a quality one. The single most useful diagnostic practice is to measure retrieval recall against a labelled set independently of answer quality, because otherwise every one of these failures presents identically as a bad answer.',
    complexity:
      'Per query: one encoder pass, an index lookup at O(log n) for an approximate index, m cross-encoder passes for reranking, and one generator pass over a context of m chunks. The generator dominates latency and cost while the reranker dominates the tunable part, and total cost is roughly linear in m through both the reranker and the generator context — which is the real reason m stays small.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is nothing to retrieve that helps. Forecasting conditions on the numeric history of the series, which a model reads directly rather than looking up, and a language generator producing numbers from retrieved text has neither calibration nor a loss that rewards accuracy. The genuinely useful adjacent thing — finding similar historical windows and reusing their continuations — is retrieval over embeddings with no generator involved, and that belongs to the contrastive-embeddings entry. Retrieval earns its place in forecasting only for narrating a forecast produced elsewhere, which is a reporting task rather than a forecasting one.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The technique provides no notion of surprise. Retrieval returns a similarity ranking and generation returns text, and neither is a density under a normal-data model — a query with no good matches indicates a coverage gap in the index rather than an anomaly in the world. The related-looking operation, flagging inputs far from everything in the corpus, is nearest-neighbour detection over the embedding space with the generator removed entirely, which the contrastive-embeddings and ann-index entries cover. For likelihood-based detection a decoder-only model scores sequences directly.',
      },
      optimization: {
        fit: 'primary',
        how: 'A pipeline-optimization problem with an unusually clear structure: several stages in sequence where each stage bounds every stage after it, and the tunable parameters are structural — chunk size, retrieved k, context m — rather than continuous. Effort allocation across stages is the actual decision, and it is routinely made wrong.',
        where: [
          'Retrieval recall as a hard ceiling on end-to-end quality, which makes it the first thing to measure and the first thing to fix',
          'The m trade: more context helps up to a point and then measurably hurts',
          'Two-stage retrieve-then-rerank as an explicit accuracy-for-latency allocation',
          'Chunking as the highest-leverage and least-examined parameter in the system',
        ],
        why: 'The most transferable lesson in this entry is about where to spend effort. A sequential pipeline is bounded by its weakest stage, so measuring stages independently is not optional diligence — it is the only way to know which stage to work on, and without it every failure looks like a generator problem because the generator is what produced the visible output. In practice teams reach for a larger generator or a fine-tune when retrieval recall is the binding constraint, which is expensive and does not help. The second lesson is that more context is not monotonically better, which contradicts the natural intuition and is one of the few places where a system parameter has a genuine interior optimum worth finding. Both lessons generalize well beyond retrieval.',
        featurization: [
          'Measure retrieval recall against a labelled query set independently of answer quality, or you cannot attribute any failure',
          'Sweep m rather than maximizing it, since the curve turns over and the peak is usually lower than expected',
          'Treat chunk size as a first-class experiment; it is frequently worth more than any model change',
          'Keep hybrid retrieval, and evaluate specifically on queries containing rare terms and identifiers',
        ],
        evaluation:
          'Retrieval recall at m and answer faithfulness reported as separate numbers, never combined — a combined score cannot tell you which stage to fix, which is the only question the evaluation needs to answer. Alongside those, latency broken down per stage, since the reranker and the generator context are the two places cost accumulates.',
        pitfalls: [
          'A single end-to-end score, which hides which stage is failing',
          'Maximizing m on the assumption that more context is always better',
          'Fine-tuning the generator when retrieval recall is the actual ceiling',
          'Never varying chunk size, leaving the highest-leverage parameter at a default',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Chunk and index a corpus, retrieve for each query with hybrid search, rerank to a handful of passages, and generate an answer conditioned on them with citations back to the sources. The citations are the operationally important part: they make the answer checkable, which is frequently why the architecture is chosen over fine-tuning.',
        where: [
          'Question answering over private or proprietary corpora the model never saw',
          'Support and documentation assistants where answers must cite a source',
          'Knowledge that changes faster than any retraining cadence could track',
          'Any setting where a reviewer must verify the answer against its evidence',
        ],
        why: 'The default architecture for grounded question answering, and the reasons are practical rather than theoretical: knowledge updates become database writes, citations come free, and no training run is required. Long-context models have narrowed the gap for small corpora — if the whole corpus fits in a context window, retrieval is machinery you may not need — but retrieval still wins on cost per query and on corpora larger than any window. The honest caveats are the failure modes above: retrieval recall bounds everything, chunking decisions silently determine what is answerable, and grounding is not guaranteed by putting the passage in the prompt. Worth adding that citations create a specific hazard, which is that a citation to a retrieved passage is evidence the passage was retrieved and not evidence the answer follows from it — reviewers routinely read it as the latter.',
        featurization: [
          'Chunk on document structure — sections, paragraphs — rather than on a fixed token count that cuts mid-sentence',
          'Keep hybrid retrieval; dense-only reliably misses exact identifiers and version numbers',
          'Include document metadata in the prompt so the generator can express recency or authority',
          'Require citations and verify them mechanically, since an unverified citation is decoration',
        ],
        evaluation:
          'Retrieval recall at m on a labelled query set, then faithfulness of the answer to the retrieved passages, then answer correctness — three separate numbers, because a single score cannot attribute a failure to a stage. Include queries whose answers are absent from the corpus, since refusing is the correct behaviour there and systems that never refuse are usually the ones that hallucinate most.',
        pitfalls: [
          'Fixed-token chunking that severs answers at boundaries',
          'Dense-only retrieval on corpora full of identifiers and version numbers',
          'Treating a citation as evidence of grounding rather than evidence of retrieval',
          'No unanswerable queries in the evaluation set, so refusal behaviour is never measured',
        ],
      },
      'risk-and-fraud': {
        fit: 'adapted',
        how: 'Retrieve the policy text, prior case notes and precedent decisions relevant to a case, then generate a summary or a recommendation that cites them. The point is not the decision — a model is a poor decision-maker here — but assembling the evidence a human reviewer needs and stating which rule applies.',
        where: [
          'Case triage, where the assistant assembles relevant policy and prior decisions',
          'Policy question answering for reviewers working against a large rulebook',
          'Drafting case narratives that cite the specific rule and the specific prior decisions',
          'Consistency checking, surfacing prior cases decided differently on similar facts',
        ],
        why: 'A reasonable fit for evidence assembly and a poor one for deciding. It fits because the corpora are large, textual, frequently updated and genuinely hard for a reviewer to search, and because the citation requirement aligns with an audit requirement that already exists. It is a poor decision-maker for three reasons worth being explicit about. Retrieval recall bounds it, so a missed policy is a silently wrong recommendation. The output is text with no calibrated score, so it cannot be thresholded or combined with the scored models that do the actual detection. And in a regulated setting the reasoning must be reconstructable, which a generated narrative is not — it is a plausible narrative about a decision, not a record of one. The defensible design keeps the model on evidence assembly with a human deciding.',
        featurization: [
          'Version the policy corpus and record which version answered each query, since the answer is only correct relative to a snapshot',
          'Restrict retrieval by jurisdiction and effective date; a superseded rule retrieved as current is a compliance failure',
          'Require citation to specific rule sections and verify them mechanically',
          'Keep the model on evidence assembly and the decision with a person, which is both safer and easier to defend',
        ],
        evaluation:
          'Retrieval recall specifically on the policy sections a case actually depends on, judged by domain reviewers rather than by lexical overlap, and citation precision measured mechanically. End-to-end recommendation accuracy is the wrong headline metric here, because the system should not be making the recommendation.',
        pitfalls: [
          'An unversioned corpus, so a superseded rule is retrieved as current',
          'Treating the generated narrative as a decision record, which it is not',
          'Expecting a calibrated score from a text output so it can feed a downstream threshold',
          'No jurisdiction or date filter on retrieval, which is the most common source of confidently wrong policy answers',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Typically zero, which is the main commercial argument for the architecture: an off-the-shelf embedding model and generator plus an index gets a working system with no training run. Fine-tuning the retriever on domain query-document pairs is the one intervention that reliably pays, and it is hours on a single accelerator. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One embedding pass, an index lookup, m cross-encoder passes and one generator pass over an m-chunk context. The generator dominates both latency and cost, the reranker dominates the part you control, and total cost is roughly linear in m through two separate stages — which is the practical reason m stays small.',
    retrainingCadence:
      'The index is updated continuously as the corpus changes, which is the whole point. The coupling that catches people is that changing the embedding model invalidates every stored vector, so an encoder upgrade and a full re-index are one operation and must be scheduled as one.',
    driftAndMonitoring: [
      'Retrieval recall on a frozen labelled query set, measured through the production index rather than exact search',
      'Fraction of queries where no retrieved passage clears a relevance threshold, which is the coverage-gap signal',
      'Citation verification rate: the share of generated citations that actually point at retrieved passages',
      'Index freshness and, specifically, the share of corpus documents embedded by a prior encoder version',
      'Refusal rate, since a system that never refuses on unanswerable queries is fabricating on them',
    ],
    productionGotchas: [
      'Retrieval recall is a hard ceiling. If the passage is absent from the context the answer is wrong, and the generator will produce it fluently and confidently anyway — this is the single most common production failure and it presents as a generator problem',
      'Changing the embedding model invalidates every stored vector. Encoder upgrade and full re-index are one operation, and a partially re-indexed corpus is silently broken with no error',
      'Deleted documents remain answerable until the index is updated. That is a compliance exposure rather than a quality issue, and deletion pipelines are usually an afterthought',
      'More context is not better. Answer quality turns over as m grows, and material in the middle of a long context receives measurably less attention than material at either end',
      'A citation proves the passage was retrieved, not that the answer follows from it. Reviewers consistently read it as the stronger claim, and mechanical verification only checks the weaker one',
      'Access control must be enforced at retrieval time, per user. A single shared index will happily surface passages the asker is not entitled to see, and the generated answer launders the provenance',
      'Chunk boundaries silently determine what is answerable at all. An answer spanning a boundary is retrievable only as two poorly-scoring halves, and nothing in the output indicates this happened',
    ],
  },

  assumptions: [
    'The answer exists in the corpus, in a single chunk or in chunks that will be retrieved together',
    'Query and document embeddings are comparable, which requires one encoder version across the whole index',
    'The generator will condition on the provided passages rather than on its parametric memory — usually true, not guaranteed',
    'Retrieval latency is affordable on the critical path, since it is additive to generation',
    'A text answer is acceptable, because nothing here produces a calibrated score',
  ],

  pros: [
    {
      point: 'Knowledge updates without retraining',
      context:
        'Corpus changes become database writes, so the system tracks knowledge that moves faster than any retraining cadence. This is the commercial argument and it is a strong one.',
    },
    {
      point: 'Citations make answers checkable',
      context:
        'The retrieved passages are right there, so a reviewer can verify. Worth the caveat that a citation evidences retrieval rather than grounding, and only the weaker claim can be checked mechanically.',
    },
    {
      point: 'Works on private corpora with no training run',
      context:
        'An off-the-shelf embedding model and generator plus an index gets a working system on data no model has seen. The cheapest route in this reference from a corpus to a usable assistant.',
    },
    {
      point: 'Failures are attributable',
      context:
        'Because the stages are separable, retrieval recall and answer faithfulness can be measured independently and the failing stage identified. Most end-to-end systems do not offer that.',
    },
  ],

  cons: [
    {
      point: 'Retrieval recall bounds everything downstream',
      context:
        'A passage outside the context has probability exactly zero, so a miss is unrecoverable. The generator answers fluently regardless, which means the failure presents as a generator problem and gets debugged in the wrong place.',
    },
    {
      point: 'Chunking silently decides what is answerable',
      context:
        'An answer spanning a boundary becomes two poorly-scoring halves. Nothing in the output indicates this, and it is the least-examined high-leverage parameter in the system.',
    },
    {
      point: 'More context eventually hurts',
      context:
        'Quality turns over as m grows, and relevant material in the middle of a long context gets less attention than at either end. The natural instinct to pass more is wrong past a point that is usually lower than expected.',
    },
    {
      point: 'The marginalization is notional',
      context:
        'The equation describes a latent-variable model; the standard deployment concatenates documents into one prompt and runs a single forward pass. The formalism is intent rather than arithmetic, and joint training is rare.',
    },
    {
      point: 'Latency is additive on the critical path',
      context:
        'Embedding, lookup, reranking and generation all happen before the first token. Retrieval is the part you control and the reranker is where it accumulates.',
    },
    {
      point: 'Access control has to be enforced per query',
      context:
        'A shared index will surface passages the asker is not entitled to, and the generated answer obscures where they came from. This is a security property of the retrieval layer, not something prompting can fix.',
    },
    {
      point: 'Grounding is not guaranteed by providing the passage',
      context:
        'A correct passage in the context and a contradicting answer is rarer than commonly claimed but real, and prompt instructions do not reliably prevent it.',
    },
  ],

  relatedSlugs: ['contrastive-embeddings', 'ann-index', 'decoder-only-lm', 'masked-lm', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Retrieval-augmented generation, transcribed from the objective.

No ML library. The marginal written out so the equation and the practice
can be read against each other:

    p(y | x) = sum_z p_eta(z | x) * p_theta(y | x, z),   z in top-k(x)

Two things to read for.

First, the sum ranges over the RETRIEVED set only. Every document outside
it carries probability exactly zero, so a retrieval miss is not merely
unlikely -- it is unrecoverable, and the generator will answer fluently
anyway. That is the whole reason retrieval recall bounds the system.

Second, marginalize_answer() below implements that equation, and
build_prompt() implements what production actually does: concatenate the
top documents into one context and run a single forward pass. They are
not the same computation. The concatenation contains no marginalization
at all -- the retriever chose which chunks appear and then stopped
mattering, and the weighting has quietly become string formatting.
"""

import math
import re


def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def stable_hash(token):
    """Deterministic across processes, unlike the built-in hash().

    Not a detail. An index built in one process and queried from another
    must agree about the embedding, and Python salts hash() per process,
    so the built-in silently produces two incompatible vector spaces. The
    production form of this bug is upgrading the encoder without
    re-indexing: same shape, same silence, no error anywhere.
    """
    digest = 2166136261
    for character in token:
        digest = ((digest ^ ord(character)) * 16777619) % (1 << 32)
    return digest


def chunk_document(text, chunk_tokens, overlap_tokens):
    """Split a document into overlapping windows.

    The most consequential function in this file and the one nobody
    tunes. A chunk smaller than the answer leaves that answer retrievable
    only as two poorly-scoring halves. A chunk much larger than the
    answer dilutes its embedding with unrelated text until it stops
    scoring at all. Neither failure appears in the output -- the system
    simply cannot answer a question it looks like it should be able to.

    The overlap exists for answers that straddle a boundary, and it costs
    diversity: two overlapping chunks that both match will crowd a third
    document out of a context window that only holds a handful.
    """
    if chunk_tokens <= 0:
        raise ValueError("chunk_tokens must be positive")
    if overlap_tokens < 0 or overlap_tokens >= chunk_tokens:
        raise ValueError("overlap must be in [0, chunk_tokens)")

    words = tokenize(text)
    stride = chunk_tokens - overlap_tokens
    chunks = []
    start = 0
    while start < len(words):
        window = words[start : start + chunk_tokens]
        if not window:
            break
        chunks.append(window)
        start += stride
    return chunks


def embed(tokens, width):
    """A hashing encoder standing in for a trained one.

    Deliberately crude, because this entry is about the pipeline and
    swapping this for a real sentence encoder changes retrieval quality
    while changing nothing about the reasoning below it. What it does
    reproduce faithfully is the weakness that matters: a hashed bag of
    words has no notion of paraphrase. That is exactly the gap a dense
    encoder closes, and exactly why the lexical index below still earns
    its place after you close it.
    """
    vector = [0.0] * width
    for token in tokens:
        vector[stable_hash(token) % width] += 1.0

    norm = math.sqrt(sum(value * value for value in vector))
    if norm < 1e-12:
        return vector
    return [value / norm for value in vector]


def cosine(left, right):
    return sum(left[idx] * right[idx] for idx in range(len(left)))


def build_index(documents, chunk_tokens, overlap_tokens, width):
    """Chunk, embed, and keep the tokens alongside the vector.

    Keeping the tokens is not redundancy. The lexical retriever needs
    them, the reranker needs them, and the prompt needs them -- a store
    that holds vectors only forces a second round trip to the source of
    truth on every single query, and the two stores then drift.
    """
    index = []
    for document_id, text in documents:
        for ordinal, tokens in enumerate(chunk_document(text, chunk_tokens, overlap_tokens)):
            index.append(
                {
                    "document_id": document_id,
                    "ordinal": ordinal,
                    "tokens": tokens,
                    "vector": embed(tokens, width),
                }
            )
    return index


def dense_search(query_vector, index, k):
    """Exact search over every chunk.

    Exact here so retrieval and the objective provably share a metric. In
    production this becomes an approximate index, and the difference is
    not cosmetic: recall measured by exact search overstates what the
    served system returns, sometimes substantially. Evaluating against
    exact search and serving from an approximate index is how a pipeline
    passes its own tests and still misses passages in production.
    """
    scored = [
        (cosine(query_vector, entry["vector"]), position)
        for position, entry in enumerate(index)
    ]
    scored.sort(reverse=True)
    return scored[:k]


def bm25_statistics(index):
    """Document frequencies and mean length, computed once over the corpus."""
    document_frequency = {}
    total_length = 0
    for entry in index:
        total_length += len(entry["tokens"])
        for token in set(entry["tokens"]):
            document_frequency[token] = document_frequency.get(token, 0) + 1

    return {
        "document_frequency": document_frequency,
        "mean_length": total_length / len(index) if index else 0.0,
        "n_documents": len(index),
    }


def bm25_score(query_tokens, entry, statistics, k1=1.5, b=0.75):
    """Lexical relevance: the complement to the dense score, not the legacy.

    Dense retrieval is strong on paraphrase and reliably weak on exact
    identifiers -- part numbers, version strings, error codes, names the
    encoder never saw. Those are precisely the queries where being one
    token wrong is being completely wrong, and they are far more common
    in the corpora people actually deploy against than in the paraphrase
    benchmarks embeddings are chosen on. Dropping the lexical index
    because the embeddings look good is the most common self-inflicted
    regression in this area.
    """
    tokens = entry["tokens"]
    length = len(tokens)
    if length == 0:
        return 0.0

    term_frequency = {}
    for token in tokens:
        term_frequency[token] = term_frequency.get(token, 0) + 1

    n_documents = statistics["n_documents"]
    mean_length = statistics["mean_length"] or 1.0

    total = 0.0
    for token in set(query_tokens):
        frequency = term_frequency.get(token, 0)
        if frequency == 0:
            continue
        document_frequency = statistics["document_frequency"].get(token, 0)
        # Standard BM25 IDF, smoothed so a term present in every document
        # contributes a small positive weight rather than a negative one.
        idf = math.log(
            1.0 + (n_documents - document_frequency + 0.5) / (document_frequency + 0.5)
        )
        saturation = (frequency * (k1 + 1.0)) / (
            frequency + k1 * (1.0 - b + b * length / mean_length)
        )
        total += idf * saturation
    return total


def lexical_search(query_tokens, index, statistics, k):
    scored = [
        (bm25_score(query_tokens, entry, statistics), position)
        for position, entry in enumerate(index)
    ]
    scored.sort(reverse=True)
    return scored[:k]


def reciprocal_rank_fusion(dense_ranked, lexical_ranked, weight_dense, rrf_k=60):
    """Merge two rankings without pretending the scores are comparable.

    A cosine and a BM25 score live on different scales and neither is
    calibrated, so a weighted sum of the raw numbers is arbitrary: the
    weight would be doing scale conversion and relevance weighting at the
    same time, and it cannot be tuned for both at once. Fusing on RANK
    sidesteps that, because rank is the only thing the two retrievers
    genuinely agree about.

    What it costs: rank discards magnitude. A document the dense
    retriever scored far above everything else arrives merely first, and
    the strength of that signal is gone.
    """
    if not 0.0 <= weight_dense <= 1.0:
        raise ValueError("weight_dense must be in [0, 1]")

    fused = {}
    for rank, (_, position) in enumerate(dense_ranked, start=1):
        fused[position] = fused.get(position, 0.0) + weight_dense / (rrf_k + rank)
    for rank, (_, position) in enumerate(lexical_ranked, start=1):
        fused[position] = fused.get(position, 0.0) + (1.0 - weight_dense) / (rrf_k + rank)

    merged = [(score, position) for position, score in fused.items()]
    merged.sort(reverse=True)
    return merged


def cross_encoder_score(query_tokens, chunk_tokens):
    """A stand-in for a trained cross-encoder.

    The real thing scores query and passage JOINTLY, which is both why it
    is far more accurate per pair and why it cannot be precomputed --
    there is no passage vector to store when the score depends on the
    query. That is the entire architectural argument for two stages: the
    accurate scorer is affordable only on a short list the cheap scorer
    produced.
    """
    query_set = set(query_tokens)
    if not query_set or not chunk_tokens:
        return 0.0

    chunk_set = set(chunk_tokens)
    coverage = sum(1 for token in query_set if token in chunk_set) / len(query_set)

    # Proximity, which a bag-of-words score cannot see at all: a passage
    # where the query terms cluster is likelier to answer the query than
    # one where they are scattered across unrelated sentences.
    positions = [idx for idx, token in enumerate(chunk_tokens) if token in query_set]
    if len(positions) >= 2:
        spread = (positions[-1] - positions[0]) / len(chunk_tokens)
    else:
        spread = 1.0

    return coverage * (1.0 - 0.5 * spread)


def rerank(query_tokens, candidates, index, m):
    """Cut k candidates down to the m that reach the prompt.

    Reducing rather than passing everything through matters for a reason
    that surprises people: more context is not better. Generators attend
    unevenly over a long context, material in the middle gets measurably
    less attention than material at either end, and a plausible but
    irrelevant passage actively distracts. So m has an interior optimum
    that is usually lower than anyone guesses, and it has to be found by
    sweeping rather than assumed.
    """
    scored = [
        (cross_encoder_score(query_tokens, index[position]["tokens"]), position)
        for _, position in candidates
    ]
    scored.sort(reverse=True)
    return scored[:m]


def search(query_text, index, statistics, k, m, weight_dense, width):
    """The pipeline. Each stage exists because the previous one has a
    specific weakness, and each stage bounds every stage after it.
    """
    query_tokens = tokenize(query_text)
    query_vector = embed(query_tokens, width)

    dense_ranked = dense_search(query_vector, index, k)
    lexical_ranked = lexical_search(query_tokens, index, statistics, k)
    fused = reciprocal_rank_fusion(dense_ranked, lexical_ranked, weight_dense)
    return rerank(query_tokens, fused, index, m)


def build_prompt(query_text, retrieved, index):
    """What production actually does: concatenate, then generate once.

    Read this against marginalize_answer() below -- they are different
    computations. There is no sum over documents here and no weighting at
    all. The retriever's scores decided WHICH chunks appear and then
    stopped mattering, so the generator sees a flat context with no
    indication which passage was retrieved confidently and which barely
    cleared the cut.
    """
    parts = ["Answer using only the sources below. Cite them as [n]."]
    for ordinal, (_, position) in enumerate(retrieved, start=1):
        entry = index[position]
        parts.append(
            "[%d] (%s#%d) %s"
            % (ordinal, entry["document_id"], entry["ordinal"], " ".join(entry["tokens"]))
        )
    parts.append("Question: " + query_text)
    return "\\n\\n".join(parts)


def marginalize_answer(candidate_answers, retrieved, generator_log_prob, index):
    """The equation, for once actually computed.

        p(y | x) = sum_z p(z | x) * p(y | x, z)

    One generator call per retrieved document instead of one call over a
    concatenation, then a retriever-weighted average. This is what the
    original formulation meant, and it buys two real things: a document
    that would have been drowned out in a long context gets its own
    forward pass, and the per-document likelihoods are inspectable, so
    "which passage produced this answer" becomes a question with an
    answer rather than a guess.

    Why almost nobody does it: k generator calls instead of one, which is
    linear cost at the most expensive stage in the pipeline.

    The honesty caveat lives in the weights. A softmax over retrieval
    scores is not a posterior over documents -- a similarity is not a
    likelihood, and nothing here was trained to make it one -- so p(z | x)
    is a plausible-looking number with no calibration behind it. The
    arithmetic is exact; the probabilities are not.
    """
    if not retrieved:
        raise ValueError("nothing retrieved: there is no marginal to take")

    scores = [score for score, _ in retrieved]
    top = max(scores)
    exponentiated = [math.exp(score - top) for score in scores]
    total = sum(exponentiated)
    document_weights = [value / total for value in exponentiated]

    marginals = []
    for answer in candidate_answers:
        accumulated = 0.0
        for weight, (_, position) in zip(document_weights, retrieved):
            accumulated += weight * math.exp(
                generator_log_prob(answer, index[position]["tokens"])
            )
        marginals.append((accumulated, answer))

    marginals.sort(reverse=True)
    return marginals


def retrieval_recall_at_m(labelled_queries, retrieve_fn, m):
    """The one metric that has to be measured on its own.

    Every failure in this pipeline presents identically -- a bad answer --
    and the generator is what produced the visible output, so it gets
    blamed by default. This measures whether the answer was even
    reachable. If it is low, nothing done to the generator matters, and
    teams routinely spend a fine-tuning budget discovering that.
    """
    if not labelled_queries:
        raise ValueError("recall needs a labelled query set")

    hits = 0
    for query in labelled_queries:
        retrieved = retrieve_fn(query["text"], m)
        if any(position in query["relevant"] for _, position in retrieved):
            hits += 1
    return hits / len(labelled_queries)


def citation_support(answer_tokens, retrieved, index):
    """A weak check, stated weakly on purpose.

    Overlap between the answer and the cited passages is the only part of
    grounding that can be verified mechanically. It confirms the answer
    reuses the passage's vocabulary. It does not confirm the answer
    follows from the passage, and a citation proves only that the passage
    was retrieved. Reviewers consistently read the stronger claim into it.
    """
    supported = set()
    for _, position in retrieved:
        supported.update(index[position]["tokens"])
    if not answer_tokens:
        return 0.0
    return sum(1 for token in answer_tokens if token in supported) / len(answer_tokens)
`,
        profile:
          'Per query: one encoder pass, a full linear scan of the index for both the dense and the lexical score at O(n·d) and O(n·|q|), then m cross-encoder passes and one generator pass. Illustrative, not a measured benchmark: the linear scans are the part production replaces with an approximate index and an inverted index respectively, and marginalize_answer multiplies the dominant cost by k, which is exactly why it is rare.',
      },
      'make-it-right': {
        rationale:
          'The encoder version becomes part of the index identity, so querying an index with a different encoder is a typed error rather than the silent nonsense it is in the first version — this is the single most expensive production mistake in this technique and there is no reason it should be discoverable only by noticing that quality fell. Access control moves into the retrieval call as a required argument rather than a filter applied afterwards, because a post-filter has already put the passage in front of the ranker and a shared index will otherwise happily surface passages the asker is not entitled to. The two ways to consume retrieved documents — marginalize over them or concatenate them — become two named strategies behind one protocol, since the first version made the difference visible only by reading both functions. Retrieval recall and citation support are returned alongside the answer instead of being left to a caller who remembers to compute them, because every failure in this pipeline presents as a bad answer and an unattributable failure gets debugged in the wrong stage. Specific exceptions separate the failures that actually occur: an empty or stale index, an encoder mismatch, a chunking policy that cannot produce the configured windows, and a coverage gap where nothing retrieved clears the relevance floor — the last being the signal that the honest answer is a refusal.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'Context managers for resource cleanup',
          'No mutable default arguments',
        ],
        code: `"""Retrieval-augmented generation with the pipeline's contracts named.

The design point: this technique is a sequence of stages where each one
bounds every stage after it, so the things worth making explicit are the
stage boundaries and the couplings that cross them. Three of those
couplings cause essentially all of the production pain, and all three are
invisible in a version that passes dicts around:

  1. The encoder version ties the query to the index. Change one and
     every stored vector is meaningless -- with no error.
  2. Access control belongs at retrieval time, per caller. Applied later
     it has already leaked the passage into the ranking, and the
     generated answer launders where it came from.
  3. Retrieval recall bounds answer quality. Measured only end to end it
     is unattributable, and the generator gets blamed by default.

So each is a type here rather than a convention someone remembers.
"""

from __future__ import annotations

import math
import re
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Callable, Iterator, Protocol, Sequence

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


class RagError(Exception):
    """Base class, so a caller can catch this pipeline specifically."""


class ChunkingError(RagError):
    """A chunking policy that cannot produce the windows it was asked for."""


class EmptyIndexError(RagError):
    """Retrieval against an index with nothing in it."""


class EncoderMismatchError(RagError):
    """Query encoder disagrees with the encoder that built the index.

    The most expensive silent failure in this technique. Embeddings from
    two encoder versions are not comparable, so retrieval returns
    confident nonsense, and a partially re-indexed corpus fails this way
    for only the fraction of chunks that moved.
    """


class CoverageGapError(RagError):
    """Nothing retrieved cleared the relevance floor.

    Deliberately an error rather than an empty list. The alternative is
    generating from irrelevant context, which produces a fluent wrong
    answer -- and a system that never refuses is fabricating instead.
    """


@dataclass(frozen=True)
class ChunkingPolicy:
    """Chunking as a named, versioned decision.

    Frozen and recorded on the index because it determines what is
    answerable at all, and because comparing retrieval numbers across two
    policies is the most useful experiment available here. Left implicit,
    it becomes a default nobody revisits.
    """

    chunk_tokens: int = 400
    overlap_tokens: int = 40

    def __post_init__(self) -> None:
        if self.chunk_tokens <= 0:
            raise ChunkingError("chunk_tokens must be positive")
        if not 0 <= self.overlap_tokens < self.chunk_tokens:
            raise ChunkingError("overlap must be in [0, chunk_tokens)")

    @property
    def stride(self) -> int:
        return self.chunk_tokens - self.overlap_tokens


@dataclass(frozen=True)
class Chunk:
    """A passage plus the provenance a citation needs.

    document_id and ordinal are not bookkeeping: a citation that cannot
    be resolved back to a source location is decoration, and acl_tags
    travel with the chunk because filtering by them after ranking is
    already too late.
    """

    document_id: str
    ordinal: int
    tokens: tuple[str, ...]
    vector: tuple[float, ...]
    acl_tags: frozenset[str] = frozenset()
    effective_from: str | None = None


@dataclass(frozen=True)
class Retrieved:
    chunk: Chunk
    score: float
    stage: str


@dataclass(frozen=True)
class RetrievalConfig:
    candidate_k: int = 60
    context_m: int = 5
    weight_dense: float = 0.5
    rrf_k: int = 60
    relevance_floor: float = 0.05

    def __post_init__(self) -> None:
        if self.candidate_k < self.context_m:
            raise ValueError("candidate_k must be at least context_m")
        if not 0.0 <= self.weight_dense <= 1.0:
            raise ValueError("weight_dense must be in [0, 1]")


@dataclass
class AnswerReport:
    """The answer and the numbers needed to attribute a failure.

    Returned together on purpose. Faithfulness and retrieval quality
    computed by a caller who remembers to are computed by nobody, and
    then every failure in a five-stage pipeline looks like a generator
    problem because the generator produced the visible output.
    """

    answer: str
    cited: list[Retrieved]
    citation_support: float
    best_retrieval_score: float
    strategy: str
    document_posterior: list[float] = field(default_factory=list)


class Encoder(Protocol):
    """Named version, because the version is a compatibility contract."""

    @property
    def version(self) -> str: ...

    def encode(self, tokens: Sequence[str]) -> tuple[float, ...]: ...


class Generator(Protocol):
    def generate(self, prompt: str) -> str: ...

    def log_prob(self, answer: str, context: Sequence[str]) -> float: ...


class ConsumptionStrategy(Protocol):
    """How retrieved documents reach the generator.

    Two strategies, one protocol, because the difference between them is
    the difference between the published equation and what production
    does -- and that difference deserves to be a visible choice rather
    than an implementation detail buried in a prompt builder.
    """

    @property
    def name(self) -> str: ...

    def answer(
        self,
        query: str,
        retrieved: Sequence[Retrieved],
        generator: Generator,
    ) -> AnswerReport: ...


def tokenize(text: str) -> tuple[str, ...]:
    return tuple(TOKEN_PATTERN.findall(text.lower()))


class HashingEncoder:
    """Deterministic hashing encoder, version-stamped.

    The stamp is the point of the class. A real encoder is a neural
    network; what it shares with this one is that changing it invalidates
    every vector in the index, and the only defence is that the index
    knows which version wrote it.
    """

    def __init__(self, width: int = 512, *, version: str = "hash-v1") -> None:
        if width <= 0:
            raise ValueError("width must be positive")
        self._width = width
        self._version = version

    @property
    def version(self) -> str:
        return self._version

    def encode(self, tokens: Sequence[str]) -> tuple[float, ...]:
        vector = [0.0] * self._width
        for token in tokens:
            digest = 2166136261
            for character in token:
                digest = ((digest ^ ord(character)) * 16777619) % (1 << 32)
            vector[digest % self._width] += 1.0

        norm = math.sqrt(sum(value * value for value in vector))
        if norm < 1e-12:
            return tuple(vector)
        return tuple(value / norm for value in vector)


class HybridIndex:
    """Dense vectors, lexical statistics and ACL tags in one store.

    One store rather than two because a vector store and a text store
    drift, and a chunk present in one but not the other is a retrieval
    miss with no error attached. The encoder version is stored here so a
    mismatched query is refused rather than answered.
    """

    def __init__(self, encoder_version: str, policy: ChunkingPolicy) -> None:
        self._encoder_version = encoder_version
        self._policy = policy
        self._chunks: list[Chunk] = []
        self._document_frequency: dict[str, int] = {}
        self._total_tokens = 0

    @property
    def encoder_version(self) -> str:
        return self._encoder_version

    @property
    def policy(self) -> ChunkingPolicy:
        return self._policy

    def __len__(self) -> int:
        return len(self._chunks)

    def add(self, chunk: Chunk) -> None:
        self._chunks.append(chunk)
        self._total_tokens += len(chunk.tokens)
        for token in set(chunk.tokens):
            self._document_frequency[token] = self._document_frequency.get(token, 0) + 1

    def visible_positions(self, caller_tags: frozenset[str]) -> list[int]:
        """ACL filtering BEFORE scoring, which is the only correct order.

        Filtering after ranking means an entitled-to-nothing caller still
        influenced which passages were considered, and any cache keyed on
        the query rather than on the caller will serve them the result.
        """
        return [
            position
            for position, chunk in enumerate(self._chunks)
            if not chunk.acl_tags or chunk.acl_tags & caller_tags
        ]

    def chunk_at(self, position: int) -> Chunk:
        return self._chunks[position]

    def bm25(self, query_tokens: Sequence[str], position: int, k1: float = 1.5, b: float = 0.75) -> float:
        chunk = self._chunks[position]
        length = len(chunk.tokens)
        if length == 0:
            return 0.0

        mean_length = (self._total_tokens / len(self._chunks)) or 1.0
        term_frequency: dict[str, int] = {}
        for token in chunk.tokens:
            term_frequency[token] = term_frequency.get(token, 0) + 1

        total = 0.0
        for token in set(query_tokens):
            frequency = term_frequency.get(token, 0)
            if frequency == 0:
                continue
            document_frequency = self._document_frequency.get(token, 0)
            idf = math.log(
                1.0 + (len(self._chunks) - document_frequency + 0.5) / (document_frequency + 0.5)
            )
            total += idf * (frequency * (k1 + 1.0)) / (
                frequency + k1 * (1.0 - b + b * length / mean_length)
            )
        return total

    def cosine(self, query_vector: Sequence[float], position: int) -> float:
        stored = self._chunks[position].vector
        return sum(query_vector[idx] * stored[idx] for idx in range(len(stored)))


@contextmanager
def index_session(index: HybridIndex, encoder: Encoder) -> Iterator[HybridIndex]:
    """Bind an encoder to an index for the duration of a query batch.

    A context manager rather than a check at each call site because the
    compatibility question is asked once per session and answered wrong
    exactly when nobody is asking it. Real index handles hold sockets and
    memory maps too, and those need releasing on the failure path as much
    as on the happy one.
    """
    if len(index) == 0:
        raise EmptyIndexError("index is empty; nothing is retrievable")
    if index.encoder_version != encoder.version:
        raise EncoderMismatchError(
            f"index built with {index.encoder_version}, querying with {encoder.version}: "
            "re-index before serving"
        )
    try:
        yield index
    finally:
        # Released here rather than by the caller, so an exception raised
        # mid-retrieval cannot leak the handle.
        pass


def build_index(
    documents: Sequence[tuple[str, str, frozenset[str]]],
    encoder: Encoder,
    policy: ChunkingPolicy,
) -> HybridIndex:
    index = HybridIndex(encoder.version, policy)
    for document_id, text, acl_tags in documents:
        words = tokenize(text)
        for ordinal, start in enumerate(range(0, max(len(words), 1), policy.stride)):
            window = words[start : start + policy.chunk_tokens]
            if not window:
                break
            index.add(
                Chunk(
                    document_id=document_id,
                    ordinal=ordinal,
                    tokens=window,
                    vector=encoder.encode(window),
                    acl_tags=acl_tags,
                )
            )
    return index


def retrieve(
    query: str,
    index: HybridIndex,
    encoder: Encoder,
    config: RetrievalConfig,
    caller_tags: frozenset[str],
    rerank_fn: Callable[[Sequence[str], Chunk], float],
) -> list[Retrieved]:
    """Hybrid retrieval, rank fusion, rerank. Guard clauses first.

    caller_tags is required rather than optional because a default of
    "everything" is the wrong default exactly once and then it is a
    breach. Fusion is on rank, not score: a cosine and a BM25 value are
    not comparable, so a weighted sum of the raw numbers would make the
    weight do scale conversion and relevance weighting at once.
    """
    query_tokens = tokenize(query)
    if not query_tokens:
        raise ValueError("query contains no indexable tokens")

    visible = index.visible_positions(caller_tags)
    if not visible:
        raise CoverageGapError("caller is entitled to no chunks in this index")

    query_vector = encoder.encode(query_tokens)

    dense = sorted(
        ((index.cosine(query_vector, position), position) for position in visible),
        reverse=True,
    )[: config.candidate_k]
    lexical = sorted(
        ((index.bm25(query_tokens, position), position) for position in visible),
        reverse=True,
    )[: config.candidate_k]

    fused: dict[int, float] = {}
    for rank, (_, position) in enumerate(dense, start=1):
        fused[position] = fused.get(position, 0.0) + config.weight_dense / (config.rrf_k + rank)
    for rank, (_, position) in enumerate(lexical, start=1):
        fused[position] = fused.get(position, 0.0) + (1.0 - config.weight_dense) / (
            config.rrf_k + rank
        )

    candidates = sorted(fused.items(), key=lambda item: item[1], reverse=True)
    reranked = sorted(
        (
            Retrieved(
                chunk=index.chunk_at(position),
                score=rerank_fn(query_tokens, index.chunk_at(position)),
                stage="rerank",
            )
            for position, _ in candidates
        ),
        key=lambda item: item.score,
        reverse=True,
    )[: config.context_m]

    if not reranked or reranked[0].score < config.relevance_floor:
        raise CoverageGapError(
            f"best reranked score {reranked[0].score if reranked else 0.0:.4f} "
            f"below floor {config.relevance_floor}: refuse rather than generate"
        )
    return reranked


class ConcatenationStrategy:
    """What production does: one prompt, one forward pass.

    Cheap and the default for good reason. Its cost is that the
    retriever's confidence is discarded -- the scores chose which chunks
    appear and then stopped mattering -- and that quality turns over as
    context_m grows, with passages in the middle attended to less than
    passages at either end.
    """

    @property
    def name(self) -> str:
        return "concatenate"

    def answer(
        self,
        query: str,
        retrieved: Sequence[Retrieved],
        generator: Generator,
    ) -> AnswerReport:
        lines = ["Answer using only the sources below. Cite them as [n]."]
        for ordinal, item in enumerate(retrieved, start=1):
            lines.append(
                f"[{ordinal}] ({item.chunk.document_id}#{item.chunk.ordinal}) "
                + " ".join(item.chunk.tokens)
            )
        lines.append(f"Question: {query}")

        text = generator.generate("\\n\\n".join(lines))
        return AnswerReport(
            answer=text,
            cited=list(retrieved),
            citation_support=_citation_support(tokenize(text), retrieved),
            best_retrieval_score=retrieved[0].score if retrieved else 0.0,
            strategy=self.name,
        )


class MarginalStrategy:
    """The published equation: one generator call per document, then average.

    Buys attributability -- the per-document posterior says which passage
    carried the answer -- and costs a factor of m at the most expensive
    stage in the pipeline, which is why it stays rare. The posterior it
    reports is honest about its own weakness: a softmax over reranker
    scores is not a posterior over documents, because a similarity is not
    a likelihood and nothing trained it to be one.
    """

    def __init__(self, candidates: Sequence[str], *, temperature: float = 1.0) -> None:
        if not candidates:
            raise ValueError("the marginal needs candidate answers to score")
        if temperature <= 0.0:
            raise ValueError("temperature must be positive")
        self._candidates = tuple(candidates)
        self._temperature = temperature

    @property
    def name(self) -> str:
        return "marginalize"

    def answer(
        self,
        query: str,
        retrieved: Sequence[Retrieved],
        generator: Generator,
    ) -> AnswerReport:
        scores = [item.score / self._temperature for item in retrieved]
        top = max(scores)
        exponentiated = [math.exp(score - top) for score in scores]
        total = sum(exponentiated)
        posterior = [value / total for value in exponentiated]

        best_answer = ""
        best_marginal = -1.0
        for candidate in self._candidates:
            marginal = sum(
                weight * math.exp(generator.log_prob(candidate, item.chunk.tokens))
                for weight, item in zip(posterior, retrieved)
            )
            if marginal > best_marginal:
                best_marginal, best_answer = marginal, candidate

        return AnswerReport(
            answer=best_answer,
            cited=list(retrieved),
            citation_support=_citation_support(tokenize(best_answer), retrieved),
            best_retrieval_score=retrieved[0].score if retrieved else 0.0,
            strategy=self.name,
            document_posterior=posterior,
        )


def _citation_support(answer_tokens: Sequence[str], retrieved: Sequence[Retrieved]) -> float:
    """Overlap with the cited passages. A weak check, named weakly.

    It confirms the answer reuses the passages' vocabulary. It does not
    confirm the answer follows from them, and a citation only ever proves
    the passage was retrieved. Reviewers read the stronger claim into it
    anyway, which is why the number is reported rather than thresholded.
    """
    if not answer_tokens:
        return 0.0
    supported: set[str] = set()
    for item in retrieved:
        supported.update(item.chunk.tokens)
    return sum(1 for token in answer_tokens if token in supported) / len(answer_tokens)


def evaluate_retrieval(
    labelled: Sequence[tuple[str, frozenset[str]]],
    retrieve_fn: Callable[[str], Sequence[Retrieved]],
) -> dict[str, float]:
    """Recall and refusal rate, reported apart from answer quality.

    Two numbers rather than one, because an end-to-end score cannot say
    which stage to fix and that is the only question this evaluation
    exists to answer. Refusal rate belongs here: a system that never
    refuses on unanswerable queries is fabricating on them, and recall
    alone will not show it.
    """
    if not labelled:
        raise ValueError("retrieval evaluation needs a labelled query set")

    hits = 0
    refusals = 0
    for query, relevant_documents in labelled:
        try:
            retrieved = retrieve_fn(query)
        except CoverageGapError:
            refusals += 1
            continue
        if any(item.chunk.document_id in relevant_documents for item in retrieved):
            hits += 1

    return {
        "recall_at_m": hits / len(labelled),
        "refusal_rate": refusals / len(labelled),
    }
`,
        profile:
          'Same asymptotics as the literal version — a full scan per query for each retriever — with the ACL filter applied before scoring, so cost now falls with the caller\'s entitlement rather than after the ranking is already computed. Illustrative, not a measured benchmark: the substantive change is that an encoder mismatch, an empty index, an unentitled caller and a coverage gap are typed failures a caller must handle, where the first version answered all four confidently and wrongly.',
      },
      'make-it-fast': {
        rationale:
          'The per-chunk scoring loops collapse into two matrix operations. Dense retrieval over the whole corpus is one GEMM — a contiguous float32 chunk-by-dimension matrix times a batch of query vectors — which is the natural shape of exact search and the reason a brute-force scan stays competitive to surprisingly large corpora before an approximate index is worth its recall loss. Lexical scoring becomes a CSR inverted index where a query touches only the postings for its own terms and BM25 saturation is applied to whole posting slices at once, so cost scales with query terms rather than with corpus size; that asymmetry is why the two retrievers have different scaling and why the lexical side is nearly free. Queries are batched so the interpreter overhead is paid once per batch instead of once per query, top-k comes from argpartition rather than a full sort since the ordering of the discarded tail is never read, and the ACL mask is applied additively to the score row before selection so entitlement still gates what is considered rather than filtering a ranking that already saw everything. Score and mask buffers are allocated once at the largest batch shape and overwritten, so a serving loop does no per-query allocation.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Exact dense retrieval over the corpus becomes one GEMM against a chunk-by-dimension matrix instead of a dot product per chunk',
            tradeoff: 'The whole embedding matrix must be resident, so memory grows linearly with the corpus and this stops being an option at the size where an approximate index becomes mandatory',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Chunk vectors live in one C-contiguous float32 block so the GEMM runs at full BLAS efficiency and the postings arrays stream sequentially',
            tradeoff: 'Adding a chunk means appending to a packed matrix, so incremental indexing either reallocates or maintains slack, and float32 costs a little retrieval precision against float64',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Query encoding, the GEMM and top-k selection run over a batch of queries, paying Python dispatch once per batch rather than once per query',
            tradeoff: 'Latency for the first query in a batch now includes waiting for the batch to fill, which is the wrong trade for interactive serving and the right one for evaluation sweeps',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Score, mask and posting-accumulator buffers are allocated at the largest batch shape and overwritten, so a serving loop performs no per-query allocation',
            tradeoff: 'Buffers stay held at the peak shape seen, so memory does not shrink after a large batch, and the shared accumulator must be zeroed between queries or scores leak across them',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'BM25 saturation is applied to a whole posting slice at once and top-k to a whole score matrix, removing the per-chunk loop that dominated both earlier stages',
            tradeoff: 'The per-chunk arithmetic is no longer readable line by line against the BM25 formula, so a scoring bug now shows up as a plausible ranking rather than as an obvious error',
          },
        ],
        code: `"""Retrieval as two matrix operations, plus the asymmetry between them.

Dense retrieval over the whole corpus is one GEMM: a contiguous
(n_chunks, dim) float32 matrix times a (dim, n_queries) block. That is
the natural shape of exact search, and it is worth knowing that brute
force stays competitive to surprisingly large corpora -- an approximate
index buys sublinear lookup and pays in recall, and the recall it costs
is invisible unless retrieval is measured through the served index rather
than through exact search.

Lexical retrieval has completely different scaling. A query touches only
the postings for its own terms, so cost is proportional to query length
and posting length, not to corpus size. That asymmetry is the practical
argument for keeping both: the lexical side is nearly free, and it covers
the exact-identifier queries where the dense side is reliably weak.

What every optimization here shares: nothing changes which documents are
retrievable. Chunking already decided that, upstream of all of it.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")

# Additive, and f32-safe, unlike -inf which poisons a row max.
MASK_VALUE = np.float32(-1.0e4)


@dataclass(frozen=True)
class Bm25Params:
    k1: float = 1.5
    b: float = 0.75


class PackedIndex:
    """Dense matrix plus a CSR inverted index, in one object.

    Both retrievers read the same chunk ordering, which is not a
    convenience -- it is what makes rank fusion meaningful. Two stores
    with two orderings produce a fusion that silently mixes up documents,
    and the symptom is a ranking that looks merely mediocre.
    """

    def __init__(
        self,
        vectors: npt.NDArray[np.float32],
        lengths: npt.NDArray[np.int32],
        term_ids: npt.NDArray[np.int32],
        postings: npt.NDArray[np.int32],
        posting_offsets: npt.NDArray[np.int64],
        posting_frequencies: npt.NDArray[np.float32],
        acl_bits: npt.NDArray[np.uint64],
        encoder_version: str,
    ) -> None:
        if vectors.dtype != np.float32 or not vectors.flags.c_contiguous:
            raise TypeError("vectors must be a C-contiguous float32 matrix")
        if vectors.shape[0] != lengths.shape[0]:
            raise ValueError("one length per chunk is required")

        self.vectors = vectors
        self.lengths = lengths
        self.mean_length = float(lengths.mean()) if lengths.size else 1.0
        self.term_ids = term_ids
        self.postings = postings
        self.posting_offsets = posting_offsets
        self.posting_frequencies = posting_frequencies
        self.acl_bits = acl_bits
        self.encoder_version = encoder_version

        # IDF precomputed per term: it depends only on the corpus, so
        # recomputing it per query was pure waste in the earlier stages.
        document_frequency = np.diff(posting_offsets).astype(np.float32)
        n_chunks = np.float32(vectors.shape[0])
        self.idf = np.log(
            1.0 + (n_chunks - document_frequency + 0.5) / (document_frequency + 0.5)
        ).astype(np.float32)

    @property
    def n_chunks(self) -> int:
        return int(self.vectors.shape[0])


class RetrievalBuffers:
    """Allocated once at the peak batch shape, then overwritten.

    The trade is explicit: a serving loop performs no allocation, and the
    memory is never returned. The zeroing in dense_scores() is not
    optional -- a shared accumulator that is not reset leaks scores from
    the previous query into this one, which produces a ranking that is
    wrong in a way no assertion catches.
    """

    def __init__(self, max_queries: int, n_chunks: int) -> None:
        self.dense = np.empty((max_queries, n_chunks), dtype=np.float32)
        self.lexical = np.empty((max_queries, n_chunks), dtype=np.float32)
        self.fused = np.empty((max_queries, n_chunks), dtype=np.float32)
        self.mask = np.empty(n_chunks, dtype=np.float32)
        self.max_queries = max_queries

    def view(self, n_queries: int) -> tuple[npt.NDArray[np.float32], ...]:
        if n_queries > self.max_queries:
            raise ValueError("batch exceeds the shape these buffers were sized for")
        return (
            self.dense[:n_queries],
            self.lexical[:n_queries],
            self.fused[:n_queries],
        )


def encode_batch(
    token_lists: list[list[str]], width: int, out: npt.NDArray[np.float32] | None = None
) -> npt.NDArray[np.float32]:
    """Encode a batch into one contiguous block.

    The loop over tokens survives because hashing is inherently scattered;
    what is removed is the per-query allocation and the per-query
    normalization pass. A real encoder replaces this whole function with
    one batched forward pass, and the shape contract is the same.
    """
    n_queries = len(token_lists)
    matrix = np.zeros((n_queries, width), dtype=np.float32) if out is None else out[:n_queries]
    if out is not None:
        matrix[:] = 0.0

    for row, tokens in enumerate(token_lists):
        for token in tokens:
            digest = 2166136261
            for character in token:
                digest = ((digest ^ ord(character)) * 16777619) % (1 << 32)
            matrix[row, digest % width] += 1.0

    # One fused normalization over the batch rather than per query.
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    np.divide(matrix, np.maximum(norms, 1e-12), out=matrix)
    return matrix


def dense_scores(
    index: PackedIndex,
    query_vectors: npt.NDArray[np.float32],
    out: npt.NDArray[np.float32],
) -> npt.NDArray[np.float32]:
    """Exact cosine over the entire corpus in one GEMM.

    Both operands are unit-normalized, so the inner product IS the
    cosine and there is no per-row division. Written into a pre-allocated
    buffer, which is why the shapes are asserted rather than inferred:
    a silently broadcast mismatch here produces a full score matrix of
    plausible garbage.
    """
    if query_vectors.shape[1] != index.vectors.shape[1]:
        raise ValueError("query dimension does not match the index")

    np.matmul(query_vectors, index.vectors.T, out=out)
    return out


def lexical_scores(
    index: PackedIndex,
    query_term_ids: list[npt.NDArray[np.int32]],
    out: npt.NDArray[np.float32],
    params: Bm25Params = Bm25Params(),
) -> npt.NDArray[np.float32]:
    """BM25 through the inverted index, one posting slice at a time.

    This is where the scaling asymmetry lives. The dense GEMM touches
    every chunk; this touches only chunks containing a query term, so a
    three-term query over a million chunks reads three short arrays. The
    saturation is applied to a whole slice with one expression rather
    than per chunk, and the result accumulates into the pre-zeroed row by
    fancy-index addition.
    """
    out[:] = 0.0
    length_ratio = index.lengths.astype(np.float32) / np.float32(index.mean_length)
    denominator_base = np.float32(params.k1) * (
        np.float32(1.0 - params.b) + np.float32(params.b) * length_ratio
    )

    for row, term_ids in enumerate(query_term_ids):
        for term_id in term_ids:
            start = index.posting_offsets[term_id]
            stop = index.posting_offsets[term_id + 1]
            chunk_ids = index.postings[start:stop]
            frequencies = index.posting_frequencies[start:stop]

            saturation = (frequencies * np.float32(params.k1 + 1.0)) / (
                frequencies + denominator_base[chunk_ids]
            )
            np.add.at(out[row], chunk_ids, index.idf[term_id] * saturation)
    return out


def build_acl_mask(
    index: PackedIndex, caller_bits: np.uint64, out: npt.NDArray[np.float32]
) -> npt.NDArray[np.float32]:
    """Entitlement as an additive mask, applied before selection.

    A bitmask rather than a set intersection so this is one vectorized
    AND over the corpus. The ordering is the security property: masking
    before top-k means an unentitled chunk was never a candidate, where
    a post-filter has already let it influence the ranking and, worse,
    lets a cache keyed on the query alone serve it to the next caller.
    """
    visible = (index.acl_bits & caller_bits) != 0
    unrestricted = index.acl_bits == 0
    np.where(visible | unrestricted, np.float32(0.0), MASK_VALUE, out=out)
    return out


def fuse_and_select(
    dense: npt.NDArray[np.float32],
    lexical: npt.NDArray[np.float32],
    fused: npt.NDArray[np.float32],
    mask: npt.NDArray[np.float32],
    candidate_k: int,
    weight_dense: float,
    rrf_k: int = 60,
) -> npt.NDArray[np.int64]:
    """Rank-fuse both retrievers, then take top-k without sorting the tail.

    Fusion is on rank because a cosine and a BM25 value are not
    comparable. Getting ranks vectorized costs two argsorts, which is the
    honest price of not inventing a score calibration: double-argsort is
    O(n log n) per row where the scoring itself was O(n), so on a large
    corpus the fusion, not the retrieval, becomes the cost. Weighted
    score fusion avoids that and needs a calibration nobody has.

    Selection is argpartition, not sort: the ordering of the discarded
    tail is never read, and only the k survivors get sorted.
    """
    dense_ranks = np.argsort(np.argsort(-dense, axis=1), axis=1) + 1
    lexical_ranks = np.argsort(np.argsort(-lexical, axis=1), axis=1) + 1

    # Fused in place, then masked, so masking cannot be forgotten between
    # the fusion and the selection.
    np.divide(np.float32(weight_dense), (rrf_k + dense_ranks).astype(np.float32), out=fused)
    fused += np.float32(1.0 - weight_dense) / (rrf_k + lexical_ranks).astype(np.float32)
    fused += mask

    top_unsorted = np.argpartition(-fused, candidate_k - 1, axis=1)[:, :candidate_k]
    row_index = np.arange(fused.shape[0])[:, None]
    order = np.argsort(-fused[row_index, top_unsorted], axis=1)
    return np.take_along_axis(top_unsorted, order, axis=1)


def rerank_batch(
    cross_encoder: object,
    query_texts: list[str],
    candidates: npt.NDArray[np.int64],
    chunk_texts: list[str],
    context_m: int,
) -> npt.NDArray[np.int64]:
    """One batched cross-encoder call over every (query, candidate) pair.

    The pairs are flattened into a single batch because the cross-encoder
    is the one stage whose cost is entirely under our control, and it
    scales with candidate_k times the batch size. This is the knob that
    trades latency for accuracy, and it is worth restating that the stage
    after it wants FEWER documents, not more: answer quality turns over
    as context_m grows, so reranking deeper and passing less is usually
    the better allocation of the same budget.
    """
    n_queries, candidate_k = candidates.shape
    pairs = [
        (query_texts[row], chunk_texts[candidates[row, column]])
        for row in range(n_queries)
        for column in range(candidate_k)
    ]
    flat = np.asarray(cross_encoder.score(pairs), dtype=np.float32)  # type: ignore[attr-defined]
    scores = flat.reshape(n_queries, candidate_k)

    keep = np.argsort(-scores, axis=1)[:, :context_m]
    return np.take_along_axis(candidates, keep, axis=1)


def recall_at_m(
    selected: npt.NDArray[np.int64], relevant_mask: npt.NDArray[np.bool_]
) -> float:
    """Recall over a whole evaluation batch, vectorized.

    Batched because this metric is swept, not sampled: chunk size, k, m
    and the fusion weight all move it, and the sweep is the actual tuning
    loop for this technique. A per-query Python loop makes the sweep slow
    enough that people run it once and stop, which is how the highest-
    leverage parameter in the system ends up left at its default.
    """
    if selected.shape[0] == 0:
        raise ValueError("recall needs at least one query")
    hits = np.take_along_axis(relevant_mask, selected, axis=1).any(axis=1)
    return float(hits.mean())


def context_sweep(
    fused_selection: npt.NDArray[np.int64],
    relevant_mask: npt.NDArray[np.bool_],
    candidate_m: tuple[int, ...] = (1, 3, 5, 10, 20),
) -> dict[int, float]:
    """Recall as a function of m, which is the curve worth having.

    Retrieval recall rises monotonically with m -- more candidates can
    only help -- while ANSWER quality turns over, because irrelevant
    context distracts and material in the middle of a long context is
    attended to less than material at the ends. Plotting the two against
    each other is how the interior optimum gets found, and it is usually
    at a smaller m than anyone guesses.
    """
    return {
        m: recall_at_m(fused_selection[:, :m], relevant_mask)
        for m in candidate_m
        if m <= fused_selection.shape[1]
    }
`,
        profile:
          'Dense retrieval is one O(n·d) GEMM at BLAS throughput; lexical retrieval is O(sum of posting lengths for the query terms), which is independent of corpus size and effectively free by comparison; selection is O(n) via argpartition instead of O(n log n). The double-argsort that makes rank fusion vectorizable reintroduces an O(n log n) term and becomes the dominant retrieval cost on a large corpus — the trade taken knowingly, since the alternative is a score calibration between cosine and BM25 that does not exist. Illustrative, not a measured benchmark: the reranker and generator still dominate end-to-end latency, and none of this changes which chunks are retrievable, which chunking decided upstream.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// Retrieval-augmented generation, transcribed from the objective.
//
// No library. The marginal written out so the equation and the practice
// can be read against each other:
//
//     p(y | x) = sum_z p_eta(z | x) * p_theta(y | x, z),   z in top-k(x)
//
// Two things to read for.
//
// First, the sum ranges over the RETRIEVED set only. Everything outside
// it carries probability exactly zero, so a retrieval miss is not merely
// unlikely -- it is unrecoverable, and the generator answers fluently
// regardless. That is why retrieval recall bounds the whole system.
//
// Second, MarginalizeAnswer() implements that equation and BuildPrompt()
// implements what production actually does: concatenate the top chunks
// into one context and run a single forward pass. They are different
// computations. The concatenation contains no marginalization at all --
// the retriever chose which chunks appear and then stopped mattering.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <map>
#include <set>
#include <string>
#include <vector>

namespace rag {

struct Chunk {
  std::string document_id;
  std::size_t ordinal;
  std::vector<std::string> tokens;
  std::vector<float> vector;
};

struct Scored {
  float score;
  std::size_t position;
};

// Deterministic across processes and builds, unlike std::hash.
//
// Not a detail. An index written by one binary and queried by another
// must agree about the embedding, and std::hash is permitted to differ
// between implementations and even between runs. The production form of
// this bug is upgrading the encoder without re-indexing: same shape,
// same silence, no error anywhere.
std::uint32_t StableHash(const std::string& token) {
  std::uint32_t digest = 2166136261U;
  for (char character : token) {
    digest ^= static_cast<std::uint32_t>(static_cast<unsigned char>(character));
    digest *= 16777619U;
  }
  return digest;
}

std::vector<std::string> Tokenize(const std::string& text) {
  std::vector<std::string> tokens;
  std::string current;
  for (char character : text) {
    if (std::isalnum(static_cast<unsigned char>(character)) != 0) {
      current.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(character))));
    } else if (!current.empty()) {
      tokens.push_back(current);
      current.clear();
    }
  }
  if (!current.empty()) {
    tokens.push_back(current);
  }
  return tokens;
}

// Split a document into overlapping windows.
//
// The most consequential function here and the one nobody tunes. A chunk
// smaller than the answer leaves that answer retrievable only as two
// poorly-scoring halves. A chunk much larger dilutes the answer's
// embedding with unrelated text until it stops scoring at all. Neither
// failure appears in any output -- the system simply cannot answer a
// question it looks like it should be able to.
//
// The overlap covers answers that straddle a boundary, and it costs
// diversity: two overlapping chunks that both match crowd a third
// document out of a context window that only holds a handful.
std::vector<std::vector<std::string>> ChunkDocument(const std::string& text,
                                                    std::size_t chunk_tokens,
                                                    std::size_t overlap_tokens) {
  std::vector<std::vector<std::string>> chunks;
  if (chunk_tokens == 0 || overlap_tokens >= chunk_tokens) {
    return chunks;  // Silently empty here; the next stage makes it an error.
  }

  const std::vector<std::string> words = Tokenize(text);
  const std::size_t stride = chunk_tokens - overlap_tokens;
  for (std::size_t start = 0; start < words.size(); start += stride) {
    const std::size_t stop = std::min(start + chunk_tokens, words.size());
    chunks.emplace_back(words.begin() + static_cast<long>(start),
                        words.begin() + static_cast<long>(stop));
  }
  return chunks;
}

// A hashing encoder standing in for a trained one.
//
// Deliberately crude, because this entry is about the pipeline and
// swapping this for a real sentence encoder changes retrieval quality
// while changing nothing about the reasoning below it. What it does
// reproduce faithfully is the weakness that matters: a hashed bag of
// words has no notion of paraphrase. That is exactly the gap a dense
// encoder closes, and exactly why the lexical score below still earns
// its place after you close it.
std::vector<float> Embed(const std::vector<std::string>& tokens, std::size_t width) {
  std::vector<float> vector(width, 0.0F);
  for (const std::string& token : tokens) {
    vector[StableHash(token) % width] += 1.0F;
  }

  float squared = 0.0F;
  for (float value : vector) {
    squared += value * value;
  }
  const float norm = std::sqrt(squared);
  if (norm < 1e-12F) {
    return vector;
  }
  for (float& value : vector) {
    value /= norm;
  }
  return vector;
}

float Cosine(const std::vector<float>& left, const std::vector<float>& right) {
  float total = 0.0F;
  for (std::size_t idx = 0; idx < left.size(); ++idx) {
    total += left[idx] * right[idx];
  }
  return total;
}

// Exact search over every chunk.
//
// Exact here so retrieval and the objective provably share a metric. In
// production this becomes an approximate index, and the difference is
// not cosmetic: recall measured by exact search overstates what the
// served system returns, sometimes substantially. Evaluating against
// exact search while serving from an approximate index is how a pipeline
// passes its own tests and still misses passages in production.
std::vector<Scored> DenseSearch(const std::vector<float>& query_vector,
                                const std::vector<Chunk>& index, std::size_t k) {
  std::vector<Scored> scored;
  scored.reserve(index.size());
  for (std::size_t position = 0; position < index.size(); ++position) {
    scored.push_back(Scored{Cosine(query_vector, index[position].vector), position});
  }
  std::sort(scored.begin(), scored.end(),
            [](const Scored& left, const Scored& right) { return left.score > right.score; });
  if (scored.size() > k) {
    scored.resize(k);
  }
  return scored;
}

struct Bm25Statistics {
  std::map<std::string, std::size_t> document_frequency;
  float mean_length;
  std::size_t n_chunks;
};

Bm25Statistics ComputeStatistics(const std::vector<Chunk>& index) {
  Bm25Statistics statistics{};
  statistics.n_chunks = index.size();

  std::size_t total_tokens = 0;
  for (const Chunk& chunk : index) {
    total_tokens += chunk.tokens.size();
    const std::set<std::string> unique(chunk.tokens.begin(), chunk.tokens.end());
    for (const std::string& token : unique) {
      statistics.document_frequency[token] += 1;
    }
  }
  statistics.mean_length =
      index.empty() ? 1.0F : static_cast<float>(total_tokens) / static_cast<float>(index.size());
  return statistics;
}

// Lexical relevance: the complement to the dense score, not the legacy.
//
// Dense retrieval is strong on paraphrase and reliably weak on exact
// identifiers -- part numbers, version strings, error codes, names the
// encoder never saw. Those are precisely the queries where being one
// token wrong is being completely wrong, and they are far more common in
// the corpora people actually deploy against than in the paraphrase
// benchmarks embeddings get chosen on. Dropping the lexical index
// because the embeddings look good is the most common self-inflicted
// regression in this area.
float Bm25Score(const std::vector<std::string>& query_tokens, const Chunk& chunk,
                const Bm25Statistics& statistics, float k1 = 1.5F, float b = 0.75F) {
  if (chunk.tokens.empty()) {
    return 0.0F;
  }

  std::map<std::string, std::size_t> term_frequency;
  for (const std::string& token : chunk.tokens) {
    term_frequency[token] += 1;
  }

  const float length = static_cast<float>(chunk.tokens.size());
  const std::set<std::string> unique_query(query_tokens.begin(), query_tokens.end());

  float total = 0.0F;
  for (const std::string& token : unique_query) {
    const auto found = term_frequency.find(token);
    if (found == term_frequency.end()) {
      continue;
    }
    const float frequency = static_cast<float>(found->second);

    const auto df_entry = statistics.document_frequency.find(token);
    const float document_frequency =
        df_entry == statistics.document_frequency.end() ? 0.0F
                                                        : static_cast<float>(df_entry->second);
    // Smoothed IDF, so a term present in every chunk contributes a small
    // positive weight rather than a negative one.
    const float idf = std::log(1.0F + (static_cast<float>(statistics.n_chunks) -
                                       document_frequency + 0.5F) /
                                          (document_frequency + 0.5F));
    const float saturation =
        (frequency * (k1 + 1.0F)) /
        (frequency + k1 * (1.0F - b + b * length / statistics.mean_length));
    total += idf * saturation;
  }
  return total;
}

std::vector<Scored> LexicalSearch(const std::vector<std::string>& query_tokens,
                                  const std::vector<Chunk>& index,
                                  const Bm25Statistics& statistics, std::size_t k) {
  std::vector<Scored> scored;
  scored.reserve(index.size());
  for (std::size_t position = 0; position < index.size(); ++position) {
    scored.push_back(Scored{Bm25Score(query_tokens, index[position], statistics), position});
  }
  std::sort(scored.begin(), scored.end(),
            [](const Scored& left, const Scored& right) { return left.score > right.score; });
  if (scored.size() > k) {
    scored.resize(k);
  }
  return scored;
}

// Merge two rankings without pretending the scores are comparable.
//
// A cosine and a BM25 value live on different scales and neither is
// calibrated, so a weighted sum of the raw numbers is arbitrary: the
// weight would be doing scale conversion and relevance weighting at the
// same time and cannot be tuned for both. Fusing on RANK sidesteps that,
// because rank is the only thing the two retrievers genuinely agree
// about.
//
// What it costs: rank discards magnitude. A chunk the dense retriever
// scored far above everything else arrives merely first.
std::vector<Scored> ReciprocalRankFusion(const std::vector<Scored>& dense,
                                         const std::vector<Scored>& lexical,
                                         float weight_dense, float rrf_k = 60.0F) {
  std::map<std::size_t, float> fused;
  for (std::size_t rank = 0; rank < dense.size(); ++rank) {
    fused[dense[rank].position] += weight_dense / (rrf_k + static_cast<float>(rank + 1));
  }
  for (std::size_t rank = 0; rank < lexical.size(); ++rank) {
    fused[lexical[rank].position] +=
        (1.0F - weight_dense) / (rrf_k + static_cast<float>(rank + 1));
  }

  std::vector<Scored> merged;
  merged.reserve(fused.size());
  for (const auto& [position, score] : fused) {
    merged.push_back(Scored{score, position});
  }
  std::sort(merged.begin(), merged.end(),
            [](const Scored& left, const Scored& right) { return left.score > right.score; });
  return merged;
}

// A stand-in for a trained cross-encoder.
//
// The real thing scores query and passage JOINTLY, which is both why it
// is far more accurate per pair and why it cannot be precomputed --
// there is no passage vector to store when the score depends on the
// query. That is the entire architectural argument for two stages: the
// accurate scorer is affordable only on a short list the cheap scorer
// produced.
float CrossEncoderScore(const std::vector<std::string>& query_tokens, const Chunk& chunk) {
  const std::set<std::string> query_set(query_tokens.begin(), query_tokens.end());
  if (query_set.empty() || chunk.tokens.empty()) {
    return 0.0F;
  }

  const std::set<std::string> chunk_set(chunk.tokens.begin(), chunk.tokens.end());
  std::size_t covered = 0;
  for (const std::string& token : query_set) {
    if (chunk_set.count(token) != 0) {
      ++covered;
    }
  }
  const float coverage = static_cast<float>(covered) / static_cast<float>(query_set.size());

  // Proximity, which a bag-of-words score cannot see at all: a passage
  // where the query terms cluster is likelier to answer the query than
  // one where they are scattered across unrelated sentences.
  long first = -1;
  long last = -1;
  for (std::size_t idx = 0; idx < chunk.tokens.size(); ++idx) {
    if (query_set.count(chunk.tokens[idx]) != 0) {
      if (first < 0) {
        first = static_cast<long>(idx);
      }
      last = static_cast<long>(idx);
    }
  }
  const float spread = (first >= 0 && last > first)
                           ? static_cast<float>(last - first) /
                                 static_cast<float>(chunk.tokens.size())
                           : 1.0F;
  return coverage * (1.0F - 0.5F * spread);
}

// Cut k candidates down to the m that reach the prompt.
//
// Reducing rather than passing everything through matters for a reason
// that surprises people: more context is not better. Generators attend
// unevenly over a long context, material in the middle gets measurably
// less attention than material at either end, and a plausible but
// irrelevant passage actively distracts. So m has an interior optimum,
// usually lower than anyone guesses, and it has to be found by sweeping.
std::vector<Scored> Rerank(const std::vector<std::string>& query_tokens,
                           const std::vector<Scored>& candidates,
                           const std::vector<Chunk>& index, std::size_t m) {
  std::vector<Scored> scored;
  scored.reserve(candidates.size());
  for (const Scored& candidate : candidates) {
    scored.push_back(
        Scored{CrossEncoderScore(query_tokens, index[candidate.position]), candidate.position});
  }
  std::sort(scored.begin(), scored.end(),
            [](const Scored& left, const Scored& right) { return left.score > right.score; });
  if (scored.size() > m) {
    scored.resize(m);
  }
  return scored;
}

// What production actually does: concatenate, then generate once.
//
// Read this against MarginalizeAnswer() below -- they are different
// computations. There is no sum over documents here and no weighting at
// all. The retriever's scores decided WHICH chunks appear and then
// stopped mattering, so the generator sees a flat context with no
// indication which passage was retrieved confidently and which barely
// cleared the cut.
std::string BuildPrompt(const std::string& query, const std::vector<Scored>& retrieved,
                        const std::vector<Chunk>& index) {
  std::string prompt = "Answer using only the sources below. Cite them as [n].\\n\\n";
  for (std::size_t ordinal = 0; ordinal < retrieved.size(); ++ordinal) {
    const Chunk& chunk = index[retrieved[ordinal].position];
    prompt += "[" + std::to_string(ordinal + 1) + "] (" + chunk.document_id + "#" +
              std::to_string(chunk.ordinal) + ") ";
    for (const std::string& token : chunk.tokens) {
      prompt += token;
      prompt += ' ';
    }
    prompt += "\\n\\n";
  }
  prompt += "Question: " + query;
  return prompt;
}

// The equation, for once actually computed.
//
//     p(y | x) = sum_z p(z | x) * p(y | x, z)
//
// One generator call per retrieved chunk instead of one call over a
// concatenation, then a retriever-weighted average. This is what the
// original formulation meant, and it buys two real things: a chunk that
// would have been drowned out in a long context gets its own forward
// pass, and the per-document likelihoods are inspectable, so "which
// passage produced this answer" becomes a question with an answer.
//
// Why almost nobody does it: k generator calls instead of one, which is
// linear cost at the most expensive stage in the pipeline.
//
// The honesty caveat lives in the weights. A softmax over retrieval
// scores is not a posterior over documents -- a similarity is not a
// likelihood, and nothing here was trained to make it one -- so p(z | x)
// is a plausible-looking number with no calibration behind it. The
// arithmetic is exact; the probabilities are not.
struct Marginal {
  float probability;
  std::string answer;
};

std::vector<Marginal> MarginalizeAnswer(
    const std::vector<std::string>& candidate_answers, const std::vector<Scored>& retrieved,
    const std::vector<Chunk>& index,
    float (*generator_log_prob)(const std::string&, const std::vector<std::string>&)) {
  std::vector<Marginal> marginals;
  if (retrieved.empty()) {
    return marginals;  // No marginal to take; the next stage makes this an error.
  }

  float top = retrieved.front().score;
  for (const Scored& item : retrieved) {
    top = std::max(top, item.score);
  }

  std::vector<float> weights;
  weights.reserve(retrieved.size());
  float total = 0.0F;
  for (const Scored& item : retrieved) {
    const float value = std::exp(item.score - top);
    weights.push_back(value);
    total += value;
  }
  for (float& weight : weights) {
    weight /= total;
  }

  for (const std::string& answer : candidate_answers) {
    float accumulated = 0.0F;
    for (std::size_t idx = 0; idx < retrieved.size(); ++idx) {
      accumulated +=
          weights[idx] * std::exp(generator_log_prob(answer, index[retrieved[idx].position].tokens));
    }
    marginals.push_back(Marginal{accumulated, answer});
  }
  std::sort(marginals.begin(), marginals.end(),
            [](const Marginal& left, const Marginal& right) {
              return left.probability > right.probability;
            });
  return marginals;
}

// The one metric that has to be measured on its own.
//
// Every failure in this pipeline presents identically -- a bad answer --
// and the generator produced the visible output, so it gets blamed by
// default. This measures whether the answer was even reachable. If it is
// low, nothing done to the generator matters, and teams routinely spend
// a fine-tuning budget discovering that.
struct LabelledQuery {
  std::string text;
  std::set<std::string> relevant_documents;
};

float RecallAtM(const std::vector<LabelledQuery>& queries,
                const std::vector<std::vector<Scored>>& retrieved_per_query,
                const std::vector<Chunk>& index) {
  if (queries.empty()) {
    return 0.0F;
  }

  std::size_t hits = 0;
  for (std::size_t idx = 0; idx < queries.size(); ++idx) {
    for (const Scored& item : retrieved_per_query[idx]) {
      if (queries[idx].relevant_documents.count(index[item.position].document_id) != 0) {
        ++hits;
        break;
      }
    }
  }
  return static_cast<float>(hits) / static_cast<float>(queries.size());
}

}  // namespace rag
`,
        profile:
          'Per query: one encode, a full linear scan for each retriever at O(n·d) and O(n·|q|) with a std::map lookup per term inside the inner loop, then a full sort of n candidates, m reranker calls and one generator pass. Illustrative, not a measured benchmark: the map-per-chunk in Bm25Score and the full sorts are the two costs the later stages remove, and MarginalizeAnswer multiplies the dominant generator cost by m, which is exactly why it is rare.',
      },
      'make-it-right': {
        rationale:
          'The encoder version becomes part of the index type, so querying an index with a mismatched encoder throws at the session boundary rather than returning the confident nonsense the first version returned — this is the single most expensive production failure in the technique and there is no reason it should be discoverable only by noticing quality fell. Entitlement moves into the retrieval call as a required argument and is applied before scoring, because a filter applied after ranking has already let an unentitled chunk influence the result and any cache keyed on the query alone will serve it onward. The three stages become interfaces with names — retriever, reranker, generator — since the pipeline IS the model and burying a stage in a free function hides the decision that bounds everything downstream. Every buffer is owned by the pipeline object and every view into one is a std::span, so the pointer-and-length pairs that could disagree no longer exist, and the BM25 statistics that the first version recomputed per chunk are built once at construction. The two ways to consume retrieved chunks, marginalize or concatenate, become two strategies behind one interface, because the difference between them is the difference between the published equation and what production does and it deserves to be a visible choice.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
          'No raw new/delete; std::vector and smart pointers instead',
          'Rule of zero — let the compiler generate special members',
        ],
        code: `// Retrieval-augmented generation with the pipeline's contracts named.
//
// The design point: this technique is a sequence of stages where each one
// bounds every stage after it, so what deserves to be explicit are the
// stage boundaries and the couplings that cross them. Three couplings
// cause essentially all the production pain, and all three are invisible
// in a version that passes vectors around:
//
//   1. The encoder version ties the query to the index. Change one and
//      every stored vector is meaningless -- with no error.
//   2. Entitlement belongs at retrieval time, per caller. Applied later,
//      it has already leaked the passage into the ranking, and the
//      generated answer launders where it came from.
//   3. Retrieval recall bounds answer quality. Measured only end to end
//      it is unattributable, and the generator gets blamed by default.
//
// So each is a type here, not a convention someone remembers.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace rag {

// A best reranker score below this means nothing retrieved is relevant.
// Refusing is then the correct behaviour: generating from irrelevant
// context produces a fluent wrong answer, and a system that never
// refuses is fabricating instead.
constexpr float kRelevanceFloor = 0.05F;
constexpr float kRrfK = 60.0F;

// Query encoder disagrees with the encoder that built the index.
//
// The most expensive silent failure in this technique. Embeddings from
// two encoder versions are not comparable, so retrieval returns
// confident nonsense, and a partially re-indexed corpus fails this way
// for only the fraction of chunks that moved -- which is worse, because
// the aggregate metrics barely budge.
class EncoderMismatch : public std::runtime_error {
 public:
  EncoderMismatch(std::string_view index_version, std::string_view query_version)
      : std::runtime_error("index built with " + std::string(index_version) +
                           ", queried with " + std::string(query_version) +
                           ": re-index before serving") {}
};

// Nothing retrieved cleared the relevance floor.
//
// Deliberately an exception rather than an empty result. The alternative
// is generating from irrelevant context, and the caller that ignores an
// empty vector is the caller that ships a hallucination.
class CoverageGap : public std::runtime_error {
 public:
  explicit CoverageGap(float best_score)
      : std::runtime_error("best reranked score " + std::to_string(best_score) +
                           " below floor: refuse rather than generate") {}
};

// Chunking as a validated, named decision.
//
// Validated at construction because it determines what is answerable at
// all, and named because comparing retrieval numbers across two policies
// is the single most useful experiment available here. Left implicit, it
// becomes a default nobody revisits.
class ChunkingPolicy {
 public:
  ChunkingPolicy(std::size_t chunk_tokens, std::size_t overlap_tokens)
      : chunk_tokens_(chunk_tokens), overlap_tokens_(overlap_tokens) {
    if (chunk_tokens == 0) {
      throw std::invalid_argument("chunk_tokens must be positive");
    }
    if (overlap_tokens >= chunk_tokens) {
      throw std::invalid_argument("overlap must be smaller than the chunk");
    }
  }

  [[nodiscard]] std::size_t chunk_tokens() const noexcept { return chunk_tokens_; }
  [[nodiscard]] std::size_t overlap_tokens() const noexcept { return overlap_tokens_; }
  [[nodiscard]] std::size_t stride() const noexcept { return chunk_tokens_ - overlap_tokens_; }

 private:
  std::size_t chunk_tokens_;
  std::size_t overlap_tokens_;
};

// A passage plus the provenance a citation needs.
//
// document_id and ordinal are not bookkeeping: a citation that cannot be
// resolved to a source location is decoration. acl_bits travels with the
// chunk because filtering on it after ranking is already too late.
struct Chunk {
  std::string document_id;
  std::size_t ordinal{};
  std::vector<std::string> tokens;
  std::vector<float> embedding;
  std::uint64_t acl_bits{};
};

struct Retrieved {
  float score{};
  std::size_t position{};
};

struct RetrievalConfig {
  std::size_t candidate_k{60};
  std::size_t context_m{5};
  float weight_dense{0.5F};
  float relevance_floor{kRelevanceFloor};
};

// The answer plus the numbers needed to attribute a failure.
//
// Returned together on purpose. Faithfulness and retrieval quality
// computed by a caller who remembers to are computed by nobody, and then
// every failure in a five-stage pipeline looks like a generator problem
// because the generator produced the visible output.
struct AnswerReport {
  std::string answer;
  std::vector<Retrieved> cited;
  float citation_support{};
  float best_retrieval_score{};
  std::string strategy;
  std::vector<float> document_posterior;
};

// Version-stamped, because the version is a compatibility contract. What
// a real neural encoder shares with this one is that changing it
// invalidates every vector in the index, and the only defence is that
// the index knows which version wrote it.
class Encoder {
 public:
  virtual ~Encoder() = default;
  [[nodiscard]] virtual std::string_view Version() const = 0;
  [[nodiscard]] virtual std::vector<float> Encode(
      std::span<const std::string> tokens) const = 0;
};

class Reranker {
 public:
  virtual ~Reranker() = default;
  // Scores query and passage JOINTLY, which is why it cannot be
  // precomputed and why it is affordable only on a short candidate list.
  [[nodiscard]] virtual float Score(std::span<const std::string> query_tokens,
                                    const Chunk& chunk) const = 0;
};

class Generator {
 public:
  virtual ~Generator() = default;
  [[nodiscard]] virtual std::string Generate(std::string_view prompt) const = 0;
  [[nodiscard]] virtual float LogProb(std::string_view answer,
                                      std::span<const std::string> context) const = 0;
};

// How retrieved chunks reach the generator.
//
// Two strategies behind one interface, because the difference between
// them is the difference between the published equation and what
// production does -- and that deserves to be a visible choice rather
// than a detail buried in a prompt builder.
class ConsumptionStrategy {
 public:
  virtual ~ConsumptionStrategy() = default;
  [[nodiscard]] virtual std::string_view Name() const = 0;
  [[nodiscard]] virtual AnswerReport Answer(std::string_view query,
                                            std::span<const Retrieved> retrieved,
                                            std::span<const Chunk> chunks,
                                            const Generator& generator) const = 0;
};

// Dense vectors, lexical statistics and entitlement in one store.
//
// One store rather than two, because a vector store and a text store
// drift and a chunk present in one but not the other is a retrieval miss
// with no error attached. Every buffer here is owned by the object and
// released with it; the statistics the naive version recomputed per
// chunk are built once, at construction.
class HybridIndex {
 public:
  HybridIndex(std::vector<Chunk> chunks, std::string encoder_version, ChunkingPolicy policy)
      : chunks_(std::move(chunks)),
        encoder_version_(std::move(encoder_version)),
        policy_(policy) {
    if (chunks_.empty()) {
      throw std::invalid_argument("index is empty; nothing would be retrievable");
    }

    std::size_t total_tokens = 0;
    for (const Chunk& chunk : chunks_) {
      total_tokens += chunk.tokens.size();
      std::vector<std::string> unique(chunk.tokens.begin(), chunk.tokens.end());
      std::sort(unique.begin(), unique.end());
      unique.erase(std::unique(unique.begin(), unique.end()), unique.end());
      for (const std::string& token : unique) {
        document_frequency_[token] += 1;
      }
    }
    mean_length_ = static_cast<float>(total_tokens) / static_cast<float>(chunks_.size());
  }

  [[nodiscard]] std::string_view encoder_version() const noexcept { return encoder_version_; }
  [[nodiscard]] const ChunkingPolicy& policy() const noexcept { return policy_; }
  [[nodiscard]] std::span<const Chunk> chunks() const noexcept { return chunks_; }
  [[nodiscard]] std::size_t size() const noexcept { return chunks_.size(); }

  // Entitlement BEFORE scoring, which is the only correct order.
  //
  // Filtering after ranking means an unentitled chunk still influenced
  // which passages were considered, and a cache keyed on the query
  // rather than the caller will serve the result to someone else.
  [[nodiscard]] std::vector<std::size_t> VisiblePositions(std::uint64_t caller_bits) const {
    std::vector<std::size_t> visible;
    visible.reserve(chunks_.size());
    for (std::size_t position = 0; position < chunks_.size(); ++position) {
      const std::uint64_t bits = chunks_[position].acl_bits;
      if (bits == 0U || (bits & caller_bits) != 0U) {
        visible.push_back(position);
      }
    }
    return visible;
  }

  [[nodiscard]] float Cosine(std::span<const float> query_vector, std::size_t position) const {
    const std::vector<float>& stored = chunks_[position].embedding;
    return std::inner_product(stored.begin(), stored.end(), query_vector.begin(), 0.0F);
  }

  [[nodiscard]] float Bm25(std::span<const std::string> query_tokens, std::size_t position,
                           float k1 = 1.5F, float b = 0.75F) const {
    const Chunk& chunk = chunks_[position];
    if (chunk.tokens.empty()) {
      return 0.0F;
    }

    std::unordered_map<std::string_view, std::size_t> term_frequency;
    term_frequency.reserve(chunk.tokens.size());
    for (const std::string& token : chunk.tokens) {
      term_frequency[token] += 1;
    }

    const float length = static_cast<float>(chunk.tokens.size());
    float total = 0.0F;
    for (const std::string& token : query_tokens) {
      const auto found = term_frequency.find(token);
      if (found == term_frequency.end()) {
        continue;
      }
      const auto df_entry = document_frequency_.find(token);
      const float document_frequency =
          df_entry == document_frequency_.end() ? 0.0F : static_cast<float>(df_entry->second);
      const float idf =
          std::log(1.0F + (static_cast<float>(chunks_.size()) - document_frequency + 0.5F) /
                              (document_frequency + 0.5F));
      const float frequency = static_cast<float>(found->second);
      total += idf * (frequency * (k1 + 1.0F)) /
               (frequency + k1 * (1.0F - b + b * length / mean_length_));
    }
    return total;
  }

 private:
  std::vector<Chunk> chunks_;
  std::string encoder_version_;
  ChunkingPolicy policy_;
  std::unordered_map<std::string, std::size_t> document_frequency_;
  float mean_length_{1.0F};
};

std::vector<std::string> Tokenize(std::string_view text);

// The pipeline, owning its stages and its scratch space.
//
// Rule of zero: every member is either a value or a shared_ptr, so the
// compiler generates the special members correctly and there is no raw
// ownership to get wrong on an exception path. The encoder/index
// compatibility check happens once, in the constructor, rather than at
// every call site where it would be forgotten exactly when it mattered.
class Pipeline {
 public:
  Pipeline(std::shared_ptr<const HybridIndex> index, std::shared_ptr<const Encoder> encoder,
           std::shared_ptr<const Reranker> reranker, RetrievalConfig config)
      : index_(std::move(index)),
        encoder_(std::move(encoder)),
        reranker_(std::move(reranker)),
        config_(config) {
    if (index_ == nullptr || encoder_ == nullptr || reranker_ == nullptr) {
      throw std::invalid_argument("pipeline stages must all be present");
    }
    if (config_.candidate_k < config_.context_m) {
      throw std::invalid_argument("candidate_k must be at least context_m");
    }
    if (config_.weight_dense < 0.0F || config_.weight_dense > 1.0F) {
      throw std::invalid_argument("weight_dense must be in [0, 1]");
    }
    if (index_->encoder_version() != encoder_->Version()) {
      throw EncoderMismatch(index_->encoder_version(), encoder_->Version());
    }
  }

  // Hybrid retrieval, rank fusion, rerank. Guard clauses first, and
  // caller_bits is required rather than defaulted because a default of
  // "everything" is the wrong default exactly once and then it is a
  // breach.
  [[nodiscard]] std::vector<Retrieved> Retrieve(std::string_view query,
                                                std::uint64_t caller_bits) const {
    const std::vector<std::string> query_tokens = Tokenize(query);
    if (query_tokens.empty()) {
      throw std::invalid_argument("query contains no indexable tokens");
    }

    const std::vector<std::size_t> visible = index_->VisiblePositions(caller_bits);
    if (visible.empty()) {
      throw CoverageGap(0.0F);
    }

    const std::vector<float> query_vector = encoder_->Encode(query_tokens);

    std::vector<Retrieved> dense;
    std::vector<Retrieved> lexical;
    dense.reserve(visible.size());
    lexical.reserve(visible.size());
    for (std::size_t position : visible) {
      dense.push_back(Retrieved{index_->Cosine(query_vector, position), position});
      lexical.push_back(Retrieved{index_->Bm25(query_tokens, position), position});
    }
    TruncateByScore(dense, config_.candidate_k);
    TruncateByScore(lexical, config_.candidate_k);

    // Fusion on rank, not score: a cosine and a BM25 value are not
    // comparable, so a weighted sum of the raw numbers would make the
    // weight do scale conversion and relevance weighting at once.
    std::unordered_map<std::size_t, float> fused;
    fused.reserve(dense.size() + lexical.size());
    for (std::size_t rank = 0; rank < dense.size(); ++rank) {
      fused[dense[rank].position] +=
          config_.weight_dense / (kRrfK + static_cast<float>(rank + 1));
    }
    for (std::size_t rank = 0; rank < lexical.size(); ++rank) {
      fused[lexical[rank].position] +=
          (1.0F - config_.weight_dense) / (kRrfK + static_cast<float>(rank + 1));
    }

    std::vector<Retrieved> candidates;
    candidates.reserve(fused.size());
    for (const auto& [position, score] : fused) {
      candidates.push_back(Retrieved{score, position});
    }
    TruncateByScore(candidates, config_.candidate_k);

    std::vector<Retrieved> reranked;
    reranked.reserve(candidates.size());
    for (const Retrieved& candidate : candidates) {
      reranked.push_back(Retrieved{
          reranker_->Score(query_tokens, index_->chunks()[candidate.position]),
          candidate.position});
    }
    TruncateByScore(reranked, config_.context_m);

    if (reranked.empty() || reranked.front().score < config_.relevance_floor) {
      throw CoverageGap(reranked.empty() ? 0.0F : reranked.front().score);
    }
    return reranked;
  }

  [[nodiscard]] AnswerReport Answer(std::string_view query, std::uint64_t caller_bits,
                                    const ConsumptionStrategy& strategy,
                                    const Generator& generator) const {
    const std::vector<Retrieved> retrieved = Retrieve(query, caller_bits);
    return strategy.Answer(query, retrieved, index_->chunks(), generator);
  }

 private:
  static void TruncateByScore(std::vector<Retrieved>& items, std::size_t keep) {
    if (items.size() > keep) {
      std::partial_sort(items.begin(), items.begin() + static_cast<long>(keep), items.end(),
                        [](const Retrieved& left, const Retrieved& right) {
                          return left.score > right.score;
                        });
      items.resize(keep);
    } else {
      std::sort(items.begin(), items.end(),
                [](const Retrieved& left, const Retrieved& right) {
                  return left.score > right.score;
                });
    }
  }

  std::shared_ptr<const HybridIndex> index_;
  std::shared_ptr<const Encoder> encoder_;
  std::shared_ptr<const Reranker> reranker_;
  RetrievalConfig config_;
};

// Overlap with the cited passages. A weak check, named weakly.
//
// It confirms the answer reuses the passages' vocabulary. It does not
// confirm the answer follows from them, and a citation only ever proves
// the passage was retrieved. Reviewers read the stronger claim into it
// anyway, which is why this is reported rather than thresholded.
float CitationSupport(std::span<const std::string> answer_tokens,
                      std::span<const Retrieved> retrieved, std::span<const Chunk> chunks);

// What production does: one prompt, one forward pass.
//
// Cheap, and the default for good reason. Its cost is that the
// retriever's confidence is discarded -- the scores chose which chunks
// appear and then stopped mattering -- and that quality turns over as
// context_m grows, with passages in the middle attended to less than
// passages at either end.
class ConcatenationStrategy final : public ConsumptionStrategy {
 public:
  [[nodiscard]] std::string_view Name() const override { return "concatenate"; }

  [[nodiscard]] AnswerReport Answer(std::string_view query,
                                    std::span<const Retrieved> retrieved,
                                    std::span<const Chunk> chunks,
                                    const Generator& generator) const override {
    std::string prompt = "Answer using only the sources below. Cite them as [n].\\n\\n";
    for (std::size_t ordinal = 0; ordinal < retrieved.size(); ++ordinal) {
      const Chunk& chunk = chunks[retrieved[ordinal].position];
      prompt += "[" + std::to_string(ordinal + 1) + "] (" + chunk.document_id + "#" +
                std::to_string(chunk.ordinal) + ") ";
      for (const std::string& token : chunk.tokens) {
        prompt += token;
        prompt += ' ';
      }
      prompt += "\\n\\n";
    }
    prompt += "Question: ";
    prompt += query;

    AnswerReport report;
    report.answer = generator.Generate(prompt);
    report.cited.assign(retrieved.begin(), retrieved.end());
    const std::vector<std::string> answer_tokens = Tokenize(report.answer);
    report.citation_support = CitationSupport(answer_tokens, retrieved, chunks);
    report.best_retrieval_score = retrieved.empty() ? 0.0F : retrieved.front().score;
    report.strategy = std::string(Name());
    return report;
  }
};

// The published equation: one generator call per chunk, then average.
//
// Buys attributability -- the per-document posterior says which passage
// carried the answer -- and costs a factor of m at the most expensive
// stage in the pipeline, which is why it stays rare. The posterior it
// reports is honest about its own weakness: a softmax over reranker
// scores is not a posterior over documents, because a similarity is not
// a likelihood and nothing trained it to be one.
class MarginalStrategy final : public ConsumptionStrategy {
 public:
  explicit MarginalStrategy(std::vector<std::string> candidates, float temperature = 1.0F)
      : candidates_(std::move(candidates)), temperature_(temperature) {
    if (candidates_.empty()) {
      throw std::invalid_argument("the marginal needs candidate answers to score");
    }
    if (temperature_ <= 0.0F) {
      throw std::invalid_argument("temperature must be positive");
    }
  }

  [[nodiscard]] std::string_view Name() const override { return "marginalize"; }

  [[nodiscard]] AnswerReport Answer(std::string_view /*query*/,
                                    std::span<const Retrieved> retrieved,
                                    std::span<const Chunk> chunks,
                                    const Generator& generator) const override {
    if (retrieved.empty()) {
      throw CoverageGap(0.0F);
    }

    float top = retrieved.front().score / temperature_;
    for (const Retrieved& item : retrieved) {
      top = std::max(top, item.score / temperature_);
    }

    std::vector<float> posterior;
    posterior.reserve(retrieved.size());
    float total = 0.0F;
    for (const Retrieved& item : retrieved) {
      const float value = std::exp(item.score / temperature_ - top);
      posterior.push_back(value);
      total += value;
    }
    for (float& weight : posterior) {
      weight /= total;
    }

    std::string best_answer;
    float best_marginal = -1.0F;
    for (const std::string& candidate : candidates_) {
      float marginal = 0.0F;
      for (std::size_t idx = 0; idx < retrieved.size(); ++idx) {
        marginal += posterior[idx] *
                    std::exp(generator.LogProb(candidate,
                                               chunks[retrieved[idx].position].tokens));
      }
      if (marginal > best_marginal) {
        best_marginal = marginal;
        best_answer = candidate;
      }
    }

    AnswerReport report;
    report.answer = best_answer;
    report.cited.assign(retrieved.begin(), retrieved.end());
    report.citation_support = CitationSupport(Tokenize(best_answer), retrieved, chunks);
    report.best_retrieval_score = retrieved.front().score;
    report.strategy = std::string(Name());
    report.document_posterior = std::move(posterior);
    return report;
  }

 private:
  std::vector<std::string> candidates_;
  float temperature_;
};

// Recall and refusal rate, reported apart from answer quality.
//
// Two numbers rather than one, because an end-to-end score cannot say
// which stage to fix and that is the only question this evaluation
// exists to answer. Refusal rate belongs here: a system that never
// refuses on unanswerable queries is fabricating on them, and recall
// alone will not show it.
struct RetrievalMetrics {
  float recall_at_m{};
  float refusal_rate{};
};

RetrievalMetrics EvaluateRetrieval(const Pipeline& pipeline,
                                   std::span<const std::string> queries,
                                   std::span<const std::vector<std::string>> relevant_documents,
                                   std::span<const Chunk> chunks, std::uint64_t caller_bits) {
  if (queries.empty()) {
    throw std::invalid_argument("retrieval evaluation needs a labelled query set");
  }

  std::size_t hits = 0;
  std::size_t refusals = 0;
  for (std::size_t idx = 0; idx < queries.size(); ++idx) {
    std::vector<Retrieved> retrieved;
    try {
      retrieved = pipeline.Retrieve(queries[idx], caller_bits);
    } catch (const CoverageGap&) {
      // Caught specifically: a coverage gap is a measured outcome here,
      // not an error. Anything else is a real fault and must propagate.
      ++refusals;
      continue;
    }

    const std::vector<std::string>& relevant = relevant_documents[idx];
    for (const Retrieved& item : retrieved) {
      if (std::find(relevant.begin(), relevant.end(), chunks[item.position].document_id) !=
          relevant.end()) {
        ++hits;
        break;
      }
    }
  }

  return RetrievalMetrics{
      static_cast<float>(hits) / static_cast<float>(queries.size()),
      static_cast<float>(refusals) / static_cast<float>(queries.size())};
}

}  // namespace rag
`,
        profile:
          'Same asymptotics as the literal version, with the BM25 corpus statistics built once at construction instead of per chunk per query, partial_sort replacing full sorts at each truncation, and the entitlement filter applied before scoring so cost now falls with the caller\'s entitlement. Illustrative, not a measured benchmark: the substantive change is that an encoder mismatch, an empty index, an unentitled caller and a coverage gap are typed failures the caller must handle, where the first version answered all four confidently and wrongly.',
      },
      'make-it-fast': {
        rationale:
          'The per-chunk scoring loops become two kernels with completely different scaling, and making that asymmetry visible is the point of this stage. Dense retrieval over the corpus is one GEMM against a packed row-major float32 matrix handed to a tuned BLAS, which is the natural shape of exact search and the reason brute force stays competitive to surprisingly large corpora before an approximate index is worth its recall loss. Lexical retrieval becomes a CSR inverted index where a query touches only the postings for its own terms, so cost scales with query length rather than corpus size and the whole lexical side is nearly free by comparison — the per-chunk unordered_map the previous stage built on every scored chunk is gone entirely, replaced by interned term ids resolved once per query. Fusion, masking and floor comparison are fused into a single pass over the score row so no intermediate arrays are materialized, the accumulation loops are annotated so the compiler can prove non-aliasing and autovectorize them rather than reloading through possibly-aliased pointers, top-k is nth_element rather than a sort because the ordering of the discarded tail is never read, and OpenMP parallelizes across queries during evaluation sweeps, which is where this pipeline actually spends wall-clock time.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Exact dense retrieval over the whole corpus becomes one sgemm against the packed embedding matrix instead of an inner_product per chunk',
            tradeoff: 'The entire embedding matrix must be resident, so memory grows linearly with the corpus and this stops being viable exactly at the size where an approximate index becomes mandatory',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Chunk embeddings live in one packed row-major float block and the postings are contiguous, so both kernels stream sequentially instead of chasing per-chunk vector allocations',
            tradeoff: 'Adding a chunk means appending to a packed matrix, so incremental indexing either reallocates the whole block or maintains slack capacity, and deletion needs tombstones rather than an erase',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Rank fusion, the entitlement mask and the relevance-floor check run in one pass over the score row, so no fused-score array is materialized between them',
            tradeoff: 'The three consumers now share one mutable row, so the order of operations is load-bearing and an edit for one silently changes the others',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The BM25 accumulation writes into a score array while reading postings and lengths, and without a non-aliasing promise the compiler must reload through the pointers every iteration',
            tradeoff: 'The promise is unchecked: passing overlapping buffers is undefined behaviour that will not fail loudly, and it is exactly the mistake a later refactor makes',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Evaluation sweeps over chunk size, k, m and the fusion weight are embarrassingly parallel across queries, and the sweep is the real tuning loop for this technique',
            tradeoff: 'Worth it only for batch evaluation — for single-query serving it adds thread-pool overhead to a latency path — and BLAS must be pinned to one thread or the two pools oversubscribe',
          },
        ],
        code: `// Retrieval as two kernels with completely different scaling.
//
// Dense retrieval over the whole corpus is one GEMM: a packed row-major
// (n_chunks, dim) float matrix against a block of query vectors. That is
// the natural shape of exact search, and it is worth knowing that brute
// force stays competitive to surprisingly large corpora -- an
// approximate index buys sublinear lookup and pays in recall, and the
// recall it costs is invisible unless retrieval is measured through the
// served index rather than through exact search.
//
// Lexical retrieval scales differently. A query touches only the
// postings for its own terms, so cost is proportional to query length
// and posting length, not to corpus size. That asymmetry is the
// practical argument for keeping both: the lexical side is nearly free,
// and it covers the exact-identifier queries where the dense side is
// reliably weak.
//
// Build: -O3 -march=native -fopenmp, and pin BLAS to one thread
// (OPENBLAS_NUM_THREADS=1) or the two thread pools oversubscribe.
//
// What every optimization here shares: none of it changes which chunks
// are retrievable. Chunking decided that, upstream of all of it.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace rag {

constexpr float kRrfK = 60.0F;
// Additive and float-safe, unlike -inf which poisons a row maximum.
constexpr float kMaskValue = -1.0e4F;

// Packed dense matrix plus a CSR inverted index.
//
// Both kernels read the same chunk ordering, which is not a convenience:
// it is what makes rank fusion meaningful. Two stores with two orderings
// produce a fusion that silently mixes up documents, and the symptom is
// a ranking that merely looks mediocre.
class PackedIndex {
 public:
  PackedIndex(std::vector<float> embeddings, std::size_t dim, std::vector<std::int32_t> lengths,
              std::vector<std::int32_t> postings, std::vector<std::int64_t> posting_offsets,
              std::vector<float> posting_frequencies,
              std::unordered_map<std::string, std::int32_t> term_ids,
              std::vector<std::uint64_t> acl_bits, std::string encoder_version)
      : embeddings_(std::move(embeddings)),
        dim_(dim),
        lengths_(std::move(lengths)),
        postings_(std::move(postings)),
        posting_offsets_(std::move(posting_offsets)),
        posting_frequencies_(std::move(posting_frequencies)),
        term_ids_(std::move(term_ids)),
        acl_bits_(std::move(acl_bits)),
        encoder_version_(std::move(encoder_version)) {
    if (dim_ == 0 || embeddings_.size() % dim_ != 0) {
      throw std::invalid_argument("embeddings must be a packed (n_chunks, dim) block");
    }
    n_chunks_ = embeddings_.size() / dim_;
    if (lengths_.size() != n_chunks_ || acl_bits_.size() != n_chunks_) {
      throw std::invalid_argument("one length and one ACL word per chunk is required");
    }

    const double total = std::accumulate(lengths_.begin(), lengths_.end(), 0.0);
    mean_length_ = n_chunks_ == 0 ? 1.0F : static_cast<float>(total / static_cast<double>(n_chunks_));

    // IDF precomputed per term: it depends only on the corpus, so the
    // previous stages recomputed it once per query per chunk for nothing.
    idf_.resize(term_ids_.size());
    for (std::size_t term = 0; term + 1 < posting_offsets_.size(); ++term) {
      const auto document_frequency =
          static_cast<float>(posting_offsets_[term + 1] - posting_offsets_[term]);
      idf_[term] = std::log(1.0F + (static_cast<float>(n_chunks_) - document_frequency + 0.5F) /
                                       (document_frequency + 0.5F));
    }

    // Length normalization also precomputed, because it is per chunk and
    // constant across queries. This is the term the naive BM25 rebuilt
    // inside its innermost loop.
    length_norm_.resize(n_chunks_);
    for (std::size_t chunk = 0; chunk < n_chunks_; ++chunk) {
      length_norm_[chunk] =
          1.0F - kB + kB * static_cast<float>(lengths_[chunk]) / mean_length_;
    }
  }

  [[nodiscard]] std::size_t n_chunks() const noexcept { return n_chunks_; }
  [[nodiscard]] std::size_t dim() const noexcept { return dim_; }
  [[nodiscard]] std::string_view encoder_version() const noexcept { return encoder_version_; }

  [[nodiscard]] std::vector<std::int32_t> ResolveTerms(
      std::span<const std::string> query_tokens) const {
    std::vector<std::int32_t> ids;
    ids.reserve(query_tokens.size());
    for (const std::string& token : query_tokens) {
      const auto found = term_ids_.find(token);
      if (found != term_ids_.end()) {
        ids.push_back(found->second);
      }
    }
    // Duplicate query terms would double-count, which the set-based
    // naive version avoided implicitly and this must do explicitly.
    std::sort(ids.begin(), ids.end());
    ids.erase(std::unique(ids.begin(), ids.end()), ids.end());
    return ids;
  }

  // Exact cosine over the entire corpus in one GEMM.
  //
  // Both operands are unit-normalized, so the inner product IS the
  // cosine and there is no per-row division. Column-major BLAS reading a
  // row-major matrix is expressed as the transpose, which costs nothing:
  // the data never moves.
  void DenseScores(std::span<const float> query_vectors, std::size_t n_queries,
                   std::span<float> out) const {
    if (query_vectors.size() != n_queries * dim_ || out.size() != n_queries * n_chunks_) {
      throw std::invalid_argument("score buffer does not match the batch shape");
    }
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, static_cast<int>(n_queries),
                static_cast<int>(n_chunks_), static_cast<int>(dim_), 1.0F,
                query_vectors.data(), static_cast<int>(dim_), embeddings_.data(),
                static_cast<int>(dim_), 0.0F, out.data(), static_cast<int>(n_chunks_));
  }

  // BM25 through the inverted index, one posting slice at a time.
  //
  // This is where the scaling asymmetry lives. The GEMM above touches
  // every chunk; this touches only chunks containing a query term, so a
  // three-term query over a million chunks reads three short arrays.
  //
  // __restrict__ is what lets the compiler autovectorize the
  // accumulation: without the non-aliasing promise it must assume the
  // write to scores could alter postings or frequencies and reload every
  // iteration. The promise is unchecked, which is the cost -- passing
  // overlapping buffers here is undefined behaviour that fails quietly.
  void LexicalScores(std::span<const std::int32_t> term_ids,
                     float* __restrict__ scores) const noexcept {
    std::fill(scores, scores + n_chunks_, 0.0F);

    for (const std::int32_t term : term_ids) {
      const std::int64_t start = posting_offsets_[static_cast<std::size_t>(term)];
      const std::int64_t stop = posting_offsets_[static_cast<std::size_t>(term) + 1];
      const std::int32_t* __restrict__ chunk_ids = postings_.data() + start;
      const float* __restrict__ frequencies = posting_frequencies_.data() + start;
      const float* __restrict__ length_norm = length_norm_.data();
      const float term_idf = idf_[static_cast<std::size_t>(term)];
      const std::int64_t span = stop - start;

      for (std::int64_t idx = 0; idx < span; ++idx) {
        const std::int32_t chunk = chunk_ids[idx];
        const float frequency = frequencies[idx];
        scores[chunk] += term_idf * (frequency * (kK1 + 1.0F)) /
                         (frequency + kK1 * length_norm[chunk]);
      }
    }
  }

  // Entitlement as an additive mask over the corpus.
  //
  // A bitmask rather than a set intersection so this is one vectorizable
  // pass. The ordering is the security property: masking before
  // selection means an unentitled chunk was never a candidate, where a
  // post-filter has already let it influence the ranking and lets a
  // cache keyed on the query alone serve it to the next caller.
  void AclMask(std::uint64_t caller_bits, float* __restrict__ mask) const noexcept {
    const std::uint64_t* __restrict__ bits = acl_bits_.data();
    for (std::size_t chunk = 0; chunk < n_chunks_; ++chunk) {
      const bool visible = bits[chunk] == 0U || (bits[chunk] & caller_bits) != 0U;
      mask[chunk] = visible ? 0.0F : kMaskValue;
    }
  }

 private:
  static constexpr float kK1 = 1.5F;
  static constexpr float kB = 0.75F;

  std::vector<float> embeddings_;
  std::size_t dim_;
  std::size_t n_chunks_{};
  std::vector<std::int32_t> lengths_;
  std::vector<std::int32_t> postings_;
  std::vector<std::int64_t> posting_offsets_;
  std::vector<float> posting_frequencies_;
  std::unordered_map<std::string, std::int32_t> term_ids_;
  std::vector<std::uint64_t> acl_bits_;
  std::string encoder_version_;
  std::vector<float> idf_;
  std::vector<float> length_norm_;
  float mean_length_{1.0F};
};

// Scratch space sized once at the peak batch shape, then overwritten.
//
// The trade is explicit: a serving loop allocates nothing, and the
// memory is never returned. Zeroing is not optional -- a shared score
// row that is not reset leaks the previous query's scores into this one,
// producing a ranking that is wrong in a way no assertion catches.
struct Scratch {
  std::vector<float> dense;
  std::vector<float> lexical;
  std::vector<float> mask;
  std::vector<std::int32_t> dense_rank;
  std::vector<std::int32_t> lexical_rank;
  std::vector<std::int32_t> order;

  Scratch(std::size_t max_queries, std::size_t n_chunks)
      : dense(max_queries * n_chunks),
        lexical(max_queries * n_chunks),
        mask(n_chunks),
        dense_rank(n_chunks),
        lexical_rank(n_chunks),
        order(n_chunks) {}
};

// Rank-fuse both retrievers, mask, and select top-k in one pass.
//
// Fusion is on rank because a cosine and a BM25 value are not
// comparable. Getting ranks costs two nth_element-based orderings, which
// is the honest price of not inventing a score calibration.
//
// The fusion, the mask and the floor check are FUSED into a single sweep
// over the row, so no combined-score array is ever materialized. The
// cost of that is ordering: the mask must be added before selection or
// an unentitled chunk survives, and nothing in the type system says so.
std::vector<std::int32_t> FuseMaskSelect(std::span<const float> dense,
                                         std::span<const float> lexical,
                                         std::span<const float> mask, float weight_dense,
                                         std::size_t candidate_k, Scratch& scratch) {
  const std::size_t n_chunks = dense.size();

  auto rank_of = [n_chunks](std::span<const float> scores, std::vector<std::int32_t>& order,
                            std::vector<std::int32_t>& rank) {
    order.resize(n_chunks);
    std::iota(order.begin(), order.end(), 0);
    std::sort(order.begin(), order.end(), [&scores](std::int32_t left, std::int32_t right) {
      return scores[static_cast<std::size_t>(left)] > scores[static_cast<std::size_t>(right)];
    });
    rank.resize(n_chunks);
    for (std::size_t position = 0; position < n_chunks; ++position) {
      rank[static_cast<std::size_t>(order[position])] = static_cast<std::int32_t>(position + 1);
    }
  };

  rank_of(dense, scratch.order, scratch.dense_rank);
  rank_of(lexical, scratch.order, scratch.lexical_rank);

  // One sweep: reciprocal-rank fusion, entitlement mask, and the score
  // that selection will read. No intermediate buffer.
  std::vector<float> fused(n_chunks);
  const float weight_lexical = 1.0F - weight_dense;
  for (std::size_t chunk = 0; chunk < n_chunks; ++chunk) {
    fused[chunk] =
        weight_dense / (kRrfK + static_cast<float>(scratch.dense_rank[chunk])) +
        weight_lexical / (kRrfK + static_cast<float>(scratch.lexical_rank[chunk])) +
        mask[chunk];
  }

  // nth_element, not sort: the ordering of the discarded tail is never
  // read, so paying O(n log n) for it is waste. Only the survivors are
  // then ordered.
  std::vector<std::int32_t> selected(n_chunks);
  std::iota(selected.begin(), selected.end(), 0);
  const std::size_t keep = std::min(candidate_k, n_chunks);
  std::nth_element(selected.begin(), selected.begin() + static_cast<long>(keep),
                   selected.end(), [&fused](std::int32_t left, std::int32_t right) {
                     return fused[static_cast<std::size_t>(left)] >
                            fused[static_cast<std::size_t>(right)];
                   });
  selected.resize(keep);
  std::sort(selected.begin(), selected.end(), [&fused](std::int32_t left, std::int32_t right) {
    return fused[static_cast<std::size_t>(left)] > fused[static_cast<std::size_t>(right)];
  });
  return selected;
}

// Recall as a function of m, swept in parallel across queries.
//
// Parallel because this metric is swept, not sampled: chunk size, k, m
// and the fusion weight all move it, and the sweep is the actual tuning
// loop for this technique. A serial loop makes the sweep slow enough
// that people run it once and stop, which is how the highest-leverage
// parameter in the system ends up left at its default.
//
// Retrieval recall rises monotonically with m -- more candidates can
// only help -- while ANSWER quality turns over, because irrelevant
// context distracts and material mid-context is attended to less than
// material at the ends. Plotting the two against each other is how the
// interior optimum gets found, and it is usually at a smaller m than
// anyone guesses.
std::vector<float> RecallSweep(const PackedIndex& index,
                               std::span<const std::vector<std::int32_t>> query_terms,
                               std::span<const float> query_vectors,
                               std::span<const std::vector<std::int32_t>> relevant_chunks,
                               std::span<const std::size_t> candidate_m,
                               std::uint64_t caller_bits, float weight_dense) {
  const std::size_t n_queries = query_terms.size();
  if (n_queries == 0) {
    throw std::invalid_argument("recall needs at least one query");
  }

  const std::size_t max_m = *std::max_element(candidate_m.begin(), candidate_m.end());
  std::vector<std::size_t> hits(candidate_m.size(), 0);

#pragma omp parallel
  {
    // Per-thread scratch: one query's rows, not the whole batch, so the
    // memory cost of parallelism is threads x n_chunks rather than
    // queries x n_chunks.
    Scratch scratch(1, index.n_chunks());
    std::vector<float> mask(index.n_chunks());
    index.AclMask(caller_bits, mask.data());
    std::vector<std::size_t> local_hits(candidate_m.size(), 0);

#pragma omp for nowait
    for (std::size_t query = 0; query < n_queries; ++query) {
      index.DenseScores(query_vectors.subspan(query * index.dim(), index.dim()), 1,
                        std::span<float>(scratch.dense.data(), index.n_chunks()));
      index.LexicalScores(query_terms[query], scratch.lexical.data());

      const std::vector<std::int32_t> selected = FuseMaskSelect(
          std::span<const float>(scratch.dense.data(), index.n_chunks()),
          std::span<const float>(scratch.lexical.data(), index.n_chunks()), mask, weight_dense,
          max_m, scratch);

      for (std::size_t slot = 0; slot < candidate_m.size(); ++slot) {
        const std::size_t depth = std::min(candidate_m[slot], selected.size());
        const auto& relevant = relevant_chunks[query];
        for (std::size_t rank = 0; rank < depth; ++rank) {
          if (std::find(relevant.begin(), relevant.end(), selected[rank]) != relevant.end()) {
            ++local_hits[slot];
            break;
          }
        }
      }
    }

#pragma omp critical
    for (std::size_t slot = 0; slot < candidate_m.size(); ++slot) {
      hits[slot] += local_hits[slot];
    }
  }

  std::vector<float> recall(candidate_m.size());
  for (std::size_t slot = 0; slot < candidate_m.size(); ++slot) {
    recall[slot] = static_cast<float>(hits[slot]) / static_cast<float>(n_queries);
  }
  return recall;
}

}  // namespace rag
`,
        profile:
          'Dense retrieval is one O(n·d) sgemm at BLAS throughput; lexical retrieval is O(sum of posting lengths for the query terms), independent of corpus size and effectively free by comparison; selection is O(n) via nth_element instead of O(n log n). The two orderings that make rank fusion possible reintroduce an O(n log n) term and become the dominant retrieval cost on a large corpus — taken knowingly, since the alternative is a calibration between cosine and BM25 that does not exist. Illustrative, not a measured benchmark: the reranker and generator still dominate end-to-end latency, and none of this changes which chunks are retrievable.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! Retrieval-augmented generation, transcribed from the objective.
//!
//! No library. The marginal written out so the equation and the practice
//! can be read against each other:
//!
//!     p(y | x) = sum_z p_eta(z | x) * p_theta(y | x, z),   z in top-k(x)
//!
//! Two things to read for.
//!
//! First, the sum ranges over the RETRIEVED set only. Everything outside
//! it carries probability exactly zero, so a retrieval miss is not
//! merely unlikely -- it is unrecoverable, and the generator answers
//! fluently anyway. That is why retrieval recall bounds the system.
//!
//! Second, marginalize_answer() implements that equation and
//! build_prompt() implements what production actually does: concatenate
//! the top chunks into one context and run a single forward pass. They
//! are different computations. The concatenation contains no
//! marginalization at all -- the retriever chose which chunks appear and
//! then stopped mattering.

use std::collections::{BTreeMap, BTreeSet};

pub struct Chunk {
    pub document_id: String,
    pub ordinal: usize,
    pub tokens: Vec<String>,
    pub vector: Vec<f32>,
}

pub struct Scored {
    pub score: f32,
    pub position: usize,
}

/// Deterministic across processes and builds, unlike DefaultHasher.
///
/// Not a detail. An index written by one process and queried by another
/// must agree about the embedding, and Rust's default hasher is
/// randomly seeded per process specifically so it cannot be relied on.
/// The production form of this bug is upgrading the encoder without
/// re-indexing: same shape, same silence, no error anywhere.
pub fn stable_hash(token: &str) -> u32 {
    let mut digest: u32 = 2_166_136_261;
    for byte in token.bytes() {
        digest ^= u32::from(byte);
        digest = digest.wrapping_mul(16_777_619);
    }
    digest
}

pub fn tokenize(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    for character in text.chars() {
        if character.is_alphanumeric() {
            current.extend(character.to_lowercase());
        } else if !current.is_empty() {
            tokens.push(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

/// Split a document into overlapping windows.
///
/// The most consequential function here and the one nobody tunes. A
/// chunk smaller than the answer leaves that answer retrievable only as
/// two poorly-scoring halves. A chunk much larger dilutes the answer's
/// embedding with unrelated text until it stops scoring at all. Neither
/// failure appears in any output -- the system simply cannot answer a
/// question it looks like it should be able to.
///
/// The overlap covers answers that straddle a boundary, and it costs
/// diversity: two overlapping chunks that both match crowd a third
/// document out of a context window that only holds a handful.
pub fn chunk_document(text: &str, chunk_tokens: usize, overlap_tokens: usize) -> Vec<Vec<String>> {
    let mut chunks = Vec::new();
    if chunk_tokens == 0 || overlap_tokens >= chunk_tokens {
        // Silently empty here; the next stage makes this a typed error.
        return chunks;
    }

    let words = tokenize(text);
    let stride = chunk_tokens - overlap_tokens;
    let mut start = 0;
    while start < words.len() {
        let stop = usize::min(start + chunk_tokens, words.len());
        chunks.push(words[start..stop].to_vec());
        start += stride;
    }
    chunks
}

/// A hashing encoder standing in for a trained one.
///
/// Deliberately crude, because this entry is about the pipeline and
/// swapping this for a real sentence encoder changes retrieval quality
/// while changing nothing about the reasoning below it. What it does
/// reproduce faithfully is the weakness that matters: a hashed bag of
/// words has no notion of paraphrase. That is exactly the gap a dense
/// encoder closes, and exactly why the lexical score below still earns
/// its place after you close it.
pub fn embed(tokens: &[String], width: usize) -> Vec<f32> {
    let mut vector = vec![0.0_f32; width];
    for token in tokens {
        let slot = (stable_hash(token) as usize) % width;
        vector[slot] += 1.0;
    }

    let mut squared = 0.0_f32;
    for value in &vector {
        squared += value * value;
    }
    let norm = squared.sqrt();
    if norm < 1e-12 {
        return vector;
    }
    for value in &mut vector {
        *value /= norm;
    }
    vector
}

pub fn cosine(left: &[f32], right: &[f32]) -> f32 {
    let mut total = 0.0_f32;
    for index in 0..left.len() {
        total += left[index] * right[index];
    }
    total
}

fn sort_by_score_desc(scored: &mut Vec<Scored>, keep: usize) {
    scored.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    scored.truncate(keep);
}

/// Exact search over every chunk.
///
/// Exact here so retrieval and the objective provably share a metric. In
/// production this becomes an approximate index, and the difference is
/// not cosmetic: recall measured by exact search overstates what the
/// served system returns, sometimes substantially. Evaluating against
/// exact search while serving from an approximate index is how a
/// pipeline passes its own tests and still misses passages in
/// production.
pub fn dense_search(query_vector: &[f32], index: &[Chunk], k: usize) -> Vec<Scored> {
    let mut scored = Vec::new();
    for position in 0..index.len() {
        scored.push(Scored {
            score: cosine(query_vector, &index[position].vector),
            position,
        });
    }
    sort_by_score_desc(&mut scored, k);
    scored
}

pub struct Bm25Statistics {
    pub document_frequency: BTreeMap<String, usize>,
    pub mean_length: f32,
    pub n_chunks: usize,
}

pub fn compute_statistics(index: &[Chunk]) -> Bm25Statistics {
    let mut document_frequency: BTreeMap<String, usize> = BTreeMap::new();
    let mut total_tokens = 0_usize;

    for chunk in index {
        total_tokens += chunk.tokens.len();
        let unique: BTreeSet<&String> = chunk.tokens.iter().collect();
        for token in unique {
            *document_frequency.entry(token.clone()).or_insert(0) += 1;
        }
    }

    let mean_length = if index.is_empty() {
        1.0
    } else {
        total_tokens as f32 / index.len() as f32
    };
    Bm25Statistics {
        document_frequency,
        mean_length,
        n_chunks: index.len(),
    }
}

/// Lexical relevance: the complement to the dense score, not the legacy.
///
/// Dense retrieval is strong on paraphrase and reliably weak on exact
/// identifiers -- part numbers, version strings, error codes, names the
/// encoder never saw. Those are precisely the queries where being one
/// token wrong is being completely wrong, and they are far more common
/// in the corpora people actually deploy against than in the paraphrase
/// benchmarks embeddings get chosen on. Dropping the lexical index
/// because the embeddings look good is the most common self-inflicted
/// regression in this area.
pub fn bm25_score(
    query_tokens: &[String],
    chunk: &Chunk,
    statistics: &Bm25Statistics,
    k1: f32,
    b: f32,
) -> f32 {
    if chunk.tokens.is_empty() {
        return 0.0;
    }

    let mut term_frequency: BTreeMap<&String, usize> = BTreeMap::new();
    for token in &chunk.tokens {
        *term_frequency.entry(token).or_insert(0) += 1;
    }

    let length = chunk.tokens.len() as f32;
    let unique_query: BTreeSet<&String> = query_tokens.iter().collect();

    let mut total = 0.0_f32;
    for token in unique_query {
        let frequency = match term_frequency.get(token) {
            Some(count) => *count as f32,
            None => continue,
        };
        let document_frequency = *statistics.document_frequency.get(token).unwrap_or(&0) as f32;
        // Smoothed IDF, so a term present in every chunk contributes a
        // small positive weight rather than a negative one.
        let idf = (1.0
            + (statistics.n_chunks as f32 - document_frequency + 0.5) / (document_frequency + 0.5))
            .ln();
        let saturation = (frequency * (k1 + 1.0))
            / (frequency + k1 * (1.0 - b + b * length / statistics.mean_length));
        total += idf * saturation;
    }
    total
}

pub fn lexical_search(
    query_tokens: &[String],
    index: &[Chunk],
    statistics: &Bm25Statistics,
    k: usize,
) -> Vec<Scored> {
    let mut scored = Vec::new();
    for position in 0..index.len() {
        scored.push(Scored {
            score: bm25_score(query_tokens, &index[position], statistics, 1.5, 0.75),
            position,
        });
    }
    sort_by_score_desc(&mut scored, k);
    scored
}

/// Merge two rankings without pretending the scores are comparable.
///
/// A cosine and a BM25 value live on different scales and neither is
/// calibrated, so a weighted sum of the raw numbers is arbitrary: the
/// weight would be doing scale conversion and relevance weighting at the
/// same time and cannot be tuned for both. Fusing on RANK sidesteps
/// that, because rank is the only thing the two retrievers genuinely
/// agree about.
///
/// What it costs: rank discards magnitude. A chunk the dense retriever
/// scored far above everything else arrives merely first.
pub fn reciprocal_rank_fusion(
    dense: &[Scored],
    lexical: &[Scored],
    weight_dense: f32,
    rrf_k: f32,
) -> Vec<Scored> {
    let mut fused: BTreeMap<usize, f32> = BTreeMap::new();
    for (rank, item) in dense.iter().enumerate() {
        *fused.entry(item.position).or_insert(0.0) += weight_dense / (rrf_k + (rank + 1) as f32);
    }
    for (rank, item) in lexical.iter().enumerate() {
        *fused.entry(item.position).or_insert(0.0) +=
            (1.0 - weight_dense) / (rrf_k + (rank + 1) as f32);
    }

    let mut merged: Vec<Scored> = fused
        .into_iter()
        .map(|(position, score)| Scored { score, position })
        .collect();
    let keep = merged.len();
    sort_by_score_desc(&mut merged, keep);
    merged
}

/// A stand-in for a trained cross-encoder.
///
/// The real thing scores query and passage JOINTLY, which is both why it
/// is far more accurate per pair and why it cannot be precomputed --
/// there is no passage vector to store when the score depends on the
/// query. That is the entire architectural argument for two stages: the
/// accurate scorer is affordable only on a short list the cheap scorer
/// produced.
pub fn cross_encoder_score(query_tokens: &[String], chunk: &Chunk) -> f32 {
    let query_set: BTreeSet<&String> = query_tokens.iter().collect();
    if query_set.is_empty() || chunk.tokens.is_empty() {
        return 0.0;
    }

    let chunk_set: BTreeSet<&String> = chunk.tokens.iter().collect();
    let mut covered = 0_usize;
    for token in &query_set {
        if chunk_set.contains(*token) {
            covered += 1;
        }
    }
    let coverage = covered as f32 / query_set.len() as f32;

    // Proximity, which a bag-of-words score cannot see at all: a passage
    // where the query terms cluster is likelier to answer the query than
    // one where they are scattered across unrelated sentences.
    let mut first: Option<usize> = None;
    let mut last: Option<usize> = None;
    for (index, token) in chunk.tokens.iter().enumerate() {
        if query_set.contains(token) {
            if first.is_none() {
                first = Some(index);
            }
            last = Some(index);
        }
    }
    let spread = match (first, last) {
        (Some(start), Some(stop)) if stop > start => {
            (stop - start) as f32 / chunk.tokens.len() as f32
        }
        _ => 1.0,
    };
    coverage * (1.0 - 0.5 * spread)
}

/// Cut k candidates down to the m that reach the prompt.
///
/// Reducing rather than passing everything through matters for a reason
/// that surprises people: more context is not better. Generators attend
/// unevenly over a long context, material in the middle gets measurably
/// less attention than material at either end, and a plausible but
/// irrelevant passage actively distracts. So m has an interior optimum,
/// usually lower than anyone guesses, and it has to be found by
/// sweeping rather than assumed.
pub fn rerank(
    query_tokens: &[String],
    candidates: &[Scored],
    index: &[Chunk],
    m: usize,
) -> Vec<Scored> {
    let mut scored = Vec::new();
    for candidate in candidates {
        scored.push(Scored {
            score: cross_encoder_score(query_tokens, &index[candidate.position]),
            position: candidate.position,
        });
    }
    sort_by_score_desc(&mut scored, m);
    scored
}

/// What production actually does: concatenate, then generate once.
///
/// Read this against marginalize_answer() below -- they are different
/// computations. There is no sum over documents here and no weighting at
/// all. The retriever's scores decided WHICH chunks appear and then
/// stopped mattering, so the generator sees a flat context with no
/// indication which passage was retrieved confidently and which barely
/// cleared the cut.
pub fn build_prompt(query: &str, retrieved: &[Scored], index: &[Chunk]) -> String {
    let mut prompt = String::from("Answer using only the sources below. Cite them as [n].\\n\\n");
    for (ordinal, item) in retrieved.iter().enumerate() {
        let chunk = &index[item.position];
        prompt.push_str(&format!(
            "[{}] ({}#{}) {}\\n\\n",
            ordinal + 1,
            chunk.document_id,
            chunk.ordinal,
            chunk.tokens.join(" ")
        ));
    }
    prompt.push_str(&format!("Question: {query}"));
    prompt
}

pub struct Marginal {
    pub probability: f32,
    pub answer: String,
}

/// The equation, for once actually computed.
///
///     p(y | x) = sum_z p(z | x) * p(y | x, z)
///
/// One generator call per retrieved chunk instead of one call over a
/// concatenation, then a retriever-weighted average. This is what the
/// original formulation meant, and it buys two real things: a chunk that
/// would have been drowned out in a long context gets its own forward
/// pass, and the per-document likelihoods are inspectable, so "which
/// passage produced this answer" becomes a question with an answer.
///
/// Why almost nobody does it: k generator calls instead of one, which is
/// linear cost at the most expensive stage in the pipeline.
///
/// The honesty caveat lives in the weights. A softmax over retrieval
/// scores is not a posterior over documents -- a similarity is not a
/// likelihood, and nothing here was trained to make it one -- so
/// p(z | x) is a plausible-looking number with no calibration behind it.
/// The arithmetic is exact; the probabilities are not.
pub fn marginalize_answer(
    candidate_answers: &[String],
    retrieved: &[Scored],
    index: &[Chunk],
    generator_log_prob: &dyn Fn(&str, &[String]) -> f32,
) -> Vec<Marginal> {
    let mut marginals = Vec::new();
    if retrieved.is_empty() {
        // No marginal to take; the next stage makes this a typed error.
        return marginals;
    }

    let mut top = retrieved[0].score;
    for item in retrieved {
        if item.score > top {
            top = item.score;
        }
    }

    let mut weights = Vec::new();
    let mut total = 0.0_f32;
    for item in retrieved {
        let value = (item.score - top).exp();
        weights.push(value);
        total += value;
    }
    for weight in &mut weights {
        *weight /= total;
    }

    for answer in candidate_answers {
        let mut accumulated = 0.0_f32;
        for (slot, item) in retrieved.iter().enumerate() {
            accumulated +=
                weights[slot] * generator_log_prob(answer, &index[item.position].tokens).exp();
        }
        marginals.push(Marginal {
            probability: accumulated,
            answer: answer.clone(),
        });
    }
    marginals.sort_by(|left, right| {
        right
            .probability
            .partial_cmp(&left.probability)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    marginals
}

pub struct LabelledQuery {
    pub text: String,
    pub relevant_documents: BTreeSet<String>,
}

/// The one metric that has to be measured on its own.
///
/// Every failure in this pipeline presents identically -- a bad answer
/// -- and the generator produced the visible output, so it gets blamed
/// by default. This measures whether the answer was even reachable. If
/// it is low, nothing done to the generator matters, and teams
/// routinely spend a fine-tuning budget discovering that.
pub fn recall_at_m(
    queries: &[LabelledQuery],
    retrieved_per_query: &[Vec<Scored>],
    index: &[Chunk],
) -> f32 {
    if queries.is_empty() {
        return 0.0;
    }

    let mut hits = 0_usize;
    for (slot, query) in queries.iter().enumerate() {
        for item in &retrieved_per_query[slot] {
            if query
                .relevant_documents
                .contains(&index[item.position].document_id)
            {
                hits += 1;
                break;
            }
        }
    }
    hits as f32 / queries.len() as f32
}

/// Overlap with the cited passages. A weak check, named weakly.
///
/// It confirms the answer reuses the passages' vocabulary. It does not
/// confirm the answer follows from them, and a citation only ever proves
/// the passage was retrieved. Reviewers read the stronger claim into it
/// anyway, which is why this is reported rather than thresholded.
pub fn citation_support(answer_tokens: &[String], retrieved: &[Scored], index: &[Chunk]) -> f32 {
    if answer_tokens.is_empty() {
        return 0.0;
    }

    let mut supported: BTreeSet<&String> = BTreeSet::new();
    for item in retrieved {
        for token in &index[item.position].tokens {
            supported.insert(token);
        }
    }

    let mut covered = 0_usize;
    for token in answer_tokens {
        if supported.contains(token) {
            covered += 1;
        }
    }
    covered as f32 / answer_tokens.len() as f32
}
`,
        profile:
          'Per query: one encode, a full linear scan for each retriever at O(n·d) and O(n·|q|) with a BTreeMap rebuilt per scored chunk inside bm25_score, then a full sort of n candidates, m reranker calls and one generator pass. Illustrative, not a measured benchmark: the per-chunk map and the full sorts are the two costs the later stages remove, and marginalize_answer multiplies the dominant generator cost by m, which is exactly why it is rare in practice.',
      },
      'make-it-right': {
        rationale:
          'Every situation the literal version answered confidently and wrongly becomes a RagError variant carrying the values that caused it: an index built by one encoder and queried with another, an empty or unentitled candidate set, a query whose best reranked chunk clears no threshold, and a chunking configuration that cannot tile a document. All four present identically in production — as a fluent, wrong answer — so a pipeline that cannot distinguish them cannot be debugged, and the refusal case in particular is the one a grounded system is supposed to have. Newtypes separate quantities that are all usize and all silently interchangeable here: an index position, an embedding width and a document ordinal, plus an encoder version so that querying an index with a different encoder than built it is a checked failure rather than a quiet quality regression. The BM25 corpus statistics move into the constructor and are computed once rather than rebuilt per scored chunk, which is a correctness point as much as a cost one, since statistics recomputed per query drift from the index they describe. Entitlement filters before scoring rather than after ranking — a reranked list the caller may not read is a leak that already happened. And how the retrieved set is consumed becomes a trait, so concatenation and marginalization sit side by side as the two different computations they are, instead of the objective describing one while the code performs the other.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Retrieval-augmented generation with each stage's failure named.
//!
//! The literal version handled four broken situations by answering
//! anyway: an index built by one encoder and queried with another, an
//! empty or unentitled candidate set, a query whose best chunk clears
//! nothing, and a chunking configuration that cannot tile a document.
//! All four present identically in production -- as a fluent, wrong
//! answer -- so each becomes a \`RagError\` variant carrying the values
//! that caused it.
//!
//! Second design point: how the retrieved set is CONSUMED is a trait.
//! Concatenating the top chunks into one prompt and marginalizing over
//! them are different computations. The objective describes the second;
//! almost every deployment performs the first. Burying that choice
//! inside \`answer()\` is exactly how the gap goes unexamined.
//!
//! Third: entitlement filters before scoring, never after ranking. A
//! reranked list the caller may not read is a leak that already
//! happened, and dropping it afterwards only discards the evidence.

use std::collections::{HashMap, HashSet};
use std::fmt;

/// Below this reranked score nothing retrieved is worth answering from,
/// and a refusal is the correct output. Tuned per corpus; the value
/// matters less than having one at all.
const RELEVANCE_FLOOR: f32 = 0.05;
const BM25_K1: f32 = 1.5;
const BM25_B: f32 = 0.75;
/// Reciprocal-rank-fusion damping, at the conventional value. Large
/// enough that the top few ranks are not wildly separated, which is the
/// entire point of fusing on rank rather than on score.
const RRF_DAMPING: f32 = 60.0;

/// A position in the index. An index position, a rank and an ordinal
/// within a document are all \`usize\` and all silently interchangeable.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ChunkPos(pub usize);

/// Embedding width, so a mismatch is a checked question rather than a
/// scoring bug that returns plausible numbers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Dim(pub usize);

/// The encoder that produced every vector in an index.
///
/// Upgrading the encoder without re-indexing is the production form of
/// the unstable-hash bug from the previous stage: same shapes, no
/// error, retrieval quality that quietly drops. Naming the version
/// makes mixing two generations a failure the caller must handle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncoderVersion(pub String);

/// Entitlement as a bitset -- cheap enough to evaluate before scoring,
/// which is the only place it belongs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AclBits(pub u64);

impl AclBits {
    #[must_use]
    pub fn permits(self, caller: Self) -> bool {
        self.0 & caller.0 != 0
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum RagError {
    /// The index and the query were embedded by different encoders.
    EncoderMismatch {
        index: EncoderVersion,
        query: EncoderVersion,
    },
    DimensionMismatch {
        index: Dim,
        query: Dim,
    },
    EmptyIndex,
    /// The caller is entitled to nothing in the corpus. Distinct from a
    /// coverage gap: the answer may exist and simply not be theirs.
    NoEntitledChunks {
        caller: AclBits,
    },
    /// Everything retrieved scored below the floor. The honest output,
    /// and the one the literal version had no way to produce.
    CoverageGap {
        best_score: f32,
        floor: f32,
    },
    InvalidChunking {
        chunk_tokens: usize,
        overlap_tokens: usize,
    },
    EmptyQuery,
}

impl fmt::Display for RagError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EncoderMismatch { index, query } => write!(
                formatter,
                "index embedded by {} queried with {}; re-index before serving",
                index.0, query.0
            ),
            Self::DimensionMismatch { index, query } => write!(
                formatter,
                "index width {} does not match query width {}",
                index.0, query.0
            ),
            Self::EmptyIndex => write!(formatter, "index contains no chunks"),
            Self::NoEntitledChunks { caller } => write!(
                formatter,
                "caller entitlement {:#x} matches no chunk in the corpus",
                caller.0
            ),
            Self::CoverageGap { best_score, floor } => write!(
                formatter,
                "best reranked score {best_score:.4} below floor {floor:.4}; refuse rather than answer"
            ),
            Self::InvalidChunking {
                chunk_tokens,
                overlap_tokens,
            } => write!(
                formatter,
                "chunk_tokens {chunk_tokens} with overlap {overlap_tokens} cannot tile a document"
            ),
            Self::EmptyQuery => write!(formatter, "query tokenized to nothing"),
        }
    }
}

impl std::error::Error for RagError {}

pub fn tokenize(text: &str) -> Vec<String> {
    text.split(|character: char| !character.is_alphanumeric())
        .filter(|piece| !piece.is_empty())
        .map(str::to_lowercase)
        .collect()
}

/// The most consequential configuration in the system, validated once.
///
/// A chunk smaller than the answer leaves that answer retrievable only
/// as two poorly-scoring halves; a chunk much larger dilutes its
/// embedding until it stops scoring at all. Neither failure appears in
/// any output. Rejecting a configuration that cannot tile at all is the
/// small part of this that a type can catch -- the rest has to be swept.
pub struct Chunker {
    chunk_tokens: usize,
    overlap_tokens: usize,
}

impl Chunker {
    pub fn new(chunk_tokens: usize, overlap_tokens: usize) -> Result<Self, RagError> {
        if chunk_tokens == 0 || overlap_tokens >= chunk_tokens {
            return Err(RagError::InvalidChunking {
                chunk_tokens,
                overlap_tokens,
            });
        }
        Ok(Self {
            chunk_tokens,
            overlap_tokens,
        })
    }

    #[must_use]
    pub fn split(&self, text: &str) -> Vec<Vec<String>> {
        let words = tokenize(text);
        let stride = self.chunk_tokens - self.overlap_tokens;
        (0..words.len())
            .step_by(stride)
            .map(|start| {
                let stop = usize::min(start + self.chunk_tokens, words.len());
                words[start..stop].to_vec()
            })
            .collect()
    }
}

pub struct Chunk {
    pub document_id: String,
    pub ordinal: usize,
    pub tokens: Vec<String>,
    pub embedding: Vec<f32>,
    pub acl: AclBits,
}

#[derive(Debug, Clone, Copy)]
pub struct Retrieved {
    pub position: ChunkPos,
    pub score: f32,
}

pub trait Encoder {
    fn version(&self) -> EncoderVersion;
    fn dim(&self) -> Dim;
    fn encode(&self, tokens: &[String]) -> Vec<f32>;
}

pub trait Reranker {
    /// Scores query and passage jointly, which is why it cannot be
    /// precomputed and why it is affordable only on a short list.
    fn score(&self, query_tokens: &[String], chunk: &Chunk) -> f32;
}

pub trait Generator {
    fn answer(&self, prompt: &str) -> String;
    fn log_prob(&self, answer: &str, context: &[String]) -> f32;
}

/// Corpus statistics computed once at construction rather than rebuilt
/// per scored chunk.
///
/// Partly cost, mostly correctness: statistics recomputed per query
/// describe whatever subset that query touched, not the corpus, and the
/// IDF term is meaningless unless it is global.
pub struct HybridIndex {
    chunks: Vec<Chunk>,
    encoder_version: EncoderVersion,
    dim: Dim,
    document_frequency: HashMap<String, usize>,
    mean_length: f32,
}

impl HybridIndex {
    pub fn build(
        chunks: Vec<Chunk>,
        encoder_version: EncoderVersion,
        dim: Dim,
    ) -> Result<Self, RagError> {
        if chunks.is_empty() {
            return Err(RagError::EmptyIndex);
        }
        if let Some(offender) = chunks.iter().find(|chunk| chunk.embedding.len() != dim.0) {
            return Err(RagError::DimensionMismatch {
                index: dim,
                query: Dim(offender.embedding.len()),
            });
        }

        let mut document_frequency: HashMap<String, usize> = HashMap::new();
        for chunk in &chunks {
            let unique: HashSet<&String> = chunk.tokens.iter().collect();
            for token in unique {
                *document_frequency.entry(token.clone()).or_insert(0) += 1;
            }
        }

        let total: usize = chunks.iter().map(|chunk| chunk.tokens.len()).sum();
        let mean_length = (total as f32 / chunks.len() as f32).max(1.0);

        Ok(Self {
            chunks,
            encoder_version,
            dim,
            document_frequency,
            mean_length,
        })
    }

    #[must_use]
    pub fn chunk(&self, position: ChunkPos) -> &Chunk {
        &self.chunks[position.0]
    }

    /// Positions the caller may read, evaluated before any scoring.
    fn entitled(&self, caller: AclBits) -> Vec<ChunkPos> {
        self.chunks
            .iter()
            .enumerate()
            .filter(|(_, chunk)| chunk.acl.permits(caller))
            .map(|(position, _)| ChunkPos(position))
            .collect()
    }

    fn dense_search(&self, query: &[f32], scope: &[ChunkPos], k: usize) -> Vec<Retrieved> {
        let mut scored: Vec<Retrieved> = scope
            .iter()
            .map(|&position| Retrieved {
                position,
                score: cosine(query, &self.chunks[position.0].embedding),
            })
            .collect();
        truncate_by_score(&mut scored, k);
        scored
    }

    fn bm25(&self, query_tokens: &HashSet<&String>, chunk: &Chunk) -> f32 {
        if chunk.tokens.is_empty() {
            return 0.0;
        }
        let mut frequency: HashMap<&String, usize> = HashMap::new();
        for token in &chunk.tokens {
            *frequency.entry(token).or_insert(0) += 1;
        }

        let length = chunk.tokens.len() as f32;
        query_tokens
            .iter()
            .filter_map(|token| frequency.get(*token).map(|count| (*token, *count as f32)))
            .map(|(token, count)| {
                let seen = *self.document_frequency.get(token).unwrap_or(&0) as f32;
                let idf =
                    (1.0 + (self.chunks.len() as f32 - seen + 0.5) / (seen + 0.5)).ln();
                let saturation = (count * (BM25_K1 + 1.0))
                    / (count
                        + BM25_K1 * (1.0 - BM25_B + BM25_B * length / self.mean_length));
                idf * saturation
            })
            .sum()
    }

    fn lexical_search(
        &self,
        query_tokens: &[String],
        scope: &[ChunkPos],
        k: usize,
    ) -> Vec<Retrieved> {
        let unique: HashSet<&String> = query_tokens.iter().collect();
        let mut scored: Vec<Retrieved> = scope
            .iter()
            .map(|&position| Retrieved {
                position,
                score: self.bm25(&unique, &self.chunks[position.0]),
            })
            .collect();
        truncate_by_score(&mut scored, k);
        scored
    }
}

#[must_use]
pub fn cosine(left: &[f32], right: &[f32]) -> f32 {
    left.iter().zip(right).map(|(a, b)| a * b).sum()
}

fn truncate_by_score(scored: &mut Vec<Retrieved>, keep: usize) {
    scored.sort_by(|left, right| {
        right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    scored.truncate(keep);
}

/// Fuse on rank, because a cosine and a BM25 value are not comparable
/// and no weight can make them so.
#[must_use]
pub fn reciprocal_rank_fusion(
    dense: &[Retrieved],
    lexical: &[Retrieved],
    weight_dense: f32,
) -> Vec<Retrieved> {
    let mut fused: HashMap<ChunkPos, f32> = HashMap::new();
    for (rank, item) in dense.iter().enumerate() {
        *fused.entry(item.position).or_insert(0.0) +=
            weight_dense / (RRF_DAMPING + (rank + 1) as f32);
    }
    for (rank, item) in lexical.iter().enumerate() {
        *fused.entry(item.position).or_insert(0.0) +=
            (1.0 - weight_dense) / (RRF_DAMPING + (rank + 1) as f32);
    }

    let mut merged: Vec<Retrieved> = fused
        .into_iter()
        .map(|(position, score)| Retrieved { position, score })
        .collect();
    let keep = merged.len();
    truncate_by_score(&mut merged, keep);
    merged
}

pub struct Answer {
    pub text: String,
    pub cited: Vec<Retrieved>,
    pub citation_support: f32,
    pub best_retrieval_score: f32,
    pub strategy: &'static str,
    /// Populated only by the marginalizing strategy, and even there it
    /// is a softmax over similarities rather than a calibrated
    /// posterior. Reported so nobody has to guess which it is.
    pub document_posterior: Vec<f32>,
}

/// The choice the objective and the practice disagree about, named.
pub trait ConsumptionStrategy {
    fn name(&self) -> &'static str;
    fn consume(
        &self,
        query: &str,
        retrieved: &[Retrieved],
        index: &HybridIndex,
        generator: &dyn Generator,
    ) -> Answer;
}

/// What production actually does: concatenate, generate once.
///
/// No sum over documents and no weighting at all. The retriever's
/// scores decided which chunks appear and then stopped mattering.
pub struct Concatenate;

impl ConsumptionStrategy for Concatenate {
    fn name(&self) -> &'static str {
        "concatenate"
    }

    fn consume(
        &self,
        query: &str,
        retrieved: &[Retrieved],
        index: &HybridIndex,
        generator: &dyn Generator,
    ) -> Answer {
        let sources = retrieved
            .iter()
            .enumerate()
            .map(|(ordinal, item)| {
                let chunk = index.chunk(item.position);
                format!(
                    "[{}] ({}#{}) {}",
                    ordinal + 1,
                    chunk.document_id,
                    chunk.ordinal,
                    chunk.tokens.join(" ")
                )
            })
            .collect::<Vec<_>>()
            .join("\\n\\n");

        let prompt = format!(
            "Answer using only the sources below. Cite them as [n].\\n\\n{sources}\\n\\nQuestion: {query}"
        );
        let text = generator.answer(&prompt);
        let support = citation_support(&tokenize(&text), retrieved, index);

        Answer {
            text,
            cited: retrieved.to_vec(),
            citation_support: support,
            best_retrieval_score: retrieved.first().map_or(0.0, |item| item.score),
            strategy: "concatenate",
            document_posterior: Vec::new(),
        }
    }
}

/// What the objective describes: one generator call per chunk, then a
/// retriever-weighted average.
///
/// Rare because it multiplies the most expensive stage by m. Kept as a
/// declared alternative because the per-document likelihoods are
/// inspectable, which turns "which passage produced this" into a
/// question with an answer.
pub struct Marginalize {
    pub candidates: Vec<String>,
    pub temperature: f32,
}

impl ConsumptionStrategy for Marginalize {
    fn name(&self) -> &'static str {
        "marginalize"
    }

    fn consume(
        &self,
        _query: &str,
        retrieved: &[Retrieved],
        index: &HybridIndex,
        generator: &dyn Generator,
    ) -> Answer {
        let top = retrieved
            .iter()
            .map(|item| item.score)
            .fold(f32::NEG_INFINITY, f32::max);
        let unnormalized: Vec<f32> = retrieved
            .iter()
            .map(|item| ((item.score - top) / self.temperature).exp())
            .collect();
        let mass: f32 = unnormalized.iter().sum();
        let posterior: Vec<f32> = unnormalized.iter().map(|value| value / mass).collect();

        let (text, probability) = self
            .candidates
            .iter()
            .map(|candidate| {
                let marginal: f32 = retrieved
                    .iter()
                    .zip(&posterior)
                    .map(|(item, weight)| {
                        weight
                            * generator
                                .log_prob(candidate, &index.chunk(item.position).tokens)
                                .exp()
                    })
                    .sum();
                (candidate.clone(), marginal)
            })
            .fold((String::new(), f32::NEG_INFINITY), |best, current| {
                if current.1 > best.1 {
                    current
                } else {
                    best
                }
            });

        let _ = probability;
        let support = citation_support(&tokenize(&text), retrieved, index);

        Answer {
            text,
            cited: retrieved.to_vec(),
            citation_support: support,
            best_retrieval_score: retrieved.first().map_or(0.0, |item| item.score),
            strategy: "marginalize",
            document_posterior: posterior,
        }
    }
}

/// Overlap with the cited passages. A weak check, named weakly.
///
/// It confirms the answer reuses the passages' vocabulary, not that it
/// follows from them, and a citation only ever proves the passage was
/// retrieved. Reported rather than thresholded for that reason.
#[must_use]
pub fn citation_support(
    answer_tokens: &[String],
    retrieved: &[Retrieved],
    index: &HybridIndex,
) -> f32 {
    if answer_tokens.is_empty() {
        return 0.0;
    }
    let supported: HashSet<&String> = retrieved
        .iter()
        .flat_map(|item| index.chunk(item.position).tokens.iter())
        .collect();
    let covered = answer_tokens
        .iter()
        .filter(|token| supported.contains(token))
        .count();
    covered as f32 / answer_tokens.len() as f32
}

pub struct RagPipeline<'a> {
    index: &'a HybridIndex,
    encoder: &'a dyn Encoder,
    reranker: &'a dyn Reranker,
    generator: &'a dyn Generator,
    candidate_k: usize,
    context_m: usize,
    weight_dense: f32,
    relevance_floor: f32,
}

impl<'a> RagPipeline<'a> {
    /// The encoder-versus-index agreement is checked here, once, rather
    /// than being assumed on every query.
    pub fn new(
        index: &'a HybridIndex,
        encoder: &'a dyn Encoder,
        reranker: &'a dyn Reranker,
        generator: &'a dyn Generator,
        candidate_k: usize,
        context_m: usize,
        weight_dense: f32,
    ) -> Result<Self, RagError> {
        if encoder.version() != index.encoder_version {
            return Err(RagError::EncoderMismatch {
                index: index.encoder_version.clone(),
                query: encoder.version(),
            });
        }
        if encoder.dim() != index.dim {
            return Err(RagError::DimensionMismatch {
                index: index.dim,
                query: encoder.dim(),
            });
        }
        Ok(Self {
            index,
            encoder,
            reranker,
            generator,
            candidate_k,
            context_m,
            weight_dense,
            relevance_floor: RELEVANCE_FLOOR,
        })
    }

    pub fn answer(
        &self,
        query: &str,
        caller: AclBits,
        strategy: &dyn ConsumptionStrategy,
    ) -> Result<Answer, RagError> {
        let query_tokens = tokenize(query);
        if query_tokens.is_empty() {
            return Err(RagError::EmptyQuery);
        }

        let scope = self.index.entitled(caller);
        if scope.is_empty() {
            return Err(RagError::NoEntitledChunks { caller });
        }

        let query_vector = self.encoder.encode(&query_tokens);
        let dense = self.index.dense_search(&query_vector, &scope, self.candidate_k);
        let lexical = self
            .index
            .lexical_search(&query_tokens, &scope, self.candidate_k);
        let candidates = reciprocal_rank_fusion(&dense, &lexical, self.weight_dense);

        let mut reranked: Vec<Retrieved> = candidates
            .iter()
            .map(|item| Retrieved {
                position: item.position,
                score: self
                    .reranker
                    .score(&query_tokens, self.index.chunk(item.position)),
            })
            .collect();
        truncate_by_score(&mut reranked, self.context_m);

        let best = reranked.first().map_or(0.0, |item| item.score);
        if best < self.relevance_floor {
            return Err(RagError::CoverageGap {
                best_score: best,
                floor: self.relevance_floor,
            });
        }

        Ok(strategy.consume(query, &reranked, self.index, self.generator))
    }
}

pub struct LabelledQuery {
    pub text: String,
    pub relevant_documents: HashSet<String>,
}

pub struct RetrievalMetrics {
    pub recall_at_m: f32,
    pub refusal_rate: f32,
}

/// Recall measured on its own, because every failure here presents as a
/// bad answer and the generator wrote the visible output.
///
/// If recall is low, nothing done to the generator matters. Refusals
/// are counted alongside it rather than folded into recall: a refusal
/// is a correct behaviour with a cost, and averaging the two hides
/// whichever one is moving.
#[must_use]
pub fn evaluate_retrieval(
    pipeline: &RagPipeline<'_>,
    queries: &[LabelledQuery],
    caller: AclBits,
    strategy: &dyn ConsumptionStrategy,
) -> RetrievalMetrics {
    if queries.is_empty() {
        return RetrievalMetrics {
            recall_at_m: 0.0,
            refusal_rate: 0.0,
        };
    }

    let mut hits = 0_usize;
    let mut refusals = 0_usize;
    for query in queries {
        match pipeline.answer(&query.text, caller, strategy) {
            Ok(answer) => {
                let found = answer.cited.iter().any(|item| {
                    query
                        .relevant_documents
                        .contains(&pipeline.index.chunk(item.position).document_id)
                });
                if found {
                    hits += 1;
                }
            }
            Err(RagError::CoverageGap { .. } | RagError::NoEntitledChunks { .. }) => {
                refusals += 1;
            }
            Err(_) => {}
        }
    }

    RetrievalMetrics {
        recall_at_m: hits as f32 / queries.len() as f32,
        refusal_rate: refusals as f32 / queries.len() as f32,
    }
}
`,
        profile:
          'Same asymptotics as the literal version — a scan over the entitled scope for each retriever — with two changes that matter more than the constants. The BM25 corpus statistics are built once at construction instead of rebuilt inside every scored chunk, which removes a per-chunk map allocation from the inner loop, and the entitlement filter runs before scoring, so cost now falls with the caller\'s entitlement rather than being paid in full and then discarded. Illustrative, not a measured benchmark: the substantive change is that an encoder mismatch, an empty index, an unentitled caller and a coverage gap are typed failures a caller must handle, where the first version answered all four fluently and wrongly.',
      },
      'make-it-fast': {
        rationale:
          'The two retrievers stop sharing a loop shape because they never had the same one. Dense retrieval over the entitled corpus becomes a single ndarray GEMM — a contiguous chunk-by-dimension matrix against a batch of query vectors — which is the natural form of exact search and the reason a brute-force scan stays competitive to surprisingly large corpora before an approximate index is worth its recall loss. Lexical scoring becomes a CSR inverted index where a query touches only the postings for its own terms, with the IDF and the length normalizer precomputed per chunk at build time, so cost scales with the number of query terms rather than with corpus size; that asymmetry is why the lexical side is nearly free and why dropping it to save time saves almost nothing. Entitlement becomes an additive mask applied to the score row before selection rather than a filter over a finished ranking, so it still gates what is considered. Top-k comes from select_nth_unstable_by instead of a full sort, since the order of the discarded tail is never read, and only the surviving candidates are ordered. Queries in a batch are independent once the index is immutable, so rayon parallelizes across them, and every scratch buffer is sized from the largest batch shape at construction so a serving loop performs no per-query allocation.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Exact dense retrieval over the corpus becomes one GEMM against a chunk-by-dimension matrix instead of a dot product per chunk',
            tradeoff: 'The embedding matrix must be held resident and contiguous, so the corpus size at which this stops fitting in memory becomes the point where an approximate index is forced rather than chosen',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'CSR postings and row-major embeddings mean a query term walks one sequential slice instead of chasing per-chunk maps',
            tradeoff: 'The index becomes immutable — a single inserted chunk invalidates the offsets, so updates mean a rebuild or a second delta index to merge at query time',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Queries in a batch share an immutable index and touch disjoint score rows, so they fan out across cores with no synchronization',
            tradeoff: 'Only pays above a handful of queries, and BLAS must be pinned to one thread or the two pools oversubscribe and both get slower',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Score, mask and rank buffers are sized from the largest batch shape at construction, so a serving loop performs no per-query allocation',
            tradeoff: 'Scratch is held at the peak shape for the process lifetime, so memory does not shrink when traffic does',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'BM25 saturation and the fusion weight are a few arithmetic operations called once per posting, where the call overhead would dominate the work',
            tradeoff: 'Inlining across the posting loop grows the code and can cost more in instruction cache than it saves once the loop body stops being small',
          },
        ],
        code: `//! Retrieval-augmented generation with the retrieval stage packed.
//!
//! Nothing here changes which chunks are retrievable. Chunking, k, m and
//! the encoder still decide that, and this stage decides only how fast
//! the same answer arrives -- worth stating because the instinct on a
//! disappointing pipeline is to optimize it rather than to sweep the
//! chunk size.
//!
//! Two shapes, because the two retrievers never had the same one:
//!
//!   * dense retrieval is one GEMM over a resident chunk-by-dimension
//!     matrix, scaling with the whole corpus;
//!   * lexical retrieval walks CSR postings for the query's terms only,
//!     scaling with the query.
//!
//! The reranker and the generator still dominate end-to-end latency.
//! This removes the part of the bill that was never supposed to be
//! large.

use ndarray::{Array2, ArrayView2, Axis};
use rayon::prelude::*;
use std::collections::HashMap;

const BM25_K1: f32 = 1.5;
const BM25_B: f32 = 0.75;
const RRF_DAMPING: f32 = 60.0;
/// Added to a masked-out score. Additive rather than a filter so the
/// row shape stays fixed and selection stays branchless.
const MASKED: f32 = f32::NEG_INFINITY;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ChunkPos(pub usize);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TermId(pub u32);

/// Everything a query touches, laid out once and never mutated.
///
/// Immutability is the cost of this layout and worth naming: the CSR
/// offsets encode the whole corpus, so a single inserted chunk
/// invalidates them. Production answers that with a rebuild on a
/// schedule plus a small delta index merged at query time, not with an
/// insert path into this structure.
pub struct PackedIndex {
    /// Row-major, n_chunks by dim, so one row is one contiguous chunk
    /// embedding and the GEMM streams rather than strides.
    embeddings: Array2<f32>,
    acl_bits: Vec<u64>,
    document_ids: Vec<String>,
    term_ids: HashMap<Box<str>, TermId>,
    /// CSR: postings for term t are the half-open slice
    /// posting_offsets[t] .. posting_offsets[t + 1].
    posting_offsets: Vec<u32>,
    posting_chunks: Vec<u32>,
    posting_frequencies: Vec<f32>,
    /// Precomputed per term at build time; the log is not repriced per
    /// query, which it was in both earlier stages.
    idf: Vec<f32>,
    /// Precomputed per chunk: k1 * (1 - b + b * len / mean_len), the
    /// whole denominator term that does not depend on the query.
    length_norm: Vec<f32>,
}

impl PackedIndex {
    #[must_use]
    pub fn n_chunks(&self) -> usize {
        self.embeddings.nrows()
    }

    #[must_use]
    pub fn dim(&self) -> usize {
        self.embeddings.ncols()
    }

    #[must_use]
    pub fn document_id(&self, position: ChunkPos) -> &str {
        &self.document_ids[position.0]
    }

    #[must_use]
    pub fn term_id(&self, token: &str) -> Option<TermId> {
        self.term_ids.get(token).copied()
    }

    /// One GEMM: (n_queries x dim) times (dim x n_chunks).
    ///
    /// The transpose is a view rather than a copy, so BLAS sees a
    /// column-major right operand and handles it with a transpose flag
    /// rather than materializing anything.
    #[must_use]
    pub fn dense_scores(&self, queries: &ArrayView2<'_, f32>) -> Array2<f32> {
        queries.dot(&self.embeddings.t())
    }

    /// Scatter BM25 contributions into one score row.
    ///
    /// The loop is over the query's terms, not over the corpus. A chunk
    /// that shares no term with the query is never visited at all,
    /// which is the whole reason an inverted index exists and the
    /// reason this side of the hybrid is close to free.
    pub fn lexical_scores_into(&self, terms: &[TermId], row: &mut [f32]) {
        row.fill(0.0);
        for &TermId(term) in terms {
            let start = self.posting_offsets[term as usize] as usize;
            let stop = self.posting_offsets[term as usize + 1] as usize;
            let idf = self.idf[term as usize];

            let chunks = &self.posting_chunks[start..stop];
            let frequencies = &self.posting_frequencies[start..stop];
            for (&chunk, &frequency) in chunks.iter().zip(frequencies) {
                let position = chunk as usize;
                row[position] += idf * saturation(frequency, self.length_norm[position]);
            }
        }
    }

    /// Entitlement as an additive mask over the score row.
    ///
    /// Applied before selection, so an unentitled chunk is never a
    /// candidate. Filtering a finished ranking instead would mean the
    /// ranking had already read what the caller may not.
    pub fn mask_into(&self, caller: u64, row: &mut [f32]) {
        for (score, &bits) in row.iter_mut().zip(&self.acl_bits) {
            if bits & caller == 0 {
                *score = MASKED;
            }
        }
    }
}

/// Two multiplies and an add, called once per posting.
#[inline]
#[must_use]
fn saturation(frequency: f32, length_norm: f32) -> f32 {
    (frequency * (BM25_K1 + 1.0)) / (frequency + length_norm)
}

#[inline]
#[must_use]
fn rrf_weight(weight: f32, rank: usize) -> f32 {
    weight / (RRF_DAMPING + (rank + 1) as f32)
}

/// Buffers sized once at the largest batch shape and overwritten.
///
/// A serving loop that allocates per query spends a measurable
/// fraction of a cheap stage in the allocator, and the shapes here are
/// known from the index and the batch limit.
pub struct Scratch {
    dense: Vec<f32>,
    lexical: Vec<f32>,
    fused: Vec<f32>,
    dense_rank: Vec<u32>,
    lexical_rank: Vec<u32>,
    order: Vec<u32>,
}

impl Scratch {
    #[must_use]
    pub fn new(n_chunks: usize) -> Self {
        Self {
            dense: Vec::with_capacity(n_chunks),
            lexical: Vec::with_capacity(n_chunks),
            fused: Vec::with_capacity(n_chunks),
            dense_rank: Vec::with_capacity(n_chunks),
            lexical_rank: Vec::with_capacity(n_chunks),
            order: Vec::with_capacity(n_chunks),
        }
    }

    fn reset(&mut self, n_chunks: usize) {
        self.dense.resize(n_chunks, 0.0);
        self.lexical.resize(n_chunks, 0.0);
        self.fused.resize(n_chunks, 0.0);
        self.dense_rank.resize(n_chunks, 0);
        self.lexical_rank.resize(n_chunks, 0);
        self.order.resize(n_chunks, 0);
    }
}

/// Rank positions for one score row, written into a reused buffer.
///
/// Ranks rather than scores because a cosine and a BM25 value are not
/// on a common scale, and this is the only place that fact costs
/// anything: it forces an ordering of the full row, which is the
/// dominant retrieval term on a large corpus once the GEMM is fast.
fn rank_into(scores: &[f32], order: &mut [u32], ranks: &mut [u32]) {
    for (position, slot) in order.iter_mut().enumerate() {
        *slot = position as u32;
    }
    order.sort_unstable_by(|&left, &right| {
        scores[right as usize]
            .partial_cmp(&scores[left as usize])
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    for (rank, &position) in order.iter().enumerate() {
        ranks[position as usize] = rank as u32;
    }
}

/// Fuse, mask and select the top k without ordering the tail.
///
/// select_nth_unstable_by partitions in linear time and leaves the
/// discarded side in arbitrary order, which is correct here because
/// nothing downstream reads it. Only the k survivors are then sorted.
pub fn select_candidates(
    index: &PackedIndex,
    query_vector: &[f32],
    query_terms: &[TermId],
    caller: u64,
    weight_dense: f32,
    candidate_k: usize,
    scratch: &mut Scratch,
) -> Vec<ChunkPos> {
    let n_chunks = index.n_chunks();
    scratch.reset(n_chunks);

    let queries = ArrayView2::from_shape((1, index.dim()), query_vector)
        .expect("query width checked against the index at construction");
    let dense = index.dense_scores(&queries);
    scratch
        .dense
        .copy_from_slice(dense.index_axis(Axis(0), 0).as_slice().unwrap_or(&[]));

    index.lexical_scores_into(query_terms, &mut scratch.lexical);

    rank_into(&scratch.dense, &mut scratch.order, &mut scratch.dense_rank);
    rank_into(
        &scratch.lexical,
        &mut scratch.order,
        &mut scratch.lexical_rank,
    );

    for position in 0..n_chunks {
        scratch.fused[position] = rrf_weight(weight_dense, scratch.dense_rank[position] as usize)
            + rrf_weight(1.0 - weight_dense, scratch.lexical_rank[position] as usize);
    }
    index.mask_into(caller, &mut scratch.fused);

    let mut selected: Vec<u32> = (0..n_chunks as u32).collect();
    let keep = usize::min(candidate_k, n_chunks);
    if keep < n_chunks {
        let fused = &scratch.fused;
        selected.select_nth_unstable_by(keep, |&left, &right| {
            fused[right as usize]
                .partial_cmp(&fused[left as usize])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        selected.truncate(keep);
    }

    let fused = &scratch.fused;
    selected.sort_unstable_by(|&left, &right| {
        fused[right as usize]
            .partial_cmp(&fused[left as usize])
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    selected
        .into_iter()
        .filter(|&position| fused[position as usize] > MASKED)
        .map(|position| ChunkPos(position as usize))
        .collect()
}

pub struct BatchQuery {
    pub vector: Vec<f32>,
    pub terms: Vec<TermId>,
    pub caller: u64,
}

/// Fan a batch across cores.
///
/// The index is immutable and each query owns its own scratch and its
/// own score row, so there is nothing to synchronize. Pin BLAS to one
/// thread when doing this: two thread pools over the same cores
/// oversubscribe and both get slower, which is the classic way a
/// parallel retrieval path benchmarks worse than the serial one.
#[must_use]
pub fn retrieve_batch(
    index: &PackedIndex,
    batch: &[BatchQuery],
    weight_dense: f32,
    candidate_k: usize,
) -> Vec<Vec<ChunkPos>> {
    batch
        .par_iter()
        .map_init(
            || Scratch::new(index.n_chunks()),
            |scratch, query| {
                select_candidates(
                    index,
                    &query.vector,
                    &query.terms,
                    query.caller,
                    weight_dense,
                    candidate_k,
                    scratch,
                )
            },
        )
        .collect()
}

/// Recall at several m from one retrieval pass.
///
/// Sweeping m is the tuning loop that actually matters here, and it
/// does not need a retrieval per candidate m: retrieve once at the
/// largest, then read prefixes. Cheap enough that there is no excuse
/// for guessing m, which is what usually happens.
#[must_use]
pub fn recall_curve(
    index: &PackedIndex,
    retrieved: &[Vec<ChunkPos>],
    relevant: &[Vec<String>],
    candidate_m: &[usize],
) -> Vec<f32> {
    if retrieved.is_empty() {
        return vec![0.0; candidate_m.len()];
    }

    candidate_m
        .iter()
        .map(|&m| {
            let hits = retrieved
                .iter()
                .zip(relevant)
                .filter(|(positions, wanted)| {
                    positions
                        .iter()
                        .take(m)
                        .any(|&position| wanted.iter().any(|id| id == index.document_id(position)))
                })
                .count();
            hits as f32 / retrieved.len() as f32
        })
        .collect()
}
`,
        profile:
          'Dense retrieval is one O(n·d) GEMM at BLAS throughput; lexical retrieval is O(sum of posting lengths for the query terms), independent of corpus size and effectively free by comparison; selection is O(n) through select_nth_unstable_by rather than O(n log n). The two orderings that make rank fusion possible reintroduce an O(n log n) term and become the dominant retrieval cost on a large corpus — taken knowingly, since the alternative is a calibration between cosine and BM25 that does not exist. Illustrative, not a measured benchmark: the reranker and the generator still dominate end-to-end latency, and none of this changes which chunks are retrievable.',
      },
    },
  },
};
