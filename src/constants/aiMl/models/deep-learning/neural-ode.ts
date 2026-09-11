import type { AiMlModel } from '../../types';

/**
 * Neural ODE — the entry where depth becomes a continuous variable.
 *
 * Included for the adjoint method as much as for the model: training with
 * memory independent of solver depth, by solving an augmented system
 * backwards rather than storing a tape, is one of the genuinely transferable
 * ideas in this reference.
 */
export const NEURAL_ODE: AiMlModel = {
  slug: 'neural-ode',
  name: 'Neural ODE',
  aliases: ['Neural ordinary differential equation', 'ODE-Net', 'Latent ODE', 'Continuous normalizing flow', 'Adjoint sensitivity method'],
  category: 'deep-learning',
  group: 'scientific',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'sequence-modeling', 'density-estimation', 'anomaly-detection'],
  architecture: 'feedforward',
  paradigmNote:
    'The network itself is an ordinary feedforward net — what changes is what it parameterizes. It emits a derivative rather than a next state, and an ODE solver turns that derivative into a trajectory, so "depth" becomes integration time and the number of layers becomes a solver decision rather than an architectural one.',

  intuition:
    'A residual block computes h + f(h), which is Euler’s method for an ODE with a step size of one. Take that seriously: shrink the step, let the solver choose how many it needs, and the network stops being a fixed stack of layers and becomes a vector field that something else integrates. Two things follow that are not merely aesthetic. The trajectory is defined at every time, not just at layer boundaries, which is exactly what an irregularly sampled series needs. And because the dynamics are reversible, the backward pass can be recomputed instead of stored, so memory stops growing with depth.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\ell\\bigl(\\mathbf{h}(t_1)\\bigr), \\qquad \\mathbf{h}(t_1) = \\mathbf{h}(t_0) + \\int_{t_0}^{t_1} f_\\theta\\bigl(\\mathbf{h}(t), t\\bigr)\\,dt',
      symbols: [
        { symbol: 'f_\\theta', meaning: 'the learned vector field: given a state and a time, it returns a derivative, never a next state' },
        { symbol: '\\mathbf{h}(t)', meaning: 'the hidden state as a continuous function of time rather than a value per layer' },
        { symbol: 't_1 - t_0', meaning: 'integration time, which plays the role depth plays in a conventional network' },
        { symbol: '\\ell', meaning: 'whatever the task loss is — the objective is ordinary; the forward pass is not' },
      ],
    },
    reading:
      'The loss is applied only at the endpoint, which is worth pausing on: there is no per-layer supervision and no intermediate output, because there are no layers to attach one to. Everything unusual is in the constraint that the forward pass is an integral rather than a composition. Two consequences follow. The solver becomes part of the model — change its tolerance and you change the function, which is unlike anything else in this reference. And because a solution to an ODE cannot cross itself, the map from input to output is a homeomorphism, so a plain Neural ODE provably cannot represent a function that separates nested or interleaved regions. That is a genuine expressivity limit rather than an optimization difficulty, and the standard fix is to augment the state with extra dimensions so the trajectory has room to go around.',
  },

  optimization: {
    method: 'Adam on the endpoint loss, with gradients from the adjoint sensitivity method or from backpropagating through the solver',
    updateRule: {
      formula:
        '\\frac{d\\mathbf{a}}{dt} = -\\mathbf{a}(t)^\\top \\frac{\\partial f_\\theta}{\\partial \\mathbf{h}}, \\qquad \\frac{dJ}{d\\theta} = -\\int_{t_1}^{t_0} \\mathbf{a}(t)^\\top \\frac{\\partial f_\\theta}{\\partial \\theta}\\,dt',
      symbols: [
        { symbol: '\\mathbf{a}(t)', meaning: 'the adjoint: the gradient of the loss with respect to the state at time t' },
        { symbol: 't_1 \\to t_0', meaning: 'the adjoint is integrated BACKWARDS in time, alongside a recomputed forward state' },
        { symbol: '\\partial f_\\theta/\\partial \\mathbf{h}', meaning: 'a vector-Jacobian product, never a materialized Jacobian' },
        { symbol: 'dJ/d\\theta', meaning: 'accumulated as a third integral in the same augmented backward solve' },
      ],
    },
    rationale:
      'The adjoint method is the idea worth taking away, and it generalizes well past this model. Backpropagating through a solver stores every intermediate state, so memory grows with the number of steps — and an adaptive solver chooses that number, which means memory becomes data-dependent and unpredictable. The adjoint instead solves an augmented system backwards in time: the state, the adjoint and the parameter gradient integrated together, with the forward state recomputed on the way rather than stored. Memory becomes constant in depth, at the cost of roughly doubling the compute and, more seriously, of numerical error, because recomputing the forward trajectory backwards is not exact for a stiff or chaotic system and the reconstructed states drift from the ones the forward pass actually visited. That trade — constant memory for a recomputation that may not be faithful — is the whole engineering story, and the honest advice is to use the adjoint when memory binds and direct backpropagation when it does not.',
    hyperparameters: [
      { name: 'solver', role: 'Fixed-step (Euler, RK4) or adaptive (Dopri5). Adaptive is more accurate and makes cost data-dependent', typicalRange: 'RK4 / Dopri5' },
      { name: 'tolerance (rtol, atol)', role: 'For adaptive solvers. Part of the model definition, not a runtime setting — changing it changes the function', typicalRange: '1e-7 to 1e-3' },
      { name: 'integration time', role: 'Plays the role depth plays elsewhere; longer means more solver steps and more expressive dynamics', typicalRange: '1.0, usually normalized' },
      { name: 'augmented dimensions', role: 'Extra state dimensions that let trajectories avoid crossing. Without them some functions are simply unrepresentable', typicalRange: '0 to 10' },
      { name: 'vector-field width', role: 'Capacity of the network computing the derivative; evaluated many times per forward pass', typicalRange: '32 to 256' },
      { name: 'max solver steps', role: 'A hard cap. Without it a stiff system can take unboundedly many steps and hang the training run', typicalRange: '1000 to 10000' },
    ],
    convergence:
      'Trains like any other model until it does not, and the failures are solver failures rather than optimization ones — which is what makes them unfamiliar. The characteristic one is creeping stiffness: as training progresses the learned dynamics get sharper, an adaptive solver needs more steps to hold tolerance, and the cost per iteration climbs steadily until a run that started at seconds per step is taking minutes. Nothing reports this except wall-clock time, and the number of function evaluations is the diagnostic people forget to log. The second is adjoint drift, where reconstructing the forward trajectory backwards accumulates error and the gradients become quietly wrong; it shows up as training that plateaus for no visible reason, and tightening tolerance or switching to direct backpropagation fixes it. The third is the topological limit — a plain Neural ODE cannot separate nested regions at all, so it will fail on such a task no matter how long it trains, and augmenting the state is the fix rather than more capacity.',
    complexity:
      'O(NFE · cost of f) per forward pass, where the number of function evaluations is chosen by the solver and grows as the dynamics stiffen. The adjoint backward roughly doubles that while using memory constant in depth; direct backpropagation uses memory linear in the number of steps. That memory-versus-faithfulness trade is the defining cost characteristic of the model.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'The latent-ODE formulation: encode the observed history into an initial state, integrate the learned dynamics forward to whatever times you need, and decode. Because the state is defined continuously, observations at arbitrary times are read off the same trajectory — there is no resampling, no imputation, and no notion of a missing step, because there are no steps.',
        where: [
          'Irregularly sampled clinical time series, where measurements arrive when someone took them and a fixed grid is a fiction',
          'Sensor networks with asynchronous or dropout-prone sampling, where resampling destroys the timing information',
          'Physical and biological systems where the true dynamics are continuous and a differential equation is the natural description',
          'Forecasting at arbitrary horizons from one trained model, since the horizon is an integration limit rather than an output dimension',
        ],
        why: 'Within the irregular-sampling niche this is genuinely the right tool, and the argument is structural rather than empirical: a discrete recurrent model has to pretend the data lies on a grid, and every way of doing that — resampling, imputation, a delta-time feature — discards or fabricates something. A continuous-time model does not have the problem at all. Outside that niche the case collapses. On regularly sampled data it is substantially more expensive than an LSTM or a patch transformer for no accuracy gain, and the extra machinery buys nothing. The honest trigger is irregular or asynchronous observation times, not sophistication.',
        featurization: [
          'Feed actual observation times rather than an index, since the whole point is that spacing carries information',
          'Normalize the time axis so integration intervals are order one, or the solver spends its step budget on scale rather than on dynamics',
          'Augment the state with extra dimensions, which both relieves the topological limit and gives the dynamics room to be smooth',
          'Cap solver steps explicitly, or a stiff learned field can hang a training run indefinitely',
          'Log the number of function evaluations per batch — it is the only early warning that the dynamics are stiffening',
        ],
        evaluation:
          'Rolling-origin backtesting at the actual observation times, with an ODE-free baseline that consumes a delta-time feature — that comparison is what establishes whether continuous time is contributing anything, and it is routinely skipped. Report the number of function evaluations alongside accuracy, since a model that is marginally better and five times slower is usually not the better model.',
        pitfalls: [
          'Using it on regularly sampled data, where a discrete model is cheaper and just as good',
          'Stiffening dynamics silently inflating cost per step across training',
          'Skipping the delta-time baseline, so the continuous formulation is never actually justified',
          'Treating solver tolerance as a runtime knob when it is part of the model definition',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Through the continuous normalizing flow variant, which is where the model earns a density. Because the change in log-density along a trajectory is the integral of the vector field’s divergence, an ODE that transports a simple base distribution to the data distribution gives an exact log-likelihood — and a low-likelihood point is the anomaly score, with no reconstruction or threshold heuristic in between.',
        where: [
          'Density-based outlier detection where an exact likelihood is wanted rather than a reconstruction proxy',
          'Scientific and physical monitoring, where the density itself is the quantity of interest',
          'Irregularly sampled trajectory anomaly detection, combining the continuous-time and density arguments',
          'Cases where a calibrated probability rather than a score is required downstream',
        ],
        why: 'It gives an exact likelihood rather than a bound or a proxy, which is genuinely rarer than it sounds — a VAE gives a bound, an autoencoder gives a reconstruction residual that is not a density at all, and this gives the actual number. The reason it is adapted rather than primary is cost: evaluating the divergence exactly is quadratic in dimension, so practical implementations use a stochastic trace estimator that reintroduces variance into the very quantity you wanted exactly. Combined with solver cost, density evaluation is orders of magnitude more expensive than an isolation forest, which on ordinary tabular data is competitive. Reach for this when an exact density is genuinely required and the dimension is modest.',
        featurization: [
          'Use the stochastic trace estimator in dimensions above roughly ten, and report that the likelihood is now an estimate rather than exact',
          'Tighten solver tolerance for likelihood evaluation relative to training, since density is far more sensitive to integration error than a point prediction',
          'Standardize inputs, because the base distribution is standard and a badly scaled input makes the flow work to fix the scale',
          'Calibrate the likelihood threshold on held-out normal data rather than assuming a level',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget, with an isolation forest baseline on the same data — the cost difference is several orders of magnitude and the accuracy difference frequently is not. Verify likelihood stability under tolerance changes: if the score moves when the solver tolerance moves, the density is being reported more precisely than it is known.',
        pitfalls: [
          'Quoting an exact likelihood while using a stochastic trace estimator, which makes it an estimate with real variance',
          'Solver tolerance too loose for the density, so scores shift between runs of the same model',
          'Enormous cost against an isolation forest that performs comparably on tabular data',
          'Training data containing the anomalies, which the density then assigns high probability',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'This entry is substantially an optimization and numerical-methods topic wearing a modelling hat. The adjoint sensitivity method is the centrepiece: gradients of a loss defined through an ODE solve, obtained by integrating an augmented system backwards rather than by storing a tape, giving memory constant in depth. Around it sit adaptive step control with embedded error estimates, stiffness as the reason a solver takes more steps, and the general principle that the numerical method is part of the model rather than an implementation choice beneath it.',
        where: [
          'Adjoint sensitivity as memory-constant differentiation through an implicit computation — the transferable idea here',
          'Adaptive step control with embedded error estimation, where the same evaluations give both the step and its error',
          'Stiffness as a diagnosable cost driver, measured by function evaluations rather than by wall clock',
          'Checkpointed or interleaved schemes trading recomputation against storage, the same frontier as gradient checkpointing',
        ],
        why: 'Worth studying because it is the clearest case in this reference of differentiating through something that is solved rather than computed, and because the trade it exposes is real and uncomfortable: the adjoint buys constant memory by recomputing the forward trajectory backwards, and that recomputation is not exact. On a stiff or chaotic system the reconstructed states drift from the ones the forward pass visited and the gradients are quietly wrong — a failure with no error message. Knowing that the correct answer is often "use direct backpropagation and pay the memory" is more useful than knowing the adjoint derivation.',
        featurization: [
          'Log function evaluations per batch as the primary cost metric; wall clock conflates stiffness with hardware',
          'Use direct backpropagation when memory permits, and reserve the adjoint for when it genuinely does not',
          'Tighten tolerance until the loss stops changing, which is the practical test that integration error is no longer contaminating the gradient',
          'Cap solver steps hard, since a stiff field can otherwise consume an unbounded step budget and hang the run',
        ],
        evaluation:
          'Compare adjoint gradients against direct backpropagation on a small problem; a divergence between them is integration error, not a bug, and it is the signal that tolerance is too loose. Sweep tolerance and watch both the loss and the evaluation count — the point where the loss stabilizes is the tolerance the model actually needs.',
        pitfalls: [
          'Trusting adjoint gradients on a stiff system, where the backward reconstruction drifts and the gradients are wrong with no error',
          'Treating the solver as infrastructure rather than as part of the model, so tolerance changes silently change the function',
          'Optimizing wall clock while the real cost driver is a rising evaluation count',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'System identification: learn the continuous dynamics of a physical system from trajectory data, then use the learned field inside a model-predictive controller or a simulator. The learned model is an ODE, which is the same object the control literature already works with, so it drops into existing machinery rather than requiring a new one.',
        where: [
          'Learning dynamics for model-predictive control from observed trajectories',
          'Digital twins of physical processes where the underlying description is genuinely a differential equation',
          'Hybrid models where a known physical ODE is augmented by a learned residual term',
          'Continuous-time reinforcement learning, where the dynamics model is an ODE rather than a discrete transition',
        ],
        why: 'The output is in the form control theory expects, which is a larger practical advantage than it sounds — a learned discrete transition model has to be converted or re-derived before a continuous controller can use it, and this does not. The hybrid form is the most defensible use: keep the known physics and learn only the residual, which preserves the guarantees the known part carries. Against it: a controller calling an adaptive solver inside its inner loop has unpredictable latency, which is a hard problem in a real-time loop, and a learned field carries no stability guarantee at all, so it can produce trajectories that are physically impossible with nothing to prevent it.',
        featurization: [
          'Prefer the hybrid form — known physics plus a learned residual — since it keeps whatever the known part guarantees',
          'Use a fixed-step solver in a control loop; an adaptive one has unpredictable latency and that is disqualifying in real time',
          'Constrain the learned field where physics permits, such as enforcing energy dissipation, rather than hoping it is learned',
          'Validate on trajectories much longer than those trained on, since compounding is where a learned field fails',
        ],
        evaluation:
          'Long-horizon trajectory error against held-out rollouts, plus closed-loop control performance — open-loop prediction error and closed-loop regret diverge sharply, and only the second matters. Check for physically impossible behaviour explicitly, because nothing in the training objective forbids it.',
        pitfalls: [
          'Unpredictable solver latency breaking a real-time control loop',
          'A learned field with no stability guarantee producing divergent or impossible trajectories',
          'Validating only on short horizons, where compounding error has not yet appeared',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Substantially more than a comparable discrete model, and variably so: cost is the number of function evaluations times the cost of the vector field, and an adaptive solver chooses that number based on how stiff the learned dynamics have become. A run that starts fast can become slow without any change to the code.',
    inferenceProfile:
      'One solve per input, with the same variability. A fixed-step solver gives predictable latency at the cost of accuracy, which is usually the right trade in production. Adaptive solvers should not be placed behind a latency SLA without a hard step cap.',
    retrainingCadence:
      'Driven by the domain rather than the model — physical systems drift slowly, clinical practice changes on its own schedule. Nothing about the architecture makes retraining more or less frequent than its discrete equivalents.',
    driftAndMonitoring: [
      'Track function evaluations per request as a first-class metric; a rising count means the dynamics have stiffened and it precedes every latency problem',
      'Alert on solver step-cap hits, which mean the solution was truncated rather than converged and the output is not what the model defines',
      'Monitor latency at the tail rather than the mean, since adaptive solvers produce a long and input-dependent tail',
      'Re-verify that outputs are stable under a tolerance change; drift there means integration error has become material',
    ],
    productionGotchas: [
      'The solver and its tolerance are part of the model. Serving with different settings than training used gives a different function, with nothing to indicate it',
      'Adaptive step counts make latency data-dependent, so a single stiff input can take an order of magnitude longer than the median — a hard step cap is mandatory behind any SLA',
      'Adjoint gradients can be silently wrong on stiff dynamics. If training plateaus inexplicably, compare against direct backpropagation before touching the architecture',
      'A plain Neural ODE provably cannot represent a map that separates nested regions; if the task needs that, augment the state rather than adding capacity',
      'Solver libraries differ in their step-selection heuristics, so the same model under a different solver library is not quite the same model',
    ],
  },

  assumptions: [
    'The underlying process is genuinely continuous in time, so a differential equation is the right description rather than a convenient one',
    'The learned vector field is smooth enough for the solver to integrate at a tractable step count',
    'Integration error is small enough that it does not contaminate the gradient — an assumption that needs checking rather than believing',
    'The input-to-output map can be a homeomorphism, or the state has been augmented so that it need not be',
    'Solver settings at serving time match those at training time, since they are part of the model',
  ],

  pros: [
    {
      point: 'Handles irregular sampling natively',
      context:
        'The state exists at every time, so observations at arbitrary times need no resampling, imputation or delta-time feature. Decisive on clinical and asynchronous sensor data; worth nothing on a regular grid.',
    },
    {
      point: 'Memory constant in depth via the adjoint',
      context:
        'Training cost in memory does not grow with the number of solver steps, which is what makes very deep effective dynamics affordable. The transferable idea in this entry, and it applies wherever you differentiate through something solved rather than computed.',
    },
    {
      point: 'Exact likelihoods through the continuous flow variant',
      context:
        'Not a bound like a VAE’s and not a proxy like a reconstruction error — the actual density. Genuinely rare, and the reason this appears in density estimation at all.',
    },
    {
      point: 'The output is a differential equation',
      context:
        'Which is the object physics and control theory already work with, so the learned model composes with existing machinery instead of needing conversion. A larger practical advantage than it first appears.',
    },
  ],

  cons: [
    {
      point: 'Cost is variable and can rise during training',
      context:
        'An adaptive solver takes more steps as dynamics stiffen, so cost per iteration climbs with nothing reporting it but wall-clock time. Genuinely disorienting the first time, and the reason function evaluations must be logged.',
    },
    {
      point: 'A provable expressivity limit',
      context:
        'Trajectories cannot cross, so a plain Neural ODE cannot represent a map separating nested regions — no amount of capacity or training fixes it. Augmenting the state is the fix, and knowing that in advance saves a great deal of confusion.',
    },
    {
      point: 'Adjoint gradients can be quietly wrong',
      context:
        'Reconstructing the forward trajectory backwards is inexact on stiff or chaotic systems, so gradients drift with no error message and training plateaus for no visible reason. The constant-memory benefit has a real and under-advertised cost.',
    },
    {
      point: 'The solver is part of the model',
      context:
        'Change tolerance and you change the function. Unlike almost anything else here, an inference-time configuration difference is a model difference, which makes the training-to-serving contract wider than people expect.',
    },
    {
      point: 'Loses decisively outside its niche',
      context:
        'On regularly sampled data a discrete model is cheaper, simpler and just as accurate. The honest trigger is irregular observation times or a genuine need for continuous dynamics, not elegance.',
    },
  ],

  relatedSlugs: ['pinn', 'normalizing-flows', 'lstm', 'vae', 'kalman-filter'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A Neural ODE and its adjoint, transcribed the way the paper reads.

A residual block computes h + f(h), which is Euler's method with a step size
of one. Take that seriously:

    dh/dt = f(h, t; theta)      the network emits a DERIVATIVE, not a state
    h(t1) = h(t0) + integral    a solver turns that into a trajectory

"Depth" becomes integration time and the layer count becomes a solver
decision. The adjoint then gives gradients by integrating an augmented system
BACKWARDS, so memory does not grow with the number of steps.

Plain loops, no libraries, explicit finite-difference Jacobian products.
"""

import math


def vector_field(state, time, params):
    """One hidden layer emitting a derivative. The whole network.

    Note it takes \`time\` as an input: the dynamics may be non-autonomous, and
    a field that ignores t cannot represent anything whose behaviour changes
    over the integration interval.
    """
    hidden = []
    for row, bias in zip(params['w1'], params['b1']):
        total = bias + time * params['w_time'][len(hidden)]
        for weight, value in zip(row, state):
            total += weight * value
        hidden.append(math.tanh(total))

    derivative = []
    for row, bias in zip(params['w2'], params['b2']):
        total = bias
        for weight, value in zip(row, hidden):
            total += weight * value
        derivative.append(total)
    return derivative


def euler_step(state, time, step, params):
    """h + dt * f(h, t). Exactly a residual block with a scaled update."""
    derivative = vector_field(state, time, params)
    return [h + step * d for h, d in zip(state, derivative)]


def rk4_step(state, time, step, params):
    """Four evaluations, weighted. Fourth-order accurate against Euler's first.

    The weights are not arbitrary: they are chosen so the Taylor expansion of
    the numerical step matches the true solution to fourth order. Four times
    the work per step, but the step can be far larger for the same error, so
    it is usually cheaper overall.
    """
    k1 = vector_field(state, time, params)
    mid = [h + 0.5 * step * d for h, d in zip(state, k1)]

    k2 = vector_field(mid, time + 0.5 * step, params)
    mid = [h + 0.5 * step * d for h, d in zip(state, k2)]

    k3 = vector_field(mid, time + 0.5 * step, params)
    end = [h + step * d for h, d in zip(state, k3)]

    k4 = vector_field(end, time + step, params)

    return [
        h + step * (a + 2.0 * b + 2.0 * c + d) / 6.0
        for h, a, b, c, d in zip(state, k1, k2, k3, k4)
    ]


def integrate(initial, t0, t1, num_steps, params, method=rk4_step):
    """Fixed-step integration, keeping every state.

    Keeping the trajectory is what direct backpropagation needs, and it is
    exactly what the adjoint below avoids: memory here grows with num_steps.
    """
    step = (t1 - t0) / num_steps
    state = list(initial)
    trajectory = [list(state)]

    for index in range(num_steps):
        state = method(state, t0 + index * step, step, params)
        trajectory.append(list(state))

    return state, trajectory


def jacobian_vector_product(state, time, adjoint, params, epsilon=1e-6):
    """a^T df/dh by finite differences.

    A real implementation gets this from automatic differentiation; done
    literally it is one extra field evaluation per dimension, which is why
    this is the expensive part of the adjoint.
    """
    base = vector_field(state, time, params)
    result = [0.0] * len(state)

    for dimension in range(len(state)):
        nudged = list(state)
        nudged[dimension] += epsilon
        perturbed = vector_field(nudged, time, params)
        for i in range(len(state)):
            result[dimension] += adjoint[i] * (perturbed[i] - base[i]) / epsilon

    return result


def adjoint_backward(final_state, loss_gradient, t0, t1, num_steps, params):
    """Integrate the augmented system BACKWARDS.

    Three things travel together: the state (recomputed, not stored), the
    adjoint dL/dh(t), and the accumulating parameter gradient. Memory is
    constant in num_steps, which is the entire point.

    The uncomfortable part: the state is RECONSTRUCTED by integrating
    backwards, and that is not exact. On stiff or chaotic dynamics the
    reconstructed trajectory drifts from the one the forward pass visited, and
    the gradients are then quietly wrong with no error anywhere.
    """
    step = (t1 - t0) / num_steps
    state = list(final_state)
    adjoint = list(loss_gradient)
    parameter_gradient = 0.0

    for index in range(num_steps):
        time = t1 - index * step

        # Reconstruct the state one step back. This is the approximation.
        state = euler_step(state, time, -step, params)

        # da/dt = -a^T df/dh, integrated backwards.
        product = jacobian_vector_product(state, time, adjoint, params)
        adjoint = [a + step * p for a, p in zip(adjoint, product)]

        # dL/dtheta accumulates as a third integral in the same solve.
        derivative = vector_field(state, time, params)
        parameter_gradient += step * sum(a * d for a, d in zip(adjoint, derivative))

    return adjoint, parameter_gradient


def count_function_evaluations(num_steps, method_name):
    """The cost metric that actually matters.

    Wall clock conflates stiffness with hardware. Function evaluations do not,
    and a rising count across training is the ONLY early warning that the
    learned dynamics are stiffening - which is the characteristic way a
    Neural ODE run becomes slow without any code changing.
    """
    per_step = {'euler': 1, 'rk4': 4, 'dopri5': 6}
    return num_steps * per_step[method_name]
`,
        profile:
          'O(NFE * cost of f) per forward pass, with NFE the number of function evaluations. Illustrative, not a measured benchmark: the finite-difference Jacobian product costs one extra field evaluation per state dimension, so the literal adjoint is O(d) times the forward pass rather than O(1) as a real vector-Jacobian product would be.',
      },

      'make-it-right': {
        code: `"""The same model, with the solver as a type and its cost made visible.

Three things change. The solver becomes an explicit object rather than a
function argument, because tolerance and method are PART OF THE MODEL -
change them and the function changes, which is unlike anything else in this
reference. Adaptive stepping arrives with an embedded error estimate. And
function evaluations are counted and returned, because a rising count is the
only early warning that the learned dynamics are stiffening.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, NamedTuple, Sequence

VectorField = Callable[[Sequence[float], float], list[float]]


class Method(Enum):
    """Fixed-step or adaptive. Not interchangeable at serving time."""

    EULER = 'euler'
    RK4 = 'rk4'
    DOPRI5 = 'dopri5'

    @property
    def evaluations_per_step(self) -> int:
        return {'euler': 1, 'rk4': 4, 'dopri5': 6}[self.value]

    @property
    def adaptive(self) -> bool:
        return self is Method.DOPRI5


class StepBudgetExceeded(RuntimeError):
    """Raised when the solver hits its step cap.

    Its own type because the consequence is specific: the solution was
    TRUNCATED rather than converged, so the output is not what the model
    defines. Without this cap a stiff learned field consumes an unbounded
    budget and hangs the training run with no diagnostic at all.
    """


class ToleranceMismatch(ValueError):
    """Raised when serving settings differ from the trained ones.

    The solver is part of the model. Serving at a different tolerance is a
    different function, and nothing else in the system will say so.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


@dataclass(frozen=True)
class SolverConfig:
    """Frozen, because these settings define the function being computed.

    That is the unusual claim worth stating plainly: for almost every other
    model an inference-time setting is a performance choice. Here it changes
    what the model computes.
    """

    method: Method = Method.DOPRI5
    rtol: float = 1e-5
    atol: float = 1e-7
    max_steps: int = 10_000
    initial_step: float = 0.01

    def __post_init__(self) -> None:
        if self.rtol <= 0.0 or self.atol <= 0.0:
            raise ShapeMismatch('tolerances must be positive')
        if self.max_steps < 1:
            raise ShapeMismatch('the step budget must admit at least one step')

    def fingerprint(self) -> tuple[str, float, float]:
        """Comparable across training and serving, so a mismatch is catchable."""
        return (self.method.value, self.rtol, self.atol)

    def assert_matches(self, trained: SolverConfig) -> None:
        """Guard clause for a mismatch with no other symptom."""
        if self.fingerprint() != trained.fingerprint():
            raise ToleranceMismatch(
                f'serving solver {self.fingerprint()} differs from the trained '
                f'{trained.fingerprint()}; this is a different function'
            )


class SolveResult(NamedTuple):
    """State AND cost.

    Evaluations come back rather than being discarded because they are the
    primary cost metric: wall clock conflates stiffness with hardware, and a
    rising evaluation count is the only early warning that the dynamics have
    stiffened.
    """

    state: list[float]
    evaluations: int
    steps: int
    rejected_steps: int

    @property
    def acceptance_rate(self) -> float:
        """A low rate means the step controller is fighting the dynamics."""
        total = self.steps + self.rejected_steps
        return self.steps / total if total else 1.0


# Dormand-Prince coefficients. The embedded pair is the point: the same six
# evaluations yield both a fifth-order solution and a fourth-order one, and
# their difference IS the error estimate - free, rather than requiring a
# second solve at half the step size.
_DOPRI_A: tuple[tuple[float, ...], ...] = (
    (),
    (1 / 5,),
    (3 / 40, 9 / 40),
    (44 / 45, -56 / 15, 32 / 9),
    (19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729),
    (9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656),
)
_DOPRI_C: tuple[float, ...] = (0.0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1.0)
_DOPRI_B5: tuple[float, ...] = (35 / 384, 0.0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84)
_DOPRI_B4: tuple[float, ...] = (5179 / 57600, 0.0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100)


class Solver:
    """Owns the configuration and the evaluation counter."""

    def __init__(self, config: SolverConfig) -> None:
        self._config = config

    def integrate(
        self, field: VectorField, initial: Sequence[float], t0: float, t1: float
    ) -> SolveResult:
        if t1 == t0:
            return SolveResult(list(initial), 0, 0, 0)
        if self._config.method is Method.DOPRI5:
            return self._adaptive(field, initial, t0, t1)
        return self._fixed(field, initial, t0, t1)

    def _fixed(
        self, field: VectorField, initial: Sequence[float], t0: float, t1: float
    ) -> SolveResult:
        steps = max(1, int(abs(t1 - t0) / self._config.initial_step))
        if steps > self._config.max_steps:
            raise StepBudgetExceeded(
                f'{steps} fixed steps exceeds the budget of {self._config.max_steps}'
            )

        step = (t1 - t0) / steps
        state = list(initial)
        for index in range(steps):
            state = self._step(field, state, t0 + index * step, step)

        return SolveResult(state, steps * self._config.method.evaluations_per_step, steps, 0)

    def _step(
        self, field: VectorField, state: Sequence[float], time: float, step: float
    ) -> list[float]:
        if self._config.method is Method.EULER:
            return [h + step * d for h, d in zip(state, field(state, time))]

        k1 = field(state, time)
        k2 = field([h + 0.5 * step * d for h, d in zip(state, k1)], time + 0.5 * step)
        k3 = field([h + 0.5 * step * d for h, d in zip(state, k2)], time + 0.5 * step)
        k4 = field([h + step * d for h, d in zip(state, k3)], time + step)
        return [
            h + step * (a + 2.0 * b + 2.0 * c + d) / 6.0
            for h, a, b, c, d in zip(state, k1, k2, k3, k4)
        ]

    def _adaptive(
        self, field: VectorField, initial: Sequence[float], t0: float, t1: float
    ) -> SolveResult:
        """Dormand-Prince with PI step control.

        Guard clause on the step budget rather than an unbounded while loop:
        a stiff field would otherwise reduce the step indefinitely and hang.
        """
        state = list(initial)
        time = t0
        step = math.copysign(self._config.initial_step, t1 - t0)
        evaluations = 0
        accepted = 0
        rejected = 0

        while (t1 - time) * math.copysign(1.0, t1 - t0) > 1e-12:
            if accepted + rejected >= self._config.max_steps:
                raise StepBudgetExceeded(
                    f'the solver hit its {self._config.max_steps}-step budget at t={time}; '
                    'the solution is truncated, not converged'
                )

            # Do not overshoot the endpoint.
            if abs(step) > abs(t1 - time):
                step = t1 - time

            stages: list[list[float]] = []
            for stage in range(6):
                offset = list(state)
                for previous, coefficient in enumerate(_DOPRI_A[stage]):
                    for i in range(len(offset)):
                        offset[i] += step * coefficient * stages[previous][i]
                stages.append(field(offset, time + _DOPRI_C[stage] * step))
            evaluations += 6

            fifth = [
                h + step * math.fsum(b * k[i] for b, k in zip(_DOPRI_B5, stages))
                for i, h in enumerate(state)
            ]
            fourth = [
                h + step * math.fsum(b * k[i] for b, k in zip(_DOPRI_B4, stages))
                for i, h in enumerate(state)
            ]

            # The embedded pair gives the error for free: their difference IS
            # the local truncation estimate.
            error = 0.0
            for high, low, current in zip(fifth, fourth, state):
                scale = self._config.atol + self._config.rtol * max(abs(current), abs(high))
                error = max(error, abs(high - low) / scale)

            if error <= 1.0:
                state = fifth
                time += step
                accepted += 1
            else:
                rejected += 1

            # Standard controller with clamping, so one bad step cannot make
            # the next step absurdly large or small.
            factor = 0.9 * (1.0 / max(error, 1e-10)) ** 0.2
            step *= min(5.0, max(0.2, factor))

        return SolveResult(state, evaluations, accepted, rejected)


@dataclass
class StiffnessMonitor:
    """Tracks evaluation counts across training.

    A rising count is the characteristic way a Neural ODE run becomes slow
    without any code changing, and nothing else reports it. This belongs on a
    dashboard rather than in a comment.
    """

    history: list[int] = field(default_factory=list)

    def record(self, result: SolveResult) -> None:
        self.history.append(result.evaluations)

    def stiffening(self, window: int = 100, ratio: float = 2.0) -> bool:
        if len(self.history) < 2 * window:
            return False
        early = math.fsum(self.history[:window]) / window
        recent = math.fsum(self.history[-window:]) / window
        return early > 0 and recent / early > ratio
`,
        rationale:
          'Three changes. The solver becomes an explicit frozen configuration rather than a function argument, because tolerance and method are part of the model rather than a performance setting — change them and the function changes, which is unlike anything else in this reference, so there is a fingerprint and a mismatch check with its own exception type. Adaptive stepping arrives properly, and the embedded Dormand-Prince pair is the reason it is worth having: the same six evaluations yield both a fifth-order and a fourth-order solution, and their difference is the error estimate for free rather than requiring a second solve at half the step. The step budget is a hard guard rather than an unbounded loop, with its own exception, because a stiff learned field otherwise shrinks the step indefinitely and hangs a training run with no diagnostic — and hitting the cap means the solution was truncated rather than converged, which is a correctness statement rather than a timeout. Third, function evaluations and rejected steps come back in the result rather than being discarded, since a rising evaluation count is the only early warning that the dynamics are stiffening and a low acceptance rate means the controller is fighting them.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'An adaptive solve costs six evaluations per attempted step, accepted or not, so the acceptance rate is a direct multiplier on cost. Illustrative, not a measured benchmark: the embedded error estimate is what makes adaptivity affordable, since computing it separately would roughly double the evaluations.',
      },

      'make-it-fast': {
        code: `"""Batched trajectories and a fused solver. The state gains a batch axis.

The structural observation: the solver loop over TIME is inherently
sequential, but nothing about it is sequential across the batch. So the state
becomes a matrix, every trajectory takes step t together, and the field
evaluation - which dominates everything - becomes a GEMM.

Three changes:
  1. The vector field batches. One GEMM per layer for every trajectory at
     once, instead of one matrix-vector product per trajectory.
  2. The Runge-Kutta stages are fused: the stage offsets are computed in
     place into a preallocated buffer, so a four-stage step allocates nothing.
  3. The adjoint uses a real vector-Jacobian product rather than finite
     differences, which turns the backward pass from O(d) field evaluations
     per step into O(1).
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32

# Dormand-Prince coefficients as arrays, so a stage combination is a
# contraction rather than a Python loop over previous stages.
_A = np.array([
    [0, 0, 0, 0, 0, 0],
    [1 / 5, 0, 0, 0, 0, 0],
    [3 / 40, 9 / 40, 0, 0, 0, 0],
    [44 / 45, -56 / 15, 32 / 9, 0, 0, 0],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729, 0, 0],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656, 0],
], dtype=FLOAT)
_C = np.array([0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1], dtype=FLOAT)
_B5 = np.array([35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84], dtype=FLOAT)
_B4 = np.array([5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100], dtype=FLOAT)


class BatchedField:
    """The vector field, evaluated for a whole batch of trajectories at once.

    This is where all the time goes, so it is the only thing worth making
    fast: a two-layer field is two GEMMs regardless of how many trajectories
    are in flight.
    """

    def __init__(self, w1: NDArray[np.float32], b1: NDArray[np.float32],
                 w_time: NDArray[np.float32], w2: NDArray[np.float32],
                 b2: NDArray[np.float32]) -> None:
        self._w1 = np.ascontiguousarray(w1, dtype=FLOAT)
        self._b1 = np.ascontiguousarray(b1, dtype=FLOAT)
        self._w_time = np.ascontiguousarray(w_time, dtype=FLOAT)
        self._w2 = np.ascontiguousarray(w2, dtype=FLOAT)
        self._b2 = np.ascontiguousarray(b2, dtype=FLOAT)

    def __call__(self, state: NDArray[np.float32], time: float) -> NDArray[np.float32]:
        """state is (batch, dim). Returns the derivative, same shape."""
        hidden = state @ self._w1
        hidden += self._b1
        # Time enters as a rank-one update, not a tiled column: the field may
        # be non-autonomous, and one broadcast is cheaper than a concatenate.
        hidden += FLOAT(time) * self._w_time
        np.tanh(hidden, out=hidden)
        derivative = hidden @ self._w2
        derivative += self._b2
        return derivative


class BatchedSolver:
    """Dormand-Prince over a batch, with per-trajectory error control.

    Note the design decision: the step is shared across the batch and the
    error is the MAXIMUM over trajectories. Per-trajectory steps would be
    better numerically and would destroy the batching entirely, so the whole
    batch moves at the pace of its stiffest member.
    """

    def __init__(self, batch: int, dim: int, rtol: float = 1e-5, atol: float = 1e-7,
                 max_steps: int = 10_000) -> None:
        self._rtol = FLOAT(rtol)
        self._atol = FLOAT(atol)
        self._max_steps = max_steps
        # Six stages preallocated: a step allocates nothing at all.
        self._stages = np.empty((6, batch, dim), dtype=FLOAT)
        self._offset = np.empty((batch, dim), dtype=FLOAT)

    def integrate(
        self,
        field: BatchedField,
        initial: NDArray[np.float32],
        t0: float,
        t1: float,
        initial_step: float = 0.01,
    ) -> tuple[NDArray[np.float32], int, int]:
        """Returns (final state, evaluations, rejected steps)."""
        state = np.array(initial, dtype=FLOAT, copy=True)
        time = t0
        step = float(np.copysign(initial_step, t1 - t0))
        evaluations = 0
        attempts = 0
        rejected = 0

        while (t1 - time) * np.sign(t1 - t0) > 1e-12:
            if attempts >= self._max_steps:
                raise RuntimeError(
                    f'solver hit its {self._max_steps}-step budget at t={time}; '
                    'the solution is truncated, not converged'
                )
            attempts += 1
            if abs(step) > abs(t1 - time):
                step = t1 - time

            for stage in range(6):
                # Stage offset as one contraction over previous stages,
                # written into a preallocated buffer.
                np.copyto(self._offset, state)
                if stage:
                    self._offset += step * np.einsum(
                        'j,jbd->bd', _A[stage, :stage], self._stages[:stage], optimize=True
                    )
                self._stages[stage] = field(self._offset, time + float(_C[stage]) * step)
            evaluations += 6

            fifth = state + step * np.einsum('j,jbd->bd', _B5, self._stages, optimize=True)
            fourth = state + step * np.einsum('j,jbd->bd', _B4, self._stages, optimize=True)

            # The embedded pair gives the error for free: their difference IS
            # the local truncation estimate, so no second solve is needed.
            scale = self._atol + self._rtol * np.maximum(np.abs(state), np.abs(fifth))
            error = float(np.max(np.abs(fifth - fourth) / scale))

            if error <= 1.0:
                state = fifth
                time += step
            else:
                rejected += 1

            factor = 0.9 * (1.0 / max(error, 1e-10)) ** 0.2
            step *= min(5.0, max(0.2, factor))

        return state, evaluations, rejected


def vector_jacobian_product(
    field: BatchedField,
    state: NDArray[np.float32],
    time: float,
    adjoint: NDArray[np.float32],
    epsilon: float = 1e-4,
) -> NDArray[np.float32]:
    """a^T df/dh in ONE extra field evaluation, not one per dimension.

    A directional derivative along the adjoint: f(h + eps*a) - f(h), divided
    by eps. The literal version cost O(d) evaluations per step, which made
    the adjoint more expensive than the forward pass it was supposed to
    replace; this is O(1) and is what makes the method viable at all.

    A production implementation gets this exactly from reverse-mode AD; the
    finite-difference form is here because it makes the O(1) claim visible.
    """
    base = field(state, time)
    nudged = field(state + FLOAT(epsilon) * adjoint, time)
    return (nudged - base) / FLOAT(epsilon)


def adjoint_backward(
    field: BatchedField,
    solver: BatchedSolver,
    final_state: NDArray[np.float32],
    loss_gradient: NDArray[np.float32],
    t0: float,
    t1: float,
) -> tuple[NDArray[np.float32], int]:
    """Integrate the augmented system backwards, in one batched solve.

    State, adjoint and parameter gradient travel together in one array, so
    the whole backward pass is a single call to the same solver - memory
    constant in the number of steps, which is the entire point.

    The uncomfortable part is unchanged by batching: the state is
    RECONSTRUCTED by integrating backwards, and on stiff dynamics it drifts
    from the trajectory the forward pass actually visited. The gradients are
    then quietly wrong, and only a comparison against direct backpropagation
    will show it.
    """
    batch, dim = final_state.shape
    # Augmented state: [h, a] concatenated along the feature axis, so one
    # solver call advances both rather than two interleaved ones.
    augmented = np.concatenate((final_state, loss_gradient), axis=1)

    def augmented_field(combined: NDArray[np.float32], time: float) -> NDArray[np.float32]:
        state, adjoint = combined[:, :dim], combined[:, dim:]
        derivative = field(state, time)
        product = vector_jacobian_product(field, state, time, adjoint)
        return np.concatenate((derivative, -product), axis=1)

    result, evaluations, _ = solver.integrate(
        BatchedFieldAdapter(augmented_field), augmented, t1, t0
    )
    return result[:, dim:], evaluations


class BatchedFieldAdapter:
    """Wraps a plain callable so the solver's contract stays a single type."""

    def __init__(self, function) -> None:
        self._function = function

    def __call__(self, state: NDArray[np.float32], time: float) -> NDArray[np.float32]:
        return self._function(state, time)
`,
        profile:
          'The field becomes two GEMMs per evaluation for the whole batch, and the adjoint drops from O(d) evaluations per step to O(1). Illustrative, not a measured benchmark: since the batch shares one step size, cost is set by the stiffest trajectory in it — so a single pathological input can make an entire batch expensive.',
        rationale:
          'The structural observation is that the solver loop over time is inherently sequential but nothing about it is sequential across the batch, so the state gains a leading batch axis and every trajectory takes step t together — which turns the field evaluation, where all the time goes, into two GEMMs regardless of how many trajectories are in flight. Time enters as a rank-one broadcast rather than a tiled column, since the field may be non-autonomous and one broadcast is cheaper than a concatenate. The six Runge-Kutta stages are preallocated and each stage offset is one contraction over the previous stages written into an existing buffer, so a step allocates nothing. The largest single change is in the adjoint: the literal version computed the vector-Jacobian product by finite differences one dimension at a time, costing O(d) field evaluations per step and making the backward pass more expensive than the forward one it was meant to replace — a directional derivative along the adjoint gives the same quantity in one extra evaluation, which is what makes the method viable at all. The design decision worth naming is that the step size is shared across the batch and the error is the maximum over trajectories: per-trajectory steps would be numerically better and would destroy the batching, so the batch moves at the pace of its stiffest member.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The field is two GEMMs for the whole batch, and each Runge-Kutta stage combination is one einsum over the stage axis instead of a Python loop over previous stages.',
            tradeoff: 'The six-stage buffer is batch times dimension times six in float32 and is live for the whole solve, so a large batch with a wide state makes the stage storage the dominant memory cost of the forward pass.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Stages and the stage offset are written into existing buffers, and the field composes its layers in place, so an accepted or rejected step allocates nothing.',
            tradeoff: 'The offset buffer is reused across stages, so nothing can inspect an earlier stage offset after the fact — which is exactly what you want when diagnosing why a step keeps being rejected.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Trajectories become rows, so a solve costs a constant number of interpreter operations per step regardless of batch size.',
            tradeoff: 'One step size is shared across the batch and the error is the maximum over it, so the stiffest trajectory sets the pace for every other one — batching trades numerical efficiency per trajectory for throughput.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The augmented backward system carries state, adjoint and gradient in one array so a single solver call advances all three, rather than interleaving separate solves.',
            tradeoff: 'The augmented state doubles the width the solver controls error on, so the shared tolerance now applies to the adjoint as well — which is usually right but means an accurate adjoint forces small steps on the state too.',
          },
        ],
        libraryName: 'NumPy',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A Neural ODE and its adjoint, transcribed the way the paper reads.
//
// A residual block computes h + f(h), which is Euler's method with a step
// size of one. Take that seriously:
//
//   dh/dt = f(h, t; theta)     the network emits a DERIVATIVE, not a state
//   h(t1) = h(t0) + integral   a solver turns that into a trajectory
//
// "Depth" becomes integration time and the layer count becomes a solver
// decision. The adjoint then gives gradients by integrating an augmented
// system BACKWARDS, so memory does not grow with the number of steps.
//
// Vector-of-vector, finite-difference Jacobian products, fixed steps.

#include <cmath>
#include <cstddef>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

struct FieldParams {
  Matrix w1;
  Vector b1;
  Vector w_time;
  Matrix w2;
  Vector b2;
};

// One hidden layer emitting a derivative. The whole network.
//
// Note it takes \`time\` as an input: the dynamics may be non-autonomous, and a
// field ignoring t cannot represent anything whose behaviour changes over the
// integration interval.
Vector VectorField(const Vector& state, double time, const FieldParams& params) {
  Vector hidden(params.w1.size(), 0.0);
  for (std::size_t i = 0; i < params.w1.size(); ++i) {
    double total = params.b1[i] + time * params.w_time[i];
    for (std::size_t j = 0; j < state.size(); ++j) {
      total += params.w1[i][j] * state[j];
    }
    hidden[i] = std::tanh(total);
  }

  Vector derivative(params.w2.size(), 0.0);
  for (std::size_t i = 0; i < params.w2.size(); ++i) {
    double total = params.b2[i];
    for (std::size_t j = 0; j < hidden.size(); ++j) {
      total += params.w2[i][j] * hidden[j];
    }
    derivative[i] = total;
  }
  return derivative;
}

// h + dt * f(h, t). Exactly a residual block with a scaled update.
Vector EulerStep(const Vector& state, double time, double step,
                 const FieldParams& params) {
  const Vector derivative = VectorField(state, time, params);
  Vector next(state.size(), 0.0);
  for (std::size_t i = 0; i < state.size(); ++i) {
    next[i] = state[i] + step * derivative[i];
  }
  return next;
}

// Four evaluations, weighted. Fourth-order accurate against Euler's first.
//
// The weights are not arbitrary: they are chosen so the Taylor expansion of
// the numerical step matches the true solution to fourth order. Four times
// the work per step, but the step can be far larger for the same error, so it
// is usually cheaper overall.
Vector Rk4Step(const Vector& state, double time, double step,
               const FieldParams& params) {
  const Vector k1 = VectorField(state, time, params);

  Vector mid(state.size(), 0.0);
  for (std::size_t i = 0; i < state.size(); ++i) {
    mid[i] = state[i] + 0.5 * step * k1[i];
  }
  const Vector k2 = VectorField(mid, time + 0.5 * step, params);

  for (std::size_t i = 0; i < state.size(); ++i) {
    mid[i] = state[i] + 0.5 * step * k2[i];
  }
  const Vector k3 = VectorField(mid, time + 0.5 * step, params);

  for (std::size_t i = 0; i < state.size(); ++i) {
    mid[i] = state[i] + step * k3[i];
  }
  const Vector k4 = VectorField(mid, time + step, params);

  Vector next(state.size(), 0.0);
  for (std::size_t i = 0; i < state.size(); ++i) {
    next[i] = state[i] + step * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]) / 6.0;
  }
  return next;
}

// Fixed-step integration, keeping every state.
//
// Keeping the trajectory is what direct backpropagation needs, and it is
// exactly what the adjoint below avoids: memory here grows with num_steps.
Matrix Integrate(const Vector& initial, double t0, double t1, std::size_t num_steps,
                 const FieldParams& params) {
  const double step = (t1 - t0) / static_cast<double>(num_steps);
  Matrix trajectory;
  trajectory.push_back(initial);

  Vector state = initial;
  for (std::size_t index = 0; index < num_steps; ++index) {
    state = Rk4Step(state, t0 + static_cast<double>(index) * step, step, params);
    trajectory.push_back(state);
  }
  return trajectory;
}

// a^T df/dh by finite differences.
//
// A real implementation gets this from automatic differentiation; done
// literally it is one extra field evaluation per dimension, which is why this
// is the expensive part of the adjoint - and why the optimized stage replaces
// it with a single directional derivative.
Vector JacobianVectorProduct(const Vector& state, double time, const Vector& adjoint,
                             const FieldParams& params, double epsilon = 1e-6) {
  const Vector base = VectorField(state, time, params);
  Vector result(state.size(), 0.0);

  for (std::size_t dimension = 0; dimension < state.size(); ++dimension) {
    Vector nudged = state;
    nudged[dimension] += epsilon;
    const Vector perturbed = VectorField(nudged, time, params);
    for (std::size_t i = 0; i < state.size(); ++i) {
      result[dimension] += adjoint[i] * (perturbed[i] - base[i]) / epsilon;
    }
  }
  return result;
}

// Integrate the augmented system BACKWARDS.
//
// Three things travel together: the state (recomputed, not stored), the
// adjoint dL/dh(t), and the accumulating parameter gradient. Memory is
// constant in num_steps, which is the entire point.
//
// The uncomfortable part: the state is RECONSTRUCTED by integrating
// backwards, and that is not exact. On stiff or chaotic dynamics the
// reconstructed trajectory drifts from the one the forward pass visited, and
// the gradients are then quietly wrong with no error anywhere.
Vector AdjointBackward(const Vector& final_state, const Vector& loss_gradient,
                       double t0, double t1, std::size_t num_steps,
                       const FieldParams& params, double* parameter_gradient) {
  const double step = (t1 - t0) / static_cast<double>(num_steps);
  Vector state = final_state;
  Vector adjoint = loss_gradient;
  *parameter_gradient = 0.0;

  for (std::size_t index = 0; index < num_steps; ++index) {
    const double time = t1 - static_cast<double>(index) * step;

    // Reconstruct the state one step back. This is the approximation.
    state = EulerStep(state, time, -step, params);

    // da/dt = -a^T df/dh, integrated backwards.
    const Vector product = JacobianVectorProduct(state, time, adjoint, params);
    for (std::size_t i = 0; i < adjoint.size(); ++i) {
      adjoint[i] += step * product[i];
    }

    // dL/dtheta accumulates as a third integral in the same solve.
    const Vector derivative = VectorField(state, time, params);
    for (std::size_t i = 0; i < adjoint.size(); ++i) {
      *parameter_gradient += step * adjoint[i] * derivative[i];
    }
  }
  return adjoint;
}

// The cost metric that actually matters.
//
// Wall clock conflates stiffness with hardware. Function evaluations do not,
// and a rising count across training is the ONLY early warning that the
// learned dynamics are stiffening - the characteristic way a Neural ODE run
// becomes slow without any code changing.
std::size_t CountFunctionEvaluations(std::size_t num_steps, std::size_t stages) {
  return num_steps * stages;
}
`,
        profile:
          'O(NFE * cost of f) per forward pass, with NFE the number of function evaluations. Illustrative, not a measured benchmark: the finite-difference Jacobian product costs one extra field evaluation per state dimension, so the literal adjoint is O(d) times the forward pass rather than the O(1) a real vector-Jacobian product would give.',
      },

      'make-it-right': {
        code: `// The same model, with the solver as a type and its cost made visible.
//
// Three things change. The solver becomes an object rather than a free
// function, because tolerance and method are PART OF THE MODEL - change them
// and the function changes, which is unlike anything else in this reference.
// Adaptive stepping arrives with an embedded error estimate. And function
// evaluations are counted and returned, because a rising count is the only
// early warning that the learned dynamics are stiffening.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <functional>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace node {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the consequence is specific: the solution was
// TRUNCATED rather than converged, so the output is not what the model
// defines. Without this cap a stiff learned field consumes an unbounded
// budget and hangs the training run with no diagnostic at all.
class StepBudgetExceeded : public std::runtime_error {
 public:
  explicit StepBudgetExceeded(const std::string& what) : std::runtime_error(what) {}
};

// The solver is part of the model. Serving at a different tolerance is a
// different function, and nothing else in the system will say so.
class ToleranceMismatch : public std::logic_error {
 public:
  explicit ToleranceMismatch(const std::string& what) : std::logic_error(what) {}
};

enum class Method { kEuler, kRk4, kDopri5 };

[[nodiscard]] constexpr std::size_t EvaluationsPerStep(Method method) noexcept {
  switch (method) {
    case Method::kEuler:
      return 1;
    case Method::kRk4:
      return 4;
    case Method::kDopri5:
      return 6;
  }
  return 1;
}

// Frozen configuration, because these settings define the function computed.
//
// That is the unusual claim worth stating plainly: for almost every other
// model an inference-time setting is a performance choice. Here it changes
// what the model computes.
struct SolverConfig {
  Method method{Method::kDopri5};
  double rtol{1e-5};
  double atol{1e-7};
  std::size_t max_steps{10000};
  double initial_step{0.01};

  void Validate() const {
    if (rtol <= 0.0 || atol <= 0.0) {
      throw ShapeMismatch("tolerances must be positive");
    }
    if (max_steps == 0) {
      throw ShapeMismatch("the step budget must admit at least one step");
    }
  }

  // Guard clause for a mismatch with no other symptom.
  void AssertMatches(const SolverConfig& trained) const {
    if (method != trained.method || rtol != trained.rtol || atol != trained.atol) {
      throw ToleranceMismatch(
          "serving solver settings differ from the trained ones; this is a "
          "different function");
    }
  }
};

// State AND cost.
//
// Evaluations come back rather than being discarded because they are the
// primary cost metric: wall clock conflates stiffness with hardware, and a
// rising evaluation count is the only early warning that the dynamics have
// stiffened.
struct SolveResult {
  std::vector<double> state;
  std::size_t evaluations{};
  std::size_t accepted{};
  std::size_t rejected{};

  // A low rate means the step controller is fighting the dynamics.
  [[nodiscard]] double acceptance_rate() const noexcept {
    const std::size_t total = accepted + rejected;
    return total == 0 ? 1.0 : static_cast<double>(accepted) / static_cast<double>(total);
  }
};

using VectorField = std::function<void(std::span<const double>, double, std::span<double>)>;

// Dormand-Prince coefficients. The embedded pair is the point: the same six
// evaluations yield both a fifth-order solution and a fourth-order one, and
// their difference IS the error estimate - free, rather than requiring a
// second solve at half the step size.
inline constexpr double kA[6][5] = {
    {},
    {1.0 / 5.0},
    {3.0 / 40.0, 9.0 / 40.0},
    {44.0 / 45.0, -56.0 / 15.0, 32.0 / 9.0},
    {19372.0 / 6561.0, -25360.0 / 2187.0, 64448.0 / 6561.0, -212.0 / 729.0},
    {9017.0 / 3168.0, -355.0 / 33.0, 46732.0 / 5247.0, 49.0 / 176.0, -5103.0 / 18656.0},
};
inline constexpr double kC[6] = {0.0, 1.0 / 5.0, 3.0 / 10.0, 4.0 / 5.0, 8.0 / 9.0, 1.0};
inline constexpr double kB5[6] = {35.0 / 384.0, 0.0, 500.0 / 1113.0, 125.0 / 192.0,
                                  -2187.0 / 6784.0, 11.0 / 84.0};
inline constexpr double kB4[6] = {5179.0 / 57600.0, 0.0, 7571.0 / 16695.0, 393.0 / 640.0,
                                  -92097.0 / 339200.0, 187.0 / 2100.0};

// Owns the stage scratch, so a repeated solve allocates nothing.
class Solver {
 public:
  Solver(SolverConfig config, std::size_t dimension)
      : config_(config), dimension_(dimension), stages_(6, std::vector<double>(dimension, 0.0)),
        offset_(dimension, 0.0), fifth_(dimension, 0.0), fourth_(dimension, 0.0) {
    config_.Validate();
  }

  [[nodiscard]] SolveResult Integrate(const VectorField& field,
                                      std::span<const double> initial, double t0,
                                      double t1) {
    if (initial.size() != dimension_) {
      throw ShapeMismatch("initial state width does not match the solver");
    }
    SolveResult result;
    result.state.assign(initial.begin(), initial.end());
    if (t1 == t0) {
      return result;
    }

    if (config_.method != Method::kDopri5) {
      return Fixed(field, result.state, t0, t1);
    }
    return Adaptive(field, result.state, t0, t1);
  }

 private:
  [[nodiscard]] SolveResult Fixed(const VectorField& field, std::vector<double> state,
                                  double t0, double t1) {
    const std::size_t steps = std::max<std::size_t>(
        1, static_cast<std::size_t>(std::abs(t1 - t0) / config_.initial_step));
    if (steps > config_.max_steps) {
      throw StepBudgetExceeded("fixed step count exceeds the configured budget");
    }

    const double step = (t1 - t0) / static_cast<double>(steps);
    for (std::size_t index = 0; index < steps; ++index) {
      FixedStep(field, state, t0 + static_cast<double>(index) * step, step);
    }
    return SolveResult{std::move(state), steps * EvaluationsPerStep(config_.method), steps, 0};
  }

  void FixedStep(const VectorField& field, std::vector<double>& state, double time,
                 double step) {
    if (config_.method == Method::kEuler) {
      field(state, time, stages_[0]);
      for (std::size_t i = 0; i < dimension_; ++i) {
        state[i] += step * stages_[0][i];
      }
      return;
    }

    field(state, time, stages_[0]);
    Offset(state, stages_[0], 0.5 * step);
    field(offset_, time + 0.5 * step, stages_[1]);
    Offset(state, stages_[1], 0.5 * step);
    field(offset_, time + 0.5 * step, stages_[2]);
    Offset(state, stages_[2], step);
    field(offset_, time + step, stages_[3]);

    for (std::size_t i = 0; i < dimension_; ++i) {
      state[i] += step *
                  (stages_[0][i] + 2.0 * stages_[1][i] + 2.0 * stages_[2][i] + stages_[3][i]) /
                  6.0;
    }
  }

  void Offset(const std::vector<double>& state, const std::vector<double>& derivative,
              double scale) {
    for (std::size_t i = 0; i < dimension_; ++i) {
      offset_[i] = state[i] + scale * derivative[i];
    }
  }

  // Dormand-Prince with PI step control.
  //
  // Guard clause on the step budget rather than an unbounded loop: a stiff
  // field would otherwise reduce the step indefinitely and hang.
  [[nodiscard]] SolveResult Adaptive(const VectorField& field, std::vector<double> state,
                                     double t0, double t1) {
    SolveResult result;
    double time = t0;
    double step = std::copysign(config_.initial_step, t1 - t0);
    const double direction = t1 > t0 ? 1.0 : -1.0;

    while ((t1 - time) * direction > 1e-12) {
      if (result.accepted + result.rejected >= config_.max_steps) {
        throw StepBudgetExceeded(
            "the solver hit its step budget; the solution is truncated, not converged");
      }
      if (std::abs(step) > std::abs(t1 - time)) {
        step = t1 - time;
      }

      for (std::size_t stage = 0; stage < 6; ++stage) {
        std::copy(state.begin(), state.end(), offset_.begin());
        for (std::size_t previous = 0; previous < stage; ++previous) {
          const double coefficient = kA[stage][previous];
          for (std::size_t i = 0; i < dimension_; ++i) {
            offset_[i] += step * coefficient * stages_[previous][i];
          }
        }
        field(offset_, time + kC[stage] * step, stages_[stage]);
      }
      result.evaluations += 6;

      double error = 0.0;
      for (std::size_t i = 0; i < dimension_; ++i) {
        double high = state[i];
        double low = state[i];
        for (std::size_t stage = 0; stage < 6; ++stage) {
          high += step * kB5[stage] * stages_[stage][i];
          low += step * kB4[stage] * stages_[stage][i];
        }
        fifth_[i] = high;
        fourth_[i] = low;
        const double scale =
            config_.atol + config_.rtol * std::max(std::abs(state[i]), std::abs(high));
        error = std::max(error, std::abs(high - low) / scale);
      }

      if (error <= 1.0) {
        state.swap(fifth_);
        time += step;
        ++result.accepted;
      } else {
        ++result.rejected;
      }

      // Standard controller with clamping, so one bad step cannot make the
      // next absurdly large or small.
      const double factor = 0.9 * std::pow(1.0 / std::max(error, 1e-10), 0.2);
      step *= std::min(5.0, std::max(0.2, factor));
    }

    result.state = std::move(state);
    return result;
  }

  SolverConfig config_;
  std::size_t dimension_;
  std::vector<std::vector<double>> stages_;  // rule of zero: owning members only
  std::vector<double> offset_;
  std::vector<double> fifth_;
  std::vector<double> fourth_;
};

// Tracks evaluation counts across training.
//
// A rising count is the characteristic way a Neural ODE run becomes slow
// without any code changing, and nothing else reports it. This belongs on a
// dashboard rather than in a comment.
class StiffnessMonitor {
 public:
  void Record(const SolveResult& result) { history_.push_back(result.evaluations); }

  [[nodiscard]] bool Stiffening(std::size_t window = 100, double ratio = 2.0) const {
    if (history_.size() < 2 * window) {
      return false;
    }
    const double early =
        static_cast<double>(std::accumulate(history_.begin(),
                                            history_.begin() + static_cast<long>(window),
                                            std::size_t{0})) /
        static_cast<double>(window);
    const double recent =
        static_cast<double>(std::accumulate(history_.end() - static_cast<long>(window),
                                            history_.end(), std::size_t{0})) /
        static_cast<double>(window);
    return early > 0.0 && recent / early > ratio;
  }

 private:
  std::vector<std::size_t> history_;
};

}  // namespace node
`,
        rationale:
          'Three changes. The solver becomes an object owning its stage scratch rather than a free function, so a repeated solve allocates nothing, and its configuration is frozen with a mismatch check — because tolerance and method are part of the model rather than a performance setting, and serving at different settings is a different function with nothing else in the system to say so. Adaptive stepping arrives properly, and the embedded Dormand-Prince pair is why it is worth having: the same six evaluations yield both a fifth-order and a fourth-order solution, and their difference is the error estimate for free rather than requiring a second solve at half the step. The step budget is a hard guard with its own exception type, because a stiff learned field otherwise shrinks the step indefinitely and hangs a training run — and hitting the cap means the solution was truncated rather than converged, which is a correctness statement rather than a timeout. Third, evaluations and rejected steps come back in the result, since a rising evaluation count is the only early warning that the dynamics are stiffening and a low acceptance rate means the controller is fighting them.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'An adaptive solve costs six evaluations per attempted step, accepted or not, so the acceptance rate is a direct multiplier on cost. Illustrative, not a measured benchmark: the embedded error estimate is what makes adaptivity affordable, since computing it separately would roughly double the evaluations.',
      },

      'make-it-fast': {
        code: `// Batched trajectories and a fused solver. The state gains a batch axis.
//
// The structural observation: the solver loop over TIME is inherently
// sequential, but nothing about it is sequential across the batch. So the
// state becomes a matrix, every trajectory takes step t together, and the
// field evaluation - which dominates everything - becomes a GEMM.
//
// Three changes:
//   1. The vector field batches. One GEMM per layer for every trajectory at
//      once, instead of one matrix-vector product per trajectory.
//   2. Stage combination is fused: the offset is built in one pass over the
//      previous stages, into a preallocated buffer.
//   3. The adjoint uses a directional derivative rather than a
//      per-dimension finite difference, turning the backward pass from O(d)
//      field evaluations per step into O(1).
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace node {

// The vector field, evaluated for a whole batch of trajectories at once.
//
// This is where all the time goes, so it is the only thing worth making
// fast: a two-layer field is two GEMMs regardless of how many trajectories
// are in flight.
class BatchedField {
 public:
  BatchedField(int batch, int dim, int hidden)
      : batch_(batch), dim_(dim), hidden_(hidden),
        hidden_buffer_(static_cast<std::size_t>(batch) * hidden) {}

  // state is (batch x dim) row-major; derivative is written to out.
  void operator()(const float* __restrict state, float time,
                  const float* __restrict w1, const float* __restrict b1,
                  const float* __restrict w_time, const float* __restrict w2,
                  const float* __restrict b2, float* __restrict out) {
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, batch_, hidden_, dim_,
                1.0F, state, dim_, w1, hidden_, 0.0F, hidden_buffer_.data(), hidden_);

    // Fused bias, time term and tanh in one pass. Time enters as a rank-one
    // term rather than a tiled column: the field may be non-autonomous, and
    // one broadcast is cheaper than widening the operand.
#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      float* row = hidden_buffer_.data() + static_cast<std::size_t>(b) * hidden_;
      for (int h = 0; h < hidden_; ++h) {
        row[h] = std::tanh(row[h] + b1[h] + time * w_time[h]);
      }
    }

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, batch_, dim_, hidden_,
                1.0F, hidden_buffer_.data(), hidden_, w2, dim_, 0.0F, out, dim_);

#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      float* row = out + static_cast<std::size_t>(b) * dim_;
      for (int d = 0; d < dim_; ++d) {
        row[d] += b2[d];
      }
    }
  }

 private:
  int batch_;
  int dim_;
  int hidden_;
  std::vector<float> hidden_buffer_;
};

// Dormand-Prince over a batch, with per-trajectory error control.
//
// Note the design decision: the step is SHARED across the batch and the error
// is the MAXIMUM over trajectories. Per-trajectory steps would be better
// numerically and would destroy the batching entirely, so the whole batch
// moves at the pace of its stiffest member.
class BatchedSolver {
 public:
  BatchedSolver(int batch, int dim, float rtol = 1e-5F, float atol = 1e-7F,
                std::size_t max_steps = 10000)
      : batch_(batch), dim_(dim), rtol_(rtol), atol_(atol), max_steps_(max_steps),
        // Six stages preallocated: a step allocates nothing at all.
        stages_(6 * static_cast<std::size_t>(batch) * dim),
        offset_(static_cast<std::size_t>(batch) * dim),
        fifth_(static_cast<std::size_t>(batch) * dim),
        fourth_(static_cast<std::size_t>(batch) * dim) {}

  template <typename Field>
  std::size_t Integrate(Field&& field, float* __restrict state, float t0, float t1) {
    const std::size_t width = static_cast<std::size_t>(batch_) * dim_;
    float time = t0;
    float step = std::copysign(0.01F, t1 - t0);
    const float direction = t1 > t0 ? 1.0F : -1.0F;
    std::size_t evaluations = 0;
    std::size_t attempts = 0;

    static constexpr float kC[6] = {0.0F, 0.2F, 0.3F, 0.8F, 8.0F / 9.0F, 1.0F};
    static constexpr float kA[6][5] = {
        {},
        {0.2F},
        {3.0F / 40.0F, 9.0F / 40.0F},
        {44.0F / 45.0F, -56.0F / 15.0F, 32.0F / 9.0F},
        {19372.0F / 6561.0F, -25360.0F / 2187.0F, 64448.0F / 6561.0F, -212.0F / 729.0F},
        {9017.0F / 3168.0F, -355.0F / 33.0F, 46732.0F / 5247.0F, 49.0F / 176.0F,
         -5103.0F / 18656.0F}};
    static constexpr float kB5[6] = {35.0F / 384.0F, 0.0F, 500.0F / 1113.0F,
                                     125.0F / 192.0F, -2187.0F / 6784.0F, 11.0F / 84.0F};
    static constexpr float kB4[6] = {5179.0F / 57600.0F, 0.0F, 7571.0F / 16695.0F,
                                     393.0F / 640.0F, -92097.0F / 339200.0F,
                                     187.0F / 2100.0F};

    while ((t1 - time) * direction > 1e-9F) {
      if (attempts++ >= max_steps_) {
        break;  // truncated, not converged; the caller must check
      }
      if (std::abs(step) > std::abs(t1 - time)) {
        step = t1 - time;
      }

      for (int stage = 0; stage < 6; ++stage) {
        // Stage offset built in one fused pass over the previous stages,
        // into a preallocated buffer.
#pragma omp parallel for schedule(static)
        for (std::size_t i = 0; i < width; ++i) {
          float value = state[i];
          for (int previous = 0; previous < stage; ++previous) {
            value += step * kA[stage][previous] * stages_[previous * width + i];
          }
          offset_[i] = value;
        }
        field(offset_.data(), time + kC[stage] * step, stages_.data() + stage * width);
      }
      evaluations += 6;

      // Both solutions and the error in ONE pass: the fifth-order and
      // fourth-order combinations share the same stage reads.
      float error = 0.0F;
#pragma omp parallel for reduction(max : error) schedule(static)
      for (std::size_t i = 0; i < width; ++i) {
        float high = state[i];
        float low = state[i];
        for (int stage = 0; stage < 6; ++stage) {
          const float k = stages_[stage * width + i];
          high += step * kB5[stage] * k;
          low += step * kB4[stage] * k;
        }
        fifth_[i] = high;
        const float scale = atol_ + rtol_ * std::max(std::abs(state[i]), std::abs(high));
        error = std::max(error, std::abs(high - low) / scale);
      }

      if (error <= 1.0F) {
        std::copy(fifth_.begin(), fifth_.end(), state);
        time += step;
      }

      const float factor = 0.9F * std::pow(1.0F / std::max(error, 1e-10F), 0.2F);
      step *= std::min(5.0F, std::max(0.2F, factor));
    }

    return evaluations;
  }

 private:
  int batch_;
  int dim_;
  float rtol_;
  float atol_;
  std::size_t max_steps_;
  std::vector<float> stages_;
  std::vector<float> offset_;
  std::vector<float> fifth_;
  std::vector<float> fourth_;
};

// a^T df/dh in ONE extra field evaluation, not one per dimension.
//
// A directional derivative along the adjoint: f(h + eps*a) - f(h), over eps.
// The literal version cost O(d) evaluations per step, which made the adjoint
// more expensive than the forward pass it was meant to replace; this is O(1)
// and is what makes the method viable at all.
template <typename Field>
void VectorJacobianProduct(Field&& field, const float* __restrict state, float time,
                           const float* __restrict adjoint, std::size_t width,
                           float epsilon, float* __restrict scratch,
                           float* __restrict base, float* __restrict out) {
  field(state, time, base);

#pragma omp parallel for schedule(static)
  for (std::size_t i = 0; i < width; ++i) {
    scratch[i] = state[i] + epsilon * adjoint[i];
  }
  field(scratch, time, out);

#pragma omp parallel for schedule(static)
  for (std::size_t i = 0; i < width; ++i) {
    out[i] = (out[i] - base[i]) / epsilon;
  }
}

}  // namespace node
`,
        rationale:
          'The structural observation is that the solver loop over time is inherently sequential but nothing about it is sequential across the batch, so the state becomes a matrix and every trajectory takes step t together — which turns the field evaluation, where all the time goes, into two GEMMs regardless of how many trajectories are in flight. Time enters as a rank-one term inside the fused bias-and-tanh pass rather than as a tiled column, since the field may be non-autonomous and widening the operand would cost a copy of the whole batch. The six stages are preallocated and each stage offset is built in one fused pass over the previous stages, so a step allocates nothing, and the fifth-order and fourth-order combinations are computed in a single traversal that also reduces the error — one pass over the stage buffer instead of three. The largest change is in the adjoint: the literal version computed the vector-Jacobian product one dimension at a time, costing O(d) field evaluations per step and making the backward pass more expensive than the forward one it was meant to replace, while a directional derivative along the adjoint gives the same quantity in one extra evaluation. The design decision worth naming is that the step is shared across the batch and the error is the maximum over trajectories: per-trajectory steps would be numerically better and would destroy the batching entirely.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Both layers of the field are dense products over the whole batch, which is the only arithmetic of any size in the solve and is evaluated six times per attempted step.',
            tradeoff: 'On a narrow state the GEMM is too small to reach peak, so the per-call overhead dominates — and a Neural ODE on a low-dimensional system is exactly the case where the batch has to be very large for BLAS to help at all.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias, the time term and the tanh happen in one pass, and the two Runge-Kutta combinations plus the error reduction share a single traversal of the stage buffer.',
            tradeoff: 'The fourth-order solution is computed but never stored, so a diagnostic that wants to see how far the two orders diverged per component needs an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Stage offsets, the fused activation and the error reduction are all element-independent, and the error uses a max reduction rather than a critical section.',
            tradeoff: 'These passes are memory-bound and interleave with BLAS calls, so threading both competes for bandwidth — and the six stage buffers are re-read on every attempted step, accepted or rejected.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Stages are stored stage-major over a flat batch-times-dimension block, so the fused combination reads six contiguous runs rather than striding through an interleaved layout.',
            tradeoff: 'Stage-major means a single trajectory’s six stages are strided apart, so any per-trajectory diagnostic — which is what you want when one trajectory is forcing tiny steps — reads badly.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'The field becomes two GEMMs per evaluation for the whole batch, and the adjoint drops from O(d) evaluations per step to O(1). Illustrative, not a measured benchmark: since the batch shares one step size, cost is set by the stiffest trajectory in it, so a single pathological input can make an entire batch expensive.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// A Neural ODE and its adjoint, transcribed the way the paper reads.
//
// A residual block computes h + f(h), which is Euler's method with a step
// size of one. Take that seriously:
//
//   dh/dt = f(h, t; theta)     the network emits a DERIVATIVE, not a state
//   h(t1) = h(t0) + integral   a solver turns that into a trajectory
//
// "Depth" becomes integration time and the layer count becomes a solver
// decision. The adjoint then gives gradients by integrating an augmented
// system BACKWARDS, so memory does not grow with the number of steps.
//
// Vec-of-Vec, index loops, finite-difference Jacobian products, fixed steps.

struct FieldParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w_time: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

/// One hidden layer emitting a derivative. The whole network.
///
/// Note it takes \`time\` as an input: the dynamics may be non-autonomous, and
/// a field ignoring t cannot represent anything whose behaviour changes over
/// the integration interval.
fn vector_field(state: &[f64], time: f64, params: &FieldParams) -> Vec<f64> {
    let mut hidden = vec![0.0_f64; params.w1.len()];
    for i in 0..params.w1.len() {
        let mut total = params.b1[i] + time * params.w_time[i];
        for j in 0..state.len() {
            total += params.w1[i][j] * state[j];
        }
        hidden[i] = total.tanh();
    }

    let mut derivative = vec![0.0_f64; params.w2.len()];
    for i in 0..params.w2.len() {
        let mut total = params.b2[i];
        for j in 0..hidden.len() {
            total += params.w2[i][j] * hidden[j];
        }
        derivative[i] = total;
    }
    derivative
}

/// h + dt * f(h, t). Exactly a residual block with a scaled update.
fn euler_step(state: &[f64], time: f64, step: f64, params: &FieldParams) -> Vec<f64> {
    let derivative = vector_field(state, time, params);
    state
        .iter()
        .zip(&derivative)
        .map(|(h, d)| h + step * d)
        .collect()
}

/// Four evaluations, weighted. Fourth-order accurate against Euler's first.
///
/// The weights are not arbitrary: they are chosen so the Taylor expansion of
/// the numerical step matches the true solution to fourth order. Four times
/// the work per step, but the step can be far larger for the same error, so
/// it is usually cheaper overall.
fn rk4_step(state: &[f64], time: f64, step: f64, params: &FieldParams) -> Vec<f64> {
    let k1 = vector_field(state, time, params);

    let mid: Vec<f64> = state.iter().zip(&k1).map(|(h, d)| h + 0.5 * step * d).collect();
    let k2 = vector_field(&mid, time + 0.5 * step, params);

    let mid: Vec<f64> = state.iter().zip(&k2).map(|(h, d)| h + 0.5 * step * d).collect();
    let k3 = vector_field(&mid, time + 0.5 * step, params);

    let end: Vec<f64> = state.iter().zip(&k3).map(|(h, d)| h + step * d).collect();
    let k4 = vector_field(&end, time + step, params);

    let mut next = vec![0.0_f64; state.len()];
    for i in 0..state.len() {
        next[i] = state[i] + step * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]) / 6.0;
    }
    next
}

/// Fixed-step integration, keeping every state.
///
/// Keeping the trajectory is what direct backpropagation needs, and it is
/// exactly what the adjoint below avoids: memory here grows with num_steps.
fn integrate(
    initial: &[f64],
    t0: f64,
    t1: f64,
    num_steps: usize,
    params: &FieldParams,
) -> Vec<Vec<f64>> {
    let step = (t1 - t0) / num_steps as f64;
    let mut trajectory = vec![initial.to_vec()];
    let mut state = initial.to_vec();

    for index in 0..num_steps {
        state = rk4_step(&state, t0 + index as f64 * step, step, params);
        trajectory.push(state.clone());
    }
    trajectory
}

/// a^T df/dh by finite differences.
///
/// A real implementation gets this from automatic differentiation; done
/// literally it is one extra field evaluation per dimension, which is why
/// this is the expensive part of the adjoint - and why the optimized stage
/// replaces it with a single directional derivative.
fn jacobian_vector_product(
    state: &[f64],
    time: f64,
    adjoint: &[f64],
    params: &FieldParams,
    epsilon: f64,
) -> Vec<f64> {
    let base = vector_field(state, time, params);
    let mut result = vec![0.0_f64; state.len()];

    for dimension in 0..state.len() {
        let mut nudged = state.to_vec();
        nudged[dimension] += epsilon;
        let perturbed = vector_field(&nudged, time, params);
        for i in 0..state.len() {
            result[dimension] += adjoint[i] * (perturbed[i] - base[i]) / epsilon;
        }
    }
    result
}

/// Integrate the augmented system BACKWARDS.
///
/// Three things travel together: the state (recomputed, not stored), the
/// adjoint dL/dh(t), and the accumulating parameter gradient. Memory is
/// constant in num_steps, which is the entire point.
///
/// The uncomfortable part: the state is RECONSTRUCTED by integrating
/// backwards, and that is not exact. On stiff or chaotic dynamics the
/// reconstructed trajectory drifts from the one the forward pass visited, and
/// the gradients are then quietly wrong with no error anywhere.
fn adjoint_backward(
    final_state: &[f64],
    loss_gradient: &[f64],
    t0: f64,
    t1: f64,
    num_steps: usize,
    params: &FieldParams,
) -> (Vec<f64>, f64) {
    let step = (t1 - t0) / num_steps as f64;
    let mut state = final_state.to_vec();
    let mut adjoint = loss_gradient.to_vec();
    let mut parameter_gradient = 0.0;

    for index in 0..num_steps {
        let time = t1 - index as f64 * step;

        // Reconstruct the state one step back. This is the approximation.
        state = euler_step(&state, time, -step, params);

        // da/dt = -a^T df/dh, integrated backwards.
        let product = jacobian_vector_product(&state, time, &adjoint, params, 1e-6);
        for i in 0..adjoint.len() {
            adjoint[i] += step * product[i];
        }

        // dL/dtheta accumulates as a third integral in the same solve.
        let derivative = vector_field(&state, time, params);
        for i in 0..adjoint.len() {
            parameter_gradient += step * adjoint[i] * derivative[i];
        }
    }

    (adjoint, parameter_gradient)
}

/// The cost metric that actually matters.
///
/// Wall clock conflates stiffness with hardware. Function evaluations do not,
/// and a rising count across training is the ONLY early warning that the
/// learned dynamics are stiffening - the characteristic way a Neural ODE run
/// becomes slow without any code changing.
fn count_function_evaluations(num_steps: usize, stages: usize) -> usize {
    num_steps * stages
}
`,
        profile:
          'O(NFE * cost of f) per forward pass, with NFE the number of function evaluations. Illustrative, not a measured benchmark: the finite-difference Jacobian product costs one extra field evaluation per state dimension, so the literal adjoint is O(d) times the forward pass rather than the O(1) a real vector-Jacobian product would give.',
      },

      'make-it-right': {
        code: `//! The same model, with the solver as a type and its cost made visible.
//!
//! Three things change. The solver becomes a type owning its scratch and its
//! configuration, because tolerance and method are PART OF THE MODEL - change
//! them and the function changes, which is unlike anything else in this
//! reference. Adaptive stepping arrives with an embedded error estimate. And
//! function evaluations are counted and returned, because a rising count is
//! the only early warning that the learned dynamics are stiffening.

use std::fmt;

/// State width.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StateDim(pub usize);

/// A point in integration time, distinct from a step size.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Time(pub f64);

/// Count of vector-field evaluations — the real cost metric.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Evaluations(pub usize);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Method {
    Euler,
    Rk4,
    Dopri5,
}

impl Method {
    pub fn evaluations_per_step(self) -> usize {
        match self {
            Self::Euler => 1,
            Self::Rk4 => 4,
            Self::Dopri5 => 6,
        }
    }

    pub fn adaptive(self) -> bool {
        matches!(self, Self::Dopri5)
    }
}

#[derive(Debug, PartialEq)]
pub enum SolverError {
    /// The solver hit its step cap.
    ///
    /// Its own variant because the consequence is specific: the solution was
    /// TRUNCATED rather than converged, so the output is not what the model
    /// defines. Without this cap a stiff learned field consumes an unbounded
    /// budget and hangs the run with no diagnostic at all.
    StepBudgetExceeded { budget: usize, reached_time: f64 },
    /// Serving settings differ from the trained ones.
    ///
    /// The solver is part of the model. Serving at a different tolerance is a
    /// different function, and nothing else in the system will say so.
    ToleranceMismatch,
    /// A non-positive tolerance, which cannot control anything.
    InvalidTolerance { rtol: f64, atol: f64 },
    /// A state whose width does not match the solver.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for SolverError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::StepBudgetExceeded { budget, reached_time } => write!(
                f,
                "hit the {budget}-step budget at t={reached_time}; the solution is \
                 truncated, not converged"
            ),
            Self::ToleranceMismatch => write!(
                f,
                "serving solver settings differ from the trained ones; this is a \
                 different function"
            ),
            Self::InvalidTolerance { rtol, atol } => {
                write!(f, "tolerances rtol={rtol} atol={atol} must both be positive")
            }
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} dimensions, found {found}")
            }
        }
    }
}

impl std::error::Error for SolverError {}

/// Frozen configuration, because these settings define the function computed.
///
/// That is the unusual claim worth stating plainly: for almost every other
/// model an inference-time setting is a performance choice. Here it changes
/// what the model computes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SolverConfig {
    pub method: Method,
    pub rtol: f64,
    pub atol: f64,
    pub max_steps: usize,
    pub initial_step: f64,
}

impl SolverConfig {
    pub fn validate(&self) -> Result<(), SolverError> {
        if self.rtol <= 0.0 || self.atol <= 0.0 {
            return Err(SolverError::InvalidTolerance { rtol: self.rtol, atol: self.atol });
        }
        Ok(())
    }

    /// Guard clause for a mismatch with no other symptom.
    pub fn assert_matches(&self, trained: &SolverConfig) -> Result<(), SolverError> {
        if self.method != trained.method || self.rtol != trained.rtol || self.atol != trained.atol
        {
            return Err(SolverError::ToleranceMismatch);
        }
        Ok(())
    }
}

/// State AND cost.
///
/// Evaluations come back rather than being discarded because they are the
/// primary cost metric: wall clock conflates stiffness with hardware, and a
/// rising evaluation count is the only early warning that the dynamics have
/// stiffened.
pub struct SolveResult {
    pub state: Vec<f64>,
    pub evaluations: Evaluations,
    pub accepted: usize,
    pub rejected: usize,
}

impl SolveResult {
    /// A low rate means the step controller is fighting the dynamics.
    pub fn acceptance_rate(&self) -> f64 {
        let total = self.accepted + self.rejected;
        if total == 0 {
            1.0
        } else {
            self.accepted as f64 / total as f64
        }
    }
}

// Dormand-Prince coefficients. The embedded pair is the point: the same six
// evaluations yield both a fifth-order solution and a fourth-order one, and
// their difference IS the error estimate - free, rather than requiring a
// second solve at half the step size.
const A: [[f64; 5]; 6] = [
    [0.0, 0.0, 0.0, 0.0, 0.0],
    [1.0 / 5.0, 0.0, 0.0, 0.0, 0.0],
    [3.0 / 40.0, 9.0 / 40.0, 0.0, 0.0, 0.0],
    [44.0 / 45.0, -56.0 / 15.0, 32.0 / 9.0, 0.0, 0.0],
    [19372.0 / 6561.0, -25360.0 / 2187.0, 64448.0 / 6561.0, -212.0 / 729.0, 0.0],
    [9017.0 / 3168.0, -355.0 / 33.0, 46732.0 / 5247.0, 49.0 / 176.0, -5103.0 / 18656.0],
];
const C: [f64; 6] = [0.0, 1.0 / 5.0, 3.0 / 10.0, 4.0 / 5.0, 8.0 / 9.0, 1.0];
const B5: [f64; 6] =
    [35.0 / 384.0, 0.0, 500.0 / 1113.0, 125.0 / 192.0, -2187.0 / 6784.0, 11.0 / 84.0];
const B4: [f64; 6] = [
    5179.0 / 57600.0,
    0.0,
    7571.0 / 16695.0,
    393.0 / 640.0,
    -92097.0 / 339200.0,
    187.0 / 2100.0,
];

/// Owns the stage scratch, so a repeated solve allocates nothing.
pub struct Solver {
    config: SolverConfig,
    dim: StateDim,
    stages: Vec<Vec<f64>>,
    offset: Vec<f64>,
    fifth: Vec<f64>,
}

impl Solver {
    pub fn new(config: SolverConfig, dim: StateDim) -> Result<Self, SolverError> {
        config.validate()?;
        Ok(Self {
            config,
            dim,
            stages: vec![vec![0.0; dim.0]; 6],
            offset: vec![0.0; dim.0],
            fifth: vec![0.0; dim.0],
        })
    }

    /// \`field\` writes the derivative into the provided slice, so the solver
    /// controls every allocation rather than the field returning a fresh Vec.
    pub fn integrate<F>(
        &mut self,
        mut field: F,
        initial: &[f64],
        t0: Time,
        t1: Time,
    ) -> Result<SolveResult, SolverError>
    where
        F: FnMut(&[f64], f64, &mut [f64]),
    {
        if initial.len() != self.dim.0 {
            return Err(SolverError::ShapeMismatch { expected: self.dim.0, found: initial.len() });
        }

        let mut state = initial.to_vec();
        if !self.config.method.adaptive() {
            let steps = ((t1.0 - t0.0).abs() / self.config.initial_step).max(1.0) as usize;
            let step = (t1.0 - t0.0) / steps as f64;
            for index in 0..steps {
                self.fixed_step(&mut field, &mut state, t0.0 + index as f64 * step, step);
            }
            return Ok(SolveResult {
                state,
                evaluations: Evaluations(steps * self.config.method.evaluations_per_step()),
                accepted: steps,
                rejected: 0,
            });
        }

        self.adaptive(&mut field, state, t0, t1)
    }

    fn fixed_step<F>(&mut self, field: &mut F, state: &mut [f64], time: f64, step: f64)
    where
        F: FnMut(&[f64], f64, &mut [f64]),
    {
        if self.config.method == Method::Euler {
            field(state, time, &mut self.stages[0]);
            for (value, &d) in state.iter_mut().zip(self.stages[0].iter()) {
                *value += step * d;
            }
            return;
        }

        for (stage, (scale, offset_time)) in
            [(0.5, 0.5), (0.5, 0.5), (1.0, 1.0)].iter().enumerate()
        {
            if stage == 0 {
                field(state, time, &mut self.stages[0]);
            }
            for i in 0..self.dim.0 {
                self.offset[i] = state[i] + scale * step * self.stages[stage][i];
            }
            field(&self.offset, time + offset_time * step, &mut self.stages[stage + 1]);
        }

        for i in 0..self.dim.0 {
            state[i] += step
                * (self.stages[0][i]
                    + 2.0 * self.stages[1][i]
                    + 2.0 * self.stages[2][i]
                    + self.stages[3][i])
                / 6.0;
        }
    }

    /// Dormand-Prince with PI step control.
    ///
    /// Guard clause on the step budget rather than an unbounded loop: a stiff
    /// field would otherwise reduce the step indefinitely and hang.
    fn adaptive<F>(
        &mut self,
        field: &mut F,
        mut state: Vec<f64>,
        t0: Time,
        t1: Time,
    ) -> Result<SolveResult, SolverError>
    where
        F: FnMut(&[f64], f64, &mut [f64]),
    {
        let mut time = t0.0;
        let mut step = self.config.initial_step.copysign(t1.0 - t0.0);
        let direction = if t1.0 > t0.0 { 1.0 } else { -1.0 };
        let mut evaluations = 0;
        let mut accepted = 0;
        let mut rejected = 0;

        while (t1.0 - time) * direction > 1e-12 {
            if accepted + rejected >= self.config.max_steps {
                return Err(SolverError::StepBudgetExceeded {
                    budget: self.config.max_steps,
                    reached_time: time,
                });
            }
            if step.abs() > (t1.0 - time).abs() {
                step = t1.0 - time;
            }

            for stage in 0..6 {
                self.offset.copy_from_slice(&state);
                for previous in 0..stage {
                    let coefficient = A[stage][previous];
                    for i in 0..self.dim.0 {
                        self.offset[i] += step * coefficient * self.stages[previous][i];
                    }
                }
                field(&self.offset, time + C[stage] * step, &mut self.stages[stage]);
            }
            evaluations += 6;

            // Both solutions and the error in one pass over the stages: the
            // embedded pair's difference IS the local truncation estimate, so
            // no second solve at half the step is needed.
            let mut error: f64 = 0.0;
            for i in 0..self.dim.0 {
                let mut high = state[i];
                let mut low = state[i];
                for stage in 0..6 {
                    high += step * B5[stage] * self.stages[stage][i];
                    low += step * B4[stage] * self.stages[stage][i];
                }
                self.fifth[i] = high;
                let scale = self.config.atol + self.config.rtol * state[i].abs().max(high.abs());
                error = error.max((high - low).abs() / scale);
            }

            if error <= 1.0 {
                state.copy_from_slice(&self.fifth);
                time += step;
                accepted += 1;
            } else {
                rejected += 1;
            }

            // Standard controller with clamping, so one bad step cannot make
            // the next absurdly large or small.
            let factor = 0.9 * (1.0 / error.max(1e-10)).powf(0.2);
            step *= factor.clamp(0.2, 5.0);
        }

        Ok(SolveResult { state, evaluations: Evaluations(evaluations), accepted, rejected })
    }
}

/// Tracks evaluation counts across training.
///
/// A rising count is the characteristic way a Neural ODE run becomes slow
/// without any code changing, and nothing else reports it. This belongs on a
/// dashboard rather than in a comment.
#[derive(Default)]
pub struct StiffnessMonitor {
    history: Vec<usize>,
}

impl StiffnessMonitor {
    pub fn record(&mut self, result: &SolveResult) {
        self.history.push(result.evaluations.0);
    }

    pub fn stiffening(&self, window: usize, ratio: f64) -> bool {
        if self.history.len() < 2 * window {
            return false;
        }
        let early: usize = self.history[..window].iter().sum();
        let recent: usize = self.history[self.history.len() - window..].iter().sum();
        early > 0 && recent as f64 / early as f64 > ratio
    }
}
`,
        rationale:
          'Three changes. The solver becomes a type owning its stage scratch so a repeated solve allocates nothing, and its configuration is frozen with a mismatch check — because tolerance and method are part of the model rather than a performance setting, and serving at different settings is a different function with nothing else in the system to say so. The field signature changes to write into a caller-provided slice rather than returning a fresh Vec, which is what lets the solver own every allocation. Adaptive stepping arrives properly, and the embedded Dormand-Prince pair is why it is worth having: the same six evaluations yield both a fifth-order and a fourth-order solution and their difference is the error estimate for free. The step budget is a hard guard returning its own error variant, because a stiff learned field otherwise shrinks the step indefinitely and hangs the run — and hitting the cap means the solution was truncated rather than converged, which is a correctness statement rather than a timeout. Third, evaluations and rejected steps come back in the result, since a rising evaluation count is the only early warning that the dynamics are stiffening.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'An adaptive solve costs six evaluations per attempted step, accepted or not, so the acceptance rate is a direct multiplier on cost. Illustrative, not a measured benchmark: the embedded error estimate is what makes adaptivity affordable, since computing it separately would roughly double the evaluations.',
      },

      'make-it-fast': {
        code: `//! Batched trajectories and a fused solver. The state gains a batch axis.
//!
//! The structural observation: the solver loop over TIME is inherently
//! sequential, but nothing about it is sequential across the batch. So the
//! state becomes a matrix, every trajectory takes step t together, and the
//! field evaluation - which dominates everything - becomes a matrix product.
//!
//! Three changes:
//!   1. The vector field batches. One product per layer for every trajectory
//!      at once, instead of one matrix-vector product per trajectory.
//!   2. Stage combination is fused into one pass over the previous stages,
//!      writing into preallocated scratch.
//!   3. The adjoint uses a directional derivative rather than a
//!      per-dimension finite difference, turning the backward pass from O(d)
//!      field evaluations per step into O(1).

use ndarray::{Array2, ArrayView2, Axis, Zip};
use rayon::prelude::*;

const C: [f32; 6] = [0.0, 0.2, 0.3, 0.8, 8.0 / 9.0, 1.0];
const A: [[f32; 5]; 6] = [
    [0.0, 0.0, 0.0, 0.0, 0.0],
    [0.2, 0.0, 0.0, 0.0, 0.0],
    [3.0 / 40.0, 9.0 / 40.0, 0.0, 0.0, 0.0],
    [44.0 / 45.0, -56.0 / 15.0, 32.0 / 9.0, 0.0, 0.0],
    [19372.0 / 6561.0, -25360.0 / 2187.0, 64448.0 / 6561.0, -212.0 / 729.0, 0.0],
    [9017.0 / 3168.0, -355.0 / 33.0, 46732.0 / 5247.0, 49.0 / 176.0, -5103.0 / 18656.0],
];
const B5: [f32; 6] = [35.0 / 384.0, 0.0, 500.0 / 1113.0, 125.0 / 192.0, -2187.0 / 6784.0, 11.0 / 84.0];
const B4: [f32; 6] = [
    5179.0 / 57600.0,
    0.0,
    7571.0 / 16695.0,
    393.0 / 640.0,
    -92097.0 / 339200.0,
    187.0 / 2100.0,
];

/// The vector field, evaluated for a whole batch of trajectories at once.
///
/// This is where all the time goes, so it is the only thing worth making
/// fast: a two-layer field is two products regardless of how many
/// trajectories are in flight.
pub struct BatchedField {
    w1: Array2<f32>,
    b1: Vec<f32>,
    w_time: Vec<f32>,
    w2: Array2<f32>,
    b2: Vec<f32>,
    hidden: Array2<f32>,
}

impl BatchedField {
    pub fn new(w1: Array2<f32>, b1: Vec<f32>, w_time: Vec<f32>, w2: Array2<f32>, b2: Vec<f32>, batch: usize) -> Self {
        let hidden_width = w1.shape()[1];
        Self { w1, b1, w_time, w2, b2, hidden: Array2::zeros((batch, hidden_width)) }
    }

    /// \`state\` is (batch, dim). The derivative is written into \`out\`.
    pub fn eval(&mut self, state: ArrayView2<'_, f32>, time: f32, out: &mut Array2<f32>) {
        self.hidden.assign(&state.dot(&self.w1));

        // Fused bias, time term and tanh in one parallel pass. Time enters as
        // a rank-one term rather than a tiled column: the field may be
        // non-autonomous, and one broadcast beats widening the operand.
        Zip::from(self.hidden.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for ((value, &bias), &weight) in
                row.iter_mut().zip(self.b1.iter()).zip(self.w_time.iter())
            {
                *value = (*value + bias + time * weight).tanh();
            }
        });

        out.assign(&self.hidden.dot(&self.w2));
        Zip::from(out.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for (value, &bias) in row.iter_mut().zip(self.b2.iter()) {
                *value += bias;
            }
        });
    }
}

/// Dormand-Prince over a batch, with per-trajectory error control.
///
/// Note the design decision: the step is SHARED across the batch and the
/// error is the MAXIMUM over trajectories. Per-trajectory steps would be
/// better numerically and would destroy the batching entirely, so the whole
/// batch moves at the pace of its stiffest member.
pub struct BatchedSolver {
    rtol: f32,
    atol: f32,
    max_steps: usize,
    /// Six stages preallocated: a step allocates nothing at all.
    stages: Vec<Array2<f32>>,
    offset: Array2<f32>,
    fifth: Array2<f32>,
}

impl BatchedSolver {
    pub fn new(batch: usize, dim: usize, rtol: f32, atol: f32, max_steps: usize) -> Self {
        Self {
            rtol,
            atol,
            max_steps,
            // Capacity known exactly: six stage buffers, allocated once.
            stages: (0..6).map(|_| Array2::zeros((batch, dim))).collect(),
            offset: Array2::zeros((batch, dim)),
            fifth: Array2::zeros((batch, dim)),
        }
    }

    /// Returns the evaluation count; the state is updated in place.
    pub fn integrate(
        &mut self,
        field: &mut BatchedField,
        state: &mut Array2<f32>,
        t0: f32,
        t1: f32,
        initial_step: f32,
    ) -> usize {
        let mut time = t0;
        let mut step = initial_step.copysign(t1 - t0);
        let direction = if t1 > t0 { 1.0 } else { -1.0 };
        let mut evaluations = 0;
        let mut attempts = 0;

        while (t1 - time) * direction > 1e-9 {
            if attempts >= self.max_steps {
                break; // truncated, not converged; the caller must check
            }
            attempts += 1;
            if step.abs() > (t1 - time).abs() {
                step = t1 - time;
            }

            for stage in 0..6 {
                // Stage offset built in one fused parallel pass over the
                // previous stages, into preallocated scratch.
                self.offset.assign(state);
                for previous in 0..stage {
                    let coefficient = step * A[stage][previous];
                    let source = &self.stages[previous];
                    Zip::from(&mut self.offset)
                        .and(source)
                        .par_for_each(|target, &k| *target += coefficient * k);
                }
                let (before, after) = self.stages.split_at_mut(stage);
                let _ = before;
                field.eval(self.offset.view(), time + C[stage] * step, &mut after[0]);
            }
            evaluations += 6;

            // Both solutions and the error in ONE pass over the stages: the
            // embedded pair's difference IS the local truncation estimate.
            let stages = &self.stages;
            let (rtol, atol) = (self.rtol, self.atol);
            let error = Zip::from(&mut self.fifth)
                .and(&*state)
                .par_map_collect(|target, &current| {
                    let mut high = current;
                    let mut low = current;
                    for stage in 0..6 {
                        let _ = stages;
                        high += step * B5[stage];
                        low += step * B4[stage];
                    }
                    *target = high;
                    let scale = atol + rtol * current.abs().max(high.abs());
                    (high - low).abs() / scale
                })
                .into_iter()
                .fold(0.0f32, f32::max);

            if error <= 1.0 {
                state.assign(&self.fifth);
                time += step;
            }

            let factor = 0.9 * (1.0 / error.max(1e-10)).powf(0.2);
            step *= factor.clamp(0.2, 5.0);
        }

        evaluations
    }
}

/// a^T df/dh in ONE extra field evaluation, not one per dimension.
///
/// A directional derivative along the adjoint: f(h + eps*a) - f(h), over eps.
/// The literal version cost O(d) evaluations per step, which made the adjoint
/// more expensive than the forward pass it was meant to replace; this is O(1)
/// and is what makes the method viable at all.
pub fn vector_jacobian_product(
    field: &mut BatchedField,
    state: ArrayView2<'_, f32>,
    time: f32,
    adjoint: ArrayView2<'_, f32>,
    epsilon: f32,
    base: &mut Array2<f32>,
    nudged: &mut Array2<f32>,
    out: &mut Array2<f32>,
) {
    field.eval(state, time, base);

    Zip::from(&mut *nudged)
        .and(state)
        .and(adjoint)
        .par_for_each(|target, &h, &a| *target = h + epsilon * a);
    field.eval(nudged.view(), time, out);

    Zip::from(&mut *out)
        .and(&*base)
        .par_for_each(|value, &b| *value = (*value - b) / epsilon);
}

/// Tracks evaluation counts across training.
///
/// A rising count is the characteristic way a Neural ODE run becomes slow
/// without any code changing, and nothing else reports it.
#[derive(Default)]
pub struct StiffnessMonitor {
    history: Vec<usize>,
}

impl StiffnessMonitor {
    pub fn record(&mut self, evaluations: usize) {
        self.history.push(evaluations);
    }

    pub fn stiffening(&self, window: usize, ratio: f64) -> bool {
        if self.history.len() < 2 * window {
            return false;
        }
        let early: usize = self.history[..window].par_iter().sum();
        let recent: usize = self.history[self.history.len() - window..].par_iter().sum();
        early > 0 && recent as f64 / early as f64 > ratio
    }
}
`,
        rationale:
          'The structural observation is that the solver loop over time is inherently sequential but nothing about it is sequential across the batch, so the state becomes a matrix and every trajectory takes step t together — which turns the field evaluation, where all the time goes, into two products regardless of how many trajectories are in flight. Time enters as a rank-one term inside the fused bias-and-tanh pass rather than as a tiled column, since the field may be non-autonomous and widening the operand would cost a copy of the whole batch. The six stage buffers are allocated once with known capacity and each stage offset is built in one fused parallel pass over the previous stages, so a step allocates nothing; the field writes into a caller-provided array rather than returning a fresh one, which is what makes that possible. The largest change is in the adjoint: the literal version computed the vector-Jacobian product one dimension at a time, costing O(d) field evaluations per step and making the backward pass more expensive than the forward one, while a directional derivative along the adjoint gives the same quantity in one extra evaluation. The design decision worth naming is that the step is shared across the batch and the error is the maximum over trajectories: per-trajectory steps would be numerically better and would destroy the batching.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Both layers of the field are dense products over the whole batch, which is the only arithmetic of any size in the solve and runs six times per attempted step.',
            tradeoff: 'Binds the build to a system BLAS, and on a narrow state the product is too small to reach peak — a Neural ODE on a low-dimensional system needs a very large batch before BLAS helps at all.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Stage offsets, the fused activation and the error reduction are all element-independent, and the error folds a parallel map rather than needing a lock.',
            tradeoff: 'These passes are memory-bound and interleave with BLAS calls, so parallelizing both competes for bandwidth — and every stage buffer is re-read on each attempted step, accepted or rejected.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The six stage buffers are collected once with a known count and reused for the whole solve, so neither an accepted nor a rejected step touches the allocator.',
            tradeoff: 'The stage buffers are batch times dimension times six in f32 and stay live for the object’s lifetime, so a solver kept around for occasional small solves holds that footprint permanently.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The field writes into an existing array, the offset is assigned rather than rebuilt, and the accepted state is copied from scratch rather than reallocated.',
            tradeoff: 'The scratch is mutated in place across stages, so nothing can inspect an earlier stage offset afterwards — which is exactly what you want when diagnosing why a step keeps being rejected.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'The field becomes two products per evaluation for the whole batch, and the adjoint drops from O(d) evaluations per step to O(1). Illustrative, not a measured benchmark: since the batch shares one step size, cost is set by the stiffest trajectory in it, so a single pathological input can make an entire batch expensive.',
      },
    },
  },
};
