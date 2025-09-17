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

import OpenAI from "openai";
import db from "../configs/db.js";
import { clerkClient } from "@clerk/express";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const formatArticle = (raw) => {
  // Split by double line breaks for paragraphs
  const paragraphs = raw.split(/\n{2,}/).filter(Boolean);
  let html = "";

  paragraphs.forEach((p) => {
    // If the paragraph starts with something like "Heading:" or "Title:", treat as <h2>
    if (/^(Title|Heading|H[1-6]):?/i.test(p)) {
      html += `<h2 class="text-lg font-semibold mt-4 mb-2">${p.replace(/^(Title|Heading|H[1-6]):?\s*/i, "")}</h2>`;
    } else {
      html += `<p class="mb-3">${p}</p>`;
    }
  });

  return html;
};

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;

    const plan = req.plan || "free";
    const free_usage = req.free_usage || 0;

    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!prompt) return res.status(400).json({ success: false, error: "Missing topic" });
    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        error: "Free usage limit exceeded. Please upgrade to premium plan.",
      });
    }

    // AI generate article
    const response = await AI.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: `Write a detailed ${length} article about "${prompt}" with headings, subheadings, and paragraphs. Use HTML-style formatting if possible.`,
        },
      ],
      temperature: 0.7,
      max_tokens: length === "Short" ? 600 : length === "Medium" ? 1000 : 1500,
    });

    const rawContent = response.choices[0].message.content;

    const htmlContent = formatArticle(rawContent);

    // Save to DB
    await db`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${htmlContent}, 'article');`;

    // Update free usage
    if (plan !== "premium") {
      const user = await clerkClient.users.getUser(userId);
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { ...user.privateMetadata, free_usage: free_usage + 1 },
      });
    }

    res.json({ success: true, article: htmlContent });
  } catch (error) {
    console.error("Error generating article:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;

    const plan = req.plan || "free";
    const free_usage = req.free_usage || 0;

    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!prompt) return res.status(400).json({ success: false, error: "Missing prompt" });
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
          content: `Generate 5 creative blog titles for "${prompt}".`,
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
    console.error("Error generating blog titles:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// import OpenAI from "openai";
// import db from "../configs/db.js";
// import { clerkClient } from "@clerk/express";

// const AI = new OpenAI({
//   apiKey: process.env.GEMINI_API_KEY,
//   baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
// });

// // Helper to safely extract AI response text
// const extractContent = (response) => {
//   if (response?.choices?.[0]?.message?.content) {
//     return response.choices[0].message.content;
//   }
//   if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
//     return response.candidates[0].content.parts[0].text;
//   }
//   return "";
// };

// export const generateArticle = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { topic, length, words } = req.body;

//     const plan = req.plan || "free";
//     const free_usage = req.free_usage || 0;

//     if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

//     if (plan !== "premium" && free_usage >= 10) {
//       return res.status(403).json({
//         success: false,
//         error: "Free usage limit exceeded. Please upgrade to premium plan.",
//       });
//     }

//     const prompt = `Write a detailed ${length} article about "${topic}" in around ${words}. Make it engaging and well-structured.`;

//     // ✅ AI request
//     const response = await AI.chat.completions.create({
//       model: "gemini-2.5-flash",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7,
//     });

//     const content = extractContent(response);

//     if (!content) {
//       return res.status(502).json({ success: false, error: "No content received from AI API." });
//     }

//     // ✅ Save to DB (non-blocking response if needed)
//     db`
//       INSERT INTO creations (user_id, prompt, content, type)
//       VALUES (${userId}, ${prompt}, ${content}, 'article');
//     `.catch(err => console.error("DB insert failed:", err));

//     // ✅ Update free usage
//     if (plan !== "premium") {
//       try {
//         const user = await clerkClient.users.getUser(userId);
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: { ...user.privateMetadata, free_usage: free_usage + 1 },
//         });
//       } catch (err) {
//         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
//       }
//     }

//     res.json({ success: true, article: content });
//   } catch (err) {
//     console.error("❌ Error generating article:", err?.response?.data || err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// export const generateBlogTitle = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { topic } = req.body;

//     const plan = req.plan || "free";
//     const free_usage = req.free_usage || 0;

//     if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

//     if (plan !== "premium" && free_usage >= 10) {
//       return res.status(403).json({
//         success: false,
//         error: "Free usage limit exceeded. Please upgrade to premium plan.",
//       });
//     }

//     const prompt = `Suggest 5 catchy blog titles for: "${topic}"`;

//     const response = await AI.chat.completions.create({
//       model: "gemini-2.5-flash",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7,
//       max_tokens: 150,
//     });

//     const content = extractContent(response);

//     if (!content) {
//       return res.status(502).json({ success: false, error: "No titles received from AI API." });
//     }

//     db`
//       INSERT INTO creations (user_id, prompt, content, type)
//       VALUES (${userId}, ${prompt}, ${content}, 'blog-title');
//     `.catch(err => console.error("DB insert failed:", err));

//     if (plan !== "premium") {
//       try {
//         const user = await clerkClient.users.getUser(userId);
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: { ...user.privateMetadata, free_usage: free_usage + 1 },
//         });
//       } catch (err) {
//         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
//       }
//     }

//     res.json({ success: true, titles: content });
//   } catch (err) {
//     console.error("❌ Error generating blog title:", err?.response?.data || err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// import OpenAI from "openai";
// import db from "../configs/db.js";
// import { clerkClient } from "@clerk/express";

// const AI = new OpenAI({
//   apiKey: process.env.GEMINI_API_KEY,
//   baseURL: "https://generativelanguage.googleapis.com/v1beta1",
// });

// // Helper to safely extract AI response text
// const extractContent = (response) => {
//   if (response?.candidates?.[0]?.content) {
//     // Gemini response text is usually here
//     return response.candidates[0].content.map(c => c.text).join("\n");
//   }
//   return "";
// };

// export const generateArticle = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { topic, length, words } = req.body;
//     const plan = req.plan || "free";
//     const free_usage = req.free_usage || 0;

//     if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
//     if (plan !== "premium" && free_usage >= 10) {
//       return res.status(403).json({ success: false, error: "Free usage limit exceeded. Upgrade to premium." });
//     }

//     const prompt = `Write a detailed ${length} article about "${topic}" in around ${words}. Make it engaging and well-structured.`;

//     // ✅ Gemini chat completion
//     const response = await AI.chat.completions.create({
//       model: "gemini-2.5-flash",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7,
//       max_output_tokens: 1200, // correct param
//     });

//     const content = extractContent(response);

//     if (!content) {
//       console.error("⚠️ Empty content received from Gemini:", JSON.stringify(response, null, 2));
//       return res.status(502).json({ success: false, error: "No content received from AI API." });
//     }

//     // Save to DB
//     db`
//       INSERT INTO creations (user_id, prompt, content, type)
//       VALUES (${userId}, ${prompt}, ${content}, 'article')
//     `.catch(err => console.error("DB insert failed:", err));

//     // Update free usage
//     if (plan !== "premium") {
//       try {
//         const user = await clerkClient.users.getUser(userId);
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: { ...user.privateMetadata, free_usage: free_usage + 1 },
//         });
//       } catch (err) {
//         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
//       }
//     }

//     res.json({ success: true, article: content });
//   } catch (err) {
//     console.error("❌ Article generation error:", err?.response?.data || err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// export const generateBlogTitle = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { topic } = req.body;
//     const plan = req.plan || "free";
//     const free_usage = req.free_usage || 0;

//     if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
//     if (plan !== "premium" && free_usage >= 10) {
//       return res.status(403).json({ success: false, error: "Free usage limit exceeded. Upgrade to premium." });
//     }

//     const prompt = `Suggest 5 catchy blog titles for: "${topic}"`;

//     const response = await AI.chat.completions.create({
//       model: "gemini-2.5-flash",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.7,
//       max_output_tokens: 300,
//     });

//     const content = extractContent(response);

//     if (!content) {
//       console.error("⚠️ Empty blog titles received from Gemini:", JSON.stringify(response, null, 2));
//       return res.status(502).json({ success: false, error: "No titles received from AI API." });
//     }

//     db`
//       INSERT INTO creations (user_id, prompt, content, type)
//       VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
//     `.catch(err => console.error("DB insert failed:", err));

//     if (plan !== "premium") {
//       try {
//         const user = await clerkClient.users.getUser(userId);
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: { ...user.privateMetadata, free_usage: free_usage + 1 },
//         });
//       } catch (err) {
//         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
//       }
//     }

//     res.json({ success: true, titles: content });
//   } catch (err) {
//     console.error("❌ Blog title generation error:", err?.response?.data || err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };


// import { GoogleGenerativeAI } from "@google/generative-ai";
// import db from "../configs/db.js";
// import { clerkClient } from "@clerk/express";
// import { model, extractText } from "../utils/gemini.js";

// // ✅ Setup Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
// //  */
// // export const generateArticle = async (req, res) => {
// //   // console.log("🔥 generateArticle called with:", req.body);
// //   // console.log("Auth object:", req.auth()); // ← This shows Clerk auth info
// //   // console.log("Request body:", req.body);
// //   console.log("REQ AUTH:", req.auth); // check if userId exists
// //   if (!req.auth || !req.auth.userId) {
// //     return res.status(401).json({ success: false, error: "Unauthorized" });
// //   }
// //   try {
// //     const { userId } = req.auth;
// //     const { topic, length, words } = req.body;
// //     const plan = req.plan || "free";
// //     const free_usage = req.free_usage || 0;

// //     if (!userId)
// //       return res.status(401).json({ success: false, error: "Unauthorized" });
// //     if (!topic) return res.json({ success: false, error: "Missing topic" });
// //     if (plan !== "premium" && free_usage >= 10) {
// //       return res
// //         .status(403)
// //         .json({
// //           success: false,
// //           error: "Free usage limit exceeded. Upgrade to premium.",
// //         });
// //     }

// //     const prompt = `Write a detailed ${length} article about "${topic}" in around ${words}. Make it engaging and well-structured.`;

// //     // ✅ Gemini generate
// //     const result = await model.generateContent(prompt);

// //     console.log("🔎 Gemini raw result:", JSON.stringify(result, null, 2));

// //     const text = extractText(result);

// //     if (!text) {
// //       return res
// //         .status(502)
// //         .json({ success: false, error: "⚠️ No article received from API." });
// //     }

// //     // ✅ Save in DB
// //     db`
// //       INSERT INTO creations (user_id, prompt, content, type)
// //       VALUES (${userId}, ${prompt}, ${text}, 'article')
// //     `.catch((err) => console.error("DB insert failed:", err));

// //     // ✅ Update free usage
// //     if (plan !== "premium") {
// //       try {
// //         const user = await clerkClient.users.getUser(userId);
// //         await clerkClient.users.updateUserMetadata(userId, {
// //           privateMetadata: {
// //             ...user.privateMetadata,
// //             free_usage: free_usage + 1,
// //           },
// //         });
// //       } catch (err) {
// //         console.warn("⚠️ Failed to update Clerk metadata:", err.message);
// //       }
// //     }

// //     res.json({ success: true, article: text });
// //   } catch (err) {
// //     console.error("❌ Article generation error:", err);
// //     res.status(500).json({ success: false, error: err.message });
// //   }
// // };

// export const generateArticle = async (req, res) => {
//   try {
//     // ✅ Check Clerk auth
//     if (!req.auth || !req.auth.userId) {
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     }
//     const { userId } = req.auth;

//     // ✅ Extract request body safely
//     const { topic, length = "Short", words } = req.body;

//     if (!topic || topic.trim() === "") {
//       return res.status(400).json({ success: false, error: "Missing topic" });
//     }

//     // ✅ Retrieve plan and free usage from metadata
//     const user = await clerkClient.users.getUser(userId);
//     const plan = user.privateMetadata?.plan || "free";
//     const free_usage = user.privateMetadata?.free_usage || 0;

//     if (plan !== "premium" && free_usage >= 10) {
//       return res.status(403).json({
//         success: false,
//         error: "Free usage limit exceeded. Upgrade to premium.",
//       });
//     }

//     // ✅ Build AI prompt with proper HTML formatting
//     const prompt = `
// Write a detailed ${length} article on "${topic}" in around ${words}.
// - Use <h1> for the title, <h2> for sections, <h3> for sub-sections.
// - Wrap paragraphs in <p> tags.
// - Include <ul> or <ol> for lists and bullet points.
// - Use bold (<b>) and italic (<i>) where appropriate.
// - End with <h2>Conclusion</h2> section.
// - Do not include <html>, <body>, or metadata tags.
// - Output clean HTML suitable for ReactMarkdown with rehype-raw.
// `;

//     // ✅ Generate article using Gemini
//     const result = await model.generateContent(prompt);
//     console.log("🔎 Gemini raw result:", JSON.stringify(result, null, 2));

//     const text = extractText(result);

//     if (!text) {
//       return res.status(502).json({ success: false, error: "No article received from API." });
//     }

//     // ✅ Save article in DB
//     try {
//       await db`
//         INSERT INTO creations (user_id, prompt, content, type)
//         VALUES (${userId}, ${prompt}, ${text}, 'article')
//       `;
//     } catch (dbErr) {
//       console.error("DB insert failed:", dbErr.message);
//     }

//     // ✅ Update free usage for non-premium users
//     if (plan !== "premium") {
//       try {
//         await clerkClient.users.updateUserMetadata(userId, {
//           privateMetadata: { ...user.privateMetadata, free_usage: free_usage + 1 },
//         });
//       } catch (err) {
//         console.warn("Failed to update Clerk metadata:", err.message);
//       }
//     }

//     // ✅ Return generated article
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
//     if (plan !== "premium" && free_usage >= 10) {
//       return res
//         .status(403)
//         .json({
//           success: false,
//           error: "Free usage limit exceeded. Upgrade to premium.",
//         });
//     }

//     const prompt = `Suggest 5 catchy blog titles for: "${topic}"`;

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

