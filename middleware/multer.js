import multer from 'multer'

const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        callback(null, uniqueSuffix + '-' + file.originalname)
    }
})

// Vérifie le type du fichier avant de l'accepter


const fileFilter = (req, file, callback) => {
    // Liste des formats d'images autorisés
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    // Vérifie si le type MIME du fichier fait partie des formats autorisés
    if (allowed.includes(file.mimetype)) {
        // Accepte le fichier si son format est autorisé
        callback(null, true);
    } else {
        callback(new Error("Format d'image non autorisé (jpg, png, webp uniquement)"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
})

export default upload