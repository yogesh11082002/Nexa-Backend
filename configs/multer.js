import multer from "multer";

const storage = multer.memoryStorage(); // store uploaded files in memory
const upload = multer({ storage });

export default upload;
