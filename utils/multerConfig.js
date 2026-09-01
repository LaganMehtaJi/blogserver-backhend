import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'my_uploads',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'jfif', 'bmp', 'heic', 'heif']
    };
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP, GIF, AVIF, HEIC, etc.) are allowed!'), false);
    }
  }
});

export default upload;

