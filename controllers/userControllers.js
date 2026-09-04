import jwt from "jsonwebtoken";

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email et mot de passe sont requis" });
        }

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // payload objet (plutôt qu'une simple string concaténée) + expiration,
            // pour un token exploitable et qui n'est pas valable indéfiniment
            const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
            return res.json({ success: true, token });
        }

        return res.status(401).json({ success: false, message: "Identifiants invalides" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erreur lors de la connexion admin" });
    }
};

export { adminLogin };
