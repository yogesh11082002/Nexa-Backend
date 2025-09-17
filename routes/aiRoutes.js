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


// import express from "express";
// import { generateArticle, generateBlogTitle, generateImage, removeImageBackground, removeImageObject } from "../controllers/aiController.js";
// import upload from "../configs/multer.js";
// const aiRouter = express.Router();

// // ✅ No auth here, already applied in server.js
// aiRouter.post("/generate-article", generateArticle);
// aiRouter.post("/generate-blog-title", generateBlogTitle);
// aiRouter.post("/generate-image", generateImage);
// aiRouter.post("/remove-background", upload.single("image"), removeImageBackground);
// aiRouter.post("/remove-object",upload.single("image") , removeImageObject);

// export default aiRouter;

import express from "express";
import upload from "../configs/multer.js";
import { removeImageBackground, removeImageObject, generateArticle, generateBlogTitle, generateImage } from "../controllers/aiController.js";
import { auth } from "../middlewares/auth.js";
import { requireAuth } from "@clerk/express";
import { skipForOptions } from "../utils/skipForOptions.js";

const aiRouter = express.Router();

// AI routes
aiRouter.post(
  "/generate-article",
  skipForOptions(requireAuth()),
  skipForOptions(auth),
  generateArticle
);

aiRouter.post(
  "/generate-blog-title",
  skipForOptions(requireAuth()),
  skipForOptions(auth),
  generateBlogTitle
);

aiRouter.post(
  "/generate-image",
  skipForOptions(requireAuth()),
  skipForOptions(auth),
  generateImage
);

aiRouter.post(
  "/remove-background",
  skipForOptions(requireAuth()),
  skipForOptions(auth),
  skipForOptions(upload.single("image")),
  removeImageBackground
);

aiRouter.post(
  "/remove-object",
  skipForOptions(requireAuth()),
  skipForOptions(auth),
  skipForOptions(upload.single("image")),
  removeImageObject
);

export default aiRouter;
