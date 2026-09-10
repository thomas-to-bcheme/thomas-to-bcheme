import type { AiMlModel } from '../../types';

/**
 * Variational Autoencoder — the generative stress test for this schema.
 *
 * Exercises ObjectiveKind 'elbo': the objective is MAXIMIZED, is a bound rather
 * than the quantity of interest, and has two terms that actively fight. Any
 * schema that assumed "loss, minimized" would have broken here.
 */
export const VAE: AiMlModel = {
  slug: 'vae',
  name: 'Variational Autoencoder',
  aliases: ['VAE', 'Auto-Encoding Variational Bayes'],
  category: 'generative-ai',
  group: 'latent-variable',
  kind: 'model',

  paradigms: ['unsupervised', 'self-supervised'],
  taskTypes: ['generation', 'density-estimation', 'dimensionality-reduction', 'anomaly-detection'],

  intuition:
    'An autoencoder that is forced to be probabilistic: instead of mapping an input to a single point in latent space, the encoder outputs a small Gaussian, and the decoder must reconstruct from a sample of it. Because nearby latent points now decode to similar outputs, the latent space becomes continuous rather than a scatter of memorized codes — which is what makes sampling from it produce something new rather than noise.',

  objective: {
    kind: 'elbo',
    expression: {
      formula:
        '\\mathcal{L}(\\theta,\\phi;\\mathbf{x}) = \\underbrace{\\mathbb{E}_{q_\\phi(\\mathbf{z}\\mid\\mathbf{x})}\\bigl[\\log p_\\theta(\\mathbf{x}\\mid\\mathbf{z})\\bigr]}_{\\text{reconstruction}} - \\underbrace{D_{\\mathrm{KL}}\\bigl(q_\\phi(\\mathbf{z}\\mid\\mathbf{x}) \\,\\|\\, p(\\mathbf{z})\\bigr)}_{\\text{regularizer}}',
      symbols: [
        { symbol: 'q_\\phi(\\mathbf{z}\\mid\\mathbf{x})', meaning: 'the encoder — an approximate posterior, a Gaussian per input' },
        { symbol: 'p_\\theta(\\mathbf{x}\\mid\\mathbf{z})', meaning: 'the decoder — the likelihood of the data given a latent code' },
        { symbol: 'p(\\mathbf{z})', meaning: 'the prior, almost always a standard normal' },
        { symbol: 'D_{\\mathrm{KL}}', meaning: 'how far the encoder has drifted from the prior' },
      ],
    },
    reading:
      'Maximize the evidence lower bound, not a loss: reconstruct the input well, while keeping the encoder close to the prior. The two terms pull against each other on purpose — pure reconstruction memorizes, pure regularization collapses to the prior and ignores the input, and the useful model lives between them. It is a bound because the true log-likelihood is intractable; the gap is the KL between the approximate and true posterior.',
  },

  optimization: {
    method: 'Stochastic gradient ascent on the ELBO via the reparameterization trick, with Adam',
    updateRule: {
      formula:
        '\\mathbf{z} = \\boldsymbol{\\mu}_\\phi(\\mathbf{x}) + \\boldsymbol{\\sigma}_\\phi(\\mathbf{x}) \\odot \\boldsymbol{\\epsilon}, \\qquad \\boldsymbol{\\epsilon} \\sim \\mathcal{N}(\\mathbf{0}, \\mathbf{I})',
      symbols: [
        { symbol: '\\boldsymbol{\\mu}_\\phi, \\boldsymbol{\\sigma}_\\phi', meaning: 'the encoder outputs — mean and standard deviation of the posterior' },
        { symbol: '\\boldsymbol{\\epsilon}', meaning: 'the noise, sampled OUTSIDE the graph so the gradient can flow past it' },
        { symbol: '\\odot', meaning: 'elementwise product' },
      ],
    },
    rationale:
      'The whole difficulty is that you cannot backpropagate through a sampling operation. The reparameterization trick moves the randomness into an input: rather than sampling z from a distribution whose parameters you want gradients for, you sample fixed noise and transform it deterministically by those parameters. The sampling stops being a node in the graph and the gradient flows straight through. Without this, a VAE is not trainable by gradient descent at all.',
    hyperparameters: [
      { name: 'latent dimension', role: 'Bottleneck width; the main lever on both reconstruction and how usable the space is', typicalRange: '2 to 512' },
      { name: 'beta (KL weight)', role: 'Rebalances the two terms; >1 buys disentanglement at the cost of reconstruction', typicalRange: '0.1 to 10' },
      { name: 'KL warm-up epochs', role: 'Anneals the KL term up from zero to prevent early posterior collapse', typicalRange: '0 to 30' },
      { name: 'decoder capacity', role: 'A decoder strong enough to ignore z will do exactly that', typicalRange: 'match to the encoder' },
    ],
    convergence:
      'Non-convex, and it converges reliably — the characteristic failure is not divergence but posterior collapse: the KL term drives to zero, the encoder outputs the prior regardless of input, and the decoder learns the unconditional mean. The ELBO looks respectable throughout and the model has learned nothing. Watch the KL term itself, not the total. The other well-known symptom is blurry samples, which is not a bug but the direct consequence of a Gaussian likelihood, whose optimum under uncertainty is an average.',
    complexity:
      'One encoder and one decoder pass per sample, so roughly twice a plain autoencoder. Sampling is a single decoder pass — orders of magnitude cheaper than diffusion, which is the main reason to still reach for a VAE.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Encode a window of the series into a latent distribution and decode the following window, so the forecast arrives as a distribution you can sample rather than a point. Sampling many decodings gives an empirical predictive interval directly.',
        where: [
          'Probabilistic demand forecasting where the tail drives the inventory decision',
          'Scenario generation for stress-testing a capacity or dispatch plan',
        ],
        why: 'Reach for it only when the deliverable is genuinely a distribution — otherwise a quantile-loss LSTM gets you intervals for far less complexity. The real advantage is that samples are coherent whole trajectories rather than independent per-step quantiles, which matters when a downstream optimizer consumes the path.',
        featurization: [
          'Condition the decoder on calendar and exogenous features, or samples ignore known structure',
          'Scale per series before encoding; the Gaussian likelihood assumes comparable magnitudes',
        ],
        evaluation:
          'Continuous ranked probability score and pinball loss on rolling-origin splits — never point MSE, which rewards exactly the mean-seeking behaviour that makes VAE forecasts blurry.',
        pitfalls: [
          'Posterior collapse produces samples that ignore the conditioning entirely and look plausible',
          'The Gaussian likelihood over-smooths sharp transitions, so spikes get averaged away',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Train on normal data only, then score by reconstruction probability or by the ELBO itself. A point the model assigns low likelihood is one the learned distribution does not explain — which is a principled anomaly score rather than a heuristic distance.',
        where: [
          'Manufacturing defect detection where defects are too rare and varied to label',
          'Network intrusion detection scoring novelty against learned normal traffic',
          'Medical imaging screening, flagging studies that do not look like the healthy distribution',
        ],
        why: 'Better founded than a plain autoencoder: the score is a likelihood under an explicit probabilistic model, not an unnormalized error. The well-documented catch is that deep generative models can assign *higher* likelihood to out-of-distribution inputs than to training data, so the score needs validating on real anomalies rather than trusted on theory.',
        featurization: [
          'Train exclusively on confirmed-normal data — contamination redefines normal',
          'Keep the latent dimension tight; a wide bottleneck reconstructs anomalies too',
          'Prefer importance-weighted likelihood over a single-sample ELBO for the score',
        ],
        evaluation:
          'PR-AUC and precision@k against confirmed anomalies, with the threshold taken from ELBO quantiles on a held-out clean set.',
        pitfalls: [
          'Higher likelihood for OOD inputs is a real and documented failure of deep generative scoring',
          'Blurry reconstructions inflate error on legitimately sharp normal inputs, causing false positives',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'A VAE models a distribution and samples from it; it has no notion of a constraint, an objective to maximize over decisions, or a feasible region. Using one to propose solutions gives plausible-looking outputs with no optimality argument and no guarantee of validity — which in an optimization setting is worse than useless.',
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'viable',
        how: 'Encode images to a compact latent and decode back, providing both a generative model and a learned representation for downstream tasks.',
        where: [
          'Latent diffusion, where a VAE compresses pixels so the diffusion model can work in a smaller space',
          'Image inpainting and attribute manipulation by moving along latent directions',
        ],
        why: 'Rarely the final generator any more — diffusion beats it decisively on sample quality — but its compression stage is load-bearing inside modern latent diffusion systems, which is arguably a more important role than it ever had standalone.',
        featurization: [
          'Convolutional encoder and decoder rather than dense layers; locality is the whole prior',
          'Perceptual or adversarial reconstruction loss to counter Gaussian blur',
        ],
        evaluation: 'FID for sample quality plus reconstruction PSNR, with human review — likelihood correlates poorly with perceived quality.',
        pitfalls: [
          'Pixel-space Gaussian likelihood produces the characteristic blur',
          'Latent-space interpolation looks smooth without implying the space is semantically disentangled',
        ],
      },
      'causal-inference': {
        fit: 'adapted',
        how: 'Not for estimating an effect — for generating the scenarios an effect estimate is stress-tested against. Fit a VAE to observed covariates, sample synthetic populations under varied latent assumptions, and re-run the estimator to see how far the conclusion moves.',
        where: [
          'Sensitivity analysis for unmeasured confounding, by simulating a plausible hidden confounder',
          'Synthetic control-arm generation for power analysis before a trial is run',
        ],
        why: 'The narrow legitimate use, and worth stating precisely because the tempting misuse is right next to it. A VAE trained on observational data has learned the confounding, not around it — asking it to produce counterfactuals reproduces the bias with generative confidence. Identification comes from the design; this only probes how fragile that design is.',
        featurization: [
          'Condition on the treatment indicator so synthetic arms can be sampled separately',
          'Preserve the covariate correlation structure — that is the whole object of interest',
        ],
        evaluation:
          'Whether the estimated effect survives across sampled scenarios, reported as a robustness range rather than a new point estimate.',
        pitfalls: [
          'Treating generated counterfactuals as evidence — the model reproduces confounding, it does not remove it',
          'Synthetic data inherits every bias in the observational sample that trained it',
        ],
      },
      'risk-and-fraud': {
        fit: 'adapted',
        how: 'Two distinct uses: score novelty by likelihood, and synthesize minority-class examples to rebalance a severely skewed training set.',
        where: [
          'Novelty scoring for fraud patterns never previously seen',
          'Synthetic minority oversampling where SMOTE is too crude for the feature structure',
        ],
        why: 'Useful where fraud is genuinely novel rather than a known pattern, since a supervised model can only recognize what it has been shown. Synthetic data must be validated hard, though — a VAE will happily generate artefacts the classifier then learns as signal.',
        featurization: [
          'Mixed categorical and continuous features need per-type likelihoods, not one Gaussian',
          'Fit on confirmed-legitimate transactions only',
        ],
        evaluation: 'Downstream classifier lift from the synthetic data, plus PR-AUC of the likelihood score on its own.',
        pitfalls: [
          'Synthetic samples can encode artefacts that the downstream model learns as real signal',
          'Regulated decisions may not permit a score nobody can explain',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours on one GPU for typical tabular or modest image data — far cheaper than a diffusion model of comparable scope.',
    inferenceProfile:
      'Sampling is a single decoder pass, so milliseconds. This is the VAE\'s standing advantage over diffusion, which needs tens to hundreds of passes per sample.',
    retrainingCadence:
      'Monthly to quarterly for generation. More often for anomaly scoring, where the definition of normal drifts.',
    driftAndMonitoring: [
      'Track the KL term separately from the total ELBO — collapse is invisible in the sum',
      'Monitor the ELBO distribution on known-normal traffic to catch threshold drift',
      'Watch for latent dimensions that go permanently inactive; that is capacity you are paying for and not using',
    ],
    productionGotchas: [
      'Sample stochastically at inference or you get the posterior mean every time, which defeats the point',
      'The likelihood is a bound, not a probability — do not present ELBO values as calibrated probabilities',
      'Latent dimension and the normalization are part of the contract; changing either invalidates stored embeddings',
    ],
  },

  assumptions: [
    'The data has a low-dimensional latent cause worth recovering',
    'A Gaussian approximate posterior is expressive enough for the true posterior',
    'The chosen likelihood matches the data type — Gaussian for continuous, Bernoulli for binary, and not interchangeably',
    'Training data is representative; anything absent will be assigned low likelihood, correctly or not',
  ],

  pros: [
    {
      point: 'Single-pass sampling',
      context:
        'Orders of magnitude cheaper than diffusion at inference, which is decisive for real-time or high-volume generation and irrelevant for offline batch work.',
    },
    {
      point: 'A principled likelihood-based anomaly score',
      context:
        'Gives a score grounded in an explicit probabilistic model rather than an unnormalized distance — though the OOD-likelihood pathology means it still has to be validated empirically.',
    },
    {
      point: 'Continuous, interpolable latent space',
      context:
        'What makes attribute manipulation and smooth interpolation work at all. A plain autoencoder\'s latent space has holes that decode to nothing.',
    },
    {
      point: 'Stable training',
      context:
        'A genuine advantage over GANs, which can collapse outright. The VAE\'s failure mode is subtler and quieter, which is its own problem.',
    },
  ],

  cons: [
    {
      point: 'Blurry samples under a Gaussian likelihood',
      context:
        'Structural, not a tuning issue: the optimum under uncertainty is an average. Disqualifying for photorealistic generation, harmless for representation learning.',
    },
    {
      point: 'Posterior collapse',
      context:
        'The model quietly stops using the latent while the ELBO still looks fine. This is why the KL term must be monitored on its own, and why warm-up exists.',
    },
    {
      point: 'The objective is a bound, not the likelihood',
      context:
        'The gap is unmeasured, so ELBO values are not comparable across architectures and must never be reported as probabilities.',
    },
    {
      point: 'Can assign higher likelihood to out-of-distribution data',
      context:
        'A documented failure of deep generative scoring that directly undermines the anomaly-detection use case — validate on real anomalies rather than trusting the theory.',
    },
  ],

  relatedSlugs: ['autoencoder', 'normalizing-flows', 'ddpm'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A VAE forward pass and its ELBO - the two terms, written out.

Reconstruction pulls the latent toward encoding the input; the KL pulls it
toward the prior. The model that is useful sits between them.
"""

import math
import random


def encode(x, w_mu, w_logvar):
    """Returns the posterior mean and log-variance for one input."""
    mu = [sum(w * v for w, v in zip(row, x)) for row in w_mu]
    logvar = [sum(w * v for w, v in zip(row, x)) for row in w_logvar]
    return mu, logvar


def reparameterize(mu, logvar):
    """z = mu + sigma * eps, with eps sampled OUTSIDE the computation.

    This is the whole trick: the randomness becomes an input rather than an
    operation, so a gradient can flow through to mu and logvar.
    """
    z = []
    for m, lv in zip(mu, logvar):
        sigma = math.exp(0.5 * lv)
        eps = random.gauss(0.0, 1.0)
        z.append(m + sigma * eps)
    return z


def decode(z, w_out):
    return [sum(w * v for w, v in zip(row, z)) for row in w_out]


def elbo(x, x_hat, mu, logvar):
    """The bound, as two explicit terms. Returned to be MAXIMIZED."""
    # Gaussian log-likelihood, up to a constant: negative squared error.
    reconstruction = -sum((a - b) ** 2 for a, b in zip(x, x_hat))

    # Closed form for KL(N(mu, sigma) || N(0, I)) - no sampling needed.
    kl = 0.5 * sum(
        math.exp(lv) + m * m - 1.0 - lv for m, lv in zip(mu, logvar)
    )

    return reconstruction - kl`,
        profile: 'O(D·L) per sample in pure Python. One sample per gradient step, so the ELBO estimate is very noisy.',
      },
      'make-it-right': {
        code: `"""VAE - typed, validated, with the KL warm-up that prevents collapse."""

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class VaeConfig:
    input_dim: int
    latent_dim: int = 32
    hidden_dim: int = 256
    beta: float = 1.0


class Vae(nn.Module):
    def __init__(self, config: VaeConfig) -> None:
        super().__init__()
        if config.latent_dim < 1:
            raise ValueError(f"latent_dim must be >= 1, got {config.latent_dim}")
        if config.beta < 0:
            raise ValueError(f"beta must be non-negative, got {config.beta}")

        self.config = config
        self.encoder = nn.Sequential(
            nn.Linear(config.input_dim, config.hidden_dim),
            nn.ReLU(),
        )
        # Two heads, not one: the posterior needs a mean and a spread.
        self.to_mu = nn.Linear(config.hidden_dim, config.latent_dim)
        self.to_logvar = nn.Linear(config.hidden_dim, config.latent_dim)
        self.decoder = nn.Sequential(
            nn.Linear(config.latent_dim, config.hidden_dim),
            nn.ReLU(),
            nn.Linear(config.hidden_dim, config.input_dim),
        )

    def encode(self, x: Tensor) -> tuple[Tensor, Tensor]:
        h = self.encoder(x)
        # log-variance rather than variance, so the output is unconstrained
        # and exp() guarantees positivity without a clamp.
        return self.to_mu(h), self.to_logvar(h)

    def forward(self, x: Tensor) -> tuple[Tensor, Tensor, Tensor]:
        if x.dim() != 2:
            raise ValueError(f"expected (batch, features), got {tuple(x.shape)}")
        mu, logvar = self.encode(x)
        z = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)
        return self.decoder(z), mu, logvar


def elbo_loss(
    x: Tensor, x_hat: Tensor, mu: Tensor, logvar: Tensor, beta: float
) -> tuple[Tensor, Tensor]:
    """Returns (negative ELBO to minimize, KL term for monitoring).

    The KL is returned separately on purpose: posterior collapse is invisible
    in the total, and the total is what people watch.
    """
    reconstruction = nn.functional.mse_loss(x_hat, x, reduction="sum") / x.size(0)
    kl = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp()) / x.size(0)
    return reconstruction + beta * kl, kl


def kl_weight(epoch: int, warmup_epochs: int, beta: float) -> float:
    """Anneal the KL from 0 to beta. Without this the KL wins early, the
    encoder collapses to the prior, and it never recovers."""
    if warmup_epochs <= 0:
        return beta
    return beta * min(1.0, epoch / warmup_epochs)`,
        rationale:
          'The hand-rolled passes become framework modules, log-variance replaces variance so positivity is structural rather than clamped, and the two failure modes that actually kill VAEs in practice are addressed directly: the KL is returned separately so collapse is visible, and warm-up stops it happening in the first place.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'Two network passes per batch, fully batched on GPU.',
      },
      'make-it-fast': {
        code: `"""VAE - fused KL, multi-sample estimator, one pass over the batch."""

import torch
from torch import Tensor, nn


def elbo_fused(x: Tensor, x_hat: Tensor, mu: Tensor, logvar: Tensor, beta: float) -> Tensor:
    """Both ELBO terms in a single fused reduction.

    The naive form builds five intermediate tensors (logvar.exp(), mu.pow(2),
    the sum, the negation, the scale). torch.addcmul folds the square and the
    accumulate into one traversal, and the whole expression reduces in one pass.
    """
    batch = x.size(0)
    recon = (x_hat - x).pow_(2).sum() / batch

    # -0.5 * sum(1 + logvar - mu^2 - exp(logvar)), computed without temporaries.
    kl_terms = torch.addcmul(logvar.exp() - logvar - 1.0, mu, mu)
    kl = 0.5 * kl_terms.sum() / batch

    return recon + beta * kl


def importance_weighted_elbo(model: nn.Module, x: Tensor, num_samples: int = 8) -> Tensor:
    """A tighter bound from K latent samples, for anomaly scoring.

    Expanding the batch to (K*B, D) evaluates all K samples in ONE decoder
    pass rather than K sequential ones - the difference between an 8x cost and
    roughly a 1.2x one, since the decoder is compute-bound and under-occupied
    at typical batch sizes.
    """
    batch, dim = x.shape
    mu, logvar = model.encode(x)

    # Contiguous expansion so the decoder sees one dense batch, not a strided view.
    mu_rep = mu.repeat_interleave(num_samples, dim=0)
    logvar_rep = logvar.repeat_interleave(num_samples, dim=0)
    x_rep = x.repeat_interleave(num_samples, dim=0)

    z = mu_rep + torch.exp(0.5 * logvar_rep) * torch.randn_like(mu_rep)
    x_hat = model.decoder(z)

    log_w = -(x_hat - x_rep).pow(2).sum(dim=1)
    log_w = log_w.view(batch, num_samples)

    # logsumexp in float32 regardless of autocast dtype: the whole point of
    # the estimator is the tail, and the tail is where float16 underflows.
    return torch.logsumexp(log_w.float(), dim=1) - torch.log(
        torch.tensor(float(num_samples))
    )`,
        rationale:
          'Two changes. The ELBO reduction is fused so the five intermediate tensors of the naive expression collapse into one traversal. And the multi-sample estimator — which is what makes the anomaly score usable — expands the batch once so all K samples go through the decoder in a single pass instead of K sequential ones.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'pow_ and addcmul fold the squaring and accumulation into existing buffers, removing five intermediate tensors from a reduction that runs every step.',
            tradeoff: 'In-place ops mutate their input, so an autograd graph that needs the original value will error — and the message points at the wrong line.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'repeat_interleave evaluates all K importance samples in one decoder pass; the decoder is under-occupied at typical batch sizes, so K samples cost far less than K times.',
            tradeoff: 'Peak memory scales with K·B — at K=64 this is what will exhaust the GPU, not the model.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'repeat_interleave produces a contiguous tensor the decoder can consume without a gather, and the float32 logsumexp keeps the tail from underflowing under mixed precision.',
            tradeoff: 'The contiguous expansion is a real copy of K·B·D floats rather than a free stride trick.',
          },
        ],
        libraryName: 'PyTorch',
        profile: 'One fused reduction per step; K samples in one decoder pass. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A VAE forward pass and its ELBO - the two terms, written out.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

std::vector<double> MatVec(const std::vector<std::vector<double>>& w,
                           const std::vector<double>& v) {
  std::vector<double> out(w.size(), 0.0);
  for (std::size_t j = 0; j < w.size(); ++j) {
    double acc = 0.0;
    for (std::size_t k = 0; k < v.size(); ++k) acc += w[j][k] * v[k];
    out[j] = acc;
  }
  return out;
}

// z = mu + sigma * eps, with eps drawn outside the graph so a gradient can
// flow through to mu and log_var.
std::vector<double> Reparameterize(const std::vector<double>& mu,
                                   const std::vector<double>& log_var,
                                   std::mt19937& rng) {
  std::normal_distribution<double> normal(0.0, 1.0);
  std::vector<double> z(mu.size());
  for (std::size_t j = 0; j < mu.size(); ++j) {
    const double sigma = std::exp(0.5 * log_var[j]);
    z[j] = mu[j] + sigma * normal(rng);
  }
  return z;
}

// Returned to be MAXIMIZED: reconstruction minus divergence from the prior.
double Elbo(const std::vector<double>& x, const std::vector<double>& x_hat,
            const std::vector<double>& mu, const std::vector<double>& log_var) {
  double reconstruction = 0.0;
  for (std::size_t j = 0; j < x.size(); ++j) {
    const double d = x[j] - x_hat[j];
    reconstruction -= d * d;
  }

  // Closed form for KL(N(mu, sigma) || N(0, I)) - no sampling required.
  double kl = 0.0;
  for (std::size_t j = 0; j < mu.size(); ++j) {
    kl += std::exp(log_var[j]) + mu[j] * mu[j] - 1.0 - log_var[j];
  }

  return reconstruction - 0.5 * kl;
}`,
        profile: 'O(D·H + H·L) per sample. Every MatVec allocates a fresh vector.',
      },
      'make-it-right': {
        code: `// VAE encoder - flat storage, RAII, validated once at construction.
#include <cmath>
#include <cstddef>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

struct Posterior {
  std::vector<double> mu;
  std::vector<double> log_var;
};

class VaeEncoder {
 public:
  // mu and log_var share one [2L x D] block so a forward pass is a single
  // traversal of contiguous memory rather than two strided ones.
  VaeEncoder(std::size_t input_dim, std::size_t latent_dim, std::vector<double> weights)
      : input_dim_(input_dim), latent_dim_(latent_dim), weights_(std::move(weights)) {
    if (input_dim_ == 0 || latent_dim_ == 0) {
      throw std::invalid_argument("input and latent dimensions must be non-zero");
    }
    if (weights_.size() != 2 * latent_dim_ * input_dim_) {
      throw std::invalid_argument("weight block is not [2L x D]");
    }
  }

  [[nodiscard]] Posterior Encode(std::span<const double> x) const {
    if (x.size() != input_dim_) {
      throw std::invalid_argument("input width does not match the encoder");
    }

    Posterior posterior{std::vector<double>(latent_dim_), std::vector<double>(latent_dim_)};
    for (std::size_t j = 0; j < latent_dim_; ++j) {
      posterior.mu[j] = Dot(weights_.data() + j * input_dim_, x);
      posterior.log_var[j] =
          Dot(weights_.data() + (latent_dim_ + j) * input_dim_, x);
    }
    return posterior;
  }

  // Sampling is explicit about its RNG - a hidden global generator makes a
  // stochastic model impossible to reproduce.
  [[nodiscard]] std::vector<double> Sample(const Posterior& posterior,
                                           std::mt19937& rng) const {
    std::normal_distribution<double> normal(0.0, 1.0);
    std::vector<double> z(latent_dim_);
    for (std::size_t j = 0; j < latent_dim_; ++j) {
      z[j] = posterior.mu[j] + std::exp(0.5 * posterior.log_var[j]) * normal(rng);
    }
    return z;
  }

  [[nodiscard]] std::size_t latent_dim() const noexcept { return latent_dim_; }

 private:
  static double Dot(const double* row, std::span<const double> x) noexcept {
    double acc = 0.0;
    for (std::size_t k = 0; k < x.size(); ++k) acc += row[k] * x[k];
    return acc;
  }

  std::size_t input_dim_;
  std::size_t latent_dim_;
  std::vector<double> weights_;
};`,
        rationale:
          'The nested weight vectors become one flat [2L x D] block so mu and log-variance come from a single contiguous traversal, shape validation happens once at construction rather than per call, and the RNG is threaded explicitly instead of pulled from a hidden global — a stochastic model with an invisible generator cannot be reproduced.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'One pass over the weight block per encode; two allocations for the posterior.',
      },
      'make-it-fast': {
        code: `// VAE ELBO - Eigen, batched, both terms in one fused traversal.
#include <Eigen/Dense>

// Batched encode: [B x D] times [D x 2L] is a GEMM, not B separate
// matrix-vector products. That single change moves the work from
// memory-bound to compute-bound.
struct BatchPosterior {
  Eigen::MatrixXd mu;       // [B x L]
  Eigen::MatrixXd log_var;  // [B x L]
};

BatchPosterior EncodeBatch(const Eigen::MatrixXd& x, const Eigen::MatrixXd& weights,
                           Eigen::Index latent_dim) {
  const Eigen::MatrixXd projected = x * weights;   // [B x 2L], one GEMM
  return BatchPosterior{projected.leftCols(latent_dim),
                        projected.rightCols(latent_dim)};
}

// KL(N(mu, sigma) || N(0, I)) summed over the batch.
//
// Written as one array expression so Eigen fuses exp, square, and subtract
// into a single pass. Term by term it would materialize four [B x L]
// temporaries per call, on every training step.
double KlDivergence(const BatchPosterior& posterior) {
  const auto log_var = posterior.log_var.array();
  const auto mu = posterior.mu.array();
  return 0.5 * (log_var.exp() + mu.square() - 1.0 - log_var).sum();
}

double NegativeElbo(const Eigen::MatrixXd& x, const Eigen::MatrixXd& x_hat,
                    const BatchPosterior& posterior, double beta) {
  // squaredNorm is a single fused reduction - no difference matrix is ever
  // materialized.
  const double reconstruction = (x_hat - x).squaredNorm();
  return (reconstruction + beta * KlDivergence(posterior)) / x.rows();
}`,
        rationale:
          'Per-sample matrix-vector products become one batched GEMM, and the KL — which term by term would materialize four [B x L] temporaries on every training step — becomes a single fused array expression evaluated in one pass.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Batching the encoder projection turns B matrix-vector products into one GEMM, which is compute-bound rather than memory-bound.',
            tradeoff: 'Requires materializing the whole batch as a dense matrix, so peak memory scales with batch size rather than staying constant.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The KL array expression fuses exp, square, and subtract into one traversal instead of four intermediate matrices per step.',
            tradeoff: 'Assigning such an expression to auto rather than a concrete type yields a dangling reference — the classic Eigen trap.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'squaredNorm reduces the reconstruction term without ever building the difference matrix.',
            tradeoff: 'The fused form is harder to instrument — you cannot inspect per-element residuals without unfusing it again.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'One GEMM plus two fused reductions per batch. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A VAE forward pass and its ELBO - the two terms, written out.

fn mat_vec(w: &[Vec<f64>], v: &[f64]) -> Vec<f64> {
    let mut out = vec![0.0; w.len()];
    for j in 0..w.len() {
        let mut acc = 0.0;
        for k in 0..v.len() {
            acc += w[j][k] * v[k];
        }
        out[j] = acc;
    }
    out
}

/// z = mu + sigma * eps, with eps drawn outside the graph so a gradient can
/// reach mu and log_var.
pub fn reparameterize(mu: &[f64], log_var: &[f64], noise: &[f64]) -> Vec<f64> {
    let mut z = vec![0.0; mu.len()];
    for j in 0..mu.len() {
        let sigma = (0.5 * log_var[j]).exp();
        z[j] = mu[j] + sigma * noise[j];
    }
    z
}

/// Returned to be MAXIMIZED: reconstruction minus divergence from the prior.
pub fn elbo(x: &[f64], x_hat: &[f64], mu: &[f64], log_var: &[f64]) -> f64 {
    let mut reconstruction = 0.0;
    for j in 0..x.len() {
        let d = x[j] - x_hat[j];
        reconstruction -= d * d;
    }

    // Closed form for KL(N(mu, sigma) || N(0, I)).
    let mut kl = 0.0;
    for j in 0..mu.len() {
        kl += log_var[j].exp() + mu[j] * mu[j] - 1.0 - log_var[j];
    }

    reconstruction - 0.5 * kl
}

pub fn encode(x: &[f64], w_mu: &[Vec<f64>], w_log_var: &[Vec<f64>]) -> (Vec<f64>, Vec<f64>) {
    (mat_vec(w_mu, x), mat_vec(w_log_var, x))
}`,
        profile: 'O(D·L) per sample. Two allocations per encode, every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! VAE encoder - typed errors, flat weights, seeded RNG for reproducibility.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum VaeError {
    ZeroSized,
    WeightShape { expected: usize, found: usize },
    InputWidth { expected: usize, found: usize },
}

impl fmt::Display for VaeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroSized => write!(f, "input and latent dimensions must be non-zero"),
            Self::WeightShape { expected, found } => {
                write!(f, "expected a {expected}-element weight block, found {found}")
            }
            Self::InputWidth { expected, found } => {
                write!(f, "expected input width {expected}, found {found}")
            }
        }
    }
}

impl std::error::Error for VaeError {}

#[derive(Debug, Clone)]
pub struct Posterior {
    pub mu: Vec<f64>,
    pub log_var: Vec<f64>,
}

impl Posterior {
    /// Closed-form KL against a standard normal prior.
    #[must_use]
    pub fn kl_divergence(&self) -> f64 {
        0.5 * self
            .mu
            .iter()
            .zip(&self.log_var)
            .map(|(m, lv)| lv.exp() + m * m - 1.0 - lv)
            .sum::<f64>()
    }
}

pub struct VaeEncoder {
    input_dim: usize,
    latent_dim: usize,
    /// One flat [2L x D] block: the mu rows, then the log-var rows.
    weights: Vec<f64>,
}

impl VaeEncoder {
    pub fn new(input_dim: usize, latent_dim: usize, weights: Vec<f64>) -> Result<Self, VaeError> {
        if input_dim == 0 || latent_dim == 0 {
            return Err(VaeError::ZeroSized);
        }
        let expected = 2 * latent_dim * input_dim;
        if weights.len() != expected {
            return Err(VaeError::WeightShape { expected, found: weights.len() });
        }
        Ok(Self { input_dim, latent_dim, weights })
    }

    pub fn encode(&self, x: &[f64]) -> Result<Posterior, VaeError> {
        if x.len() != self.input_dim {
            return Err(VaeError::InputWidth { expected: self.input_dim, found: x.len() });
        }

        let projected: Vec<f64> = self
            .weights
            .chunks_exact(self.input_dim)
            .map(|row| row.iter().zip(x).map(|(w, v)| w * v).sum())
            .collect();

        let (mu, log_var) = projected.split_at(self.latent_dim);
        Ok(Posterior { mu: mu.to_vec(), log_var: log_var.to_vec() })
    }

    /// Noise is passed in rather than drawn internally: a stochastic model
    /// with a hidden RNG cannot be reproduced or tested.
    pub fn sample(&self, posterior: &Posterior, noise: &[f64]) -> Vec<f64> {
        posterior
            .mu
            .iter()
            .zip(&posterior.log_var)
            .zip(noise)
            .map(|((m, lv), eps)| m + (0.5 * lv).exp() * eps)
            .collect()
    }
}`,
        rationale:
          'Nested weight vectors become one flat block walked with chunks_exact, shape errors become a typed Result checked once at construction, and the RNG is lifted into the caller\'s hands — a model whose randomness comes from a hidden global is neither reproducible nor testable.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One pass over the weight block per encode; one allocation for the projection.',
      },
      'make-it-fast': {
        code: `//! VAE encoder - parallel projection, fused KL, caller-owned buffers.

use rayon::prelude::*;

pub struct FastVaeEncoder {
    input_dim: usize,
    latent_dim: usize,
    weights: Vec<f64>,
}

impl FastVaeEncoder {
    /// Writes into caller-owned \`mu\` and \`log_var\` slices. Training calls this
    /// once per sample per epoch, so returning freshly allocated Vecs would put
    /// two allocations in the hottest loop in the program.
    pub fn encode_into(&self, x: &[f64], mu: &mut [f64], log_var: &mut [f64]) {
        let input_dim = self.input_dim;
        let (mu_rows, log_var_rows) = self
            .weights
            .split_at(self.latent_dim * input_dim);

        // The two heads are independent, so they project in parallel - and
        // rayon::join is the right primitive for exactly two tasks, with far
        // less overhead than a parallel iterator over a 2-element collection.
        rayon::join(
            || project(mu_rows, x, input_dim, mu),
            || project(log_var_rows, x, input_dim, log_var),
        );
    }

    /// Fused KL: one traversal, no intermediate collection.
    #[must_use]
    pub fn kl_divergence(mu: &[f64], log_var: &[f64]) -> f64 {
        0.5 * mu
            .iter()
            .zip(log_var)
            .map(|(m, lv)| lv.exp() + m * m - 1.0 - lv)
            .sum::<f64>()
    }
}

#[inline]
fn project(rows: &[f64], x: &[f64], input_dim: usize, out: &mut [f64]) {
    out.par_iter_mut()
        .zip(rows.par_chunks_exact(input_dim))
        .for_each(|(slot, row)| {
            // zip over two slices of proven-equal length: the compiler drops
            // the bounds checks from the innermost dot product.
            *slot = row.iter().zip(x).map(|(w, v)| w * v).sum();
        });
}`,
        rationale:
          'Output buffers move to the caller so the two allocations per encode leave the hot training loop, the two projection heads run concurrently under rayon::join, and the KL becomes a single fused traversal rather than a collect-then-reduce.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The latent rows are independent dot products, and the two heads are independent of each other — rayon::join is the right shape for exactly two tasks rather than a parallel iterator over a two-element collection.',
            tradeoff: 'Below roughly a 256-wide latent the join overhead exceeds the work being parallelized.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Caller-owned output slices remove two allocations per encode from a loop that runs once per sample per epoch.',
            tradeoff: 'Out-parameters are a worse API than a returned value, and the caller now owns a correctness obligation about slice lengths.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'zip over two slices whose lengths the compiler can prove equal removes the per-element bounds check from the innermost dot product.',
            tradeoff: 'chunks_exact silently discards a trailing partial chunk, so the shape invariant must be guaranteed before this is reached.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Both heads projected concurrently; zero allocation per encode. Illustrative, not a measured benchmark.',
      },
    },
  },
};
