import multer from "multer";

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["audio/wav", "audio/wave", "audio/x-wav", "audio/mpeg"]);
    cb(null, allowed.has(file.mimetype));
  },
});