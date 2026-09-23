/**
 * Standard Grading Scale Configurations
 */
const GRADING_SCALES = {
    PERCENTAGE_STANDARD: [
        { minPercent: 90, maxPercent: 100, grade: 'A+', label: 'Outstanding (A+)' },
        { minPercent: 80, maxPercent: 89.99, grade: 'A', label: 'Very Good (A)' },
        { minPercent: 70, maxPercent: 79.99, grade: 'B+', label: 'Good (B+)' },
        { minPercent: 60, maxPercent: 69.99, grade: 'B', label: 'Average (B)' },
        { minPercent: 50, maxPercent: 59.99, grade: 'C', label: 'Needs Improvement (C)' },
        { minPercent: 40, maxPercent: 49.99, grade: 'D', label: 'Pass (D)' },
        { minPercent: 0, maxPercent: 39.99, grade: 'F', label: 'Fail (F)' },
    ],
    PERCENTAGE_10_POINT: [
        { minPercent: 90, maxPercent: 100, grade: 'O', label: 'Outstanding (O)' },
        { minPercent: 80, maxPercent: 89.99, grade: 'A+', label: 'Excellent (A+)' },
        { minPercent: 70, maxPercent: 79.99, grade: 'A', label: 'Very Good (A)' },
        { minPercent: 60, maxPercent: 69.99, grade: 'B+', label: 'Good (B+)' },
        { minPercent: 50, maxPercent: 59.99, grade: 'B', label: 'Average (B)' },
        { minPercent: 40, maxPercent: 49.99, grade: 'C', label: 'Pass (C)' },
        { minPercent: 0, maxPercent: 39.99, grade: 'F', label: 'Fail (F)' },
    ],
};

/**
 * Returns the grading scale for a given gradingSystem type or custom array
 */
const getGradingScale = (gradingSystem = 'PERCENTAGE_STANDARD', customScale = null) => {
    if (customScale && Array.isArray(customScale) && customScale.length > 0) {
        return customScale;
    }
    return GRADING_SCALES[gradingSystem] || GRADING_SCALES.PERCENTAGE_STANDARD;
};

/**
 * Calculates percentage, grade, and pass/fail status for a given mark
 */
const calculateScoreDetails = (marksObtained, maxMarks, passingMarks = 40, gradingScale = null) => {
    const marks = Number(marksObtained);
    const max = Number(maxMarks);
    const pass = Number(passingMarks);

    if (isNaN(marks) || marks < 0) {
        throw new Error('Marks obtained must be a non-negative number');
    }
    if (isNaN(max) || max <= 0) {
        throw new Error('Maximum marks must be greater than 0');
    }
    if (marks > max) {
        throw new Error(`Marks obtained (${marks}) cannot exceed maximum marks (${max})`);
    }

    const percentage = Number(((marks / max) * 100).toFixed(2));
    const status = marks >= pass ? 'PASS' : 'FAIL';

    const scale = Array.isArray(gradingScale) && gradingScale.length > 0
        ? gradingScale
        : GRADING_SCALES.PERCENTAGE_STANDARD;

    let grade = 'F';
    for (const tier of scale) {
        if (percentage >= tier.minPercent) {
            grade = tier.grade;
            break;
        }
    }

    return {
        marksObtained: marks,
        maxMarks: max,
        percentage,
        grade,
        status,
    };
};

/**
 * Aggregates assessment analytics across an array of score records
 */
const calculateAssessmentAnalytics = (scores = [], maxMarks = 100, passingMarks = 40) => {
    const validScores = scores.filter(s => s && typeof s.marksObtained === 'number' && !s.isDeleted);
    const totalCount = validScores.length;

    if (totalCount === 0) {
        return {
            totalEvaluated: 0,
            averagePercentage: 0,
            averageMarks: 0,
            highestScore: 0,
            highestPercentage: 0,
            lowestScore: 0,
            lowestPercentage: 0,
            passCount: 0,
            failCount: 0,
            passRate: 0,
            performanceDistribution: [
                { range: '90–100%', min: 90, max: 100, count: 0, percentage: 0 },
                { range: '80–89%', min: 80, max: 89.99, count: 0, percentage: 0 },
                { range: '70–79%', min: 70, max: 79.99, count: 0, percentage: 0 },
                { range: '60–69%', min: 60, max: 69.99, count: 0, percentage: 0 },
                { range: 'Below 60%', min: 0, max: 59.99, count: 0, percentage: 0 },
            ],
            gradeDistribution: {},
        };
    }

    let sumPercent = 0;
    let sumMarks = 0;
    let highestScore = -Infinity;
    let lowestScore = Infinity;
    let highestPercentage = -Infinity;
    let lowestPercentage = Infinity;
    let passCount = 0;

    const distribution = [
        { range: '90–100%', min: 90, max: 100, count: 0 },
        { range: '80–89%', min: 80, max: 89.99, count: 0 },
        { range: '70–79%', min: 70, max: 79.99, count: 0 },
        { range: '60–69%', min: 60, max: 69.99, count: 0 },
        { range: 'Below 60%', min: 0, max: 59.99, count: 0 },
    ];

    const gradeCounts = {};

    validScores.forEach(s => {
        const marks = s.marksObtained;
        const pct = s.percentage !== undefined ? s.percentage : Number(((marks / maxMarks) * 100).toFixed(2));
        
        sumMarks += marks;
        sumPercent += pct;

        if (marks > highestScore) {
            highestScore = marks;
            highestPercentage = pct;
        }
        if (marks < lowestScore) {
            lowestScore = marks;
            lowestPercentage = pct;
        }

        if (s.status === 'PASS' || marks >= passingMarks) {
            passCount++;
        }

        if (pct >= 90) distribution[0].count++;
        else if (pct >= 80) distribution[1].count++;
        else if (pct >= 70) distribution[2].count++;
        else if (pct >= 60) distribution[3].count++;
        else distribution[4].count++;

        const g = s.grade || 'Ungraded';
        gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    });

    const averagePercentage = Number((sumPercent / totalCount).toFixed(2));
    const averageMarks = Number((sumMarks / totalCount).toFixed(2));
    const passRate = Number(((passCount / totalCount) * 100).toFixed(2));

    const formattedDistribution = distribution.map(d => ({
        ...d,
        percentage: Number(((d.count / totalCount) * 100).toFixed(1)),
    }));

    return {
        totalEvaluated: totalCount,
        averagePercentage,
        averageMarks,
        highestScore: highestScore === -Infinity ? 0 : highestScore,
        highestPercentage: highestPercentage === -Infinity ? 0 : highestPercentage,
        lowestScore: lowestScore === Infinity ? 0 : lowestScore,
        lowestPercentage: lowestPercentage === Infinity ? 0 : lowestPercentage,
        passCount,
        failCount: totalCount - passCount,
        passRate,
        performanceDistribution: formattedDistribution,
        gradeDistribution: gradeCounts,
    };
};

module.exports = {
    GRADING_SCALES,
    getGradingScale,
    calculateScoreDetails,
    calculateAssessmentAnalytics,
};
