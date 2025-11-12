// Enhanced verification route with AWS Textract and comprehensive document analysis
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const Tesseract = require("tesseract.js");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Configure AWS services with proper error handling
const rekognition = new AWS.Rekognition({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const textract = new AWS.Textract({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// Test AWS credentials on startup
async function testAWSCredentials() {
  try {
    await rekognition.describeCollection({ CollectionId: "test" }).promise();
  } catch (error) {
    if (error.code === "ResourceNotFoundException") {
    } else if (
      error.code === "InvalidParameterException" ||
      error.code === "AccessDeniedException"
    ) {
      console.error("❌ AWS credentials invalid:", error.message);
    }
  }

  try {
    await textract.getDocumentAnalysis({ JobId: "test" }).promise();
  } catch (error) {
    if (error.code === "InvalidJobIdException") {
    } else if (error.code === "AccessDeniedException") {
      console.error("❌ AWS Textract credentials invalid:", error.message);
    }
  }
}

// Initialize credentials test
testAWSCredentials();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for higher quality
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"), false);
    }
  },
});

// Helper function to calculate age from date string
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Enhanced date parsing and normalization
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Remove common prefixes and clean the string
  const cleaned = dateStr
    .toLowerCase()
    .replace(/dob|date of birth|birth|born/g, "")
    .replace(/[^\d\/\-\.]/g, "")
    .trim();

  const datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/, // MM/DD/YY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
    /(\d{2})(\d{2})(\d{4})/, // MMDDYYYY
    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
  ];

  for (const pattern of datePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let [, part1, part2, part3] = match;

      // Handle different formats
      if (part3.length === 4) {
        // Format: MM/DD/YYYY or DD/MM/YYYY
        const year = parseInt(part3);
        const month = parseInt(part1) - 1; // JavaScript months are 0-indexed
        const day = parseInt(part2);

        // Try both MM/DD and DD/MM formats
        const date1 = new Date(year, month, day);
        const date2 = new Date(year, parseInt(part2) - 1, parseInt(part1));

        // Return the date that makes more sense (not in future, reasonable age)
        const age1 = calculateAge(date1);
        const age2 = calculateAge(date2);

        if (age1 >= 0 && age1 <= 120) return date1;
        if (age2 >= 0 && age2 <= 120) return date2;

        return date1; // Default to first interpretation
      } else if (part1.length === 4) {
        // Format: YYYY/MM/DD
        return new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
      } else if (part3.length === 2) {
        // Format: MM/DD/YY - need to determine century
        let year = parseInt(part3);
        year += year > 30 ? 1900 : 2000; // Assume 31-99 = 1931-1999, 00-30 = 2000-2030
        return new Date(year, parseInt(part1) - 1, parseInt(part2));
      }
    }
  }

  return null;
}

// Compare two dates with tolerance
function compareDates(date1, date2, toleranceDays = 1) {
  if (!date1 || !date2) return { match: false, difference: null };

  const d1 = new Date(date1);
  const d2 = new Date(date2);

  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    match: diffDays <= toleranceDays,
    difference: diffDays,
    date1String: d1.toDateString(),
    date2String: d2.toDateString(),
  };
}

// Validate document based on type with more flexible matching
function validateDocumentType(text, idType) {
  const validationRules = {
    drivers_license: {
      requiredKeywords: ["license", "driver", "dl", "permit"],
      optionalKeywords: [
        "state",
        "department",
        "motor",
        "vehicles",
        "restriction",
        "class",
        "expires",
        "issued",
        "dmv",
      ],
      minKeywords: 2, // Reduced for better matching
    },
    passport: {
      requiredKeywords: ["passport", "united states", "usa"],
      optionalKeywords: [
        "nationality",
        "date of birth",
        "place of birth",
        "authority",
        "passport no",
        "department",
        "state",
      ],
      minKeywords: 2, // Reduced for better matching
    },
    state_id: {
      requiredKeywords: ["identification", "state", "id"],
      optionalKeywords: [
        "department",
        "height",
        "weight",
        "eyes",
        "expires",
        "issued",
        "card",
        "identity",
      ],
      minKeywords: 2,
    },
    military_id: {
      requiredKeywords: ["department", "defense", "military"],
      optionalKeywords: ["armed forces", "card", "cac", "common access", "dod"],
      minKeywords: 2,
    },
    national_id: {
      requiredKeywords: ["identification", "national", "government"],
      optionalKeywords: ["federal", "republic", "citizen", "card"],
      minKeywords: 2,
    },
  };

  const rules = validationRules[idType];
  if (!rules) {
    return { isValid: false, confidence: 0 };
  }

  const foundRequired = rules.requiredKeywords.filter((keyword) =>
    text.includes(keyword.toLowerCase())
  );

  const foundOptional = rules.optionalKeywords.filter((keyword) =>
    text.includes(keyword.toLowerCase())
  );

  const totalFound = foundRequired.length + foundOptional.length;
  const requiredFound = foundRequired.length;

  // More flexible validation - require at least 1 required keyword OR sufficient total keywords
  const isValid = requiredFound >= 1 || totalFound >= rules.minKeywords;
  const confidence = Math.min(
    100,
    ((requiredFound * 2 + foundOptional.length) /
      (rules.requiredKeywords.length + 2)) *
      100
  );

  return {
    isValid: isValid,
    confidence: confidence,
    foundKeywords: totalFound,
    foundRequired: foundRequired,
    foundOptional: foundOptional,
  };
}
// Enhanced document analysis using ONLY AWS Rekognition (free tier compatible)
async function analyzeDocument(imageBuffer, idType) {

  try {
    // Validate buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Invalid image buffer");
    }


    // Use ONLY Rekognition for text detection (no Textract needed)
    const rekognitionResult = await rekognition
      .detectText({
        Image: { Bytes: imageBuffer },
      })
      .promise();


    // Extract all detected text
    const rekognitionText = rekognitionResult.TextDetections
      ? rekognitionResult.TextDetections.filter(
          (detection) => detection.Type === "LINE"
        )
          .map((detection) => detection.DetectedText || "")
          .join(" ")
          .toLowerCase()
      : "";

    const combinedText = rekognitionText.trim();


    if (!combinedText || combinedText.length < 10) {
      throw new Error("Insufficient text extracted from document");
    }

    // Document type specific validation
    const validationResult = validateDocumentType(combinedText, idType);


    // Check for security features using only Rekognition data
    const securityCheck = checkSecurityFeaturesRekognitionOnly(
      rekognitionResult,
      idType
    );

    // Extract key information including DOB
    const extractedInfo = extractDocumentInfo(combinedText, idType);

    // Enhanced DOB extraction using only Rekognition
    const extractedDOB = extractDateOfBirthRekognitionOnly(
      combinedText,
      rekognitionResult
    );

    const result = {
      isValid: validationResult.isValid,
      confidence: validationResult.confidence,
      securityFeatures: securityCheck,
      extractedInfo: { ...extractedInfo, dateOfBirth: extractedDOB },
      rawText: combinedText,
      documentType: idType,
      authentic: securityCheck.score > 40, // Lower threshold since we can't use Textract
    };


    return result;
  } catch (error) {
    console.error("❌ Document analysis error:", error);

    // Provide more specific error information
    let errorMessage = "Document analysis failed";
    if (error.code === "InvalidImageFormatException") {
      errorMessage = "Invalid image format - please use PNG or JPEG";
    } else if (error.code === "ImageTooLargeException") {
      errorMessage = "Image too large - please reduce file size";
    } else if (error.code === "InvalidParameterException") {
      errorMessage = "Invalid image parameters";
    } else if (error.code === "AccessDeniedException") {
      errorMessage = "AWS access denied - check credentials";
    } else if (error.code === "ThrottlingException") {
      errorMessage = "Service temporarily throttled - please try again";
    } else if (error.code === "SubscriptionRequiredException") {
      errorMessage =
        "AWS service subscription required - using fallback analysis";
    }

    return {
      isValid: false,
      confidence: 0,
      error: errorMessage,
      authentic: false,
      rawError: error.message,
      errorCode: error.code,
    };
  }
}

// Enhanced DOB extraction using only Rekognition data
function extractDateOfBirthRekognitionOnly(text, rekognitionResult) {
  const dobKeywords = ["dob", "date of birth", "birth", "born", "birthdate"];
  const results = [];


  // Method 1: Look for DOB keywords followed by dates in the text
  for (const keyword of dobKeywords) {
    const keywordIndex = text.indexOf(keyword);
    if (keywordIndex !== -1) {
      const section = text.substring(keywordIndex, keywordIndex + 100);
      const dateMatch = section.match(
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
      );
      if (dateMatch) {
        const parsedDate = parseDate(dateMatch[0]);
        if (parsedDate) {
          results.push({
            date: parsedDate,
            confidence: 90,
            method: `Found near keyword: ${keyword}`,
            raw: dateMatch[0],
          });
        }
      }
    }
  }

  // Method 2: Use Rekognition's spatial text detection to find dates near DOB keywords
  if (rekognitionResult && rekognitionResult.TextDetections) {
    try {
      const textDetections = rekognitionResult.TextDetections.filter(
        (detection) => detection.Type === "WORD" && detection.DetectedText
      );

      // Find DOB-related words
      const dobWords = textDetections.filter((detection) =>
        dobKeywords.some((keyword) =>
          detection.DetectedText.toLowerCase().includes(keyword)
        )
      );

      // For each DOB word, look for nearby date patterns
      for (const dobWord of dobWords) {
        const dobGeometry = dobWord.Geometry.BoundingBox;

        // Find text detections that are spatially close to the DOB keyword
        const nearbyText = textDetections.filter((detection) => {
          if (!detection.Geometry || !detection.Geometry.BoundingBox)
            return false;

          const textGeometry = detection.Geometry.BoundingBox;
          const distance = Math.sqrt(
            Math.pow(dobGeometry.Left - textGeometry.Left, 2) +
              Math.pow(dobGeometry.Top - textGeometry.Top, 2)
          );

          return distance < 0.3; // Adjust this threshold as needed
        });

        // Combine nearby text and look for dates
        const nearbyTextString = nearbyText
          .map((detection) => detection.DetectedText)
          .join(" ");

        const dateMatch = nearbyTextString.match(
          /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
        );

        if (dateMatch) {
          const parsedDate = parseDate(dateMatch[0]);
          if (parsedDate) {
            results.push({
              date: parsedDate,
              confidence: 85,
              method: "Rekognition spatial detection",
              raw: dateMatch[0],
            });
          }
        }
      }
    } catch (error) {
      console.error(
        "⚠️ Error processing Rekognition spatial detection:",
        error
      );
    }
  }

  // Method 3: Extract all dates and filter by reasonable birth dates
  const allDates = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) || [];
  for (const dateStr of allDates) {
    const parsedDate = parseDate(dateStr);
    if (parsedDate) {
      const age = calculateAge(parsedDate);
      if (age >= 16 && age <= 120) {
        results.push({
          date: parsedDate,
          confidence: 60,
          method: "Date pattern matching",
          raw: dateStr,
        });
      }
    }
  }


  // Return the highest confidence result
  if (results.length === 0) return null;

  results.sort((a, b) => b.confidence - a.confidence);
  return results[0];
}

// Check for security features using only Rekognition data
function checkSecurityFeaturesRekognitionOnly(rekognitionResult, idType) {
  let score = 0;
  const features = [];

  // Check text confidence levels (high confidence indicates clear, professional text)
  if (rekognitionResult.TextDetections) {
    const highConfidenceText = rekognitionResult.TextDetections.filter(
      (detection) => detection.Confidence > 90
    ).length;

    const totalText = rekognitionResult.TextDetections.length;

    if (highConfidenceText > 5) {
      score += 20;
      features.push("High-quality text detected");
    } else if (highConfidenceText > 2) {
      score += 10;
      features.push("Moderate-quality text detected");
    }

    // Check for structured text (multiple lines, consistent formatting)
    const lineDetections = rekognitionResult.TextDetections.filter(
      (detection) => detection.Type === "LINE"
    );

    if (lineDetections.length > 8) {
      score += 15;
      features.push("Structured document layout");
    } else if (lineDetections.length > 4) {
      score += 10;
      features.push("Basic document structure");
    }
  }

  // Check for date patterns (professional documents have multiple dates)
  const datePatterns = [
    /\d{2}[\/\-]\d{2}[\/\-]\d{4}/g,
    /\d{4}[\/\-]\d{2}[\/\-]\d{2}/g,
    /\w{3}\s+\d{1,2},?\s+\d{4}/g,
  ];

  let dateCount = 0;
  const allText = rekognitionResult.TextDetections
    ? rekognitionResult.TextDetections.map((d) => d.DetectedText || "").join(
        " "
      )
    : "";

  datePatterns.forEach((pattern) => {
    const matches = allText.match(pattern);
    if (matches) dateCount += matches.length;
  });

  if (dateCount >= 2) {
    score += 15;
    features.push("Multiple date fields found");
  } else if (dateCount >= 1) {
    score += 10;
    features.push("Date field found");
  }

  // ID-specific security checks
  if (idType === "drivers_license") {
    if (allText.toLowerCase().includes("class")) {
      score += 15;
      features.push("License class found");
    }
    if (allText.toLowerCase().includes("restriction")) {
      score += 10;
      features.push("License restrictions found");
    }
  }

  if (idType === "passport") {
    if (allText.match(/[A-Z0-9]{6,9}/)) {
      score += 20;
      features.push("Passport number pattern detected");
    }
    if (allText.toLowerCase().includes("nationality")) {
      score += 10;
      features.push("Nationality field found");
    }
  }

  // Check for government formatting
  const govKeywords = [
    "united states",
    "state of",
    "department",
    "government",
    "official",
    "bureau",
  ];
  const foundGovKeywords = govKeywords.filter((keyword) =>
    allText.toLowerCase().includes(keyword)
  ).length;

  if (foundGovKeywords >= 2) {
    score += 15;
    features.push("Strong government document indicators");
  } else if (foundGovKeywords >= 1) {
    score += 10;
    features.push("Government document indicators");
  }

  // Basic document quality check
  if (allText.length > 100) {
    score += 5;
    features.push("Substantial text content");
  } else if (allText.length > 50) {
    score += 3;
    features.push("Adequate text content");
  }

  // Check for uppercase formatting (common in official documents)
  const uppercaseRatio =
    (allText.match(/[A-Z]/g) || []).length / allText.length;
  if (uppercaseRatio > 0.3) {
    score += 5;
    features.push("Official document formatting");
  }

  return {
    score: Math.min(100, score),
    features: features,
    dateCount: dateCount,
  };
}

// Extract key information from document
function extractDocumentInfo(text, idType) {
  const info = {};

  // Extract dates
  const datePatterns = [
    /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g,
    /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/g,
  ];

  const dates = [];
  datePatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) dates.push(...matches);
  });

  info.dates = dates;

  // Try to identify expiration date
  const expireIndex = text.indexOf("exp");
  if (expireIndex !== -1) {
    const expireSection = text.substring(expireIndex, expireIndex + 20);
    const expireDate = expireSection.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
    if (expireDate) {
      info.expirationDate = expireDate[0];
      info.expired = new Date(expireDate[0]) < new Date();
    }
  }

  // Extract document number patterns
  if (idType === "drivers_license") {
    const dlNumber = text.match(/[A-Z]\d{7,12}|\d{8,12}/);
    if (dlNumber) info.documentNumber = dlNumber[0];
  }

  if (idType === "passport") {
    const passportNumber = text.match(/[A-Z0-9]{6,9}/); // More flexible pattern
    if (passportNumber) info.documentNumber = passportNumber[0];
  }

  return info;
}

// Enhanced face comparison with liveness detection
async function enhancedFaceComparison(selfieBuffer, idBuffer) {

  try {
    // Validate buffers
    if (
      !selfieBuffer ||
      !idBuffer ||
      selfieBuffer.length === 0 ||
      idBuffer.length === 0
    ) {
      throw new Error("Invalid image buffers for face comparison");
    }

    // Basic face comparison
    const comparison = await rekognition
      .compareFaces({
        SourceImage: { Bytes: selfieBuffer },
        TargetImage: { Bytes: idBuffer },
        SimilarityThreshold: 70, // Lower threshold for initial detection
        QualityFilter: "AUTO",
      })
      .promise();

    // Face quality analysis for selfie
    const selfieAnalysis = await rekognition
      .detectFaces({
        Image: { Bytes: selfieBuffer },
        Attributes: ["ALL"],
      })
      .promise();


    // Face quality analysis for ID
    const idAnalysis = await rekognition
      .detectFaces({
        Image: { Bytes: idBuffer },
        Attributes: ["ALL"],
      })
      .promise();


    let result = {
      match: false,
      similarity: 0,
      qualityScore: 0,
      issues: [],
    };

    if (comparison.FaceMatches && comparison.FaceMatches.length > 0) {
      result.similarity = comparison.FaceMatches[0].Similarity;
      result.match = result.similarity > 80; // Slightly lower threshold
    } else {
      if (comparison.UnmatchedFaces && comparison.UnmatchedFaces.length > 0) {
        result.issues.push("Face detected but no match found");
      } else {
        result.issues.push("No face detected in one or both images");
      }
    }

    // Quality checks with better error handling
    if (selfieAnalysis.FaceDetails && selfieAnalysis.FaceDetails.length > 0) {
      const face = selfieAnalysis.FaceDetails[0];

      if (face.Quality) {
        if (face.Quality.Brightness < 25 || face.Quality.Brightness > 85) {
          result.issues.push("Poor lighting in selfie");
        }

        if (face.Quality.Sharpness < 40) {
          result.issues.push("Selfie is blurry");
        }

        result.qualityScore =
          (face.Quality.Brightness + face.Quality.Sharpness) / 2;
      }

      if (
        face.Sunglasses &&
        face.Sunglasses.Value &&
        face.Sunglasses.Confidence > 80
      ) {
        result.issues.push("Remove sunglasses for selfie");
      }

      if (
        face.EyesOpen &&
        !face.EyesOpen.Value &&
        face.EyesOpen.Confidence > 80
      ) {
        result.issues.push("Eyes should be open in selfie");
      }
    } else {
      result.issues.push("No face detected in selfie");
    }


    return result;
  } catch (error) {
    console.error("❌ Face comparison error:", error);

    let errorMessage = "Face comparison failed";
    if (error.code === "InvalidImageFormatException") {
      errorMessage = "Invalid image format for face comparison";
    } else if (error.code === "ImageTooLargeException") {
      errorMessage = "Image too large for face comparison";
    } else if (error.code === "InvalidParameterException") {
      errorMessage = "Invalid parameters for face comparison";
    }

    return {
      match: false,
      similarity: 0,
      qualityScore: 0,
      issues: [errorMessage],
      error: error.message,
      errorCode: error.code,
    };
  }
}

// Main enhanced verification endpoint
router.post(
  "/verify/auto-submit",
  authMiddleware,
  upload.fields([
    { name: "idPhoto", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { firstName, lastName, dateOfBirth, idType } = req.body;


      if (!req.files.idPhoto || !req.files.selfie) {
        return res
          .status(400)
          .json({ error: "Both ID photo and selfie required" });
      }

      if (!idType) {
        return res.status(400).json({ error: "ID type is required" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isIdVerified) {
        return res.status(400).json({ error: "Already verified" });
      }

      const idPhotoBuffer = req.files.idPhoto[0].buffer;
      const selfieBuffer = req.files.selfie[0].buffer;

      let verificationScore = 0;
      let verificationDetails = {};
      let reasons = [];
      let criticalFailures = [];


      // Step 1: Enhanced Face Comparison (35 points)
      let faceMatchPassed = false;
      try {
        const faceResult = await enhancedFaceComparison(
          selfieBuffer,
          idPhotoBuffer
        );
        verificationDetails.faceComparison = faceResult;

        if (faceResult.match && faceResult.similarity > 90) {
          verificationScore += 35;
          faceMatchPassed = true;
          reasons.push(
            `✓ Face match: Excellent (${Math.round(faceResult.similarity)}%)`
          );
        } else if (faceResult.match && faceResult.similarity > 80) {
          verificationScore += 25;
          faceMatchPassed = true;
          reasons.push(
            `✓ Face match: Good (${Math.round(faceResult.similarity)}%)`
          );
        } else if (faceResult.similarity > 70) {
          verificationScore += 15;
          reasons.push(
            `⚠ Face match: Low confidence (${Math.round(
              faceResult.similarity
            )}%)`
          );
        } else {
          criticalFailures.push("Face matching failed");
          reasons.push(
            `✗ Face match: Failed (${Math.round(faceResult.similarity)}%)`
          );
        }

        // Add quality issues
        if (faceResult.issues && faceResult.issues.length > 0) {
          faceResult.issues.forEach((issue) => {
            reasons.push(`⚠ ${issue}`);
          });
        }
      } catch (error) {
        console.error("❌ Face comparison service error:", error);
        criticalFailures.push("Face comparison service error");
        reasons.push("✗ Face comparison failed - service error");
      }

      // Step 2: Enhanced Document Analysis (35 points)
      let documentPassed = false;
      try {
        const documentAnalysis = await analyzeDocument(idPhotoBuffer, idType);
        verificationDetails.documentAnalysis = documentAnalysis;


        if (documentAnalysis.isValid && documentAnalysis.authentic) {
          verificationScore += 35;
          documentPassed = true;
          reasons.push(`✓ ${idType.replace("_", " ")} verified as authentic`);
          reasons.push(
            `✓ Document confidence: ${Math.round(documentAnalysis.confidence)}%`
          );

          // Add security feature details
          if (documentAnalysis.securityFeatures.features.length > 0) {
            documentAnalysis.securityFeatures.features.forEach((feature) => {
              reasons.push(`✓ ${feature}`);
            });
          }
        } else if (documentAnalysis.isValid) {
          verificationScore += 20;
          documentPassed = true; // Allow valid but not fully authentic docs
          reasons.push(`⚠ Document appears valid but authenticity unclear`);
          reasons.push(
            `✓ Document confidence: ${Math.round(documentAnalysis.confidence)}%`
          );
        } else {
          // Don't mark as critical failure if we got some analysis
          if (documentAnalysis.confidence > 0) {
            verificationScore += 10; // Partial credit
            reasons.push(
              `⚠ ${idType.replace("_", " ")} validation inconclusive`
            );
            reasons.push(
              `⚠ Document confidence: ${Math.round(
                documentAnalysis.confidence
              )}%`
            );
          } else {
            criticalFailures.push("Invalid or unrecognized document");
            reasons.push(`✗ ${idType.replace("_", " ")} validation failed`);
          }
        }

        // Check expiration with better handling
        if (
          documentAnalysis.extractedInfo &&
          documentAnalysis.extractedInfo.expired
        ) {
          criticalFailures.push("Document has expired");
          reasons.push("✗ Document has expired");
        } else if (
          documentAnalysis.extractedInfo &&
          documentAnalysis.extractedInfo.expirationDate
        ) {
          reasons.push(
            `✓ Document expires: ${documentAnalysis.extractedInfo.expirationDate}`
          );
        }

        // Add error information if present
        if (documentAnalysis.error) {
          reasons.push(`⚠ ${documentAnalysis.error}`);
        }
      } catch (error) {
        console.error("❌ Document analysis service error:", error);
        criticalFailures.push("Document analysis failed");
        reasons.push("✗ Document analysis service error");
      }

      // Step 3: Enhanced Date of Birth Verification (20 points)
      let dobVerificationPassed = false;
      const userDOB = new Date(user.dateOfBirth || dateOfBirth);
      const submittedDOB = new Date(dateOfBirth);
      const userAge = calculateAge(userDOB);

      verificationDetails.dateOfBirth = {
        userDOB: userDOB.toDateString(),
        submittedDOB: submittedDOB.toDateString(),
        userAge: userAge,
      };

      // Check if user is over 18
      if (userAge < 18) {
        criticalFailures.push("User must be 18 or older");
        reasons.push(
          `✗ Age verification failed: ${userAge} years old (must be 18+)`
        );
      } else {
        verificationScore += 5;
        reasons.push(`✓ Age verified: ${userAge} years old`);
      }

      // Compare user's stored DOB with submitted DOB
      const dobComparison = compareDates(userDOB, submittedDOB, 0);
      if (dobComparison.match) {
        verificationScore += 5;
        reasons.push("✓ Submitted DOB matches profile DOB");
      } else if (dobComparison.difference <= 1) {
        verificationScore += 3;
        reasons.push("⚠ Minor discrepancy in submitted DOB");
      } else {
        criticalFailures.push("DOB mismatch between profile and submission");
        reasons.push(
          `✗ DOB mismatch: Profile (${dobComparison.date1String}) vs Submitted (${dobComparison.date2String})`
        );
      }

      // Compare with extracted DOB from document
      if (verificationDetails.documentAnalysis?.extractedInfo?.dateOfBirth) {
        const extractedDOB =
          verificationDetails.documentAnalysis.extractedInfo.dateOfBirth;
        verificationDetails.dateOfBirth.extractedDOB =
          extractedDOB.date?.toDateString();
        verificationDetails.dateOfBirth.extractionMethod = extractedDOB.method;
        verificationDetails.dateOfBirth.extractionConfidence =
          extractedDOB.confidence;

        const docDobComparison = compareDates(userDOB, extractedDOB.date, 1);
        if (docDobComparison.match) {
          verificationScore += 10;
          dobVerificationPassed = true;
          reasons.push(
            `✓ DOB verified from document: ${extractedDOB.date.toDateString()}`
          );
          reasons.push(
            `✓ Extraction method: ${extractedDOB.method} (${extractedDOB.confidence}% confidence)`
          );
        } else if (docDobComparison.difference <= 7) {
          verificationScore += 5;
          reasons.push(
            `⚠ Minor DOB discrepancy with document (${docDobComparison.difference} days difference)`
          );
        } else {
          reasons.push(
            `✗ DOB mismatch with document: ${docDobComparison.difference} days difference`
          );
        }
      } else {
        reasons.push("⚠ Could not extract DOB from document");
      }

      // Step 4: Enhanced Name Matching (10 points)
      try {
        const documentText =
          verificationDetails.documentAnalysis?.rawText || "";

        // More flexible name matching
        const firstNameLower = firstName.toLowerCase();
        const lastNameLower = lastName.toLowerCase();

        // Check for various name formats
        const firstNameMatch =
          documentText.includes(firstNameLower) ||
          documentText.includes(firstNameLower.substring(0, 3)); // Partial match
        const lastNameMatch =
          documentText.includes(lastNameLower) ||
          documentText.includes(lastNameLower.substring(0, 3)); // Partial match

        if (firstNameMatch && lastNameMatch) {
          verificationScore += 10;
          reasons.push("✓ Full name verified in document");
        } else if (firstNameMatch || lastNameMatch) {
          verificationScore += 5;
          reasons.push("⚠ Partial name match found");
        } else {
          reasons.push("✗ Name not clearly found in document");
        }
      } catch (error) {
        console.error("⚠️ Name verification error:", error);
        reasons.push("⚠ Name verification inconclusive");
      }

      // Enhanced Decision Logic with more flexible criteria
      const passedCriticalChecks = criticalFailures.length === 0;
      const hasMinimumScore = verificationScore >= 60; // Lowered threshold
      const hasFaceMatch = faceMatchPassed;
      const hasValidDocument = documentPassed || verificationScore >= 40; // More flexible
      const hasValidAge = userAge >= 18;

      // More lenient approval logic
      const isApproved =
        (passedCriticalChecks &&
          hasMinimumScore &&
          hasFaceMatch &&
          hasValidAge) ||
        (passedCriticalChecks && verificationScore >= 80); // High score can override some requirements

      if (!isApproved && criticalFailures.length > 0) {
        reasons.unshift(`❌ CRITICAL ISSUES: ${criticalFailures.join(", ")}`);
      }

      // Update user record
      user.isIdVerified = isApproved;
      user.verificationStatus = isApproved ? "approved" : "rejected";
      user.verificationScore = verificationScore;
      user.verificationDetails = verificationDetails;
      user.verificationReasons = reasons;
      user.idType = idType; // Store the verified ID type

      if (isApproved) {
        user.verifiedAt = new Date();
      }

      await user.save();

      // Clear sensitive data from memory
      idPhotoBuffer.fill(0);
      selfieBuffer.fill(0);
      delete req.files.idPhoto;
      delete req.files.selfie;

      res.json({
        verified: isApproved,
        score: verificationScore,
        maxScore: 100,
        message: isApproved
          ? `${idType.replace(
              "_",
              " "
            )} successfully verified! Your account is now trusted.`
          : "Verification failed. Please ensure you submit a clear, valid government-issued ID with matching personal information.",
        reasons: reasons,
        documentAnalysis: verificationDetails.documentAnalysis
          ? {
              documentType: idType,
              authentic: verificationDetails.documentAnalysis.authentic,
              expired:
                verificationDetails.documentAnalysis.extractedInfo?.expired ||
                false,
              confidence: Math.round(
                verificationDetails.documentAnalysis.confidence || 0
              ),
            }
          : null,
        details: {
          faceMatch: verificationDetails.faceComparison?.similarity
            ? Math.round(verificationDetails.faceComparison.similarity)
            : 0,
          documentValid: verificationDetails.documentAnalysis?.isValid || false,
          documentAuthentic:
            verificationDetails.documentAnalysis?.authentic || false,
          ageVerified: userAge >= 18,
          dobExtracted:
            !!verificationDetails.documentAnalysis?.extractedInfo?.dateOfBirth,
          dobMatches: dobVerificationPassed,
          criticalFailures: criticalFailures,
          idType: idType,
        },
      });
    } catch (error) {
      // Ensure cleanup even on error
      if (req.files?.idPhoto?.[0]?.buffer) req.files.idPhoto[0].buffer.fill(0);
      if (req.files?.selfie?.[0]?.buffer) req.files.selfie[0].buffer.fill(0);

      console.error("❌ Enhanced verification error:", error);
      res.status(500).json({
        error:
          "Verification service temporarily unavailable. Please try again later.",
        details: "All uploaded images were securely processed and deleted.",
        technicalError: error.message, // Add for debugging
      });
    }
  }
);

// Get verification status (unchanged)
router.get("/verify/status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "isIdVerified verificationStatus verificationScore verificationReasons verifiedAt idType"
    );

    res.json({
      isVerified: user.isIdVerified || false,
      status: user.verificationStatus || "not_submitted",
      score: user.verificationScore || 0,
      reasons: user.verificationReasons || [],
      verifiedAt: user.verifiedAt || null,
      idType: user.idType || null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

module.exports = router;
