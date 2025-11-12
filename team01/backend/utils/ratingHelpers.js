const Rating = require("../models/Rating");
const Profile = require("../models/Profile");
const BlockedUser = require("../models/BlockedUser");

async function recalcProfileStats(userId) {
  const ratings = await Rating.find({ ratee: userId }).sort({ createdAt: 1 }); // Sort by date for trend analysis

  // getting blocked count for this user
  const blockedCount = await BlockedUser.countDocuments({ blockedUserId: userId });
  
  // No ratings → reset to zero
  if (ratings.length === 0) {
    await Profile.findOneAndUpdate(
      { user: userId },
      { safetyScore: 0, badges: [] }
    );
    return;
  }

  // Enhanced Safety Score Calculation with Multiple Dimensions
  const safetyDimensions = {
    physicalSafety: {
      fields: ["madeMeFeelSafe", "respectfulOfBoundaries"],
      weight: 0.4, // Highest weight - most critical
      section: "safetyAndRespect",
    },
    trustworthiness: {
      fields: ["asDescribedInProfile"],
      weight: 0.3, // High weight - trust is crucial
      section: "safetyAndRespect",
    },
    reliability: {
      fields: ["onTime", "goodManners"],
      weight: 0.2, // Moderate weight - reliability matters
      section: "consideration",
    },
    respectfulness: {
      fields: ["attentive"],
      weight: 0.1, // Lower weight but still important
      section: "consideration",
    },
  };

  // Calculate dimensional scores
  let overallWeightedScore = 0;
  let dimensionalScores = {};
  let totalValidRatings = 0;

  for (const [dimension, config] of Object.entries(safetyDimensions)) {
    let dimensionScore = 0;
    let validRatingsForDimension = 0;

    for (const rating of ratings) {
      // Skip ratings where user didn't show up or cancelled
      if (rating.didNotShowUp || rating.cancelled) continue;

      let dimensionTotal = 0;
      let dimensionCount = 0;

      for (const field of config.fields) {
        if (
          rating[config.section] &&
          rating[config.section][field] !== undefined
        ) {
          dimensionTotal += rating[config.section][field] ? 1 : 0;
          dimensionCount++;
        }
      }

      if (dimensionCount > 0) {
        dimensionScore += dimensionTotal / dimensionCount;
        validRatingsForDimension++;
      }
    }

    if (validRatingsForDimension > 0) {
      const avgDimensionScore =
        (dimensionScore / validRatingsForDimension) * 100;
      dimensionalScores[dimension] = Math.round(avgDimensionScore);
      overallWeightedScore += avgDimensionScore * config.weight;
      totalValidRatings = Math.max(totalValidRatings, validRatingsForDimension);
    } else {
      dimensionalScores[dimension] = 0;
    }
  }

  // Calculate confidence level based on sample size and consistency
  const confidence = calculateConfidence(ratings, totalValidRatings);

  // Apply confidence-based adjustments
  let finalSafetyScore = Math.round(overallWeightedScore);

  // Penalize low confidence scores (conservative approach for safety)
  if (confidence.level === "low" && finalSafetyScore > 70) {
    finalSafetyScore = Math.max(70, finalSafetyScore - 10);
  } else if (confidence.level === "very-low" && finalSafetyScore > 60) {
    finalSafetyScore = Math.max(60, finalSafetyScore - 15);
  }

  // Detect concerning patterns
  const riskFlags = detectRiskPatterns(ratings);

  // Apply risk flag penalties
  if (riskFlags.length > 0) {
    const penalty = Math.min(20, riskFlags.length * 5); // Max 20 point penalty
    finalSafetyScore = Math.max(0, finalSafetyScore - penalty);
  }

  // Applying blocked user penalty (logarithmic scaling)
  const blockedPenalty = calculateBlockedUserPenalty(blockedCount);
  if (blockedPenalty > 0) {
    finalSafetyScore = Math.max(0, finalSafetyScore - blockedPenalty);
  }

  // Trend analysis (improving/declining performance)
  const trendAnalysis = analyzeTrends(ratings);

  // Build enhanced badges with safety context
  const badges = buildEnhancedBadges(
    ratings,
    finalSafetyScore,
    dimensionalScores,
    confidence,
    trendAnalysis,
    blockedCount
  );

  // Persist back to Profile with enhanced data
  await Profile.findOneAndUpdate(
    { user: userId },
    {
      safetyScore: finalSafetyScore,
      badges,
      // Store additional metadata for transparency
      safetyMetadata: {
        confidence: confidence.level,
        sampleSize: totalValidRatings,
        dimensionalScores,
        riskFlags,
        trendAnalysis,
        blockedCount,
        blockedPenalty: calculateBlockedUserPenalty(blockedCount),
        lastCalculated: new Date(),
      },
    }
  );

  console.log(
    `Updated safety score for user ${userId}: ${finalSafetyScore}% (${confidence.level} confidence, ${totalValidRatings} ratings, ${blockedCount} blocks, -${calculateBlockedUserPenalty(blockedCount)} penalty)`
  );
}

function calculateConfidence(ratings, validRatingCount) {
  if (validRatingCount === 0) return { level: "none", score: 0 };

  // Calculate consistency (how much scores vary)
  const safetyScores = [];
  const safetyFields = [
    "madeMeFeelSafe",
    "asDescribedInProfile",
    "respectfulOfBoundaries",
  ];

  for (const rating of ratings) {
    if (rating.didNotShowUp || rating.cancelled) continue;

    let ratingScore = 0;
    let fieldCount = 0;

    for (const field of safetyFields) {
      if (
        rating.safetyAndRespect &&
        rating.safetyAndRespect[field] !== undefined
      ) {
        ratingScore += rating.safetyAndRespect[field] ? 1 : 0;
        fieldCount++;
      }
    }

    if (fieldCount > 0) {
      safetyScores.push((ratingScore / fieldCount) * 100);
    }
  }

  // Calculate variance (consistency measure)
  let variance = 0;
  if (safetyScores.length > 1) {
    const mean = safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;
    variance =
      safetyScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      safetyScores.length;
  }

  const standardDeviation = Math.sqrt(variance);
  const consistencyScore = Math.max(0, 100 - standardDeviation);

  // Determine confidence level
  let level, score;

  if (validRatingCount >= 10 && consistencyScore >= 70) {
    level = "high";
    score = 90;
  } else if (validRatingCount >= 6 && consistencyScore >= 60) {
    level = "moderate";
    score = 75;
  } else if (validRatingCount >= 3 && consistencyScore >= 40) {
    level = "low";
    score = 60;
  } else {
    level = "very-low";
    score = 30;
  }

  return {
    level,
    score,
    consistencyScore: Math.round(consistencyScore),
    variance: Math.round(standardDeviation),
  };
}

function detectRiskPatterns(ratings) {
  const riskFlags = [];
  const validRatings = ratings.filter((r) => !r.didNotShowUp && !r.cancelled);

  if (validRatings.length < 2) return riskFlags;

  // Pattern 1: Multiple "didn't feel safe" reports
  const unsafeReports = validRatings.filter(
    (r) => r.safetyAndRespect && r.safetyAndRespect.madeMeFeelSafe === false
  ).length;

  if (unsafeReports >= 2) {
    riskFlags.push({
      type: "safety_concerns",
      severity: unsafeReports >= 3 ? "high" : "medium",
      description: `${unsafeReports} reports of safety concerns`,
    });
  }

  // Pattern 2: Boundary violations
  const boundaryViolations = validRatings.filter(
    (r) =>
      r.safetyAndRespect && r.safetyAndRespect.respectfulOfBoundaries === false
  ).length;

  if (boundaryViolations >= 2) {
    riskFlags.push({
      type: "boundary_violations",
      severity: boundaryViolations >= 3 ? "high" : "medium",
      description: `${boundaryViolations} reports of boundary violations`,
    });
  }

  // Pattern 3: Frequent no-shows
  const noShows = ratings.filter((r) => r.didNotShowUp).length;
  if (noShows >= 2) {
    riskFlags.push({
      type: "reliability_issues",
      severity: noShows >= 3 ? "high" : "medium",
      description: `${noShows} no-show incidents`,
    });
  }

  // Pattern 4: Profile misrepresentation
  const profileMismatches = validRatings.filter(
    (r) =>
      r.safetyAndRespect && r.safetyAndRespect.asDescribedInProfile === false
  ).length;

  if (profileMismatches >= 3) {
    riskFlags.push({
      type: "profile_misrepresentation",
      severity: "medium",
      description: `${profileMismatches} reports of profile inaccuracy`,
    });
  }

  return riskFlags;
}

/**
 * Calculate logarithmic penalty for blocked users
 * blockedCount - the num of times user has been blocked
 * Returns penalty points to subtract from safety score
 */
function calculateBlockedUserPenalty(blockedCount) {
  if (blockedCount === 0) return 0;
  
  // Logarithmic scaling: minimal impact (1-2 blocks,1-5 points), moderate impact (3-5 blocks, 8-15 points), significant impact (6+ blocks, 18+ points)
  
  if (blockedCount <= 2) {
    return blockedCount * 2.5; 
  }
  
  const logPenalty = 5 + 10 * Math.log2(blockedCount - 1);
  return Math.min(50, Math.round(logPenalty));
}

function analyzeTrends(ratings) {
  const validRatings = ratings.filter((r) => !r.didNotShowUp && !r.cancelled);

  if (validRatings.length < 4) {
    return { trend: "insufficient_data", improvement: 0 };
  }

  // Split ratings into older and recent halves
  const midpoint = Math.floor(validRatings.length / 2);
  const olderRatings = validRatings.slice(0, midpoint);
  const recentRatings = validRatings.slice(midpoint);

  const calculatePeriodScore = (ratings) => {
    const safetyFields = [
      "madeMeFeelSafe",
      "asDescribedInProfile",
      "respectfulOfBoundaries",
    ];
    let total = 0,
      count = 0;

    for (const rating of ratings) {
      for (const field of safetyFields) {
        if (
          rating.safetyAndRespect &&
          rating.safetyAndRespect[field] !== undefined
        ) {
          total += rating.safetyAndRespect[field] ? 1 : 0;
          count++;
        }
      }
    }

    return count > 0 ? (total / count) * 100 : 0;
  };

  const olderScore = calculatePeriodScore(olderRatings);
  const recentScore = calculatePeriodScore(recentRatings);
  const improvement = recentScore - olderScore;

  let trend;
  if (improvement > 15) {
    trend = "improving";
  } else if (improvement < -15) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  return { trend, improvement: Math.round(improvement) };
}

function buildEnhancedBadges(
  ratings,
  safetyScore,
  dimensionalScores,
  confidence,
  trendAnalysis,
  blockedCount = 0
) {
  const badges = [];
  const validRatings = ratings.filter((r) => !r.didNotShowUp && !r.cancelled);

  // Blocked user warnings 
  if (blockedCount >= 10) {
    badges.push("🚨 Multiple Blocks");
  } else if (blockedCount >= 5) {
    badges.push("⚠️ Several Blocks");
  } else if (blockedCount >= 3) {
    badges.push("⚠️ Some Blocks");
  }

  // Safety badges with confidence requirements
  if (safetyScore >= 90 && confidence.score >= 75) {
    badges.push("🛡️ Highly Trusted");
  } else if (safetyScore >= 80 && confidence.score >= 60) {
    badges.push("🛡️ Trusted");
  } else if (safetyScore >= 70) {
    badges.push("🛡️ Generally Safe");
  } else if (safetyScore < 50) {
    badges.push("⚠️ Safety Concerns");
  }

  // Dimensional excellence badges
  if (dimensionalScores.physicalSafety >= 95) {
    badges.push("🔒 Physical Safety Expert");
  }

  if (dimensionalScores.trustworthiness >= 95) {
    badges.push("✅ Completely Authentic");
  }

  if (dimensionalScores.reliability >= 95) {
    badges.push("⏰ Ultra Reliable");
  }

  // Trend badges
  if (trendAnalysis.trend === "improving" && trendAnalysis.improvement >= 20) {
    badges.push("📈 Rapidly Improving");
  } else if (trendAnalysis.trend === "improving") {
    badges.push("📈 Getting Better");
  }

  // Confidence badges
  if (confidence.level === "high" && safetyScore >= 75) {
    badges.push("📊 Well-Established");
  }

  // Consideration badges (keep existing logic but with higher thresholds)
  const considerationMap = {
    onTime: "⏰ Punctual",
    attentive: "👂 Attentive",
    goodManners: "🙏 Well-mannered",
  };

  for (const [field, label] of Object.entries(considerationMap)) {
    const countTrue = validRatings.filter(
      (r) => r.consideration && r.consideration[field]
    ).length;
    if (validRatings.length > 0 && countTrue / validRatings.length >= 0.8) {
      // Higher threshold
      badges.push(label);
    }
  }

  // Qualities badges (keep existing logic but with higher thresholds)
  const qualitiesMap = {
    dressedWell: "👗 Dressed Well",
    smelledNice: "👃 Smelled Nice",
    goodEnergy: "⚡ Good Energy",
    charmingSmile: "😊 Charming Smile",
    athletic: "🏃 Athletic",
    competitiveDrive: "🏆 Competitive",
    openToAnything: "🤝 Open-minded",
  };

  for (const [field, label] of Object.entries(qualitiesMap)) {
    const countTrue = validRatings.filter(
      (r) => r.qualities && r.qualities[field]
    ).length;
    if (validRatings.length > 0 && countTrue / validRatings.length >= 0.75) {
      // Higher threshold
      badges.push(label);
    }
  }

  // Experience badges
  if (validRatings.length >= 15) {
    badges.push("⭐ Veteran");
  } else if (validRatings.length >= 8) {
    badges.push("⭐ Experienced");
  }

  return badges;
}

module.exports = { recalcProfileStats };
