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


export  const getPublishedCreations = async (req ,res)=>{

    try {
      
        const creations = await db`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;
        res.json({success:true , creations});

        res.json({success:true , creations})
    } catch (error) {
        res.json({success:false , error : error.message})
    }
}

export  const toggleLikeCreation = async (req ,res)=>{

    try {
      
       const {userId} = req.auth;
       const {id} =req.body;

        const [creation]= await db`SELECT * FROM creations WHERE id = ${id}`;
        if(!creation) return res.json({success:false , error : "Creation not found"})

        const currentLikes = creation.likes;
        const userIdstr = userId.toString();
        let updatedLikes;
        let message;
        if(currentLikes.includes(userIdstr)){
            //unlike
            updatedLikes = currentLikes.filter((user)=> user !== userIdstr);
            message = "Creation unliked"
        }
        else{
            //like
            updatedLikes = [...currentLikes , userIdstr];
            message = "Creation liked"
        }
        const  formattedArray = `{${updatedLikes.json(',')}}`;
        await db`UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}`;
        res.json({success:true , message})


    } catch (error) {
        res.json({success:false , error : error.message})
    }
}