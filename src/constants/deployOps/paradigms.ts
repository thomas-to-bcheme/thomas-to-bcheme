import type { ParadigmRow, RepoProofItem } from '@/types/deployOps';

export const PARADIGM_ROWS: readonly ParadigmRow[] = [
  {
    dimension: 'What ships',
    devops: 'Code and binaries; stateless services.',
    mlops: 'Code + data + trained model artifact.',
    llmops: 'Prompts, retrieval index, model/provider pin, and the code around them.',
  },
  {
    dimension: 'What is versioned',
    devops: 'Source, lockfiles, image digests.',
    mlops: 'Datasets, features, experiments, registry versions.',
    llmops: 'Prompt hashes, embedding model + index version, dated model snapshots.',
  },
  {
    dimension: 'How it is tested',
    devops: 'Unit / integration / E2E; assert equality.',
    mlops: 'Data validation, offline metrics on held-out sets.',
    llmops: 'Golden-set evals and calibrated LLM-as-judge; assert pass rates.',
  },
  {
    dimension: 'How it degrades',
    devops: 'Crashes and regressions, visible in probes.',
    mlops: 'Silent: data and concept drift, training/serving skew.',
    llmops: 'Silent: provider model updates, retrieval decay, prompt/model mismatch.',
  },
  {
    dimension: 'Release strategy',
    devops: 'Rolling, blue-green, canary on error rate and latency.',
    mlops: 'Shadow and champion/challenger, gated on model quality.',
    llmops: 'Eval-gated rollout, shadow traffic, index alias swap.',
  },
  {
    dimension: 'Cost driver',
    devops: 'Replicas and idle capacity.',
    mlops: 'Training compute and feature serving.',
    llmops: 'Tokens, GPU-seconds, context length, cache hit rate.',
  },
];

/**
 * Claims about THIS repository. Each carries the path that backs it; a claim
 * without evidence in the tree does not belong here. The repo does not use DVC,
 * MLflow or a feature store -- the section says so rather than implying it.
 */
export const REPO_PROOF: readonly RepoProofItem[] = [
  {
    id: 'rag-chat',
    claim: 'Gemini chat agent grounded in a versioned RAG context (system prompt as code).',
    evidencePath: 'src/data/AiSystemInformation.ts',
  },
  {
    id: 'signed-downloads',
    claim: 'Resume downloads gated by signed HMAC tokens rather than a raw shared secret.',
    evidencePath: 'src/lib/auth/resumeToken.ts',
  },
  {
    id: 'backend-deploy',
    claim: 'Python ML backend deployed through a GitHub Actions workflow.',
    evidencePath: '.github/workflows/deploy-backend.yml',
  },
  {
    id: 'jit-cuda',
    claim: 'Custom CUDA kernel built by runtime JIT, with GPU architecture auto-detected.',
    evidencePath: 'backend/cuda_ext.py',
  },
];

export const REPO_PROOF_DISCLAIMER =
  'This site does not run DVC, MLflow or a feature store. Those sections are engineering principles, not claims about this repo.';
