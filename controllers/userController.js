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
export const getPublishedCreations = async (req, res) => {
  try {
    const { userId } = req.auth;

    const creations =
      await db`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;

    // map with liked + like count
    const enriched = creations.map((c) => {
      const likesArr = c.likes || [];
      return {
        ...c,
        likeCount: likesArr.length,
        liked: likesArr.includes(userId.toString()), // ✅ check if this user liked
      };
    });

    res.json({ success: true, creations: enriched });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};



export const toggleLikeCreation = async (req, res) => {
  try {
    const { userId } = req.auth;
    const { id } = req.body;

    const [creation] = await db`SELECT * FROM creations WHERE id = ${id}`;
    if (!creation) {
      return res.json({ success: false, error: "Creation not found" });
    }

    const currentLikes = creation.likes || [];
    const userIdStr = userId.toString();

    let updatedLikes;
    let message;

    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter((u) => u !== userIdStr);
      message = "Creation unliked";
    } else {
      updatedLikes = [...currentLikes, userIdStr];
      message = "Creation liked";
    }

    const formattedArray = `{${updatedLikes.join(",")}}`;

    await db`UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}`;

    res.json({
      success: true,
      message,
      likes: updatedLikes.length,
      liked: updatedLikes.includes(userIdStr),
      whoLiked: updatedLikes, // ✅ return full array
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};
