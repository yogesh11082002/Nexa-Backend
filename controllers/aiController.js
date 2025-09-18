// import OpenAI from "openai";
// import db from "../configs/db.js";
// import { clerkClient } from "@clerk/express";

// const AI = new OpenAI({
//   apiKey: process.env.GEMINI_API_KEY,
//   baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
// });

// export const generateArticle = async (req, res) => {
//   try {
//     const { userId } = req.auth();
//     const { prompt, length } = req.body;

//     const plan = req.plan;
//     const free_usage = req.free_usage;

//     if (plan !== "premium" && free_usage >= 10) {
//       return res.json({
//         success: false,
//         error: "Free usage limit exceeded. Please upgrade to premium plan.",
//       });
//     }

//     const response = await AI.chat.completions.create({
//       model: "gemini-2.5-flash",
//       messages: [
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       temperature: 0.7,
//       max_tokens: length,
//     });

//     const content = response.choices[0].message.content;

//     await db`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article');`;

//     if (plan !== "premium") {
//       await clerkClient.users.updateUserMetadata(userId, {
//         privateMetadata: { free_usage: free_usage + 1 },
//       });
//     }

//     res.json({ success: true, content });
//   } catch (error) {
//     console.error("Error generating article:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// export const generateBlogTitle = async (req, res) => {
//   try {
//     const { userId } = req.auth();
//     const { prompt } = req.body;

//     const plan = req.plan;
//     const free_usage = req.free_usage;

//     if (plan !== "premium" && free_usage >= 10) {
//       return res.json({
//         success: false,
//         error: "Free usage limit exceeded. Please upgrade to premium plan.",
//       });
//     }

//     const response = await AI.chat.completions.create({
//       model: "gemini-2.5-flash",
//       messages: [
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       temperature: 0.7,
//       max_tokens: 100,
//     });

//     const content = response.choices[0].message.content;

//     await db`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title');`;

//     if (plan !== "premium") {
//       await clerkClient.users.updateUserMetadata(userId, {
//         privateMetadata: { free_usage: free_usage + 1 },
//       });
//     }

//     res.json({ success: true, content });
//   } catch (error) {
//     console.error("Error generating article:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };


import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import FormData from "form-data";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'

// ✅ Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Safe extractor for Gemini responses
 */
const extractText = (result) => {
  if (!result) return "";

  try {
    // ✅ New SDK style
    if (typeof result.response?.text === "function") {
      return result.response.text();
    }

    // ✅ Candidate parts style
    if (result.response?.candidates?.length) {
      return result.response.candidates
        .flatMap((c) => c.content?.parts || [])
        .map((p) => p.text || "")
        .join("\n")
        .trim();
    }
  } catch (err) {
    console.error("⚠️ Failed to extract text:", err);
  }

  return "";
};

/**
 * Generate Article
 */
export const generateArticle = async (req, res) => {

  console.log("REQ AUTH:", req.auth); 
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const { userId } = req.auth;
    const { topic, length, words } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage ;

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!topic) return res.json({ success: false, error: "Missing topic" });
    if (plan !== "premium" && free_usage >= 15) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Free usage limit exceeded. Upgrade to premium.",
        });
    }

    const prompt = `
Write a detailed ${length} article about "${topic}" in around ${words}.
- A big heading (<h1>) with the article title.
- Include an introduction paragraph.
- Use bold headings and subheadings (<h1>, <h2>, <h3>) for sections.
- Include lists (<ul><li>) for steps, tips, and examples.
- Include tips or examples in italic or bold where appropriate.
- Use clear, simple language.
- End with a conclusion.
- Do NOT include outer <html>, <body>, or metadata tags.
- Output clean HTML suitable for ReactMarkdown or ReactQuill with correct heading, list, and paragraph formatting.
      `;

    // ✅ Gemini generate
    const result = await model.generateContent(prompt);

    console.log("🔎 Gemini raw result:", JSON.stringify(result, null, 2));

    const text = extractText(result);

    if (!text) {
      return res
        .status(502)
        .json({ success: false, error: "⚠️ No article received from API." });
    }

    // ✅ Save in DB
    db`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${text}, 'article')
    `.catch((err) => console.error("DB insert failed:", err));

    // ✅ Update free usage
    if (plan !== "premium") {
      try {
        const user = await clerkClient.users.getUser(userId);
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: {
            ...user.privateMetadata,
            free_usage: free_usage + 1,
          },
        });
      } catch (err) {
        console.warn("⚠️ Failed to update Clerk metadata:", err.message);
      }
    }

    res.json({ success: true, article: text });
  } catch (err) {
    console.error("❌ Article generation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Generate Blog Titles
 */
export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { topic } = req.body;
    const plan = req.plan || "free";
    const free_usage = req.free_usage || 0;

    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!topic) return res.json({ success: false, error: "Missing topic" });
    if (plan !== "premium" && free_usage >= 15) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Free usage limit exceeded. Upgrade to premium.",
        });
    }

    const prompt = `Suggest 5  Blog titles for: "${topic}" With headings in bold and Bigger`;

    // ✅ Gemini generate
    const result = await model.generateContent(prompt);

    console.log("🔎 Gemini raw result:", JSON.stringify(result, null, 2));

    const text = extractText(result);

    if (!text) {
      return res
        .status(502)
        .json({ success: false, error: "⚠️ No titles received from API." });
    }

    // ✅ Save in DB
    db`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${text}, 'blog-title')
    `.catch((err) => console.error("DB insert failed:", err));

    // ✅ Update free usage
    if (plan !== "premium") {
      try {
        const user = await clerkClient.users.getUser(userId);
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: {
            ...user.privateMetadata,
            free_usage: free_usage + 1,
          },
        });
      } catch (err) {
        console.warn("⚠️ Failed to update Clerk metadata:", err.message);
      }
    }

    res.json({ success: true, titles: text });
  } catch (err) {
    console.error("❌ Blog title generation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { topic, publish } = req.body;
    const plan = req.plan || "free";

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!topic) {
      return res.json({ success: false, error: "Missing topic" });
    }
    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        error: "Only for Premium users. Upgrade to premium.",
      });
    }

    // ✅ Count how many images this user already generated
    const [{ count }] = await db`
      SELECT COUNT(*)::int AS count
      FROM creations
      WHERE user_id = ${userId} AND type = 'image'
    `;

    if (count >= 3) {
      return res.status(403).json({
        success: false,
        error: "⚠️ You’ve reached your 3-image limit as a Premium user.",
      });
    }

    // Build prompt for ClipDrop
    const prompt = `Create an image of "${topic}"`;

    const form = new FormData();
    form.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      form,
      {
        headers: {
          "x-api-key": process.env.CLIPDROP_API_KEY,
          ...form.getHeaders(),
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = `data:image/png;base64,${Buffer.from(
      data,
      "binary"
    ).toString("base64")}`;

    // Upload to Cloudinary
    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    // ✅ Save to DB
    await db`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    res.json({
      success: true,
      image: secure_url,
      remaining: 3 - (count + 1), // 👈 tell frontend how many images left
    });
  } catch (err) {
    console.error("❌ Image generation error:", err.response?.data || err);
    res.status(500).json({ success: false, error: err.message });
  }
};



export const removeImageBackground = async (req, res) => {
  try {
    console.log("=== REMOVE BACKGROUND ===");
    console.log("req.auth:", req.auth);
    console.log("req.plan:", req.plan);
    console.log("req.file:", req.file);

    // ✅ Auth check
    if (!req.auth || !req.auth.userId) {
      console.error("Unauthorized access");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (req.plan !== "premium") {
      console.error("Non-premium user tried to remove background");
      return res.status(403).json({ success: false, error: "Premium required" });
    }

    // ✅ File check
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ success: false, error: "No file received" });
    }

    // ✅ Count images
    const [{ count }] = await db`
      SELECT COUNT(*)::int AS count
      FROM creations
      WHERE user_id = ${req.auth.userId} AND type = 'image'
    `;

    if (count >= 5) {
      console.error("Image limit reached");
      return res.status(403).json({ success: false, error: "You’ve reached your 3-image limit." });
    }

    // ✅ Upload to Cloudinary using upload_stream
    console.log("Uploading file to Cloudinary...");

    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { transformation: [{ effect: "background_removal" }] },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload_stream error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        stream.end(fileBuffer); // send file buffer to Cloudinary
      });
    };

    const result = await streamUpload(req.file.buffer);
    const secure_url = result.secure_url;
    console.log("Cloudinary result:", secure_url);

    // ✅ Save to DB
    await db`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${req.auth.userId}, 'Remove background from image', ${secure_url}, 'image')
    `;

    console.log("Success! Sending response...");
    res.json({
      success: true,
      image: secure_url,
      remaining: 5 - (count + 1),
    });

  } catch (err) {
    console.error("Unexpected error:", err.stack || err);
    res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};


export const removeImageObject = async (req, res) => {
  try {
    console.log("=== REMOVE OBJECT FROM IMAGE ===");
    console.log("req.auth:", req.auth);
    console.log("req.plan:", req.plan);
    console.log("req.body.object:", req.body.object);
    console.log("req.file:", req.file);

    const { userId } = req.auth || {};
    const plan = req.plan;
    const objectToRemove = req.body.object;
    const imageFile = req.file;

    if (!userId) {
      console.error("Unauthorized access");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (plan !== "premium") {
      console.error("Non-premium user tried to remove object");
      return res.status(403).json({ success: false, error: "Premium required" });
    }
    if (!imageFile) {
      console.error("No file uploaded");
      return res.status(400).json({ success: false, error: "No file received" });
    }
    if (!objectToRemove) {
      console.error("No object specified");
      return res.status(400).json({ success: false, error: "Missing object to remove" });
    }

    // ✅ Check image limit
    const [{ count }] = await db`
      SELECT COUNT(*)::int AS count
      FROM creations
      WHERE user_id = ${userId} AND type = 'image'
    `;
    if (count >= 5) {
      return res.status(403).json({ success: false, error: "You’ve reached your 3-image limit." });
    }

    // ✅ Upload image to Cloudinary using upload_stream
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {},
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload_stream error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        stream.end(buffer);
      });
    };

    const uploadResult = await streamUpload(imageFile.buffer);

    // ✅ Generate URL with object removal transformation
    const imageUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { effect: `gen_remove:${objectToRemove}` },
      ],
      resource_type: "image",
    });
    console.log("Cloudinary transformed image URL:", imageUrl);

    // ✅ Save to DB
    await db`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Remove ${objectToRemove} from image`}, ${imageUrl}, 'image')
    `;

    res.json({
      success: true,
      image: imageUrl,
      remaining: 5 - (count + 1),
    });

  } catch (err) {
    console.error("❌ removeImageObject error:", err.stack || err);
    res.status(500).json({ success: false, error: err.message });
  }
};




export const reviewResume = async (req, res) => {
  try {
    console.log("=== REVIEW RESUME ===");
    console.log("req.auth:", req.auth);
    console.log("req.plan:", req.plan);
    console.log("req.file:", req.file);

    const { userId } = req.auth || {};
    const plan = req.plan;
    const resumeFile = req.file;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!resumeFile) {
      return res.status(400).json({ success: false, error: "Missing resume file" });
    }
    if (plan !== "premium") {
      return res.status(403).json({ success: false, error: "Premium required" });
    }
    if (resumeFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "File size too large" });
    }

    // ✅ Parse PDF from buffer
    const pdfData = await pdf(resumeFile.buffer);
    const prompt = `Review the following resume and provide constructive feedback on strengths, weaknesses, and areas of improvement:\n\n${pdfData.text}`;

    // ✅ Call your AI model (replace model.generateContent with actual method)
    const result = await model.generateContent(prompt);
    console.log("Raw AI result:", result);

    const text = extractText(result); // your helper function
    if (!text) {
      return res.status(502).json({ success: false, error: "No response from AI" });
    }

    // ✅ Save to DB
    await db`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${text}, 'resume-review')
    `;

    res.json({ success: true, content: text });

  } catch (err) {
    console.error("❌ reviewResume error:", err.stack || err);
    res.status(500).json({ success: false, error: err.message });
  }
};
