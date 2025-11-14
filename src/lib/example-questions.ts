/**
 * Gold-Standard Example Questions
 * In-context examples to anchor AI generation for each difficulty level
 */

export interface ExampleQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cognitiveLevel: string;
  why: string; // Why this is a good example
}

// ✅ PhD-Level Examples (Evaluate & Create)
export const PHD_EXAMPLES: ExampleQuestion[] = [
  {
    question: "The paper uses pre-extracted features from Kitsune for anomaly detection. How might this feature engineering approach limit the model's ability to generalize to zero-day attacks that exhibit novel packet-level signatures not captured in the original feature set?",
    options: [
      "It would only affect detection speed, not accuracy, since features are domain-agnostic",
      "The fixed feature set assumes attack patterns are stationary, reducing adaptability to unseen attack vectors with novel low-level characteristics",
      "Pre-extracted features improve generalization by abstracting away protocol-specific details",
      "Feature engineering has no impact on zero-day detection as long as the model architecture is deep enough"
    ],
    correctAnswer: 1,
    explanation: "Pre-extracted features create a dependency on domain knowledge encoded during feature engineering. Zero-day attacks may exhibit packet-level signatures (e.g., novel timing patterns, payload distributions) not represented in the fixed feature space, limiting the model's ability to detect them. Options A and D ignore the fundamental constraint of fixed features, while C incorrectly suggests abstraction aids generalization to novel patterns.",
    difficulty: 'hard',
    cognitiveLevel: 'evaluate',
    why: "Tests critical evaluation of methodology limitations, requires understanding of feature engineering trade-offs, avoids factual recall"
  },
  
  {
    question: "The hybrid GRU-LSTM architecture achieves 98.7% accuracy on the NSL-KDD dataset. Under what conditions might this architecture's performance degrade significantly when deployed on edge devices with constrained computational budgets (e.g., 128MB RAM, 1 GFLOPS)?",
    options: [
      "When the dataset size increases, requiring more training iterations",
      "When real-time inference requirements conflict with the sequential processing overhead of recurrent layers, causing latency spikes that exceed acceptable thresholds",
      "When the dataset has fewer attack categories, reducing model complexity",
      "When network bandwidth increases, allowing faster data transmission"
    ],
    correctAnswer: 1,
    explanation: "Edge devices have strict latency and memory constraints. RNN architectures (GRU/LSTM) process sequences sequentially, creating computational bottlenecks. With limited FLOPS, each timestep's computation compounds, potentially exceeding real-time requirements. Options A and C relate to training (not deployment), while D incorrectly focuses on bandwidth rather than computational constraints.",
    difficulty: 'hard',
    cognitiveLevel: 'analyze',
    why: "Requires analysis of architectural trade-offs in resource-constrained scenarios, tests transfer learning limitations"
  },
  
  {
    question: "Critique the assumption that training on historical attack data (2015-2020) will enable accurate detection of modern adversarial attacks that use gradient-based perturbations to evade ML-based intrusion detection systems.",
    options: [
      "Historical data is sufficient because attack patterns remain constant over time",
      "The assumption fails because adversarial attacks exploit model-specific vulnerabilities that didn't exist when historical data was collected, representing a fundamental distribution shift",
      "Modern attacks can be detected using historical data if the model has enough layers",
      "The assumption is valid as long as the dataset includes diverse attack categories"
    ],
    correctAnswer: 1,
    explanation: "Adversarial attacks specifically craft inputs to exploit ML model vulnerabilities, creating a temporal distribution shift. Historical data lacks examples of attacks designed against the specific model architecture being deployed. This is a covariate shift problem: the attack generation process has changed, not just attack prevalence. Options A and D ignore temporal evolution, while C conflates model capacity with distribution mismatch.",
    difficulty: 'hard',
    cognitiveLevel: 'evaluate',
    why: "Tests ability to critique methodological assumptions, requires understanding of adversarial ML and distribution shift"
  },
];

// ✅ Graduate-Level Examples (Apply & Analyze)
export const GRADUATE_EXAMPLES: ExampleQuestion[] = [
  {
    question: "A gradient-boosted decision tree (GBDT) achieves 95% accuracy on imbalanced intrusion detection data (1:99 attack-to-normal ratio). Analyze the trade-offs between using SMOTE (Synthetic Minority Over-sampling) versus cost-sensitive learning to address class imbalance. Which approach would be more suitable for a scenario where false negatives (missed attacks) are 10x more costly than false positives?",
    options: [
      "SMOTE, because it increases training data size, leading to better generalization",
      "Cost-sensitive learning, because it directly optimizes the objective to minimize high-cost false negatives without introducing synthetic data that may not represent true attack distributions",
      "SMOTE, because synthetic samples guarantee perfect balance between classes",
      "Neither approach is necessary since 95% accuracy is already high"
    ],
    correctAnswer: 1,
    explanation: "Cost-sensitive learning directly incorporates the asymmetric cost structure into the loss function, making the model prioritize recall for the minority class. SMOTE generates synthetic samples that may not reflect true attack manifolds, potentially introducing noise. When costs are explicitly asymmetric (10x), encoding this in the loss function is more principled than data augmentation. Options A and C overstate SMOTE's benefits, while D ignores that high accuracy can hide poor minority class performance.",
    difficulty: 'medium',
    cognitiveLevel: 'analyze',
    why: "Requires analyzing trade-offs between techniques and applying knowledge to a specific scenario with constraints"
  },
  
  {
    question: "You need to deploy a CNN-based intrusion detection model on an IoT gateway with 256MB RAM and 50ms maximum latency per prediction. The current model has 5M parameters and 200ms inference time. How would you adapt the architecture to meet the constraints while minimizing accuracy loss?",
    options: [
      "Add more convolutional layers to increase accuracy, then optimize later",
      "Apply model compression techniques: use depthwise separable convolutions to reduce FLOPs, quantize weights to INT8, and prune channels with low L1 norms, targeting 4x reduction in compute and memory",
      "Reduce batch size during inference to lower memory usage",
      "Use a larger learning rate during retraining to speed up convergence"
    ],
    correctAnswer: 1,
    explanation: "The question requires applying model compression knowledge. Depthwise separable convolutions reduce FLOPs by factorizing standard convolutions (typically 8-9x reduction). INT8 quantization reduces memory by 4x. Structured pruning (channel-level) removes entire feature maps. Combined, these achieve the needed 4x reduction. Option A worsens constraints, C only affects training (not deployment inference), and D is unrelated to latency/memory.",
    difficulty: 'medium',
    cognitiveLevel: 'apply',
    why: "Tests application of multiple techniques to a constrained optimization problem in a realistic deployment scenario"
  },
];

// ✅ Undergraduate-Level Examples (Understand & Apply)
export const UNDERGRADUATE_EXAMPLES: ExampleQuestion[] = [
  {
    question: "In a feedforward neural network for binary classification, why is the sigmoid activation function commonly used in the output layer rather than ReLU?",
    options: [
      "Sigmoid is faster to compute than ReLU",
      "Sigmoid maps any input to a probability in [0, 1], which is interpretable as class likelihood, whereas ReLU produces unbounded positive values",
      "Sigmoid has a steeper gradient than ReLU, leading to faster training",
      "Sigmoid prevents vanishing gradients better than ReLU"
    ],
    correctAnswer: 1,
    explanation: "The sigmoid function σ(x) = 1/(1+e^(-x)) outputs values between 0 and 1, which can be interpreted as P(class=1). This is essential for binary classification. ReLU outputs [0, ∞), which isn't a valid probability distribution. Options A, C, and D are factually incorrect about sigmoid's computational and gradient properties compared to ReLU.",
    difficulty: 'easy',
    cognitiveLevel: 'understand',
    why: "Tests conceptual understanding of activation functions and their purposes, avoids pure memorization"
  },
  
  {
    question: "A decision tree classifier overfits on training data (100% accuracy) but performs poorly on test data (60% accuracy). Explain what overfitting means in this context and identify the most appropriate remedy.",
    options: [
      "Overfitting means the model is too simple; add more layers to increase capacity",
      "Overfitting means the model has memorized training data noise instead of learning general patterns; apply pruning or limit tree depth to reduce complexity",
      "Overfitting indicates insufficient training data; collect more samples",
      "Overfitting is caused by using the wrong loss function; switch to cross-entropy"
    ],
    correctAnswer: 1,
    explanation: "Overfitting occurs when a model learns training data too specifically, including noise, rather than underlying patterns. For decision trees, this manifests as very deep trees that create specific rules for each training example. Pruning or limiting depth constrains model complexity, forcing it to learn general patterns. Option A worsens the problem, C may help but doesn't address the root cause, and D is irrelevant to tree-based models.",
    difficulty: 'easy',
    cognitiveLevel: 'understand',
    why: "Tests understanding of fundamental ML concepts (overfitting) and appropriate solutions"
  },
];

/**
 * Get example questions for a specific difficulty level
 */
export function getExamplesForLevel(difficulty: 'undergraduate' | 'graduate' | 'phd'): ExampleQuestion[] {
  const exampleMap = {
    undergraduate: UNDERGRADUATE_EXAMPLES,
    graduate: GRADUATE_EXAMPLES,
    phd: PHD_EXAMPLES,
  };
  
  return exampleMap[difficulty];
}

/**
 * Format examples for inclusion in prompts
 */
export function formatExamplesForPrompt(examples: ExampleQuestion[]): string {
  return examples.map((ex, i) => `
EXAMPLE ${i + 1} (${ex.cognitiveLevel.toUpperCase()} - ${ex.difficulty}):
Q: "${ex.question}"
Options:
  A) ${ex.options[0]}
  B) ${ex.options[1]}
  C) ${ex.options[2]}
  D) ${ex.options[3]}
Correct: ${String.fromCharCode(65 + ex.correctAnswer)}
Explanation: "${ex.explanation}"

Why this is a good ${ex.difficulty} question:
${ex.why}
`).join('\n---\n');
}
