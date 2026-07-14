// Adaptive learning engine for AdaptED AI.
//
// Every student has a mastery score per topic, ranging from 0.0 (0%) to
// 1.0 (100%). Mastery drives both the difficulty of questions selected
// for a topic and how often that topic is revisited in future quizzes.
//
// This module is intentionally framework-free (no React, no Firestore
// calls) so the algorithm itself can be reasoned about, tested and
// explained independently of the UI that drives it.

export const INITIAL_MASTERY = 0.3;

const DIFFICULTY_THRESHOLDS = {
  easy: 0.4,   // mastery below this -> easy
  medium: 0.7  // mastery below this -> medium, otherwise hard
};

const TOTAL_QUESTIONS = 10;


// --- Difficulty selection ------------------------------------------

export function getDifficultyForMastery(mastery) {

  if (mastery < DIFFICULTY_THRESHOLDS.easy) return "easy";

  if (mastery < DIFFICULTY_THRESHOLDS.medium) return "medium";

  return "hard";

}


// --- Mastery updates -------------------------------------------------

// Mastery values are always stored rounded to the nearest 1% (2 decimal
// places), so that Firestore never ends up holding long floating point
// artifacts like 0.09999999999999998 from repeated addition.
export function roundMastery(value) {
  return Math.round(value * 100) / 100;
}

// The size of a mastery update depends on the student's CURRENT mastery
// in that topic - students close to full mastery move in smaller steps
// than students who are still building up understanding. This keeps
// the scale meaningful at the top end (100% shouldn't be trivial to
// reach or leave) while still rewarding early progress clearly.
function getMasteryDelta(currentMastery, outcome) {

  let deltas;

  if (currentMastery < 0.80) {
    deltas = { correct: 0.10, partial: 0.05, incorrect: -0.05 };
  } else if (currentMastery < 0.90) {
    deltas = { correct: 0.05, partial: 0.025, incorrect: -0.03 };
  } else {
    deltas = { correct: 0.02, partial: 0.01, incorrect: -0.02 };
  }

  return deltas[outcome] ?? deltas.incorrect;

}

// Applies a mastery delta for every answered question, in order, on
// top of a mastery baseline. Multiple questions on the same topic each
// apply their own delta on top of the topic's mastery as it stood
// after the previous question - not all against the original baseline
// - since the bracket a delta falls into depends on current mastery.
//
// Returns the final per-topic mastery map, plus the same answers array
// with a masteryChange field added to each entry (the delta that
// specific question caused), so the UI can show e.g. "+10%" per
// question without recalculating anything.
export function applyMasteryUpdates(detailedAnswers, baselineMastery) {

  const workingMastery = { ...baselineMastery };

  const annotatedAnswers = detailedAnswers.map((item) => {

    const currentMastery =
      workingMastery[item.topic] !== undefined
        ? workingMastery[item.topic]
        : INITIAL_MASTERY;

    const delta = getMasteryDelta(currentMastery, item.outcome);

    const updatedMastery = roundMastery(
      Math.min(1, Math.max(0, currentMastery + delta))
    );

    workingMastery[item.topic] = updatedMastery;

    return {
      ...item,
      masteryChange: roundMastery(updatedMastery - currentMastery)
    };

  });

  return { updatedMastery: workingMastery, detailedAnswers: annotatedAnswers };

}


// --- Week / module mastery (derived, never stored) --------------------

// Week mastery is the average mastery across the topics belonging to
// that week. Always calculated on demand from topic mastery - never
// stored, so topic mastery remains the single source of truth.
export function calculateWeekMastery(masteryMap, weekTopics) {

  const values = weekTopics
    .map((topic) => masteryMap[topic])
    .filter((value) => typeof value === "number");

  if (values.length === 0) return INITIAL_MASTERY;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  return roundMastery(average);

}

// Module mastery is the average mastery across every topic the student
// has any mastery score for at all (currently the whole app is a
// single "Cryptography" module, so this is every topic in the map).
export function calculateModuleMastery(masteryMap) {

  const values = Object.values(masteryMap).filter(
    (value) => typeof value === "number"
  );

  if (values.length === 0) return INITIAL_MASTERY;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  return roundMastery(average);

}


// --- Quiz generation ---------------------------------------------------

// Question banks are still being built up by teachers, so a topic may
// not yet have questions at the exact difficulty mastery calls for.
// Falls back to the closest available tier rather than skip the topic.
function pickDifficultyPool(topicQuestions, targetDifficulty) {

  const fallbackOrder = {
    easy: ["easy", "medium", "hard"],
    medium: ["medium", "easy", "hard"],
    hard: ["hard", "medium", "easy"]
  }[targetDifficulty];

  for (const difficulty of fallbackOrder) {

    const pool = topicQuestions[difficulty] || [];

    if (pool.length > 0) {
      return { pool, difficulty };
    }

  }

  return { pool: [], difficulty: targetDifficulty };

}

// Three-tier preference when picking a question from a pool:
//   1. Never seen by this student before, and not already used
//      elsewhere in this quiz - maximises variety.
//   2. Seen before, but not already used in this quiz.
//   3. Already used in this quiz (last resort - only happens when a
//      topic/difficulty genuinely has too few questions written).
function pickQuestionFromPool(pool, usedQuestionTexts, previouslySeenQuestions) {

  const neverSeen = pool.filter(
    (q) =>
      !usedQuestionTexts.has(q.question) &&
      !previouslySeenQuestions.has(q.question)
  );

  if (neverSeen.length > 0) {
    return neverSeen[Math.floor(Math.random() * neverSeen.length)];
  }

  const unusedInThisQuiz = pool.filter((q) => !usedQuestionTexts.has(q.question));

  if (unusedInThisQuiz.length > 0) {
    return unusedInThisQuiz[Math.floor(Math.random() * unusedInThisQuiz.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];

}

// Weighted random topic pick, favouring lower-mastery topics while
// still giving stronger topics some (smaller) chance of being picked -
// this supports long-term retention rather than neglecting them.
function weightedRandomTopic(topics, masteryMap) {

  const weights = topics.map(
    (topic) => (1 - masteryMap[topic]) + 0.1
  );

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let roll = Math.random() * totalWeight;

  for (let i = 0; i < topics.length; i++) {

    roll -= weights[i];

    if (roll <= 0) return topics[i];

  }

  return topics[topics.length - 1];

}


export function buildAdaptiveQuiz(week, masteryMap, previouslySeenQuestions = new Set()) {

  const topicNames = Object.keys(week.questions);

  const effectiveMastery = {};

  topicNames.forEach((topic) => {
    effectiveMastery[topic] =
      masteryMap[topic] !== undefined ? masteryMap[topic] : INITIAL_MASTERY;
  });

  const usedQuestionTexts = new Set();

  const selected = [];

  const addQuestionForTopic = (topic) => {

    const targetDifficulty = getDifficultyForMastery(effectiveMastery[topic]);

    const { pool, difficulty } =
      pickDifficultyPool(week.questions[topic], targetDifficulty);

    if (pool.length === 0) return false;

    const question =
      pickQuestionFromPool(pool, usedQuestionTexts, previouslySeenQuestions);

    usedQuestionTexts.add(question.question);

    selected.push({ ...question, topic, difficulty });

    return true;

  };

  // Step 2: baseline coverage.
  topicNames.forEach((topic) => addQuestionForTopic(topic));

  // Step 3: reinforce weakest topics first - one pass through all
  // topics, weakest mastery first.
  const weakestFirst = [...topicNames].sort(
    (a, b) => effectiveMastery[a] - effectiveMastery[b]
  );

  weakestFirst.forEach((topic) => {
    if (selected.length < TOTAL_QUESTIONS) {
      addQuestionForTopic(topic);
    }
  });

  // Step 4: fill any remaining slots with mastery-weighted selection.
  // The safety counter guards against an infinite loop if the question
  // bank genuinely doesn't have enough questions to reach 10.
  let safetyCounter = 0;

  const maxAttempts = TOTAL_QUESTIONS * topicNames.length * 3;

  while (selected.length < TOTAL_QUESTIONS && safetyCounter < maxAttempts) {

    const topic = weightedRandomTopic(topicNames, effectiveMastery);

    addQuestionForTopic(topic);

    safetyCounter++;

  }

  return selected.sort(() => Math.random() - 0.5);

}