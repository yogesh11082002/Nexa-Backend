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


// const getImageUrl = (c) => {
//   return (
//     c.img || c.image_url || c.imageUrl || c.url || "" // 👈 try all possible keys
//   );
// };

// // ✅ Get all published creations
// export const getPublishedCreations = async (req, res) => {
//   try {
//     const { userId } = req.auth;

//     const creations =
//       await db`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;

//     const enriched = creations.map((c) => {
//       const likesArr = Array.isArray(c.likes) ? c.likes : [];
//       return {
//         id: c.id,
//         img: getImageUrl(c), // 👈 always normalized
//         text: c.text || c.description || "",
//         created_at: c.created_at,
//         likeCount: likesArr.length,
//         liked: likesArr.includes(userId.toString()),
//         whoLiked: likesArr,
//       };
//     });

//     res.json({ success: true, creations: enriched });
//   } catch (error) {
//     console.error("❌ getPublishedCreations error:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // ✅ Toggle like/unlike
// export const toggleLikeCreation = async (req, res) => {
//   try {
//     const { userId } = req.auth;
//     const { id } = req.body;

//     if (!id) {
//       return res.status(400).json({ success: false, error: "Missing creation id" });
//     }

//     const [creation] = await db`SELECT * FROM creations WHERE id = ${id}`;
//     if (!creation) {
//       return res.status(404).json({ success: false, error: "Creation not found" });
//     }

//     const currentLikes = Array.isArray(creation.likes) ? creation.likes : [];
//     const userIdStr = userId.toString();

//     let updatedLikes;
//     let message;

//     if (currentLikes.includes(userIdStr)) {
//       updatedLikes = currentLikes.filter((u) => u !== userIdStr);
//       message = "Creation unliked";
//     } else {
//       updatedLikes = [...new Set([...currentLikes, userIdStr])];
//       message = "Creation liked";
//     }

//     const formattedArray = `{${updatedLikes.join(",")}}`;

//     const [updated] = await db`
//       UPDATE creations 
//       SET likes = ${formattedArray}::text[] 
//       WHERE id = ${id}
//       RETURNING *;
//     `;

//     const likesArr = Array.isArray(updated.likes) ? updated.likes : [];

//     res.json({
//       success: true,
//       message,
//       creation: {
//         id: updated.id,
//         img: getImageUrl(updated), // 👈 always normalized
//         text: updated.text || updated.description || "",
//         created_at: updated.created_at,
//         likeCount: likesArr.length,
//         liked: likesArr.includes(userIdStr),
//         whoLiked: likesArr,
//       },
//     });
//   } catch (error) {
//     console.error("❌ toggleLikeCreation error:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// ✅ Normalize image URL
const getImageUrl = (c) => {
  return c.content || ""; // content column has the image URL
};

// ✅ Get all published creations
export const getPublishedCreations = async (req, res) => {
  try {
    const { userId } = req.auth;

    const creations = await db`
      SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC
    `;

    const enriched = creations.map((c) => {
      const likesArr = Array.isArray(c.likes) ? c.likes : [];
      return {
        id: c.id,
        img: getImageUrl(c),          // ✅ fixed column
        text: c.prompt || "",         // ✅ fixed column
        created_at: c.created_at,
        likeCount: likesArr.length,
        liked: likesArr.includes(userId.toString()),
        whoLiked: likesArr,
      };
    });

    res.json({ success: true, creations: enriched });
  } catch (error) {
    console.error("❌ getPublishedCreations error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Toggle like/unlike
export const toggleLikeCreation = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing creation id" });
    }

    const [creation] = await db`SELECT * FROM creations WHERE id = ${id}`;
    if (!creation) {
      return res.status(404).json({ success: false, error: "Creation not found" });
    }

    const currentLikes = Array.isArray(creation.likes) ? creation.likes : [];
    const userIdStr = userId.toString();

    let updatedLikes;
    let message;

    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter((u) => u !== userIdStr);
      message = "Creation unliked";
    } else {
      updatedLikes = [...new Set([...currentLikes, userIdStr])];
      message = "Creation liked";
    }

    const formattedArray = `{${updatedLikes.join(",")}}`;

    const [updated] = await db`
      UPDATE creations 
      SET likes = ${formattedArray}::text[] 
      WHERE id = ${id}
      RETURNING *
    `;

    const likesArr = Array.isArray(updated.likes) ? updated.likes : [];

    res.json({
      success: true,
      message,
      creation: {
        id: updated.id,
        img: getImageUrl(updated),      // ✅ always use content column
        text: updated.prompt || "",     // ✅ always use prompt column
        created_at: updated.created_at,
        likeCount: likesArr.length,
        liked: likesArr.includes(userIdStr),
        whoLiked: likesArr,
      },
    });
  } catch (error) {
    console.error("❌ toggleLikeCreation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
