import { toast } from "react-toastify";
import axios from "axios";

export const uploadToCloudinary = async (file: File) => {
    if(!file) {
        toast.error("Vui lòng chon file!!");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

    console.log(import.meta.env);
    try {
        const res = await axios.post(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, formData);
        return res.data.secure_url; 
    } catch (error) {
        throw {
            message: "Upload ảnh thất bại!!", error,
        }
    }
}