import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
    //  authentication middleware
   try {
     const {userId , has} =await req.auth();
     const hasPremiumPlan = await has({plan:'premium'});
      const user = await  clerkClient.users.getUser(userId)
      
      if (!hasPremiumPlan && user.privateMetadata.free_usage) {

         req.free_usage = user.privateMetadata.free_usage
         
      }
      else{
         await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: { free_usage: 0 }
          });
         req.free_usage = 0
      }

      req.plan = hasPremiumPlan ? 'premium' : 'free';
      next()

   } catch (error) {
     res.json({success:false ,   error : error.message})
   }
};

// middlewares/auth.js

// import { clerkClient } from "@clerk/express";

// export const auth = async (req, res, next) => {
//   try {
//     // ✅ Use req.auth() as a function (not req.auth object)
//     const authData = req.auth();
//     const { userId } = authData;

//     if (!userId) {
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     }

//     // Fetch user from Clerk
//     const user = await clerkClient.users.getUser(userId);

//     // Get plan and free usage from private metadata
//     const plan = user.privateMetadata?.plan || "free";
//     let free_usage = user.privateMetadata?.free_usage ?? 0;

//     // Reset free usage if premium
//     if (plan === "premium") free_usage = 0;

//     // Attach to request
//     req.plan = plan;
//     req.free_usage = free_usage;
//     req.user = user;

//     next();
//   } catch (err) {
//     console.error("❌ Auth middleware error:", err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
