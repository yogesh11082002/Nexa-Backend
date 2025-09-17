// import 'dotenv/config'; 
// import express from 'express';
// import cors from 'cors';
// import { clerkMiddleware, requireAuth } from '@clerk/express'
// import aiRouter from './routes/aiRoutes.js';

// const app = express();
// const port = process.env.PORT || 3000;

// app.use(cors());
// app.use(express.json());
// app.use(clerkMiddleware())

// app.use(async (req, res, next) => {
//   let user = null;
//   if (req.auth) {
//     try {
//       user = await req.auth(); // get user info
//     } catch {}
//   }
//   console.log("Method:", req.method, "URL:", req.url, "Auth:", user);
//   next();
// });



// // Basic route
// app.get('/', (req, res) => {
//     res.send('Server is running');
// });

// app.use(requireAuth());  // protected routes below this line
// app.use('/api/ai', aiRouter);

// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });

import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import aiRouter from "./routes/aiRoutes.js";
import { auth } from "./middlewares/auth.js";

const app = express();
const port = process.env.PORT || 3000;

// JSON + CORS
app.use(
  cors({
    origin: "https://nexa-ai-neon-yogesh.vercel.app", // frontend URL
    credentials: true,
  })
);
app.use(express.json());

// Clerk middleware
app.use(clerkMiddleware());

// Debug log
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log("➡️", req.method, req.url, "Auth:", req.auth);
    next();
  });
}

// Public route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// AI routes
app.use("/api/ai", requireAuth(), auth, aiRouter);

// Listen
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
