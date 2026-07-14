// Progress analytics for AdaptED AI.
//
// Everything here is derived on the fly from stored quiz attempts and
// the student's current topic mastery map - nothing in this file is
// itself persisted to Firestore. Keeping this framework-free (no
// React, no Firestore calls) mirrors adaptiveLearning.js: the
// calculations can be reasoned about and explained independently of
// the page that renders them.

import { calculateModuleMastery } from "./adaptiveLearning";

// Converts a Firestore Timestamp (or already-a-Date, or null/undefined)
// into a JS Date, defensively. An attempt saved via serverTimestamp()
// can briefly resolve as null before the server value lands, so this
// is used everywhere a date is read rather than assuming the shape.
// Consistent colour/label treatment for a mastery trend value (a
// signed delta, or null when there isn't enough history yet), reused
// everywhere a "Learning Trend" or improvement figure is shown -
// Student Progress, Teacher Analytics, the Student Detail modal, and
// the Leaderboard - so the same number is never presented in
// different colours on different pages.
export function getTrendInfo(value) {

  if (value === null || value === undefined) {
    return {
      label: "Not enough data yet",
      colorClass: "text-gray-400",
      badgeClass: "bg-gray-100 text-gray-500"
    };
  }

  if (value > 0) {
    return {
      label: "Improving ↑",
      colorClass: "text-green-600",
      badgeClass: "bg-green-100 text-green-700"
    };
  }

  if (value < 0) {
    return {
      label: "Declining ↓",
      colorClass: "text-red-600",
      badgeClass: "bg-red-100 text-red-700"
    };
  }

  return {
    label: "Stable →",
    colorClass: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700"
  };

}

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

// Sorts attempts chronologically (oldest first), skipping any whose
// date hasn't resolved yet.
export function sortAttemptsByDate(attempts) {

  return attempts
    .filter((attempt) => toDate(attempt.date))
    .sort((a, b) => toDate(a.date) - toDate(b.date));

}

// Reconstructs "overall module mastery at the time of each attempt"
// purely from the per-attempt masteryAfter snapshots already stored on
// quizAttempts (each of which only covers that attempt's week). Since
// a student's full mastery spans multiple weeks, this walks attempts
// in order and keeps a running merged mastery map, updating only the
// topics each attempt actually touched and carrying every other
// previously-seen topic forward unchanged. This lets the whole
// module-mastery history be derived without storing a full mastery
// snapshot on every attempt.
export function reconstructMasteryTimeline(sortedAttempts) {

  let cumulativeMastery = {};

  return sortedAttempts.map((attempt, index) => {

    cumulativeMastery = { ...cumulativeMastery, ...(attempt.masteryAfter || {}) };

    return {
      attemptNumber: index + 1,
      date: toDate(attempt.date),
      weekTitle: attempt.weekTitle,
      moduleMastery: calculateModuleMastery(cumulativeMastery),
      topicMastery: { ...cumulativeMastery }
    };

  });

}

// A "consecutive calendar days with at least one completed quiz"
// streak, computed from attempt dates. Deliberately simple - this
// counts unique days, not hours or exact timing.
export function calculateStreak(sortedAttempts) {

  const uniqueDays = [
    ...new Set(
      sortedAttempts
        .map((attempt) => toDate(attempt.date))
        .filter(Boolean)
        .map((date) => date.toDateString())
    )
  ]
    .map((dateString) => new Date(dateString))
    .sort((a, b) => a - b);

  if (uniqueDays.length === 0) {
    return { current: 0, longest: 0 };
  }

  const oneDay = 1000 * 60 * 60 * 24;

  let longest = 1;
  let running = 1;

  for (let i = 1; i < uniqueDays.length; i++) {

    const diffDays = Math.round((uniqueDays[i] - uniqueDays[i - 1]) / oneDay);

    running = diffDays === 1 ? running + 1 : 1;

    longest = Math.max(longest, running);

  }

  // The current streak only counts if the most recent active day is
  // today or yesterday - otherwise it's been broken.
  const today = new Date(new Date().toDateString());
  const lastActiveDay = uniqueDays[uniqueDays.length - 1];
  const daysSinceLastActive = Math.round((today - lastActiveDay) / oneDay);

  let current = 0;

  if (daysSinceLastActive <= 1) {

    current = 1;

    for (let i = uniqueDays.length - 1; i > 0; i--) {

      const diffDays = Math.round((uniqueDays[i] - uniqueDays[i - 1]) / oneDay);

      if (diffDays === 1) {
        current++;
      } else {
        break;
      }

    }

  }

  return { current, longest };

}

// Percentage of all answered questions, across every attempt, at each
// difficulty tier - shows how the adaptive engine's difficulty choices
// have shifted as the student's mastery has grown.
export function calculateDifficultyDistribution(attempts) {

  const counts = { easy: 0, medium: 0, hard: 0 };

  let total = 0;

  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {
      if (counts[answer.difficulty] !== undefined) {
        counts[answer.difficulty]++;
        total++;
      }
    });
  });

  if (total === 0) {
    return { easy: 0, medium: 0, hard: 0 };
  }

  return {
    easy: Math.round((counts.easy / total) * 100),
    medium: Math.round((counts.medium / total) * 100),
    hard: Math.round((counts.hard / total) * 100)
  };

}

// Average mark (0-100, so partial credit is reflected) at each
// difficulty tier, across every attempt.
export function calculateAccuracyByDifficulty(attempts) {

  const totals = {
    easy: { sum: 0, count: 0 },
    medium: { sum: 0, count: 0 },
    hard: { sum: 0, count: 0 }
  };

  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {
      if (totals[answer.difficulty] && typeof answer.questionMark === "number") {
        totals[answer.difficulty].sum += answer.questionMark;
        totals[answer.difficulty].count++;
      }
    });
  });

  const toPercentage = (bucket) =>
    bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0;

  return {
    easy: toPercentage(totals.easy),
    medium: toPercentage(totals.medium),
    hard: toPercentage(totals.hard)
  };

}

// Rule-based, locally-generated learning insights - no Gemini call.
// Everything here is a direct read of the student's mastery map and
// the reconstructed mastery timeline.
export function generateInsights(masteryMap, timeline) {

  const topicEntries = Object.entries(masteryMap);

  if (topicEntries.length === 0) {
    return {
      strongestTopic: null,
      weakestTopic: null,
      mostImprovedTopic: null,
      recommendation:
        "Complete your first adaptive quiz to start building your learning profile."
    };
  }

  const sortedByMastery = [...topicEntries].sort((a, b) => a[1] - b[1]);

  const [weakestTopic, weakestValue] = sortedByMastery[0];
  const [strongestTopic] = sortedByMastery[sortedByMastery.length - 1];

  // Most improved: compare each topic's earliest and latest recorded
  // value across the reconstructed timeline. Needs at least two points
  // to say anything meaningful.
  let mostImprovedTopic = null;
  let mostImprovedDelta = 0;

  if (timeline.length >= 2) {

    const first = timeline[0].topicMastery;
    const last = timeline[timeline.length - 1].topicMastery;

    Object.keys(last).forEach((topic) => {

      if (first[topic] === undefined) return;

      const delta = last[topic] - first[topic];

      if (delta > mostImprovedDelta) {
        mostImprovedDelta = delta;
        mostImprovedTopic = topic;
      }

    });

  }

  // Recent trend: was the most recent attempt a notable jump?
  let recentTrendNote = "";

  if (timeline.length >= 2) {

    const latestChange =
      timeline[timeline.length - 1].moduleMastery -
      timeline[timeline.length - 2].moduleMastery;

    if (latestChange >= 0.05) {
      recentTrendNote =
        " You've made significant progress on your last attempt - keep it up!";
    }

  }

  const recommendation =
    weakestValue < 0.4
      ? `We recommend revising ${weakestTopic} before attempting another adaptive quiz.${recentTrendNote}`
      : `Your understanding is solid across topics. Keep practising ${weakestTopic} to reinforce it further.${recentTrendNote}`;

  return {
    strongestTopic,
    weakestTopic,
    mostImprovedTopic,
    recommendation
  };

}