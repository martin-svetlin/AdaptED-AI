// Class-wide analytics for AdaptED AI's Teacher Analytics dashboard.
//
// Everything here is derived on the fly from stored quiz attempts and
// student mastery maps - nothing in this file is itself persisted to
// Firestore. Framework-free (no React, no Firestore calls), mirroring
// adaptiveLearning.js and progressAnalytics.js, so class-wide
// calculations stay out of the page component and can be reasoned
// about independently.

import { calculateModuleMastery, calculateWeekMastery, roundMastery, INITIAL_MASTERY } from "./adaptiveLearning";
import { toDate, sortAttemptsByDate, reconstructMasteryTimeline, calculateStreak } from "./progressAnalytics";

const WRITTEN_TYPES = ["Short Answer", "Fill in the Blank", "Scenario-Based"];

// Mastery-based status thresholds, consistent with the "Strong" (>=70%)
// and "weakest topic" (<40%) thresholds already used on the Student
// Progress page.
const EXCELLENT_THRESHOLD = 0.7;
const ATTENTION_THRESHOLD = 0.4;
const WEAK_TOPIC_THRESHOLD = 0.3;


// --- Week ordering -----------------------------------------------------

// Weeks must always display in numeric order (Week 1, Week 2, ...),
// never alphabetically or in Firestore's arbitrary document order.
export function sortWeeks(weeks) {
  return [...weeks].sort((a, b) => {
    const getWeekNumber = (week) => {
      const text = week.weekTitle || week.title || "";
      const match = text.match(/Week\s+(\d+)/i);
      return match ? Number(match[1]) : 0;
    };
    return getWeekNumber(a) - getWeekNumber(b);
  });
}


// --- Per-student rollup, used as the basis for most of the page ------

// Builds one summary row per student: overall mastery, last quiz
// score, learning trend, last active date, status, plus their
// reconstructed mastery timeline (reused for "most improved" and
// "recent improvement" calculations elsewhere on the page).
export function calculateStudentOverview(students, attemptsByStudentId) {

  const overview = students.map((student) => {

    const studentAttempts = attemptsByStudentId[student.id] || [];

    const sorted = sortAttemptsByDate(studentAttempts);

    const timeline = reconstructMasteryTimeline(sorted);

    const moduleMastery = calculateModuleMastery(student.mastery || {});

    const lastAttempt = sorted[sorted.length - 1] || null;

    const trend =
      timeline.length >= 2
        ? roundMastery(
            timeline[timeline.length - 1].moduleMastery -
              timeline[timeline.length - 2].moduleMastery
          )
        : null;

    const status =
      moduleMastery >= EXCELLENT_THRESHOLD
        ? "Excellent"
        : moduleMastery >= ATTENTION_THRESHOLD
        ? "Good"
        : "Needs Attention";

    return {
      studentId: student.id,
      username: student.username || student.displayName || student.id,
      moduleMastery,
      lastQuizScore: lastAttempt ? lastAttempt.percentage : null,
      trend,
      lastActiveDate: lastAttempt ? toDate(lastAttempt.date) : null,
      status,
      timeline,
      attempts: sorted
    };

  });

  // Weakest mastery first, so the students most likely to need help
  // surface immediately.
  return overview.sort((a, b) => a.moduleMastery - b.moduleMastery);

}


// --- Class snapshot ----------------------------------------------------

export function calculateClassSnapshot(students, attempts, studentOverview, attentionList) {

  const studentCount = students.length;

  const avgModuleMastery =
    studentCount > 0
      ? roundMastery(
          studentOverview.reduce((sum, s) => sum + s.moduleMastery, 0) / studentCount
        )
      : 0;

  const avgQuizScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length
        )
      : 0;

  // "Completion" has no formal definition in this app (no assignments
  // or deadlines exist) - this is read as "has engaged with the
  // adaptive quiz system at all", i.e. completed at least one quiz.
  const studentsWithAttempts = new Set(attempts.map((a) => a.studentId)).size;

  const avgCompletionRate =
    studentCount > 0 ? Math.round((studentsWithAttempts / studentCount) * 100) : 0;

  // Average of each student's most recent mastery change, across
  // students who have at least two attempts to compare.
  const improvements = studentOverview.map((s) => s.trend).filter((t) => t !== null);

  const avgWeeklyImprovement =
    improvements.length > 0
      ? roundMastery(improvements.reduce((sum, v) => sum + v, 0) / improvements.length)
      : null;

  return {
    studentCount,
    avgModuleMastery,
    avgQuizScore,
    avgCompletionRate,
    studentsRequiringAttention: attentionList.length,
    avgWeeklyImprovement
  };

}


// --- Class performance over time ---------------------------------------

// Averages each student's mastery at their Nth attempt, across all
// students who have reached at least N attempts. Attempt number is
// ordinal per-student (each student's 1st, 2nd, 3rd... quiz), not
// calendar-aligned, since students don't take quizzes synchronously -
// this is what makes a single class-wide "learning curve" meaningful.
export function calculateClassPerformanceOverTime(studentOverview) {

  const timelines = studentOverview.map((s) => s.timeline);

  const maxAttempts = Math.max(0, ...timelines.map((t) => t.length));

  const points = [];

  for (let i = 0; i < maxAttempts; i++) {

    const valuesAtThisAttempt = timelines
      .map((timeline) => timeline[i])
      .filter(Boolean)
      .map((point) => point.moduleMastery);

    if (valuesAtThisAttempt.length === 0) continue;

    const average =
      valuesAtThisAttempt.reduce((sum, v) => sum + v, 0) / valuesAtThisAttempt.length;

    points.push({
      attemptNumber: i + 1,
      averageMastery: roundMastery(average),
      studentCount: valuesAtThisAttempt.length
    });

  }

  return points;

}


// --- Topic performance ---------------------------------------------

// Average topic mastery (from students' current mastery maps) and
// average accuracy (from every answered question on that topic across
// every attempt), sorted weakest first.
export function calculateTopicPerformance(students, attempts) {

  const masterySum = {};
  const masteryCount = {};

  students.forEach((student) => {
    Object.entries(student.mastery || {}).forEach(([topic, value]) => {
      masterySum[topic] = (masterySum[topic] || 0) + value;
      masteryCount[topic] = (masteryCount[topic] || 0) + 1;
    });
  });

  const accuracySum = {};
  const accuracyCount = {};
  const attemptCount = {};

  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {

      if (!answer.topic) return;

      attemptCount[answer.topic] = (attemptCount[answer.topic] || 0) + 1;

      if (typeof answer.questionMark === "number") {
        accuracySum[answer.topic] = (accuracySum[answer.topic] || 0) + answer.questionMark;
        accuracyCount[answer.topic] = (accuracyCount[answer.topic] || 0) + 1;
      }

    });
  });

  const allTopics = new Set([...Object.keys(masterySum), ...Object.keys(attemptCount)]);

  const results = [...allTopics].map((topic) => ({
    topic,
    averageMastery: masteryCount[topic]
      ? roundMastery(masterySum[topic] / masteryCount[topic])
      : INITIAL_MASTERY,
    averageAccuracy: accuracyCount[topic]
      ? Math.round(accuracySum[topic] / accuracyCount[topic])
      : 0,
    attemptCount: attemptCount[topic] || 0
  }));

  return results.sort((a, b) => a.averageMastery - b.averageMastery);

}


// --- Week performance ------------------------------------------------

export function calculateWeekPerformance(weeks, students, attempts) {

  return weeks.map((week) => {

    const weekAttempts = attempts.filter((a) => a.weekId === week.id);

    const avgWeekMastery =
      students.length > 0
        ? roundMastery(
            students.reduce(
              (sum, s) => sum + calculateWeekMastery(s.mastery || {}, week.topics || []),
              0
            ) / students.length
          )
        : INITIAL_MASTERY;

    const avgScore =
      weekAttempts.length > 0
        ? Math.round(
            weekAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / weekAttempts.length
          )
        : 0;

    const studentsCompleted = new Set(weekAttempts.map((a) => a.studentId)).size;

    const completionRate =
      students.length > 0 ? Math.round((studentsCompleted / students.length) * 100) : 0;

    return {
      weekId: week.id,
      weekTitle: week.title,
      topics: week.topics || [],
      avgWeekMastery,
      avgScore,
      completionRate,
      attemptCount: weekAttempts.length
    };

  });

}


// --- Students requiring attention ------------------------------------

// Rule-based, single most-relevant reason per student (priority: very
// low overall mastery > one specific weak topic > stalled progress),
// so the table stays scannable rather than listing every issue at once.
export function identifyStudentsRequiringAttention(studentOverview) {

  const flagged = [];

  studentOverview.forEach((student) => {

    let reason = null;
    let action = null;

    if (student.moduleMastery < ATTENTION_THRESHOLD) {

      reason = `Overall mastery is low (${Math.round(student.moduleMastery * 100)}%).`;
      action = "Recommend a focused review session before the next adaptive quiz.";

    } else {

      const latestTopicMastery =
        student.timeline.length > 0
          ? student.timeline[student.timeline.length - 1].topicMastery
          : {};

      const weakestEntry = Object.entries(latestTopicMastery).sort((a, b) => a[1] - b[1])[0];

      if (weakestEntry && weakestEntry[1] < WEAK_TOPIC_THRESHOLD) {

        reason = `Weak mastery in ${weakestEntry[0]} (${Math.round(weakestEntry[1] * 100)}%).`;
        action = `Recommend additional practice on ${weakestEntry[0]} before progressing.`;

      } else if (student.trend !== null && student.trend <= 0 && student.attempts.length >= 2) {

        reason = "Little to no improvement across recent attempts.";
        action = "Check in with the student and consider revisiting foundational topics.";

      }

    }

    if (reason) {
      flagged.push({
        studentId: student.studentId,
        username: student.username,
        reason,
        action
      });
    }

  });

  return flagged;

}


// --- Question analytics -----------------------------------------------

// Matched by question text (the schema has no unique question ID).
// averageMarks covers every question type; averageAIScore is reported
// separately for written-response questions only, since those marks
// come from Gemini rather than exact-match grading and teachers may
// want to sanity-check the AI grader specifically.
export function calculateQuestionAnalytics(attempts) {

  const questionMap = {};

  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {

      if (!answer.question) return;

      if (!questionMap[answer.question]) {
        questionMap[answer.question] = {
          question: answer.question,
          topic: answer.topic,
          difficulty: answer.difficulty,
          questionType: answer.questionType || null,
          correctCount: 0,
          totalCount: 0,
          markSum: 0,
          aiMarkSum: 0,
          aiCount: 0
        };
      }

      const entry = questionMap[answer.question];

      entry.totalCount++;

      if (answer.outcome === "correct") entry.correctCount++;

      if (typeof answer.questionMark === "number") {
        entry.markSum += answer.questionMark;
      }

      if (WRITTEN_TYPES.includes(answer.questionType) && typeof answer.questionMark === "number") {
        entry.aiMarkSum += answer.questionMark;
        entry.aiCount++;
      }

    });
  });

  return Object.values(questionMap)
    .map((entry) => ({
      question: entry.question,
      topic: entry.topic,
      difficulty: entry.difficulty,
      correctRate:
        entry.totalCount > 0 ? Math.round((entry.correctCount / entry.totalCount) * 100) : 0,
      averageMarks: entry.totalCount > 0 ? Math.round(entry.markSum / entry.totalCount) : 0,
      averageAIScore: entry.aiCount > 0 ? Math.round(entry.aiMarkSum / entry.aiCount) : null,
      attemptCount: entry.totalCount
    }))
    .sort((a, b) => a.correctRate - b.correctRate);

}


// --- Class heatmap (weeks x topics) ------------------------------------

export function calculateHeatmapData(weeks, students) {

  return weeks.map((week) => ({
    weekId: week.id,
    weekTitle: week.title,
    topics: (week.topics || []).map((topic) => {

      const values = students
        .map((s) => (s.mastery || {})[topic])
        .filter((v) => typeof v === "number");

      const mastery =
        values.length > 0
          ? roundMastery(values.reduce((sum, v) => sum + v, 0) / values.length)
          : null;

      return { topic, mastery };

    })
  }));

}


// --- Teacher insights (rule-based, no Gemini) ------------------------

export function generateTeacherInsights({ topicPerformance, weekPerformance, classPerformanceOverTime, students }) {

  const insights = [];

  if (topicPerformance.length > 0 && students.length > 0) {

    const weakest = topicPerformance[0];

    const strugglingCount = students.filter(
      (s) => ((s.mastery || {})[weakest.topic] ?? 1) < ATTENTION_THRESHOLD
    ).length;

    const strugglingShare = strugglingCount / students.length;

    if (strugglingShare >= 0.5) {
      insights.push(
        `Most students are struggling with ${weakest.topic} (class average ${Math.round(weakest.averageMastery * 100)}%).`
      );
    } else if (strugglingCount >= 2) {
      insights.push(`Several students are consistently struggling with ${weakest.topic}.`);
    }

  }

  if (classPerformanceOverTime.length >= 4) {

    const latest = classPerformanceOverTime[classPerformanceOverTime.length - 1];
    const threeBack = classPerformanceOverTime[classPerformanceOverTime.length - 4];

    const change = Math.round((latest.averageMastery - threeBack.averageMastery) * 100);

    if (Math.abs(change) >= 3) {
      insights.push(
        `Average mastery has ${change >= 0 ? "increased" : "decreased"} by ${Math.abs(change)}% over the last three quiz attempts.`
      );
    }

  }

  if (weekPerformance.length > 0) {

    const lowestWeek = [...weekPerformance].sort(
      (a, b) => a.avgWeekMastery - b.avgWeekMastery
    )[0];

    insights.push(
      `${lowestWeek.weekTitle} has the lowest average mastery (${Math.round(lowestWeek.avgWeekMastery * 100)}%).`
    );

  }

  if (insights.length === 0) {
    insights.push("Not enough class data yet to generate insights.");
  }

  return insights;

}


// --- Leaderboard --------------------------------------------------

// Ranks students by Overall Module Mastery (the most representative
// measure of long-term progress - deliberately not average quiz
// score, which only reflects one-shot performance). Also derives a
// rank-movement indicator without storing any historical leaderboard
// snapshots: for each student, their mastery as of one attempt ago
// (from their own reconstructed timeline) is swapped in for their
// current mastery, and everyone else's CURRENT mastery is used to see
// where that would have ranked them. Comparing that hypothetical rank
// to their real current rank gives an honest "moved up/down N places"
// figure, entirely derived from data already stored.
export function calculateLeaderboard(studentOverview) {

  const enriched = studentOverview.map((student) => {

    const avgQuizScore =
      student.attempts.length > 0
        ? Math.round(
            student.attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
              student.attempts.length
          )
        : 0;

    const streak = calculateStreak(student.attempts);

    const previousMastery =
      student.timeline.length >= 2
        ? student.timeline[student.timeline.length - 2].moduleMastery
        : null;

    return {
      ...student,
      avgQuizScore,
      quizzesCompleted: student.attempts.length,
      streak,
      previousMastery
    };

  });

  const currentRanked = [...enriched].sort((a, b) => b.moduleMastery - a.moduleMastery);

  const currentMasteryById = {};

  currentRanked.forEach((s) => {
    currentMasteryById[s.studentId] = s.moduleMastery;
  });

  return currentRanked.map((student, index) => {

    const rank = index + 1;

    if (student.previousMastery === null) {
      return { ...student, rank, previousRank: null, movement: null };
    }

    const hypotheticalRank =
      currentRanked.filter((other) => {
        const otherMastery =
          other.studentId === student.studentId
            ? student.previousMastery
            : currentMasteryById[other.studentId];
        return otherMastery > student.previousMastery;
      }).length + 1;

    return {
      ...student,
      rank,
      previousRank: hypotheticalRank,
      movement: hypotheticalRank - rank
    };

  });

}