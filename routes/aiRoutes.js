// // import express from 'express';
// // import { auth } from '../middlewares/auth.js';
// // import { generateArticle, generateBlogTitle } from '../controllers/aiController.js';

// // const aiRouter = express.Router();

// // // AI routes

// // aiRouter.post('/generate-article', auth, generateArticle);
// // aiRouter.post('/generate-blogtitle', auth, generateBlogTitle);

// // export default aiRouter;
   
// import express from "express";
// import { auth } from "../middlewares/auth.js";
// import { generateArticle, generateBlogTitle } from "../controllers/aiController.js";

// const aiRouter = express.Router();

// // AI routes (Clerk requireAuth already ran at app level)
// aiRouter.post("/generate-article", auth, generateArticle);
// aiRouter.post("/generate-blogtitle", auth, generateBlogTitle);

// export default aiRouter;


import express from "express";
import { generateArticle, generateBlogTitle } from "../controllers/aiController.js";

const aiRouter = express.Router();

// ✅ No auth here, already applied in server.js
aiRouter.post("/generate-article", generateArticle);
aiRouter.post("/generate-blog-title", generateBlogTitle);

export default aiRouter;

