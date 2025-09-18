import db from "../configs/db.js";

export  const getUserCreations = async (req ,res)=>{

    try {
        
        const {userId} = req.auth;
        const creations = await db`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;
        res.json({success:true , creations});

        res.json({success:true , creations})
    } catch (error) {
        res.json({success:false , error : error.message})
    }
}

// export const getPublishedCreations = async (req, res) => {
//   try {
//     const { userId } = req.auth;

//     const creations =
//       await db`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;

//     // map with liked + like count
//     const enriched = creations.map((c) => {
//       const likesArr = c.likes || [];
//       return {
//         ...c,
//         likeCount: likesArr.length,
//         liked: likesArr.includes(userId.toString()), // ✅ check if this user liked
//       };
//     });

//     res.json({ success: true, creations: enriched });
//   } catch (error) {
//     res.json({ success: false, error: error.message });
//   }
// };



// export const toggleLikeCreation = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { id } = req.body;

//     const [creation] = await db`SELECT * FROM creations WHERE id = ${id}`;
//     if (!creation) {
//       return res.json({ success: false, error: "Creation not found" });
//     }

//     const currentLikes = creation.likes || [];
//     const userIdStr = userId.toString();

//     let updatedLikes;
//     let message;

//     if (currentLikes.includes(userIdStr)) {
//       updatedLikes = currentLikes.filter((u) => u !== userIdStr);
//       message = "Creation unliked";
//     } else {
//       updatedLikes = [...currentLikes, userIdStr];
//       message = "Creation liked";
//     }

//     const formattedArray = `{${updatedLikes.join(",")}}`;

//     await db`UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}`;

//     res.json({
//       success: true,
//       message,
//       likes: updatedLikes.length,
//       liked: updatedLikes.includes(userIdStr),
//       whoLiked: updatedLikes, // ✅ return full array
//     });
//   } catch (error) {
//     res.json({ success: false, error: error.message });
//   }
// };

// ✅ Get all published creations with like info
export const getPublishedCreations = async (req, res) => {
  try {
    const { userId } = req.auth;

    const creations =
      await db`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;

    const enriched = creations.map((c) => {
      const likesArr = Array.isArray(c.likes) ? c.likes : []; // ensure always array
      return {
        ...c,
        likeCount: likesArr.length,
        liked: likesArr.includes(userId.toString()),
      };
    });

    res.json({ success: true, creations: enriched });
  } catch (error) {
    console.error("❌ getPublishedCreations error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Toggle like/unlike on a creation
export const toggleLikeCreation = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.body;

    const [creation] = await db`SELECT * FROM creations WHERE id = ${id}`;
    if (!creation) {
      return res.json({ success: false, error: "Creation not found" });
    }

    const currentLikes = Array.isArray(creation.likes) ? creation.likes : [];
    const userIdStr = userId.toString();

    let updatedLikes;
    let message;

    if (currentLikes.includes(userIdStr)) {
      // unlike
      updatedLikes = currentLikes.filter((u) => u !== userIdStr);
      message = "Creation unliked";
    } else {
      // like (prevent duplicate with Set)
      updatedLikes = [...new Set([...currentLikes, userIdStr])];
      message = "Creation liked";
    }

    const formattedArray = `{${updatedLikes.join(",")}}`;

    const [updated] = await db`
      UPDATE creations 
      SET likes = ${formattedArray}::text[] 
      WHERE id = ${id}
      RETURNING *;
    `;

    res.json({
      success: true,
      message,
      creation: {
        ...updated,
        likeCount: updatedLikes.length,
        liked: updatedLikes.includes(userIdStr),
      },
    });
  } catch (error) {
    console.error("❌ toggleLikeCreation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
