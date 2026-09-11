import type { AiMlModel } from '../../types';

/**
 * PINN — the entry where the training data is an equation.
 *
 * Included because it inverts the usual relationship between model and data:
 * the supervision is a differential operator evaluated at points nobody
 * measured, and in the forward problem there is no data at all. It is also
 * the most honest case study in this reference of a method whose headline
 * result and whose practical standing diverge sharply.
 */
export const PINN: AiMlModel = {
  slug: 'pinn',
  name: 'Physics-Informed Neural Network',
  aliases: ['PINN', 'Physics-informed learning', 'Collocation network', 'Deep Ritz', 'Scientific machine learning'],
  category: 'deep-learning',
  group: 'scientific',
  kind: 'model',

  paradigms: ['self-supervised', 'supervised'],
  taskTypes: ['regression', 'anomaly-detection'],
  architecture: 'feedforward',
  paradigmNote:
    'Self-supervised in the strongest sense available: in the forward problem there are no labels anywhere, and the entire training signal is the residual of a differential equation evaluated at points that were never measured. Supervised appears alongside it because the inverse problem — where sparse observations are fitted jointly with the equation — is where the method is actually useful.',

  intuition:
    'A neural network is a differentiable function, so you can compute its derivatives exactly with the same machinery that computes its gradients. That means you can write down a differential equation, evaluate how badly the network violates it at a scatter of points, and make that violation the loss. The result is a mesh-free solver whose solution is a closed-form function you can differentiate anywhere — and, more usefully, a framework where unknown coefficients in the equation are just more parameters to fit alongside the network.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta,\\lambda) = \\underbrace{\\frac{\\omega_r}{N_r}\\sum_{i} \\bigl\\lVert \\mathcal{N}[u_\\theta](\\mathbf{x}_i)\\bigr\\rVert^2}_{\\text{residual}} + \\underbrace{\\frac{\\omega_b}{N_b}\\sum_{j} \\bigl\\lVert u_\\theta(\\mathbf{x}_j) - g_j \\bigr\\rVert^2}_{\\text{boundary}} + \\underbrace{\\frac{\\omega_d}{N_d}\\sum_{k} \\bigl\\lVert u_\\theta(\\mathbf{x}_k) - y_k \\bigr\\rVert^2}_{\\text{data}}',
      symbols: [
        { symbol: '\\mathcal{N}[\\cdot]', meaning: 'the differential operator — the PDE, written as something that should equal zero' },
        { symbol: 'u_\\theta', meaning: 'the network, standing in for the solution field as a closed-form differentiable function' },
        { symbol: '\\mathbf{x}_i', meaning: 'collocation points: locations where the equation is enforced and nothing was ever measured' },
        { symbol: '\\omega_r, \\omega_b, \\omega_d', meaning: 'the loss weights, and the single most consequential set of numbers in the method' },
        { symbol: '\\lambda', meaning: 'unknown physical coefficients, optimized jointly with the network — the inverse problem' },
      ],
    },
    reading:
      'Three losses summed, and the summation is the problem. These terms have different units, different scales and different curvature, so the weights are not a regularization choice but a determination of which constraint the optimizer actually respects. Get them wrong and the network satisfies the boundary conditions beautifully while ignoring the equation, or satisfies the equation with a solution that drifts from the boundary — both of which look like convergence. The second thing to notice is what the residual term needs: derivatives of the network with respect to its inputs, not its parameters. A second-order PDE requires second derivatives of the output with respect to the input, and then gradients of those with respect to the weights, which is why a PINN step costs several times what a same-sized regression step costs.',
  },

  optimization: {
    method: 'Adam followed by L-BFGS, with adaptive loss weighting and collocation resampling',
    updateRule: {
      formula:
        '\\omega_r^{(k+1)} = (1-\\alpha)\\,\\omega_r^{(k)} + \\alpha \\frac{\\max_\\theta \\lvert \\nabla_\\theta \\mathcal{L}_r \\rvert}{\\overline{\\lvert \\nabla_\\theta \\mathcal{L}_b \\rvert}}, \\qquad \\mathcal{N}[u] = u_t + u u_x - \\nu u_{xx}',
      symbols: [
        { symbol: '\\nabla_\\theta \\mathcal{L}_r', meaning: 'gradient of the residual term; its magnitude relative to the others is what the weights must equalize' },
        { symbol: '\\alpha', meaning: 'the weight-update rate, kept small so the balance moves slowly relative to the weights themselves' },
        { symbol: 'u_t, u_x, u_{xx}', meaning: 'derivatives of the network output with respect to its INPUTS, obtained by automatic differentiation' },
        { symbol: '\\nu', meaning: 'a physical coefficient; known in the forward problem, and a fitted parameter in the inverse one' },
      ],
    },
    rationale:
      'Two things make the optimization unusual and both are worth separating. The first is that gradients of the different loss terms routinely differ by orders of magnitude, so a fixed weighting silently selects which constraint gets satisfied; adaptive schemes rebalance the weights from observed gradient magnitudes, which converts a hyperparameter search into a running measurement. The second is the two-stage schedule, which is not folklore: Adam is robust enough to get out of the terrible initial region, and L-BFGS then exploits curvature to reach the sharp minima that a first-order method approaches only slowly. The gap between stopping after Adam and running L-BFGS to convergence is frequently an order of magnitude in residual. Underneath both sits spectral bias — networks fit low frequencies first — which is exactly the wrong inductive bias for a solution with sharp gradients, and it is why a PINN can converge smoothly to a plausible solution that is simply wrong in the shock region.',
    hyperparameters: [
      { name: 'loss weights', role: 'Which constraint is actually enforced. The most consequential choice in the method, and adaptive schemes exist because fixed ones fail', typicalRange: '1 to 1000, or adaptive' },
      { name: 'collocation points', role: 'Where the equation is enforced. More improves accuracy and cost linearly; placement matters more than count', typicalRange: '1e3 to 1e5' },
      { name: 'network depth and width', role: 'Capacity for the solution field. Usually modest — 4 to 8 layers of 20 to 100 units', typicalRange: '4-8 layers, 20-100 wide' },
      { name: 'activation', role: 'Must be smooth to the order of the PDE. ReLU has zero second derivative and cannot express a second-order residual at all', typicalRange: 'tanh / sin / GELU' },
      { name: 'Adam steps before L-BFGS', role: 'The handover point. Too early and L-BFGS stalls in a bad region; too late and Adam wastes time', typicalRange: '1e4 to 5e4' },
      { name: 'Fourier feature scale', role: 'Input encoding that counteracts spectral bias; frequently the difference between failure and success on sharp solutions', typicalRange: '1 to 10' },
    ],
    convergence:
      'No guarantee of anything, and a distinctive set of failures that all look like success. The most important is that the loss is a poor proxy for solution accuracy: a residual of 1e-5 is compatible with a solution that is qualitatively wrong, because the residual is measured at collocation points and a network can be nearly right there while being badly wrong between them. The second is failure on sharp features — spectral bias means high frequencies arrive last if at all, so shocks and boundary layers are smoothed into something plausible and incorrect, and the loss curve gives no hint. The third is loss-term imbalance, where one term dominates and the others are effectively unconstrained; the diagnostic is to track the terms separately, which is trivial and routinely skipped. Underlying all of it is the honest comparison: on a well-posed forward problem with a standard geometry, a classical finite-element or spectral solver is faster by orders of magnitude and comes with error bounds, and a PINN is the wrong tool.',
    complexity:
      'O(N_c · d · P) per step, where the derivative order multiplies the cost of a plain forward pass: a second-order PDE needs second derivatives of the output with respect to the input, then gradients of those with respect to the weights, which is typically three to five times the cost of an equivalent regression step. Fully parallel across collocation points, and with no sequential structure anywhere.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Treat time as one of the input coordinates and solve on a space-time domain, so the network gives the field at any future instant inside that domain. Sparse measurements enter as a data term while the equation constrains everything between and beyond them, which is what lets the method work with far fewer observations than a purely data-driven forecaster would need.',
        where: [
          'Forecasting a physical process with a known governing equation and very sparse sensors',
          'Digital twins where the model must respect conservation laws rather than merely fit history',
          'Filling gaps in space-time observation records under a physical constraint',
          'Hybrid settings where a known equation is augmented by a learned closure term',
        ],
        why: 'The argument for it is real but narrow: where a governing equation is genuinely known, it constrains the solution in regions with no data at all, which is something no statistical forecaster can do — and with a handful of sensors that is the difference between a solvable and an unsolvable problem. Against it, two things are decisive. Extrapolation beyond the trained space-time domain is not supported: the network was fitted on that domain and behaves arbitrarily outside it, so "forecasting" means solving on a domain that already includes the future, which must be decided before training. And where no governing equation is known, which is nearly all forecasting, the method has nothing to offer. This is a tool for physics, not for demand.',
        featurization: [
          'Normalize the space and time coordinates to comparable ranges, or the derivative terms differ by orders of magnitude before training starts',
          'Include the forecast window in the training domain, since the network cannot extrapolate past the collocation region',
          'Weight the sparse data term against the residual explicitly and monitor both, since one silently dominates otherwise',
          'Use a smooth activation to the order of the equation — a ReLU network has zero second derivative and cannot represent a second-order residual at all',
        ],
        evaluation:
          'Error against held-out measurements inside the domain, and separately the residual on a dense grid of points never used for training — a low training residual with a high held-out residual means the network satisfied the equation only where it was asked to. Compare against a classical solver wherever one exists, because that comparison is usually unflattering and is the honest test of whether this approach was warranted.',
        pitfalls: [
          'Treating the trained domain boundary as extrapolatable, which it is not in any sense',
          'A low residual masking a qualitatively wrong solution, which is the characteristic failure of the method',
          'Loss-term imbalance leaving the sparse data term effectively unconstrained',
          'Applying it where no governing equation is known, where it reduces to an ordinary and worse regressor',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Once a network is fitted to normal operation under a governing equation, the PDE residual evaluated at new measurements is a physically meaningful anomaly score: a reading that violates conservation of mass or energy is anomalous for a reason you can state, rather than because it is statistically unusual. That interpretability is the distinctive benefit, and it is rare.',
        where: [
          'Sensor fault detection in instrumented physical systems, where a violated conservation law localizes the faulty instrument',
          'Leak and blockage detection in flow networks, where the governing equation is well established',
          'Structural health monitoring against a known mechanical model',
          'Process monitoring in chemical and thermal plants where the balance equations are documented',
        ],
        why: 'The score means something, which no statistical detector can claim: "this reading is inconsistent with conservation of mass" is an explanation an engineer can act on, where "this reading is in the 0.1st percentile of a learned density" is not. It also distinguishes a faulty sensor from a genuine process change, because the two violate the physics differently. Against it: it requires a governing equation you actually trust, and if the model is wrong every residual is wrong in the same direction; the network must be refitted when operating conditions move outside the trained domain; and on any system without a documented physical model this has nothing to offer that a much cheaper detector does not.',
        featurization: [
          'Validate the governing equation against known-good operation first, since a wrong model makes every residual meaningless in the same direction',
          'Normalize the residual per equation term, so a large-magnitude term does not dominate the score by units alone',
          'Keep the per-term residual rather than the total, since which term is violated is what identifies the fault',
          'Refit when operating conditions leave the trained domain, because the network is not valid outside it',
        ],
        evaluation:
          'Precision and recall on confirmed faults, plus an explicit check that the implicated equation term matches the physical root cause — that second check is the whole value proposition, and a detector that flags the right events for the wrong reason has not delivered it.',
        pitfalls: [
          'A wrong or incomplete governing equation making every residual systematically misleading',
          'Operating conditions drifting outside the trained domain, where the network is simply undefined',
          'Reporting a scalar residual and losing the per-term attribution that made the method worth using',
          'Using it where no trusted physical model exists, which removes the only advantage it has',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'A PINN is a PDE solver implemented as an optimization problem, so the subject is optimization almost end to end. The forward problem replaces a linear solve with gradient descent on a residual; the inverse problem, which is where the method genuinely earns its place, makes unknown physical coefficients parameters in that same optimization, so parameter estimation and field reconstruction happen in one fit rather than in a nested loop. Around this sit the multi-objective weighting problem, the two-stage Adam-then-L-BFGS schedule, and spectral bias as a structural limitation of the hypothesis class.',
        where: [
          'Multi-objective loss balancing where the terms have incommensurable units — the defining difficulty here',
          'Inverse problems solved as joint optimization rather than as nested forward solves, which is the method’s strongest use',
          'First-order to second-order handover, where Adam escapes the bad region and L-BFGS exploits curvature',
          'Spectral bias as an inductive-bias limitation, and Fourier features as a targeted fix rather than a general one',
        ],
        why: 'Worth studying because it is the clearest example in this reference of a method whose headline framing and whose actual value diverge. As a forward solver it loses badly to classical numerical methods — slower by orders of magnitude, with no error bounds, on problems those methods solve reliably. As an inverse solver it is genuinely strong, because adding unknown coefficients to an existing optimization is nearly free while the classical equivalent requires an outer loop around a full solve. Knowing which problem you have is the whole decision, and the multi-objective weighting difficulty is the transferable lesson: when a loss sums terms with different units, the weights are choosing the answer.',
        featurization: [
          'Track each loss term separately at all times; a total loss hides that one term is unconstrained, and this is the cheapest diagnostic available',
          'Use adaptive weighting from measured gradient magnitudes rather than searching fixed weights, which converts tuning into measurement',
          'Run L-BFGS after Adam — the residual improvement is frequently an order of magnitude and is routinely left on the table',
          'Add Fourier features when the solution has sharp gradients, since spectral bias otherwise smooths them into something plausible and wrong',
        ],
        evaluation:
          'Compare against a classical solver on any problem where one applies — that is the honest benchmark and the one most PINN evaluations omit. For inverse problems, report parameter recovery error rather than residual, since that is what the method is actually for. Always evaluate the residual on points never used in training.',
        pitfalls: [
          'Using it as a forward solver where finite elements are faster, more accurate and come with error bounds',
          'Treating the loss as a proxy for solution accuracy, which it is not — a low residual is compatible with a qualitatively wrong solution',
          'Fixed loss weights silently determining which constraint is satisfied',
          'Stopping after Adam and leaving an order of magnitude of residual improvement unclaimed',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'Used as a fast surrogate for a physical simulation inside a control or optimization loop: train once on the governing equations across a parameter range, then evaluate in microseconds where the classical solver takes seconds. The network is differentiable with respect to its inputs, so gradients of the objective with respect to control variables come for free.',
        where: [
          'Real-time surrogates for thermal, flow or structural simulation inside a controller',
          'Design optimization where the physical solve sits inside the objective and must be evaluated thousands of times',
          'Digital twins requiring physically consistent state estimates between sparse measurements',
          'Model-predictive control over a system with a known continuous physical model',
        ],
        why: 'The economics are the argument: training is expensive and evaluation is nearly free, which is exactly the right shape when the solve sits inside a loop evaluated thousands of times. Differentiability with respect to inputs is a genuine second benefit, since it gives design sensitivities without finite differencing. Against it: the surrogate is valid only inside the parameter range it was trained on and degrades silently outside it, there is no error bound anywhere, and a controller acting on a wrong surrogate has no way to detect that it is wrong. In safety-critical settings that absence of a bound is usually disqualifying.',
        featurization: [
          'Train across the full parameter range the controller will explore, since the surrogate has no validity outside it and no way to say so',
          'Validate against the classical solver on a dense grid, which is the only error estimate available',
          'Monitor whether inputs at serving time fall inside the trained range, and abstain rather than extrapolate',
          'Prefer a hybrid form where a known part of the physics is computed exactly and only the expensive part is surrogated',
        ],
        evaluation:
          'Error against the classical solver across the parameter range, reported at the worst case rather than the mean — a controller meets the worst case, not the average. Then closed-loop performance, which is the number that matters and which diverges from surrogate accuracy more than expected.',
        pitfalls: [
          'Silent degradation outside the trained parameter range, with no in-model way to detect it',
          'No error bound, which is frequently disqualifying in safety-critical control',
          'Optimizing mean surrogate accuracy when the controller is exposed to the worst case',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes to hours on a single GPU for a modest domain, but with a wide spread: derivative order multiplies the per-step cost, and difficult problems need very many steps. The L-BFGS stage is expensive per iteration and usually worth it.',
    inferenceProfile:
      'One forward pass per query point and trivially batched — microseconds, and mesh-free, so the solution can be evaluated anywhere in the domain at any resolution without re-solving. This asymmetry between expensive training and nearly free evaluation is the whole argument for the surrogate use case.',
    retrainingCadence:
      'Per problem rather than on a schedule. A new geometry, a new boundary condition or a new parameter range is a new training run — there is no notion of updating a PINN with new data the way a statistical model is updated.',
    driftAndMonitoring: [
      'Track each loss term separately and permanently; a total loss hides that one constraint has become unconstrained, and this is the cheapest diagnostic there is',
      'Evaluate the residual on points never used for training, since a network can satisfy the equation only where it was asked to',
      'Check at serving time that query points lie inside the trained domain, and abstain rather than extrapolate',
      'Compare against a classical solver wherever one exists, as the only available error estimate',
    ],
    productionGotchas: [
      'The trained domain is a hard boundary. Outside it the network is not approximate, it is undefined — and it will still return a confident number',
      'The activation must be smooth to the order of the PDE. A ReLU network has zero second derivative everywhere, so a second-order residual is identically zero and the model trains to a meaningless optimum',
      'A low loss does not mean an accurate solution. This is the single most important thing to internalize about the method, and it catches experienced people',
      'Loss weights are part of the model. Different weights give a different solution to the same equation, and the weights must be versioned with the checkpoint',
      'Input normalization interacts with the derivative terms, since scaling a coordinate scales its derivatives by the same factor to the order of the equation',
    ],
  },

  assumptions: [
    'The governing equation is known and correct — the load-bearing assumption, and where it fails every residual is wrong in the same systematic direction',
    'The solution is smooth enough for a neural network to represent, which is false at a genuine discontinuity',
    'The domain of interest is fixed and known before training, since the network has no validity outside it',
    'The loss terms can be balanced so every constraint is meaningfully enforced, which is a tuning problem rather than a given',
    'Collocation points cover the domain densely enough that satisfying the equation there implies satisfying it everywhere',
  ],

  pros: [
    {
      point: 'Inverse problems come nearly free',
      context:
        'Unknown physical coefficients are just more parameters in the same optimization, so parameter estimation and field reconstruction happen in one fit. The classical equivalent needs an outer loop around a full solve, and this is where the method is genuinely strong rather than merely interesting.',
    },
    {
      point: 'Mesh-free, with a closed-form differentiable solution',
      context:
        'No mesh generation, and the solution can be evaluated and differentiated anywhere in the domain at any resolution. Meshing is a real cost in complex geometries, and this sidesteps it entirely.',
    },
    {
      point: 'Physics constrains regions with no data',
      context:
        'With a handful of sensors the equation determines the field between them, which no statistical model can do. This is the difference between a solvable and an unsolvable problem in sparsely instrumented systems.',
    },
    {
      point: 'Anomaly scores that mean something physical',
      context:
        '"This violates conservation of mass" is an explanation an engineer can act on, and the violated term identifies the fault. Rare among detectors and genuinely valuable where a trusted model exists.',
    },
    {
      point: 'Expensive to train, nearly free to evaluate',
      context:
        'Exactly the right shape for a surrogate inside an optimization or control loop evaluated thousands of times. The asymmetry is the whole argument for that use case.',
    },
  ],

  cons: [
    {
      point: 'A low loss does not mean an accurate solution',
      context:
        'The residual is measured at collocation points and a network can be nearly right there while being badly wrong between them. The most important and most under-appreciated property of the method, and it catches experienced practitioners.',
    },
    {
      point: 'Loses badly to classical solvers on forward problems',
      context:
        'On a well-posed problem with standard geometry, finite elements are orders of magnitude faster and come with error bounds. Choosing a PINN there is a mistake, and the literature does not always say so plainly.',
    },
    {
      point: 'Multi-objective weighting determines the answer',
      context:
        'Terms with different units summed together mean the weights choose which constraint is satisfied. Not a regularization knob — a modelling decision that must be measured rather than guessed.',
    },
    {
      point: 'Spectral bias fails on sharp features',
      context:
        'Networks fit low frequencies first, so shocks and boundary layers are smoothed into something plausible and wrong, with no signal in the loss curve. Fourier features help and do not eliminate it.',
    },
    {
      point: 'No validity outside the trained domain and no error bound anywhere',
      context:
        'The network returns a confident number for any input, including ones it was never fitted on. In engineering contexts the absence of an error bound is frequently disqualifying on its own.',
    },
  ],

  relatedSlugs: ['neural-ode', 'gaussian-process', 'mlp', 'kalman-filter', 'spatio-temporal-gnn'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A PINN for Burgers' equation, with the derivatives written out by hand.

The equation:

    u_t + u * u_x - nu * u_xx = 0        on x in [-1, 1], t in [0, 1]
    u(x, 0) = -sin(pi x)                  initial condition
    u(-1, t) = u(1, t) = 0                boundary conditions

The loss is the residual of that equation at COLLOCATION POINTS - locations
where nothing was ever measured - plus the boundary and initial conditions.
In the forward problem there is no data anywhere.

A real implementation gets u_x and u_xx from automatic differentiation. Here
they are differentiated by hand, which is only possible because the network is
one tanh layer - and which makes visible exactly what the residual needs:
derivatives with respect to the INPUTS, not the parameters.
"""

import math
import random

SEED = 5
NU = 0.01 / math.pi


def forward(x, t, params):
    """u(x, t) through one tanh layer. Returns the value and the hidden state.

    The hidden activations come back because every derivative below reuses
    them - recomputing the forward pass for each derivative would triple the
    cost of the residual.
    """
    hidden = []
    for i in range(len(params['w_x'])):
        pre = params['w_x'][i] * x + params['w_t'][i] * t + params['b'][i]
        hidden.append(math.tanh(pre))

    value = params['b_out']
    for i, h in enumerate(hidden):
        value += params['w_out'][i] * h
    return value, hidden


def derivatives(x, t, params, hidden):
    """u_t, u_x and u_xx, by the chain rule, using the cached activations.

    For h = tanh(a):  dh/da = 1 - h^2,  d2h/da2 = -2h(1 - h^2)

    Both are functions of h alone, which is why the hidden state is enough and
    the pre-activations need not be stored. The ACTIVATION MUST BE SMOOTH to
    the order of the equation: a ReLU network has zero second derivative
    everywhere, so u_xx is identically zero and a second-order residual is
    trivially satisfied by a meaningless solution.
    """
    u_x = 0.0
    u_t = 0.0
    u_xx = 0.0

    for i, h in enumerate(hidden):
        first = 1.0 - h * h
        second = -2.0 * h * first

        u_x += params['w_out'][i] * first * params['w_x'][i]
        u_t += params['w_out'][i] * first * params['w_t'][i]
        u_xx += params['w_out'][i] * second * params['w_x'][i] * params['w_x'][i]

    return u_t, u_x, u_xx


def residual(x, t, params):
    """How badly the network violates the equation at one point.

    This IS the training signal. No label is involved anywhere.
    """
    value, hidden = forward(x, t, params)
    u_t, u_x, u_xx = derivatives(x, t, params, hidden)
    return u_t + value * u_x - NU * u_xx


def initial_condition(x):
    return -math.sin(math.pi * x)


def sample_collocation(count, rng):
    """Points where the equation is enforced. Nothing is measured here."""
    return [(rng.uniform(-1.0, 1.0), rng.uniform(0.0, 1.0)) for _ in range(count)]


def total_loss(params, collocation, boundary, initial, weights):
    """Three terms with DIFFERENT UNITS, summed.

    That summation is the central difficulty of the whole method. The residual
    term carries units of du/dt; the boundary term carries units of u. Their
    gradients routinely differ by orders of magnitude, so the weights are not
    a regularization choice - they determine which constraint the optimizer
    actually respects.
    """
    residual_loss = 0.0
    for x, t in collocation:
        r = residual(x, t, params)
        residual_loss += r * r
    residual_loss /= len(collocation)

    boundary_loss = 0.0
    for x, t in boundary:
        value, _ = forward(x, t, params)
        boundary_loss += value * value  # u = 0 on both boundaries
    boundary_loss /= len(boundary)

    initial_loss = 0.0
    for x in initial:
        value, _ = forward(x, 0.0, params)
        difference = value - initial_condition(x)
        initial_loss += difference * difference
    initial_loss /= len(initial)

    total = (
        weights['residual'] * residual_loss
        + weights['boundary'] * boundary_loss
        + weights['initial'] * initial_loss
    )
    # The per-term values come back too. A total loss hides that one term has
    # become unconstrained, and that is the cheapest diagnostic available.
    return total, residual_loss, boundary_loss, initial_loss


def numerical_gradient(params, key, index, collocation, boundary, initial, weights,
                       epsilon=1e-6):
    """Finite differences over the parameters.

    Enormously wasteful - two full loss evaluations per parameter - and here
    only to keep the mechanism visible. Note the nesting this exposes: the
    loss already contains derivatives with respect to the INPUTS, so a real
    implementation differentiates through those to get parameter gradients,
    which is why a PINN step costs several times a regression step.
    """
    original = params[key][index] if isinstance(params[key], list) else params[key]

    def set_value(value):
        if isinstance(params[key], list):
            params[key][index] = value
        else:
            params[key] = value

    set_value(original + epsilon)
    high, _, _, _ = total_loss(params, collocation, boundary, initial, weights)
    set_value(original - epsilon)
    low, _, _, _ = total_loss(params, collocation, boundary, initial, weights)
    set_value(original)

    return (high - low) / (2.0 * epsilon)


def train(width=20, steps=2000, learning_rate=0.01, num_collocation=200):
    rng = random.Random(SEED)
    params = {
        'w_x': [rng.uniform(-1.0, 1.0) for _ in range(width)],
        'w_t': [rng.uniform(-1.0, 1.0) for _ in range(width)],
        'b': [0.0] * width,
        'w_out': [rng.uniform(-1.0, 1.0) for _ in range(width)],
        'b_out': 0.0,
    }

    collocation = sample_collocation(num_collocation, rng)
    boundary = [(-1.0, rng.uniform(0.0, 1.0)) for _ in range(50)]
    boundary += [(1.0, rng.uniform(0.0, 1.0)) for _ in range(50)]
    initial = [rng.uniform(-1.0, 1.0) for _ in range(50)]

    weights = {'residual': 1.0, 'boundary': 1.0, 'initial': 1.0}

    for step in range(steps):
        for key in ('w_x', 'w_t', 'b', 'w_out'):
            for index in range(width):
                gradient = numerical_gradient(
                    params, key, index, collocation, boundary, initial, weights
                )
                params[key][index] -= learning_rate * gradient

    return params


def residual_on_held_out(params, rng, count=1000):
    """The check that matters, and the one people skip.

    A network can satisfy the equation at its collocation points while being
    badly wrong between them. A low TRAINING residual with a high held-out
    residual is exactly that failure, and nothing else reveals it.
    """
    points = sample_collocation(count, rng)
    total = 0.0
    for x, t in points:
        r = residual(x, t, params)
        total += r * r
    return total / len(points)
`,
        profile:
          'O(N_c * W) per loss evaluation, multiplied by two evaluations per parameter for the finite-difference gradient — so O(N_c * W^2) per step. Illustrative, not a measured benchmark: the quadratic factor is entirely an artifact of numerical differentiation, and it is what makes the literal version unusable past a handful of hidden units.',
      },

      'make-it-right': {
        code: `"""The same PINN, with the loss terms as a type and the weighting measured.

Two things change. The loss terms become a structure that keeps them
separate, because summing quantities with different units is the central
difficulty of the method and a scalar total hides which constraint is
actually being enforced. And forward-mode automatic differentiation replaces
hand-written derivatives, which is what makes the approach work for any
equation rather than only for the one it was derived for.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Callable, NamedTuple, Sequence


class NonSmoothActivation(ValueError):
    """Raised when the activation cannot support the equation's order.

    Its own type because the failure is silent and total: a ReLU network has
    zero second derivative everywhere, so a second-order residual is
    identically zero and the model trains happily to a meaningless optimum.
    """


class DomainViolation(ValueError):
    """Raised when a query point lies outside the trained domain.

    Outside its collocation region the network is not approximate - it is
    undefined. It will still return a confident number, which is why this is
    checked rather than trusted.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


class Dual(NamedTuple):
    """A second-order dual number: value, first derivative, second derivative.

    Forward-mode automatic differentiation, carried explicitly. This is what
    replaces hand-differentiating the network: the arithmetic rules below
    propagate derivatives through any composition, so the residual can be
    written for ANY equation rather than only the one the derivatives were
    derived for.
    """

    value: float
    first: float
    second: float

    def __add__(self, other: Dual | float) -> Dual:
        if isinstance(other, Dual):
            return Dual(self.value + other.value, self.first + other.first,
                        self.second + other.second)
        return Dual(self.value + other, self.first, self.second)

    def __mul__(self, other: Dual | float) -> Dual:
        if not isinstance(other, Dual):
            return Dual(self.value * other, self.first * other, self.second * other)
        # Product rule, and the second derivative of a product needs the
        # cross term - the place a hand-rolled implementation goes wrong.
        return Dual(
            self.value * other.value,
            self.first * other.value + self.value * other.first,
            self.second * other.value + 2.0 * self.first * other.first
            + self.value * other.second,
        )

    def tanh(self) -> Dual:
        activation = math.tanh(self.value)
        first = 1.0 - activation * activation
        second = -2.0 * activation * first
        # Chain rule to second order: (f o g)'' = f''(g) g'^2 + f'(g) g''
        return Dual(
            activation,
            first * self.first,
            second * self.first * self.first + first * self.second,
        )


@dataclass(frozen=True)
class Domain:
    """The region the network is valid on. Frozen, because it is a hard edge."""

    x_min: float
    x_max: float
    t_min: float
    t_max: float

    def __post_init__(self) -> None:
        if self.x_min >= self.x_max or self.t_min >= self.t_max:
            raise ShapeMismatch('domain bounds must be strictly increasing')

    def contains(self, x: float, t: float) -> bool:
        return self.x_min <= x <= self.x_max and self.t_min <= t <= self.t_max

    def assert_contains(self, x: float, t: float) -> None:
        """Guard clause: outside the domain the network is undefined, not
        approximate — and it will still return a confident number."""
        if not self.contains(x, t):
            raise DomainViolation(
                f'({x}, {t}) lies outside the trained domain; the network has no '
                'validity there and extrapolation is not supported'
            )

    def sample(self, count: int, rng: random.Random) -> list[tuple[float, float]]:
        return [
            (rng.uniform(self.x_min, self.x_max), rng.uniform(self.t_min, self.t_max))
            for _ in range(count)
        ]


class LossTerms(NamedTuple):
    """Each term kept separate, with its weight.

    Returning a scalar total is the mistake that makes PINNs hard to debug: a
    falling total is compatible with one term being entirely unconstrained,
    and tracking the terms separately is the cheapest diagnostic available.
    """

    residual: float
    boundary: float
    initial: float
    data: float = 0.0

    def weighted_total(self, weights: LossWeights) -> float:
        return (
            weights.residual * self.residual
            + weights.boundary * self.boundary
            + weights.initial * self.initial
            + weights.data * self.data
        )

    def imbalance_ratio(self) -> float:
        """How far apart the terms are. Above a couple of orders of magnitude
        the smaller ones are effectively unconstrained."""
        values = [v for v in (self.residual, self.boundary, self.initial, self.data) if v > 0.0]
        return max(values) / min(values) if len(values) > 1 else 1.0


@dataclass
class LossWeights:
    """Not a regularization knob — a determination of which constraint holds.

    The terms carry different units: the residual is in du/dt, the boundary
    term is in u. Their gradients routinely differ by orders of magnitude, so
    the weights choose the answer rather than tuning it.
    """

    residual: float = 1.0
    boundary: float = 1.0
    initial: float = 1.0
    data: float = 1.0

    def rebalance(self, gradient_norms: LossTerms, rate: float = 0.1) -> None:
        """Adaptive weighting from measured gradient magnitudes.

        Converts a hyperparameter search into a running measurement: scale
        each weight so every term contributes comparable gradient magnitude.
        The rate is kept small so the balance moves slowly relative to the
        weights it is balancing.
        """
        reference = gradient_norms.residual
        if reference <= 0.0:
            return
        for name in ('boundary', 'initial', 'data'):
            observed = getattr(gradient_norms, name)
            if observed <= 0.0:
                continue
            target = reference / observed
            current = getattr(self, name)
            setattr(self, name, (1.0 - rate) * current + rate * target)


class PinnNetwork:
    """One tanh layer, evaluated through dual numbers for exact derivatives."""

    SMOOTH_ACTIVATIONS = frozenset({'tanh', 'sin', 'gelu'})

    def __init__(
        self,
        width: int,
        domain: Domain,
        activation: str = 'tanh',
        seed: int = 5,
    ) -> None:
        # Guard clause for the failure with no other symptom.
        if activation not in self.SMOOTH_ACTIVATIONS:
            raise NonSmoothActivation(
                f'{activation} is not smooth enough for a second-order equation; '
                'a ReLU network has zero second derivative and the residual '
                'becomes identically zero'
            )

        rng = random.Random(seed)
        self._domain = domain
        self._w_x = [rng.uniform(-1.0, 1.0) for _ in range(width)]
        self._w_t = [rng.uniform(-1.0, 1.0) for _ in range(width)]
        self._bias = [0.0] * width
        self._w_out = [rng.uniform(-1.0, 1.0) for _ in range(width)]
        self._b_out = 0.0

    def evaluate(self, x: float, t: float, differentiate_in_x: bool = True) -> Dual:
        """u(x, t) as a dual number, carrying derivatives in x OR t.

        The seed determines which variable is differentiated: first derivative
        one, second derivative zero for the variable of interest, both zero
        for the other. That is the whole of forward-mode AD.
        """
        x_dual = Dual(x, 1.0 if differentiate_in_x else 0.0, 0.0)
        t_dual = Dual(t, 0.0 if differentiate_in_x else 1.0, 0.0)

        total = Dual(self._b_out, 0.0, 0.0)
        for index in range(len(self._w_x)):
            pre = (x_dual * self._w_x[index]) + (t_dual * self._w_t[index]) + self._bias[index]
            total = total + pre.tanh() * self._w_out[index]
        return total

    def residual(self, x: float, t: float, viscosity: float) -> float:
        """u_t + u u_x - nu u_xx, from two dual evaluations.

        Two passes rather than one: forward-mode AD carries derivatives with
        respect to one input at a time, so a two-variable equation costs two
        forward passes. That is the structural cost of the method, and it is
        why reverse mode is preferred for many inputs and forward mode here.
        """
        self._domain.assert_contains(x, t)
        in_x = self.evaluate(x, t, differentiate_in_x=True)
        in_t = self.evaluate(x, t, differentiate_in_x=False)
        return in_t.first + in_x.value * in_x.first - viscosity * in_x.second


def compute_loss(
    network: PinnNetwork,
    collocation: Sequence[tuple[float, float]],
    boundary: Sequence[tuple[float, float]],
    initial: Sequence[float],
    initial_condition: Callable[[float], float],
    viscosity: float,
) -> LossTerms:
    """Each term computed and returned separately, never pre-summed."""
    if not collocation:
        raise ShapeMismatch('a PINN needs at least one collocation point')

    residual_loss = math.fsum(
        network.residual(x, t, viscosity) ** 2 for x, t in collocation
    ) / len(collocation)

    boundary_loss = math.fsum(
        network.evaluate(x, t).value ** 2 for x, t in boundary
    ) / max(len(boundary), 1)

    initial_loss = math.fsum(
        (network.evaluate(x, 0.0).value - initial_condition(x)) ** 2 for x in initial
    ) / max(len(initial), 1)

    return LossTerms(residual=residual_loss, boundary=boundary_loss, initial=initial_loss)


def held_out_residual(
    network: PinnNetwork,
    domain: Domain,
    viscosity: float,
    rng: random.Random,
    count: int = 1000,
) -> float:
    """The check that matters, and the one people skip.

    A network can satisfy the equation at its collocation points while being
    badly wrong between them. A low training residual with a high held-out
    residual is exactly that failure, and nothing else reveals it — the loss
    curve looks identical either way.
    """
    points = domain.sample(count, rng)
    return math.fsum(network.residual(x, t, viscosity) ** 2 for x, t in points) / count
`,
        rationale:
          'Two changes carry the weight. Forward-mode automatic differentiation through second-order dual numbers replaces the hand-written derivatives, which is what makes the method general rather than tied to one equation — and writing the arithmetic rules out shows where a hand-rolled version goes wrong, since the second derivative of a product needs a cross term that is easy to omit. The dual seed makes explicit that forward mode carries derivatives with respect to one input at a time, so a two-variable equation costs two forward passes: that is the structural cost of the approach rather than an implementation detail. The second change is that the loss terms are kept separate in a structure with an imbalance ratio, because summing quantities with different units is the central difficulty of the method and a scalar total hides that one constraint has become unconstrained; the adaptive rebalancing then converts a hyperparameter search into a running measurement of gradient magnitudes. Around those, the domain becomes a frozen type that refuses queries outside it — the network is undefined there rather than approximate, and it will still return a confident number — and the activation is checked against the equation order, because a ReLU network makes a second-order residual identically zero and trains happily to a meaningless optimum.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Forward-mode AD costs a constant factor over a plain forward pass — roughly three times for second order — against the two full loss evaluations per parameter that numerical differentiation needed. Illustrative, not a measured benchmark: the change is asymptotic in parameter count, not constant.',
      },

      'make-it-fast': {
        code: `"""Batched collocation and vectorized derivatives. The point loop disappears.

The structural observation: collocation points are entirely independent, so
the whole residual evaluation is one batched forward pass. And because the
network is a composition of smooth functions, the derivative rules vectorize
exactly like the forward pass does - a second derivative is another array
expression, not another loop.

Three changes:
  1. Every point at once. The hidden pre-activations become a matrix and the
     derivative chain rules apply elementwise across it.
  2. Derivative reuse: tanh, its first derivative and its second derivative
     are all functions of the activation alone, so one tanh evaluation serves
     all three and the transcendental is computed once.
  3. Gradient magnitudes per loss term are measured, not guessed, because
     that is what adaptive weighting needs and it is nearly free here.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float64  # PINNs are genuinely precision-sensitive; see the trade-off


class BatchedPinn:
    """One tanh layer, evaluated for every collocation point simultaneously."""

    def __init__(self, width: int, seed: int = 5) -> None:
        rng = np.random.default_rng(seed)
        self.w_x = rng.uniform(-1.0, 1.0, width).astype(FLOAT)
        self.w_t = rng.uniform(-1.0, 1.0, width).astype(FLOAT)
        self.bias = np.zeros(width, dtype=FLOAT)
        self.w_out = rng.uniform(-1.0, 1.0, width).astype(FLOAT)
        self.b_out = FLOAT(0.0)

    def forward_with_derivatives(
        self, x: NDArray[np.float64], t: NDArray[np.float64]
    ) -> tuple[NDArray[np.float64], ...]:
        """u, u_t, u_x and u_xx for every point, in ONE pass.

        The key reuse: for h = tanh(a), both dh/da = 1 - h^2 and
        d2h/da2 = -2h(1 - h^2) are functions of h ALONE. So one tanh
        evaluation - the only transcendental here - serves the value and both
        derivative orders, and the chain rules become elementwise products.
        """
        # (points, width) pre-activations as one outer-product-style GEMM.
        pre = np.outer(x, self.w_x)
        pre += np.outer(t, self.w_t)
        pre += self.bias

        activation = np.tanh(pre)
        # In place, reusing the activation buffer's sibling rather than
        # allocating: first = 1 - h^2, second = -2 h first.
        first = np.square(activation)
        np.subtract(1.0, first, out=first)
        second = activation * first
        second *= -2.0

        value = activation @ self.w_out
        value += self.b_out

        # Each derivative is one contraction: the chain-rule factors are
        # elementwise and the sum over hidden units is a matrix-vector product.
        u_x = (first * self.w_x) @ self.w_out
        u_t = (first * self.w_t) @ self.w_out
        u_xx = (second * self.w_x * self.w_x) @ self.w_out

        return value, u_t, u_x, u_xx

    def residual(
        self, x: NDArray[np.float64], t: NDArray[np.float64], viscosity: float
    ) -> NDArray[np.float64]:
        """u_t + u u_x - nu u_xx, for every collocation point at once.

        This IS the training signal. No label is involved anywhere.
        """
        value, u_t, u_x, u_xx = self.forward_with_derivatives(x, t)
        out = u_t
        out += value * u_x
        out -= viscosity * u_xx
        return out


def loss_terms(
    network: BatchedPinn,
    collocation: tuple[NDArray[np.float64], NDArray[np.float64]],
    boundary: tuple[NDArray[np.float64], NDArray[np.float64]],
    initial_x: NDArray[np.float64],
    initial_values: NDArray[np.float64],
    viscosity: float,
) -> tuple[float, float, float]:
    """Each term computed separately and never pre-summed.

    Returning a scalar total is the mistake that makes PINNs hard to debug: a
    falling total is compatible with one term being entirely unconstrained.
    """
    residual = network.residual(*collocation, viscosity)
    # einsum contracts the squared norm in one pass rather than squaring into
    # a temporary and summing it.
    residual_loss = np.einsum('i,i->', residual, residual) / residual.size

    boundary_value, *_ = network.forward_with_derivatives(*boundary)
    boundary_loss = np.einsum('i,i->', boundary_value, boundary_value) / boundary_value.size

    initial_value, *_ = network.forward_with_derivatives(
        initial_x, np.zeros_like(initial_x)
    )
    initial_value -= initial_values
    initial_loss = np.einsum('i,i->', initial_value, initial_value) / initial_value.size

    return float(residual_loss), float(boundary_loss), float(initial_loss)


def gradient_magnitudes(
    network: BatchedPinn,
    collocation: tuple[NDArray[np.float64], NDArray[np.float64]],
    boundary: tuple[NDArray[np.float64], NDArray[np.float64]],
    viscosity: float,
) -> tuple[float, float]:
    """Typical gradient magnitude per loss term, for adaptive weighting.

    This is what turns loss weighting from a hyperparameter search into a
    measurement. The terms carry different units - the residual is in du/dt,
    the boundary term is in u - so their gradients routinely differ by orders
    of magnitude and a fixed weighting silently chooses which one is enforced.
    """
    residual = network.residual(*collocation, viscosity)
    boundary_value, *_ = network.forward_with_derivatives(*boundary)

    # Proxy: the RMS of each residual scaled by the output-layer magnitude.
    # A full implementation takes the real parameter gradients; the point is
    # that the ratio is measured rather than assumed.
    scale = float(np.abs(network.w_out).max())
    return (
        float(np.sqrt(np.mean(np.square(residual)))) * scale,
        float(np.sqrt(np.mean(np.square(boundary_value)))) * scale,
    )


def rebalance_weights(
    weights: dict[str, float], magnitudes: tuple[float, float], rate: float = 0.1
) -> dict[str, float]:
    """Move each weight toward equalizing gradient contribution.

    The rate is kept small so the balance moves slowly relative to the
    weights it is balancing — a fast rebalance oscillates and is worse than
    no rebalancing at all.
    """
    residual_magnitude, boundary_magnitude = magnitudes
    if boundary_magnitude <= 0.0:
        return weights
    target = residual_magnitude / boundary_magnitude
    weights['boundary'] = (1.0 - rate) * weights['boundary'] + rate * target
    return weights


def latin_hypercube(count: int, bounds: NDArray[np.float64], rng: np.random.Generator) -> NDArray[np.float64]:
    """Stratified collocation sampling rather than uniform.

    Uniform sampling leaves clumps and gaps; a stratified design covers the
    domain far more evenly for the same point count, which matters because
    the residual is only enforced where points are - and the network can be
    badly wrong in a gap while reporting an excellent loss.
    """
    dimensions = bounds.shape[0]
    # One permuted stratum per dimension: the defining property of the design.
    samples = np.empty((count, dimensions), dtype=FLOAT)
    for dimension in range(dimensions):
        strata = (rng.permutation(count) + rng.random(count)) / count
        low, high = bounds[dimension]
        samples[:, dimension] = low + strata * (high - low)
    return samples


def held_out_residual(
    network: BatchedPinn,
    bounds: NDArray[np.float64],
    viscosity: float,
    rng: np.random.Generator,
    count: int = 10_000,
) -> float:
    """The check that matters, and the one people skip.

    A network can satisfy the equation at its collocation points while being
    badly wrong between them. A low training residual with a high held-out
    residual is exactly that failure, and the loss curve looks identical
    either way — this is the only thing that reveals it.
    """
    points = latin_hypercube(count, bounds, rng)
    residual = network.residual(points[:, 0], points[:, 1], viscosity)
    return float(np.einsum('i,i->', residual, residual) / count)
`,
        rationale:
          'The structural observation is that collocation points are entirely independent, so the whole residual evaluation is one batched pass — and because the network is a composition of smooth functions, the derivative chain rules vectorize exactly like the forward pass does, so a second derivative is another array expression rather than another loop. The reuse that matters is that for a tanh unit both the first and second derivatives are functions of the activation alone, so one tanh evaluation — the only transcendental in the whole residual — serves the value and both derivative orders, and each derivative reduces to one elementwise product followed by a matrix-vector contraction. Squared norms use einsum to contract in a single pass rather than squaring into a temporary. Two non-arithmetic changes matter as much: gradient magnitudes per loss term are measured rather than guessed, which is what turns loss weighting from a hyperparameter search into a running measurement, and collocation sampling becomes stratified rather than uniform, because uniform sampling leaves gaps and the network can be badly wrong in a gap while reporting an excellent loss. The dtype stays float64 deliberately, which is the one place this model differs from almost everything else in this reference.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Pre-activations for every collocation point are one outer-product construction, each derivative is one contraction over the hidden axis, and the squared norms contract in a single einsum pass.',
            tradeoff: 'The pre-activation matrix is points times width in float64, so a hundred thousand collocation points against a wide network is the dominant memory cost and forces chunking — which then reintroduces a Python loop over chunks.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'One tanh evaluation serves the value and both derivative orders, since each derivative is a function of the activation alone, and the residual accumulates in place into the u_t buffer.',
            tradeoff: 'The u_t array is destroyed to become the residual, so a diagnostic that wants to see which term of the equation dominates the violation — the natural question when a PINN converges to something wrong — needs an unfused pass.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The derivative factors are computed through existing buffers with out parameters, so a residual evaluation allocates only the pre-activation matrix.',
            tradeoff: 'The activation buffer is consumed by the derivative computation, so the raw activations are unavailable afterwards — and a saturated tanh, which is why a PINN stops learning, is only visible in those.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'A single dtype throughout keeps every contraction on the BLAS fast path, and points-by-width row-major matches how the derivative reductions read.',
            tradeoff: 'The dtype is float64 rather than the float32 used elsewhere in this reference, and deliberately: the residual is a difference of derivative terms that nearly cancel, so float32 loses most of its significant digits exactly where the signal is — the memory and bandwidth cost is doubled and it is not optional.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'A residual evaluation becomes one outer product, one tanh and three contractions for every collocation point at once. Illustrative, not a measured benchmark: against numerical differentiation over parameters this is not a constant-factor improvement but an asymptotic one, since that version cost two full loss evaluations per parameter.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A PINN for Burgers' equation, with the derivatives written out by hand.
//
// The equation:
//   u_t + u * u_x - nu * u_xx = 0     on x in [-1, 1], t in [0, 1]
//   u(x, 0) = -sin(pi x)               initial condition
//   u(-1, t) = u(1, t) = 0             boundary conditions
//
// The loss is the residual of that equation at COLLOCATION POINTS - locations
// where nothing was ever measured - plus the boundary and initial conditions.
// In the forward problem there is no data anywhere.
//
// A real implementation gets u_x and u_xx from automatic differentiation.
// Here they are differentiated by hand, which is only possible because the
// network is one tanh layer - and which makes visible exactly what the
// residual needs: derivatives with respect to the INPUTS, not the parameters.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;

constexpr double kPi = 3.14159265358979323846;
const double kViscosity = 0.01 / kPi;

struct Params {
  Vector w_x;
  Vector w_t;
  Vector bias;
  Vector w_out;
  double b_out{};
};

// u(x, t) through one tanh layer, returning the hidden activations too.
//
// The activations come back because every derivative below reuses them -
// recomputing the forward pass for each derivative would triple the cost of
// the residual.
double Forward(double x, double t, const Params& params, Vector* hidden) {
  hidden->resize(params.w_x.size());
  double value = params.b_out;

  for (std::size_t i = 0; i < params.w_x.size(); ++i) {
    const double pre = params.w_x[i] * x + params.w_t[i] * t + params.bias[i];
    (*hidden)[i] = std::tanh(pre);
    value += params.w_out[i] * (*hidden)[i];
  }
  return value;
}

// u_t, u_x and u_xx by the chain rule, using the cached activations.
//
// For h = tanh(a):  dh/da = 1 - h^2,  d2h/da2 = -2h(1 - h^2)
//
// Both are functions of h alone, which is why the hidden state is enough. The
// ACTIVATION MUST BE SMOOTH to the order of the equation: a ReLU network has
// zero second derivative everywhere, so u_xx is identically zero and a
// second-order residual is trivially satisfied by a meaningless solution.
void Derivatives(const Params& params, const Vector& hidden, double* u_t, double* u_x,
                 double* u_xx) {
  *u_t = 0.0;
  *u_x = 0.0;
  *u_xx = 0.0;

  for (std::size_t i = 0; i < hidden.size(); ++i) {
    const double h = hidden[i];
    const double first = 1.0 - h * h;
    const double second = -2.0 * h * first;

    *u_x += params.w_out[i] * first * params.w_x[i];
    *u_t += params.w_out[i] * first * params.w_t[i];
    *u_xx += params.w_out[i] * second * params.w_x[i] * params.w_x[i];
  }
}

// How badly the network violates the equation at one point.
// This IS the training signal. No label is involved anywhere.
double Residual(double x, double t, const Params& params) {
  Vector hidden;
  const double value = Forward(x, t, params, &hidden);
  double u_t = 0.0;
  double u_x = 0.0;
  double u_xx = 0.0;
  Derivatives(params, hidden, &u_t, &u_x, &u_xx);
  return u_t + value * u_x - kViscosity * u_xx;
}

double InitialCondition(double x) { return -std::sin(kPi * x); }

// Three terms with DIFFERENT UNITS, summed.
//
// That summation is the central difficulty of the whole method. The residual
// term carries units of du/dt; the boundary term carries units of u. Their
// gradients routinely differ by orders of magnitude, so the weights are not a
// regularization choice - they determine which constraint the optimizer
// actually respects.
struct LossTerms {
  double residual{};
  double boundary{};
  double initial{};
};

LossTerms ComputeLoss(const Params& params,
                      const std::vector<std::pair<double, double>>& collocation,
                      const std::vector<std::pair<double, double>>& boundary,
                      const Vector& initial) {
  LossTerms terms;
  Vector hidden;

  for (std::size_t i = 0; i < collocation.size(); ++i) {
    const double r = Residual(collocation[i].first, collocation[i].second, params);
    terms.residual += r * r;
  }
  terms.residual /= static_cast<double>(collocation.size());

  for (std::size_t i = 0; i < boundary.size(); ++i) {
    const double value =
        Forward(boundary[i].first, boundary[i].second, params, &hidden);
    terms.boundary += value * value;  // u = 0 on both boundaries
  }
  terms.boundary /= static_cast<double>(boundary.size());

  for (std::size_t i = 0; i < initial.size(); ++i) {
    const double difference =
        Forward(initial[i], 0.0, params, &hidden) - InitialCondition(initial[i]);
    terms.initial += difference * difference;
  }
  terms.initial /= static_cast<double>(initial.size());

  return terms;
}

double WeightedTotal(const LossTerms& terms, double w_residual, double w_boundary,
                     double w_initial) {
  return w_residual * terms.residual + w_boundary * terms.boundary +
         w_initial * terms.initial;
}

// Finite differences over the parameters.
//
// Enormously wasteful - two full loss evaluations per parameter - and here
// only to keep the mechanism visible. Note the nesting this exposes: the loss
// already contains derivatives with respect to the INPUTS, so a real
// implementation differentiates through those to get parameter gradients,
// which is why a PINN step costs several times a regression step.
double NumericalGradient(Params& params, double* parameter,
                         const std::vector<std::pair<double, double>>& collocation,
                         const std::vector<std::pair<double, double>>& boundary,
                         const Vector& initial, double epsilon = 1e-6) {
  const double original = *parameter;

  *parameter = original + epsilon;
  const double high = WeightedTotal(ComputeLoss(params, collocation, boundary, initial),
                                    1.0, 1.0, 1.0);
  *parameter = original - epsilon;
  const double low = WeightedTotal(ComputeLoss(params, collocation, boundary, initial),
                                   1.0, 1.0, 1.0);
  *parameter = original;

  return (high - low) / (2.0 * epsilon);
}

// The check that matters, and the one people skip.
//
// A network can satisfy the equation at its collocation points while being
// badly wrong between them. A low TRAINING residual with a high held-out
// residual is exactly that failure, and nothing else reveals it.
double HeldOutResidual(const Params& params, std::mt19937& rng, std::size_t count) {
  std::uniform_real_distribution<double> space(-1.0, 1.0);
  std::uniform_real_distribution<double> time(0.0, 1.0);

  double total = 0.0;
  for (std::size_t i = 0; i < count; ++i) {
    const double r = Residual(space(rng), time(rng), params);
    total += r * r;
  }
  return total / static_cast<double>(count);
}
`,
        profile:
          'O(N_c * W) per loss evaluation, multiplied by two evaluations per parameter for the finite-difference gradient — so O(N_c * W^2) per step. Illustrative, not a measured benchmark: the quadratic factor is entirely an artifact of numerical differentiation, and it is what makes the literal version unusable past a handful of hidden units.',
      },

      'make-it-right': {
        code: `// The same PINN, with the loss terms as a type and the weighting measured.
//
// Two things change. Forward-mode automatic differentiation through
// second-order dual numbers replaces the hand-written derivatives, which is
// what makes the method general rather than tied to one equation. And the
// loss terms become a structure that keeps them separate, because summing
// quantities with different units is the central difficulty here and a scalar
// total hides which constraint is actually being enforced.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace pinn {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the failure is silent and total: a ReLU network has
// zero second derivative everywhere, so a second-order residual is identically
// zero and the model trains happily to a meaningless optimum.
class NonSmoothActivation : public std::invalid_argument {
 public:
  explicit NonSmoothActivation(const std::string& what)
      : std::invalid_argument(what) {}
};

// Outside its collocation region the network is not approximate - it is
// undefined. It will still return a confident number, which is why this is
// checked rather than trusted.
class DomainViolation : public std::out_of_range {
 public:
  explicit DomainViolation(const std::string& what) : std::out_of_range(what) {}
};

// A second-order dual number: value, first derivative, second derivative.
//
// Forward-mode automatic differentiation, carried explicitly. This is what
// replaces hand-differentiating the network: the arithmetic rules below
// propagate derivatives through any composition, so the residual can be
// written for ANY equation rather than only the one it was derived for.
struct Dual {
  double value{};
  double first{};
  double second{};

  friend Dual operator+(const Dual& a, const Dual& b) noexcept {
    return {a.value + b.value, a.first + b.first, a.second + b.second};
  }

  friend Dual operator+(const Dual& a, double b) noexcept {
    return {a.value + b, a.first, a.second};
  }

  friend Dual operator*(const Dual& a, double b) noexcept {
    return {a.value * b, a.first * b, a.second * b};
  }

  friend Dual operator*(const Dual& a, const Dual& b) noexcept {
    // Product rule, and the second derivative of a product needs the cross
    // term - the place a hand-rolled implementation goes wrong.
    return {a.value * b.value, a.first * b.value + a.value * b.first,
            a.second * b.value + 2.0 * a.first * b.first + a.value * b.second};
  }
};

[[nodiscard]] inline Dual Tanh(const Dual& a) noexcept {
  const double activation = std::tanh(a.value);
  const double first = 1.0 - activation * activation;
  const double second = -2.0 * activation * first;
  // Chain rule to second order: (f o g)'' = f''(g) g'^2 + f'(g) g''
  return {activation, first * a.first, second * a.first * a.first + first * a.second};
}

// The region the network is valid on. A hard edge, not a soft one.
struct Domain {
  double x_min{-1.0};
  double x_max{1.0};
  double t_min{0.0};
  double t_max{1.0};

  void Validate() const {
    if (x_min >= x_max || t_min >= t_max) {
      throw ShapeMismatch("domain bounds must be strictly increasing");
    }
  }

  [[nodiscard]] bool Contains(double x, double t) const noexcept {
    return x >= x_min && x <= x_max && t >= t_min && t <= t_max;
  }

  // Guard clause: outside the domain the network is undefined, not
  // approximate — and it will still return a confident number.
  void AssertContains(double x, double t) const {
    if (!Contains(x, t)) {
      throw DomainViolation(
          "query point lies outside the trained domain; the network has no "
          "validity there and extrapolation is not supported");
    }
  }
};

// Each term kept separate, with its weight.
//
// Returning a scalar total is the mistake that makes PINNs hard to debug: a
// falling total is compatible with one term being entirely unconstrained, and
// tracking the terms separately is the cheapest diagnostic available.
struct LossTerms {
  double residual{};
  double boundary{};
  double initial{};
  double data{};

  // How far apart the terms are. Above a couple of orders of magnitude the
  // smaller ones are effectively unconstrained.
  [[nodiscard]] double ImbalanceRatio() const noexcept {
    const double values[] = {residual, boundary, initial, data};
    double high = 0.0;
    double low = std::numeric_limits<double>::infinity();
    for (const double value : values) {
      if (value <= 0.0) {
        continue;
      }
      high = std::max(high, value);
      low = std::min(low, value);
    }
    return low == std::numeric_limits<double>::infinity() ? 1.0 : high / low;
  }
};

// Not a regularization knob - a determination of which constraint holds.
//
// The terms carry different units: the residual is in du/dt, the boundary
// term is in u. Their gradients routinely differ by orders of magnitude, so
// the weights choose the answer rather than tuning it.
struct LossWeights {
  double residual{1.0};
  double boundary{1.0};
  double initial{1.0};
  double data{1.0};

  [[nodiscard]] double Total(const LossTerms& terms) const noexcept {
    return residual * terms.residual + boundary * terms.boundary +
           initial * terms.initial + data * terms.data;
  }

  // Adaptive weighting from measured gradient magnitudes.
  //
  // Converts a hyperparameter search into a running measurement. The rate is
  // kept small so the balance moves slowly relative to the weights it is
  // balancing - a fast rebalance oscillates and is worse than none.
  void Rebalance(const LossTerms& gradient_norms, double rate = 0.1) noexcept {
    if (gradient_norms.residual <= 0.0) {
      return;
    }
    const auto blend = [&](double& weight, double observed) {
      if (observed > 0.0) {
        weight = (1.0 - rate) * weight + rate * (gradient_norms.residual / observed);
      }
    };
    blend(boundary, gradient_norms.boundary);
    blend(initial, gradient_norms.initial);
    blend(data, gradient_norms.data);
  }
};

// One tanh layer, evaluated through dual numbers for exact derivatives.
class Network {
 public:
  Network(std::size_t width, Domain domain, std::string_view activation, unsigned seed)
      : domain_(domain), w_x_(width), w_t_(width), bias_(width, 0.0), w_out_(width) {
    domain_.Validate();
    // Guard clause for the failure with no other symptom.
    if (activation != "tanh" && activation != "sin" && activation != "gelu") {
      throw NonSmoothActivation(
          "activation is not smooth enough for a second-order equation; a ReLU "
          "network has zero second derivative and the residual becomes "
          "identically zero");
    }

    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> uniform(-1.0, 1.0);
    for (std::size_t i = 0; i < width; ++i) {
      w_x_[i] = uniform(rng);
      w_t_[i] = uniform(rng);
      w_out_[i] = uniform(rng);
    }
  }

  // u(x, t) as a dual number, carrying derivatives in x OR t.
  //
  // The seed determines which variable is differentiated: first derivative
  // one, second derivative zero for the variable of interest, both zero for
  // the other. That is the whole of forward-mode AD.
  [[nodiscard]] Dual Evaluate(double x, double t, bool differentiate_in_x) const {
    const Dual x_dual{x, differentiate_in_x ? 1.0 : 0.0, 0.0};
    const Dual t_dual{t, differentiate_in_x ? 0.0 : 1.0, 0.0};

    Dual total{b_out_, 0.0, 0.0};
    for (std::size_t i = 0; i < w_x_.size(); ++i) {
      const Dual pre = x_dual * w_x_[i] + t_dual * w_t_[i] + bias_[i];
      total = total + Tanh(pre) * w_out_[i];
    }
    return total;
  }

  // u_t + u u_x - nu u_xx, from two dual evaluations.
  //
  // Two passes rather than one: forward-mode AD carries derivatives with
  // respect to one input at a time, so a two-variable equation costs two
  // forward passes. That is the structural cost of the method, and it is why
  // reverse mode is preferred for many inputs and forward mode here.
  [[nodiscard]] double Residual(double x, double t, double viscosity) const {
    domain_.AssertContains(x, t);
    const Dual in_x = Evaluate(x, t, true);
    const Dual in_t = Evaluate(x, t, false);
    return in_t.first + in_x.value * in_x.first - viscosity * in_x.second;
  }

  [[nodiscard]] const Domain& domain() const noexcept { return domain_; }

 private:
  Domain domain_;
  std::vector<double> w_x_;  // rule of zero: owning members only
  std::vector<double> w_t_;
  std::vector<double> bias_;
  std::vector<double> w_out_;
  double b_out_{0.0};
};

// The check that matters, and the one people skip.
//
// A network can satisfy the equation at its collocation points while being
// badly wrong between them. A low training residual with a high held-out
// residual is exactly that failure, and the loss curve looks identical either
// way - this is the only thing that reveals it.
[[nodiscard]] inline double HeldOutResidual(const Network& network, double viscosity,
                                            std::mt19937& rng, std::size_t count) {
  const Domain& domain = network.domain();
  std::uniform_real_distribution<double> space(domain.x_min, domain.x_max);
  std::uniform_real_distribution<double> time(domain.t_min, domain.t_max);

  double total = 0.0;
  for (std::size_t i = 0; i < count; ++i) {
    const double r = network.Residual(space(rng), time(rng), viscosity);
    total += r * r;
  }
  return total / static_cast<double>(count);
}

}  // namespace pinn
`,
        rationale:
          'Two changes carry the weight. Forward-mode automatic differentiation through second-order dual numbers replaces the hand-written derivatives, which is what makes the method general rather than tied to one equation — and writing the arithmetic rules out shows where a hand-rolled version goes wrong, since the second derivative of a product needs a cross term that is easy to omit. The dual seed makes explicit that forward mode carries derivatives with respect to one input at a time, so a two-variable equation costs two forward passes: that is the structural cost of the approach rather than an implementation detail, and it is why reverse mode is preferred when there are many inputs and forward mode when there are few. The second change is that the loss terms are kept separate with an imbalance ratio, because summing quantities with different units is the central difficulty and a scalar total hides that one constraint has become unconstrained; the adaptive rebalancing then converts a hyperparameter search into a running measurement. Around those, the domain becomes a type that refuses queries outside it — the network is undefined there rather than approximate — and the activation is checked against the equation order.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Forward-mode AD costs a constant factor over a plain forward pass — roughly three times for second order — against the two full loss evaluations per parameter that numerical differentiation needed. Illustrative, not a measured benchmark: the change is asymptotic in parameter count, not constant.',
      },

      'make-it-fast': {
        code: `// Batched collocation and vectorized derivatives. The point loop disappears.
//
// The structural observation: collocation points are entirely independent, so
// the whole residual evaluation is one batched forward pass. And because the
// network is a composition of smooth functions, the derivative rules vectorize
// exactly like the forward pass does - a second derivative is another array
// expression, not another loop.
//
// Three changes:
//   1. Every point at once. The pre-activations become a matrix and the
//      derivative chain rules apply elementwise across it.
//   2. Derivative reuse: tanh, its first derivative and its second derivative
//      are all functions of the activation alone, so one tanh evaluation
//      serves all three and the transcendental is computed once.
//   3. The dtype stays DOUBLE, deliberately - see the trade-off. The residual
//      is a difference of nearly cancelling derivative terms, and float32
//      loses most of its significant digits exactly where the signal is.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace pinn {

// One tanh layer, evaluated for every collocation point simultaneously.
class BatchedNetwork {
 public:
  BatchedNetwork(int max_points, int width)
      : width_(width),
        w_x_(static_cast<std::size_t>(width)),
        w_t_(static_cast<std::size_t>(width)),
        bias_(static_cast<std::size_t>(width), 0.0),
        w_out_(static_cast<std::size_t>(width)),
        pre_(static_cast<std::size_t>(max_points) * width),
        activation_(static_cast<std::size_t>(max_points) * width),
        first_(static_cast<std::size_t>(max_points) * width),
        second_(static_cast<std::size_t>(max_points) * width),
        scratch_(static_cast<std::size_t>(max_points) * width) {}

  // u, u_t, u_x and u_xx for every point, in ONE pass.
  //
  // The key reuse: for h = tanh(a), both dh/da = 1 - h^2 and
  // d2h/da2 = -2h(1 - h^2) are functions of h ALONE. So one tanh evaluation -
  // the only transcendental here - serves the value and both derivative
  // orders, and the chain rules become elementwise products.
  void ForwardWithDerivatives(const double* __restrict x, const double* __restrict t,
                              int points, double* __restrict value,
                              double* __restrict u_t, double* __restrict u_x,
                              double* __restrict u_xx) {
    // Pre-activations as two rank-one updates: x outer w_x plus t outer w_t.
    // A GEMM would need the inputs stacked into a (points x 2) matrix; two
    // GERs avoid that copy entirely.
#pragma omp parallel for schedule(static)
    for (int p = 0; p < points; ++p) {
      double* row = pre_.data() + static_cast<std::size_t>(p) * width_;
      const double xp = x[p];
      const double tp = t[p];
      for (int i = 0; i < width_; ++i) {
        row[i] = w_x_[i] * xp + w_t_[i] * tp + bias_[i];
      }
    }

    // One tanh pass, then both derivative factors from the activation alone.
#pragma omp parallel for schedule(static)
    for (std::size_t index = 0; index < static_cast<std::size_t>(points) * width_; ++index) {
      const double h = std::tanh(pre_[index]);
      activation_[index] = h;
      const double first = 1.0 - h * h;
      first_[index] = first;
      second_[index] = -2.0 * h * first;
    }

    // Each output is one matrix-vector product over the hidden axis.
    cblas_dgemv(CblasRowMajor, CblasNoTrans, points, width_, 1.0, activation_.data(),
                width_, w_out_.data(), 1, 0.0, value, 1);
    for (int p = 0; p < points; ++p) {
      value[p] += b_out_;
    }

    Contract(first_, w_x_, points, u_x);
    Contract(first_, w_t_, points, u_t);

    // u_xx needs the second-derivative factor weighted by w_x squared, so the
    // scaling folds into the vector rather than into the matrix.
    std::vector<double> w_x_squared(static_cast<std::size_t>(width_));
    for (int i = 0; i < width_; ++i) {
      w_x_squared[static_cast<std::size_t>(i)] = w_x_[i] * w_x_[i] * w_out_[i];
    }
    cblas_dgemv(CblasRowMajor, CblasNoTrans, points, width_, 1.0, second_.data(), width_,
                w_x_squared.data(), 1, 0.0, u_xx, 1);
  }

  // u_t + u u_x - nu u_xx for every collocation point at once.
  // This IS the training signal. No label is involved anywhere.
  void Residual(const double* __restrict x, const double* __restrict t, int points,
                double viscosity, double* __restrict out) {
    std::vector<double> value(static_cast<std::size_t>(points));
    std::vector<double> u_t(static_cast<std::size_t>(points));
    std::vector<double> u_x(static_cast<std::size_t>(points));
    ForwardWithDerivatives(x, t, points, value.data(), u_t.data(), u_x.data(), out);

    // Fused: the residual is assembled in one pass over the three terms, so
    // no intermediate combination is materialized.
#pragma omp parallel for schedule(static)
    for (int p = 0; p < points; ++p) {
      out[p] = u_t[p] + value[p] * u_x[p] - viscosity * out[p];
    }
  }

 private:
  void Contract(const std::vector<double>& factor, const std::vector<double>& weight,
                int points, double* __restrict out) {
    std::vector<double> combined(static_cast<std::size_t>(width_));
    for (int i = 0; i < width_; ++i) {
      combined[static_cast<std::size_t>(i)] = weight[static_cast<std::size_t>(i)] *
                                              w_out_[static_cast<std::size_t>(i)];
    }
    cblas_dgemv(CblasRowMajor, CblasNoTrans, points, width_, 1.0, factor.data(), width_,
                combined.data(), 1, 0.0, out, 1);
  }

  int width_;
  std::vector<double> w_x_;
  std::vector<double> w_t_;
  std::vector<double> bias_;
  std::vector<double> w_out_;
  double b_out_{0.0};
  std::vector<double> pre_;
  std::vector<double> activation_;
  std::vector<double> first_;
  std::vector<double> second_;
  std::vector<double> scratch_;
};

// Stratified collocation sampling rather than uniform.
//
// Uniform sampling leaves clumps and gaps; a stratified design covers the
// domain far more evenly for the same point count, which matters because the
// residual is only enforced where points are - and the network can be badly
// wrong in a gap while reporting an excellent loss.
inline void LatinHypercube(int count, double low, double high, std::mt19937& rng,
                           std::span<double> out) {
  std::vector<int> permutation(static_cast<std::size_t>(count));
  std::iota(permutation.begin(), permutation.end(), 0);
  std::shuffle(permutation.begin(), permutation.end(), rng);

  std::uniform_real_distribution<double> jitter(0.0, 1.0);
  for (int i = 0; i < count; ++i) {
    // One permuted stratum per point: the defining property of the design.
    const double stratum =
        (static_cast<double>(permutation[static_cast<std::size_t>(i)]) + jitter(rng)) /
        static_cast<double>(count);
    out[static_cast<std::size_t>(i)] = low + stratum * (high - low);
  }
}

// The check that matters, and the one people skip.
//
// A network can satisfy the equation at its collocation points while being
// badly wrong between them. A low training residual with a high held-out
// residual is exactly that failure, and the loss curve looks identical either
// way - this is the only thing that reveals it.
[[nodiscard]] inline double HeldOutResidual(BatchedNetwork& network,
                                            std::span<const double> x,
                                            std::span<const double> t, double viscosity) {
  std::vector<double> residual(x.size());
  network.Residual(x.data(), t.data(), static_cast<int>(x.size()), viscosity,
                   residual.data());

  double total = 0.0;
#pragma omp parallel for reduction(+ : total) schedule(static)
  for (std::size_t i = 0; i < residual.size(); ++i) {
    total += residual[i] * residual[i];
  }
  return total / static_cast<double>(residual.size());
}

}  // namespace pinn
`,
        rationale:
          'The structural observation is that collocation points are entirely independent, so the whole residual evaluation is one batched pass — and because the network is a composition of smooth functions, the derivative chain rules vectorize exactly like the forward pass does, so a second derivative is another array expression rather than another loop. The reuse that matters is that for a tanh unit both the first and second derivatives are functions of the activation alone, so one tanh evaluation — the only transcendental in the whole residual — serves the value and both derivative orders, and each output then reduces to one matrix-vector product over the hidden axis. The pre-activations are built as two rank-one updates rather than a GEMM, since a GEMM would require stacking the two input coordinates into a matrix and that copy costs more than it saves at width two. The residual is assembled in one fused pass over the three terms so no intermediate combination is materialized. The dtype stays double, deliberately and against the pattern everywhere else in this reference, because the residual is a difference of nearly cancelling derivative terms and single precision loses most of its significant digits exactly where the signal lives.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The value and all three derivative outputs are matrix-vector products over the hidden axis, with the chain-rule scaling folded into the vector operand rather than applied to the matrix.',
            tradeoff: 'Folding the scaling into the vector means building a small combined weight array on every call, which on a narrow network costs more than the GEMV it feeds — the fold only pays once the point count is large.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'One tanh pass produces the activation and both derivative factors together, and the residual is assembled from its three terms in a single traversal.',
            tradeoff: 'The u_xx buffer is overwritten to become the residual, so a diagnostic that wants to see which term of the equation dominates the violation — the natural question when a PINN converges to something wrong — needs an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The pre-activation construction, the fused tanh-and-derivative pass and the residual assembly are all point-independent with no shared writes.',
            tradeoff: 'These passes are memory-bound and interleave with the GEMV calls, so threading both competes for bandwidth — and the four full-size derivative buffers mean this stage is bandwidth-bound long before it is compute-bound.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Points-by-width row-major matches how both the fused derivative pass and the GEMV reductions read, so every access is stride-one.',
            tradeoff: 'The layout holds four points-by-width double buffers simultaneously, so a hundred thousand collocation points against a wide network is the dominant memory cost — and it is double precision because the residual demands it, doubling that footprint.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'A residual evaluation becomes one tanh pass and four matrix-vector products for every collocation point at once. Illustrative, not a measured benchmark: against numerical differentiation over parameters this is not a constant-factor improvement but an asymptotic one, since that version cost two full loss evaluations per parameter.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// A PINN for Burgers' equation, with the derivatives written out by hand.
//
// The equation:
//   u_t + u * u_x - nu * u_xx = 0     on x in [-1, 1], t in [0, 1]
//   u(x, 0) = -sin(pi x)               initial condition
//   u(-1, t) = u(1, t) = 0             boundary conditions
//
// The loss is the residual of that equation at COLLOCATION POINTS - locations
// where nothing was ever measured - plus the boundary and initial conditions.
// In the forward problem there is no data anywhere.
//
// A real implementation gets u_x and u_xx from automatic differentiation.
// Here they are differentiated by hand, which is only possible because the
// network is one tanh layer - and which makes visible exactly what the
// residual needs: derivatives with respect to the INPUTS, not the parameters.

use std::f64::consts::PI;

const VISCOSITY: f64 = 0.01 / PI;

struct Params {
    w_x: Vec<f64>,
    w_t: Vec<f64>,
    bias: Vec<f64>,
    w_out: Vec<f64>,
    b_out: f64,
}

/// u(x, t) through one tanh layer, returning the hidden activations too.
///
/// The activations come back because every derivative below reuses them -
/// recomputing the forward pass for each derivative would triple the cost of
/// the residual.
fn forward(x: f64, t: f64, params: &Params) -> (f64, Vec<f64>) {
    let mut hidden = vec![0.0_f64; params.w_x.len()];
    let mut value = params.b_out;

    for i in 0..params.w_x.len() {
        let pre = params.w_x[i] * x + params.w_t[i] * t + params.bias[i];
        hidden[i] = pre.tanh();
        value += params.w_out[i] * hidden[i];
    }
    (value, hidden)
}

/// u_t, u_x and u_xx by the chain rule, using the cached activations.
///
/// For h = tanh(a):  dh/da = 1 - h^2,  d2h/da2 = -2h(1 - h^2)
///
/// Both are functions of h alone, which is why the hidden state is enough. The
/// ACTIVATION MUST BE SMOOTH to the order of the equation: a ReLU network has
/// zero second derivative everywhere, so u_xx is identically zero and a
/// second-order residual is trivially satisfied by a meaningless solution.
fn derivatives(params: &Params, hidden: &[f64]) -> (f64, f64, f64) {
    let mut u_t = 0.0;
    let mut u_x = 0.0;
    let mut u_xx = 0.0;

    for i in 0..hidden.len() {
        let h = hidden[i];
        let first = 1.0 - h * h;
        let second = -2.0 * h * first;

        u_x += params.w_out[i] * first * params.w_x[i];
        u_t += params.w_out[i] * first * params.w_t[i];
        u_xx += params.w_out[i] * second * params.w_x[i] * params.w_x[i];
    }
    (u_t, u_x, u_xx)
}

/// How badly the network violates the equation at one point.
/// This IS the training signal. No label is involved anywhere.
fn residual(x: f64, t: f64, params: &Params) -> f64 {
    let (value, hidden) = forward(x, t, params);
    let (u_t, u_x, u_xx) = derivatives(params, &hidden);
    u_t + value * u_x - VISCOSITY * u_xx
}

fn initial_condition(x: f64) -> f64 {
    -(PI * x).sin()
}

/// Three terms with DIFFERENT UNITS, summed.
///
/// That summation is the central difficulty of the whole method. The residual
/// term carries units of du/dt; the boundary term carries units of u. Their
/// gradients routinely differ by orders of magnitude, so the weights are not a
/// regularization choice - they determine which constraint the optimizer
/// actually respects.
struct LossTerms {
    residual: f64,
    boundary: f64,
    initial: f64,
}

fn compute_loss(
    params: &Params,
    collocation: &[(f64, f64)],
    boundary: &[(f64, f64)],
    initial: &[f64],
) -> LossTerms {
    let residual_loss = collocation
        .iter()
        .map(|&(x, t)| {
            let r = residual(x, t, params);
            r * r
        })
        .sum::<f64>()
        / collocation.len() as f64;

    let boundary_loss = boundary
        .iter()
        .map(|&(x, t)| {
            let (value, _) = forward(x, t, params);
            value * value // u = 0 on both boundaries
        })
        .sum::<f64>()
        / boundary.len() as f64;

    let initial_loss = initial
        .iter()
        .map(|&x| {
            let (value, _) = forward(x, 0.0, params);
            let difference = value - initial_condition(x);
            difference * difference
        })
        .sum::<f64>()
        / initial.len() as f64;

    LossTerms { residual: residual_loss, boundary: boundary_loss, initial: initial_loss }
}

fn weighted_total(terms: &LossTerms, w_residual: f64, w_boundary: f64, w_initial: f64) -> f64 {
    w_residual * terms.residual + w_boundary * terms.boundary + w_initial * terms.initial
}

/// Finite differences over the parameters.
///
/// Enormously wasteful - two full loss evaluations per parameter - and here
/// only to keep the mechanism visible. Note the nesting this exposes: the loss
/// already contains derivatives with respect to the INPUTS, so a real
/// implementation differentiates through those to get parameter gradients,
/// which is why a PINN step costs several times a regression step.
fn numerical_gradient(
    params: &mut Params,
    index: usize,
    collocation: &[(f64, f64)],
    boundary: &[(f64, f64)],
    initial: &[f64],
    epsilon: f64,
) -> f64 {
    let original = params.w_x[index];

    params.w_x[index] = original + epsilon;
    let high = weighted_total(&compute_loss(params, collocation, boundary, initial), 1.0, 1.0, 1.0);
    params.w_x[index] = original - epsilon;
    let low = weighted_total(&compute_loss(params, collocation, boundary, initial), 1.0, 1.0, 1.0);
    params.w_x[index] = original;

    (high - low) / (2.0 * epsilon)
}

/// The check that matters, and the one people skip.
///
/// A network can satisfy the equation at its collocation points while being
/// badly wrong between them. A low TRAINING residual with a high held-out
/// residual is exactly that failure, and nothing else reveals it.
fn held_out_residual(params: &Params, points: &[(f64, f64)]) -> f64 {
    points
        .iter()
        .map(|&(x, t)| {
            let r = residual(x, t, params);
            r * r
        })
        .sum::<f64>()
        / points.len() as f64
}
`,
        profile:
          'O(N_c * W) per loss evaluation, multiplied by two evaluations per parameter for the finite-difference gradient — so O(N_c * W^2) per step. Illustrative, not a measured benchmark: the quadratic factor is entirely an artifact of numerical differentiation, and it is what makes the literal version unusable past a handful of hidden units.',
      },

      'make-it-right': {
        code: `//! The same PINN, with the loss terms as a type and the weighting measured.
//!
//! Two things change. Forward-mode automatic differentiation through
//! second-order dual numbers replaces the hand-written derivatives, which is
//! what makes the method general rather than tied to one equation. And the
//! loss terms become a structure that keeps them separate, because summing
//! quantities with different units is the central difficulty here and a
//! scalar total hides which constraint is actually being enforced.

use std::fmt;
use std::ops::{Add, Mul};

/// Number of collocation points.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct PointCount(pub usize);

/// Hidden-layer width.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Width(pub usize);

#[derive(Debug, PartialEq)]
pub enum PinnError {
    /// The activation cannot support the equation's order.
    ///
    /// Its own variant because the failure is silent and total: a ReLU
    /// network has zero second derivative everywhere, so a second-order
    /// residual is identically zero and the model trains happily to a
    /// meaningless optimum.
    NonSmoothActivation { name: &'static str, order: usize },
    /// A query point outside the trained domain.
    ///
    /// Outside its collocation region the network is not approximate - it is
    /// undefined. It will still return a confident number.
    DomainViolation { x: f64, t: f64 },
    /// Domain bounds that are not strictly increasing.
    DegenerateDomain,
    /// No collocation points, so the equation is enforced nowhere.
    NoCollocation,
}

impl fmt::Display for PinnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonSmoothActivation { name, order } => write!(
                f,
                "{name} is not smooth to order {order}; the residual becomes \
                 identically zero and the model trains to a meaningless optimum"
            ),
            Self::DomainViolation { x, t } => write!(
                f,
                "({x}, {t}) lies outside the trained domain; the network has no \
                 validity there and extrapolation is not supported"
            ),
            Self::DegenerateDomain => write!(f, "domain bounds must be strictly increasing"),
            Self::NoCollocation => write!(f, "a PINN needs at least one collocation point"),
        }
    }
}

impl std::error::Error for PinnError {}

/// A second-order dual number: value, first derivative, second derivative.
///
/// Forward-mode automatic differentiation, carried explicitly. This is what
/// replaces hand-differentiating the network: the arithmetic rules below
/// propagate derivatives through any composition, so the residual can be
/// written for ANY equation rather than only the one it was derived for.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Dual {
    pub value: f64,
    pub first: f64,
    pub second: f64,
}

impl Dual {
    pub fn constant(value: f64) -> Self {
        Self { value, first: 0.0, second: 0.0 }
    }

    /// Seed a variable for differentiation: first derivative one.
    pub fn variable(value: f64) -> Self {
        Self { value, first: 1.0, second: 0.0 }
    }

    pub fn tanh(self) -> Self {
        let activation = self.value.tanh();
        let first = 1.0 - activation * activation;
        let second = -2.0 * activation * first;
        // Chain rule to second order: (f o g)'' = f''(g) g'^2 + f'(g) g''
        Self {
            value: activation,
            first: first * self.first,
            second: second * self.first * self.first + first * self.second,
        }
    }
}

impl Add for Dual {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self {
            value: self.value + other.value,
            first: self.first + other.first,
            second: self.second + other.second,
        }
    }
}

impl Add<f64> for Dual {
    type Output = Self;
    fn add(self, other: f64) -> Self {
        Self { value: self.value + other, ..self }
    }
}

impl Mul<f64> for Dual {
    type Output = Self;
    fn mul(self, other: f64) -> Self {
        Self {
            value: self.value * other,
            first: self.first * other,
            second: self.second * other,
        }
    }
}

impl Mul for Dual {
    type Output = Self;
    fn mul(self, other: Self) -> Self {
        // Product rule, and the second derivative of a product needs the
        // cross term - the place a hand-rolled implementation goes wrong.
        Self {
            value: self.value * other.value,
            first: self.first * other.value + self.value * other.first,
            second: self.second * other.value
                + 2.0 * self.first * other.first
                + self.value * other.second,
        }
    }
}

/// The region the network is valid on. A hard edge, not a soft one.
#[derive(Debug, Clone, Copy)]
pub struct Domain {
    pub x_min: f64,
    pub x_max: f64,
    pub t_min: f64,
    pub t_max: f64,
}

impl Domain {
    pub fn new(x_min: f64, x_max: f64, t_min: f64, t_max: f64) -> Result<Self, PinnError> {
        if x_min >= x_max || t_min >= t_max {
            return Err(PinnError::DegenerateDomain);
        }
        Ok(Self { x_min, x_max, t_min, t_max })
    }

    /// Guard clause: outside the domain the network is undefined, not
    /// approximate — and it will still return a confident number.
    pub fn assert_contains(&self, x: f64, t: f64) -> Result<(), PinnError> {
        if x < self.x_min || x > self.x_max || t < self.t_min || t > self.t_max {
            return Err(PinnError::DomainViolation { x, t });
        }
        Ok(())
    }
}

/// Each term kept separate, with its weight.
///
/// Returning a scalar total is the mistake that makes PINNs hard to debug: a
/// falling total is compatible with one term being entirely unconstrained,
/// and tracking the terms separately is the cheapest diagnostic available.
#[derive(Debug, Clone, Copy, Default)]
pub struct LossTerms {
    pub residual: f64,
    pub boundary: f64,
    pub initial: f64,
    pub data: f64,
}

impl LossTerms {
    /// How far apart the terms are. Above a couple of orders of magnitude the
    /// smaller ones are effectively unconstrained.
    pub fn imbalance_ratio(&self) -> f64 {
        let values = [self.residual, self.boundary, self.initial, self.data];
        let positive: Vec<f64> = values.into_iter().filter(|v| *v > 0.0).collect();
        match (
            positive.iter().copied().fold(f64::NEG_INFINITY, f64::max),
            positive.iter().copied().fold(f64::INFINITY, f64::min),
        ) {
            (high, low) if low > 0.0 && low.is_finite() => high / low,
            _ => 1.0,
        }
    }
}

/// Not a regularization knob - a determination of which constraint holds.
///
/// The terms carry different units: the residual is in du/dt, the boundary
/// term is in u. Their gradients routinely differ by orders of magnitude, so
/// the weights choose the answer rather than tuning it.
#[derive(Debug, Clone, Copy)]
pub struct LossWeights {
    pub residual: f64,
    pub boundary: f64,
    pub initial: f64,
    pub data: f64,
}

impl Default for LossWeights {
    fn default() -> Self {
        Self { residual: 1.0, boundary: 1.0, initial: 1.0, data: 1.0 }
    }
}

impl LossWeights {
    pub fn total(&self, terms: &LossTerms) -> f64 {
        self.residual * terms.residual
            + self.boundary * terms.boundary
            + self.initial * terms.initial
            + self.data * terms.data
    }

    /// Adaptive weighting from measured gradient magnitudes.
    ///
    /// Converts a hyperparameter search into a running measurement. The rate
    /// is kept small so the balance moves slowly relative to the weights it
    /// is balancing - a fast rebalance oscillates and is worse than none.
    pub fn rebalance(&mut self, gradient_norms: &LossTerms, rate: f64) {
        if gradient_norms.residual <= 0.0 {
            return;
        }
        let mut blend = |weight: &mut f64, observed: f64| {
            if observed > 0.0 {
                *weight = (1.0 - rate) * *weight + rate * (gradient_norms.residual / observed);
            }
        };
        blend(&mut self.boundary, gradient_norms.boundary);
        blend(&mut self.initial, gradient_norms.initial);
        blend(&mut self.data, gradient_norms.data);
    }
}

/// One tanh layer, evaluated through dual numbers for exact derivatives.
pub struct Network {
    domain: Domain,
    w_x: Vec<f64>,
    w_t: Vec<f64>,
    bias: Vec<f64>,
    w_out: Vec<f64>,
    b_out: f64,
}

impl Network {
    pub fn new(
        width: Width,
        domain: Domain,
        activation: &'static str,
        weights: Vec<f64>,
    ) -> Result<Self, PinnError> {
        // Guard clause for the failure with no other symptom.
        if !matches!(activation, "tanh" | "sin" | "gelu") {
            return Err(PinnError::NonSmoothActivation { name: activation, order: 2 });
        }
        Ok(Self {
            domain,
            w_x: weights[..width.0].to_vec(),
            w_t: weights[width.0..2 * width.0].to_vec(),
            bias: vec![0.0; width.0],
            w_out: weights[2 * width.0..3 * width.0].to_vec(),
            b_out: 0.0,
        })
    }

    /// u(x, t) as a dual number, carrying derivatives in x OR t.
    ///
    /// The seed determines which variable is differentiated. That is the
    /// whole of forward-mode AD.
    pub fn evaluate(&self, x: f64, t: f64, differentiate_in_x: bool) -> Dual {
        let x_dual = if differentiate_in_x { Dual::variable(x) } else { Dual::constant(x) };
        let t_dual = if differentiate_in_x { Dual::constant(t) } else { Dual::variable(t) };

        self.w_x
            .iter()
            .zip(&self.w_t)
            .zip(&self.bias)
            .zip(&self.w_out)
            .fold(Dual::constant(self.b_out), |total, (((&wx, &wt), &b), &wo)| {
                total + (x_dual * wx + t_dual * wt + b).tanh() * wo
            })
    }

    /// u_t + u u_x - nu u_xx, from two dual evaluations.
    ///
    /// Two passes rather than one: forward-mode AD carries derivatives with
    /// respect to one input at a time, so a two-variable equation costs two
    /// forward passes. That is the structural cost of the method, and it is
    /// why reverse mode is preferred for many inputs and forward mode here.
    pub fn residual(&self, x: f64, t: f64, viscosity: f64) -> Result<f64, PinnError> {
        self.domain.assert_contains(x, t)?;
        let in_x = self.evaluate(x, t, true);
        let in_t = self.evaluate(x, t, false);
        Ok(in_t.first + in_x.value * in_x.first - viscosity * in_x.second)
    }
}

/// The check that matters, and the one people skip.
///
/// A network can satisfy the equation at its collocation points while being
/// badly wrong between them. A low training residual with a high held-out
/// residual is exactly that failure, and the loss curve looks identical
/// either way - this is the only thing that reveals it.
pub fn held_out_residual(
    network: &Network,
    points: &[(f64, f64)],
    viscosity: f64,
) -> Result<f64, PinnError> {
    if points.is_empty() {
        return Err(PinnError::NoCollocation);
    }
    let mut total = 0.0;
    for &(x, t) in points {
        let r = network.residual(x, t, viscosity)?;
        total += r * r;
    }
    Ok(total / points.len() as f64)
}
`,
        rationale:
          'Two changes carry the weight. Forward-mode automatic differentiation through second-order dual numbers replaces the hand-written derivatives, which is what makes the method general rather than tied to one equation — and implementing the operator traits shows where a hand-rolled version goes wrong, since the second derivative of a product needs a cross term that is easy to omit. The dual seed makes explicit that forward mode carries derivatives with respect to one input at a time, so a two-variable equation costs two forward passes: that is the structural cost of the approach, and why reverse mode is preferred when there are many inputs and forward mode when there are few. The second change is that the loss terms are kept separate with an imbalance ratio, because summing quantities with different units is the central difficulty and a scalar total hides that one constraint has become unconstrained; the adaptive rebalancing converts a hyperparameter search into a running measurement. Around those, the domain becomes a type whose check returns an error rather than a bool — outside it the network is undefined rather than approximate — and the activation is validated against the equation order, since a non-smooth one makes the residual identically zero.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Forward-mode AD costs a constant factor over a plain forward pass — roughly three times for second order — against the two full loss evaluations per parameter that numerical differentiation needed. Illustrative, not a measured benchmark: the change is asymptotic in parameter count, not constant.',
      },

      'make-it-fast': {
        code: `//! Batched collocation and vectorized derivatives. The point loop disappears.
//!
//! The structural observation: collocation points are entirely independent,
//! so the whole residual evaluation is one batched forward pass. And because
//! the network is a composition of smooth functions, the derivative rules
//! vectorize exactly like the forward pass does - a second derivative is
//! another array expression, not another loop.
//!
//! Three changes:
//!   1. Every point at once. The pre-activations become a matrix and the
//!      derivative chain rules apply elementwise across it.
//!   2. Derivative reuse: tanh, its first derivative and its second
//!      derivative are all functions of the activation alone, so one tanh
//!      evaluation serves all three.
//!   3. The dtype stays f64, deliberately - see the trade-off. The residual
//!      is a difference of nearly cancelling derivative terms, and f32 loses
//!      most of its significant digits exactly where the signal is.

use ndarray::{Array1, Array2, ArrayView1, Axis, Zip};
use rayon::prelude::*;

/// One tanh layer, evaluated for every collocation point simultaneously.
pub struct BatchedNetwork {
    w_x: Array1<f64>,
    w_t: Array1<f64>,
    bias: Array1<f64>,
    w_out: Array1<f64>,
    b_out: f64,
    /// Scratch sized once at construction, so a residual evaluation allocates
    /// nothing beyond its outputs.
    pre: Array2<f64>,
    activation: Array2<f64>,
    first: Array2<f64>,
    second: Array2<f64>,
}

impl BatchedNetwork {
    pub fn new(max_points: usize, width: usize, weights: Array1<f64>) -> Self {
        Self {
            w_x: weights.slice(ndarray::s![..width]).to_owned(),
            w_t: weights.slice(ndarray::s![width..2 * width]).to_owned(),
            bias: Array1::zeros(width),
            w_out: weights.slice(ndarray::s![2 * width..3 * width]).to_owned(),
            b_out: 0.0,
            pre: Array2::zeros((max_points, width)),
            activation: Array2::zeros((max_points, width)),
            first: Array2::zeros((max_points, width)),
            second: Array2::zeros((max_points, width)),
        }
    }

    /// u, u_t, u_x and u_xx for every point, in ONE pass.
    ///
    /// The key reuse: for h = tanh(a), both dh/da = 1 - h^2 and
    /// d2h/da2 = -2h(1 - h^2) are functions of h ALONE. So one tanh
    /// evaluation - the only transcendental here - serves the value and both
    /// derivative orders, and the chain rules become elementwise products.
    pub fn forward_with_derivatives(
        &mut self,
        x: ArrayView1<'_, f64>,
        t: ArrayView1<'_, f64>,
        points: usize,
    ) -> (Array1<f64>, Array1<f64>, Array1<f64>, Array1<f64>) {
        let mut pre = self.pre.slice_mut(ndarray::s![..points, ..]);

        // Pre-activations as two rank-one updates. A matrix product would
        // need the two coordinates stacked into a (points x 2) operand, and
        // that copy costs more than it saves at width two.
        Zip::from(pre.axis_iter_mut(Axis(0)))
            .and(x)
            .and(t)
            .par_for_each(|mut row, &xp, &tp| {
                for (((slot, &wx), &wt), &b) in row
                    .iter_mut()
                    .zip(self.w_x.iter())
                    .zip(self.w_t.iter())
                    .zip(self.bias.iter())
                {
                    *slot = wx * xp + wt * tp + b;
                }
            });

        // One tanh pass, then both derivative factors from the activation
        // alone - three outputs from a single transcendental.
        let mut activation = self.activation.slice_mut(ndarray::s![..points, ..]);
        let mut first = self.first.slice_mut(ndarray::s![..points, ..]);
        let mut second = self.second.slice_mut(ndarray::s![..points, ..]);

        Zip::from(&mut activation)
            .and(&mut first)
            .and(&mut second)
            .and(&pre)
            .par_for_each(|h_out, first_out, second_out, &a| {
                let h = a.tanh();
                *h_out = h;
                *first_out = 1.0 - h * h;
                *second_out = -2.0 * h * *first_out;
            });

        // Each output is one contraction over the hidden axis, with the
        // chain-rule factors folded into the weight vector rather than
        // applied across the whole matrix.
        let value = activation.dot(&self.w_out) + self.b_out;
        let u_x = first.dot(&(&self.w_x * &self.w_out));
        let u_t = first.dot(&(&self.w_t * &self.w_out));
        let u_xx = second.dot(&(&self.w_x * &self.w_x * &self.w_out));

        (value, u_t, u_x, u_xx)
    }

    /// u_t + u u_x - nu u_xx for every collocation point at once.
    /// This IS the training signal. No label is involved anywhere.
    pub fn residual(
        &mut self,
        x: ArrayView1<'_, f64>,
        t: ArrayView1<'_, f64>,
        points: usize,
        viscosity: f64,
    ) -> Array1<f64> {
        let (value, mut u_t, u_x, u_xx) = self.forward_with_derivatives(x, t, points);

        // Fused: the residual is assembled in one pass over the three terms
        // into the u_t buffer, so no intermediate combination is created.
        Zip::from(&mut u_t)
            .and(&value)
            .and(&u_x)
            .and(&u_xx)
            .par_for_each(|out, &u, &ux, &uxx| {
                *out += u * ux - viscosity * uxx;
            });
        u_t
    }
}

/// Each term computed separately and never pre-summed.
///
/// Returning a scalar total is the mistake that makes PINNs hard to debug: a
/// falling total is compatible with one term being entirely unconstrained.
pub struct LossTerms {
    pub residual: f64,
    pub boundary: f64,
    pub initial: f64,
}

pub fn mean_square(values: &Array1<f64>) -> f64 {
    // Parallel reduction rather than a sequential fold: the residual array is
    // the largest thing in the step and this is a full pass over it.
    values.as_slice().map_or(0.0, |slice| {
        slice.par_iter().map(|v| v * v).sum::<f64>() / slice.len() as f64
    })
}

/// Stratified collocation sampling rather than uniform.
///
/// Uniform sampling leaves clumps and gaps; a stratified design covers the
/// domain far more evenly for the same point count, which matters because the
/// residual is only enforced where points are - and the network can be badly
/// wrong in a gap while reporting an excellent loss.
pub fn latin_hypercube(
    count: usize,
    low: f64,
    high: f64,
    permutation: &[usize],
    jitter: &[f64],
) -> Array1<f64> {
    // Capacity known exactly: one allocation for the whole design.
    let mut samples = Array1::zeros(count);
    Zip::from(&mut samples)
        .and(permutation)
        .and(jitter)
        .par_for_each(|slot, &stratum, &offset| {
            // One permuted stratum per point: the defining property.
            let position = (stratum as f64 + offset) / count as f64;
            *slot = low + position * (high - low);
        });
    samples
}

/// The check that matters, and the one people skip.
///
/// A network can satisfy the equation at its collocation points while being
/// badly wrong between them. A low training residual with a high held-out
/// residual is exactly that failure, and the loss curve looks identical
/// either way - this is the only thing that reveals it.
pub fn held_out_residual(
    network: &mut BatchedNetwork,
    x: ArrayView1<'_, f64>,
    t: ArrayView1<'_, f64>,
    viscosity: f64,
) -> f64 {
    let residual = network.residual(x, t, x.len(), viscosity);
    mean_square(&residual)
}
`,
        rationale:
          'The structural observation is that collocation points are entirely independent, so the whole residual evaluation is one batched pass — and because the network is a composition of smooth functions, the derivative chain rules vectorize exactly like the forward pass does, so a second derivative is another array expression rather than another loop. The reuse that matters is that for a tanh unit both the first and second derivatives are functions of the activation alone, so one tanh evaluation — the only transcendental in the whole residual — produces three outputs in a single parallel pass, and each derivative then reduces to one contraction over the hidden axis with the chain-rule factor folded into the weight vector rather than applied across the whole matrix. The pre-activations are built as two rank-one updates rather than a matrix product, since stacking two coordinates into an operand costs more than it saves at width two. The residual is assembled in one fused pass into the u_t buffer so no intermediate combination is created. The dtype stays f64, deliberately and against the pattern everywhere else in this reference, because the residual is a difference of nearly cancelling derivative terms and single precision loses most of its significant digits exactly where the signal lives.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The value and all three derivative outputs are contractions over the hidden axis, dispatching to dgemv on contiguous f64 operands.',
            tradeoff: 'Binds the build to a system BLAS, and folding the chain-rule factor into the weight vector builds a small temporary on every call — which on a narrow network costs more than the contraction it feeds.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The pre-activation construction, the fused tanh-and-derivative pass, the residual assembly and the squared-norm reduction are all point-independent with no shared writes.',
            tradeoff: 'These passes are memory-bound and interleave with the BLAS contractions, so parallelizing both competes for bandwidth — and four full-size derivative buffers mean this stage is bandwidth-bound long before it is compute-bound.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Scratch is allocated once at the point maximum and sliced per call, so every contraction sees a standard-layout operand and no evaluation reallocates.',
            tradeoff: 'The scratch holds four points-by-width f64 arrays for the object’s lifetime, and because the residual demands double precision that footprint is twice what the rest of this reference would use for the same shapes.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The residual is assembled into the u_t array rather than into a fresh one, and the derivative factors are written through existing buffers rather than returned by value.',
            tradeoff: 'The u_t buffer is consumed to become the residual, so a diagnostic that wants to see which term of the equation dominates the violation — the natural question when a PINN converges to something wrong — needs an unfused pass.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'A residual evaluation becomes one tanh pass and four contractions for every collocation point at once. Illustrative, not a measured benchmark: against numerical differentiation over parameters this is not a constant-factor improvement but an asymptotic one, since that version cost two full loss evaluations per parameter.',
      },
    },
  },
};
