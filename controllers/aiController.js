import OpenAI from "openai";
import db from "../configs/db.js";
import { clerkClient } from "@clerk/express";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;

    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        error: "Free usage limit exceeded. Please upgrade to premium plan.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: length,
    });

    const content = response.choices[0].message.content;

    await db`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article');`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("Error generating article:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;

    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        error: "Free usage limit exceeded. Please upgrade to premium plan.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;

    await db`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title');`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.error("Error generating article:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// import { GoogleGenerativeAI } from "@google/generative-ai";
// import db from "../configs/db.js";
// import { clerkClient } from "@clerk/express";

// // ✅ Setup Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// /**
//  * Safe extractor for Gemini responses
//  */
// const extractText = (result) => {
//   if (!result) return "";

//   try {
//     // ✅ New SDK style
//     if (typeof result.response?.text === "function") {
//       return result.response.text();
//     }

//     // ✅ Candidate parts style
//     if (result.response?.candidates?.length) {
//       return result.response.candidates
//         .flatMap((c) => c.content?.parts || [])
//         .map((p) => p.text || "")
//         .join("\n")
//         .trim();
//     }
//   } catch (err) {
//     console.error("⚠️ Failed to extract text:", err);
//   }

//   return "";
// };

// /**
//  * Generate Article
//  */
// export const generateArticle = async (req, res) => {

//   console.log("REQ AUTH:", req.auth); 
//   if (!req.auth || !req.auth.userId) {
//     return res.status(401).json({ success: false, error: "Unauthorized" });
//   }
//   try {
//     const { userId } = req.auth;
//     const { topic, length, words } = req.body;
//     const plan = req.plan;
//     const free_usage = req.free_usage ;

//     if (!userId)
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     if (!topic) return res.json({ success: false, error: "Missing topic" });
//     if (plan !== "premium" && free_usage >= 15) {
//       return res
//         .status(403)
//         .json({
//           success: false,
//           error: "Free usage limit exceeded. Upgrade to premium.",
//         });
//     }

//     const prompt = `
// Write a detailed ${length} article about "${topic}" in around ${words}.
// - A big heading (<h1>) with the article title.
// - Include an introduction paragraph.
// - Use bold headings and subheadings (<h1>, <h2>, <h3>) for sections.
// - Include lists (<ul><li>) for steps, tips, and examples.
// - Include tips or examples in italic or bold where appropriate.
// - Use clear, simple language.
// - End with a conclusion.
// - Do NOT include outer <html>, <body>, or metadata tags.
// - Output clean HTML suitable for ReactMarkdown or ReactQuill with correct heading, list, and paragraph formatting.
//       `;

//     // ✅ Gemini generate
//     const result = await model.generateContent(prompt);

//     console.log("🔎 Gemini raw result:", JSON.stringify(result, null, 2));

//     const text = extractText(result);

//     if (!text) {
//       return res
//         .status(502)
//         .json({ success: false, error: "⚠️ No article received from API." });
//     }

//     // ✅ Save in DB
//     db`
//       INSERT INTO creations (user_id, prompt, content, type)
//       VALUES (${userId}, ${prompt}, ${text}, 'article')
//     `.catch((err) => console.error("DB insert failed:", err));

//     // ✅ Update free usage
//     if (plan !== "premium") {
//       try {
//         const user = await clerkClient.users.getUser(userId);
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: {
//             ...user.privateMetadata,
//             free_usage: free_usage + 1,
//           },
//         });
//       } catch (err) {
//         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
//       }
//     }

//     res.json({ success: true, article: text });
//   } catch (err) {
//     console.error("❌ Article generation error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// /**
//  * Generate Blog Titles
//  */
// export const generateBlogTitle = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { topic } = req.body;
//     const plan = req.plan || "free";
//     const free_usage = req.free_usage || 0;

//     if (!userId)
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     if (!topic) return res.json({ success: false, error: "Missing topic" });
//     if (plan !== "premium" && free_usage >= 15) {
//       return res
//         .status(403)
//         .json({
//           success: false,
//           error: "Free usage limit exceeded. Upgrade to premium.",
//         });
//     }

//     const prompt = `Suggest 5  Blog titles for: "${topic}" With headings in bold and Bigger`;

//     // ✅ Gemini generate
//     const result = await model.generateContent(prompt);

//     console.log("🔎 Gemini raw result:", JSON.stringify(result, null, 2));

//     const text = extractText(result);

//     if (!text) {
//       return res
//         .status(502)
//         .json({ success: false, error: "⚠️ No titles received from API." });
//     }

//     // ✅ Save in DB
//     db`
//       INSERT INTO creations (user_id, prompt, content, type)
//       VALUES (${userId}, ${prompt}, ${text}, 'blog-title')
//     `.catch((err) => console.error("DB insert failed:", err));

//     // ✅ Update free usage
//     if (plan !== "premium") {
//       try {
//         const user = await clerkClient.users.getUser(userId);
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: {
//             ...user.privateMetadata,
//             free_usage: free_usage + 1,
//           },
//         });
//       } catch (err) {
//         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
//       }
//     }

//     res.json({ success: true, titles: text });
//   } catch (err) {
//     console.error("❌ Blog title generation error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };




