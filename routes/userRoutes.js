// import express from 'express';
// import { getUserCreations, getPublishedCreations, toggleLikeCreation } from '../controllers/userController.js';

// const userRouter = express.Router();

// userRouter.get('/creations', getUserCreations);
// userRouter.get('/creations/published', getPublishedCreations);
// userRouter.post('/creations/toggle-like', toggleLikeCreation);

// export default userRouter;
import express from "express";
import { getUserCreations, getPublishedCreations, toggleLikeCreation } from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";
import { auth } from "../middlewares/auth.js";

const userRouter = express.Router();

userRouter.get("/creations", getUserCreations);
userRouter.get("/creations/published", getPublishedCreations);
userRouter.post("/creations/toggle-like", toggleLikeCreation);

export default userRouter;
