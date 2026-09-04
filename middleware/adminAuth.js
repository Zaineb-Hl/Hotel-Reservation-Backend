import jwt from "jsonwebtoken";

const adminAuth = async (req, res, next) => {
    try {
        const { token } = req.headers;

        if (!token) {
            return res.status(401).json({ success: false, message: "Non autorisé, token manquant" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || decoded.email !== process.env.ADMIN_EMAIL || decoded.role !== "admin") {
            return res.status(403).json({ success: false, message: "Accès refusé" });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentification invalide ou expirée" });
    }
};

export default adminAuth;
