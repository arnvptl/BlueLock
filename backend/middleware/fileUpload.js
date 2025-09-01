const multer = require('multer');
const path = require('path');
const APIError = require('../middleware/errorHandler').APIError;

const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 50 * 1024 * 1024; // 50MB default
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf,text/plain').split(',');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        return cb(new APIError(`File type ${file.mimetype} not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`, 400));
    }

    // Virus scan simulation (replace with actual virus scanning in production)
    if (file.originalname.includes('virus')) {
        return cb(new APIError('Potentially malicious file detected', 400));
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5 // Maximum number of files per request
    }
});

// Error handler wrapper for multer
const handleMulterUpload = (uploadType) => {
    return (req, res, next) => {
        const uploadMiddleware = uploadType === 'single' 
            ? upload.single('file')
            : upload.array('files', 5);

        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new APIError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new APIError('Too many files. Maximum is 5 files per request', 400));
                }
                return next(new APIError(err.message, 400));
            }
            if (err) {
                return next(err);
            }
            next();
        });
    };
};

module.exports = {
    handleMulterUpload,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE
};
