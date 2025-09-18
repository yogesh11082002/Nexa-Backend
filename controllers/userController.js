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


// ✅ Get all published creations
export const getPublishedCreations = async (req, res) => {
  try {
    const userId = req.auth?.userId || null;

    // Allow publish stored as BOOLEAN true OR string 'true'
    const creations = await db`
      SELECT * FROM creations
      WHERE publish IS TRUE OR publish = 'true'
      ORDER BY created_at DESC
    `;

    const enriched = creations.map((c) => {
      const likesArr = Array.isArray(c.likes) ? c.likes : [];
      return {
        id: c.id,
        img: c.img || c.image_url || "",
        text: c.text || c.prompt || "",
        publish: c.publish === true || c.publish === "true",
        created_at: c.created_at,
        likeCount: likesArr.length,
        liked: userId ? likesArr.includes(userId.toString()) : false,
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
    if (!id) return res.status(400).json({ success: false, error: "Missing creation id" });

    const [creation] = await db`SELECT * FROM creations WHERE id = ${id}`;
    if (!creation) return res.status(404).json({ success: false, error: "Creation not found" });

    const currentLikes = Array.isArray(creation.likes) ? creation.likes : [];
    const userIdStr = userId.toString();

    let updatedLikes;
    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter((u) => u !== userIdStr);
    } else {
      updatedLikes = [...new Set([...currentLikes, userIdStr])];
    }

    const formattedArray = `{${updatedLikes.join(",")}}`;
    const [updated] = await db`
      UPDATE creations
      SET likes = ${formattedArray}::text[]
      WHERE id = ${id}
      RETURNING *;
    `;

    const likesArr = Array.isArray(updated.likes) ? updated.likes : [];
    res.json({
      success: true,
      creation: {
        id: updated.id,
        img: updated.img || updated.image_url || "",
        text: updated.text || updated.prompt || "",
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
