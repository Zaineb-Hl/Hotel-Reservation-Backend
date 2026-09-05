import express from 'express';
import { addHotel, listHotel, removeHotel, singleHotel } from '../controllers/hotelControllers.js'
import upload from '../middleware/multer.js'
import adminAuth from '../middleware/adminAuth.js'

const hotelRouter = express.Router()

// Lecture publique (le site vitrine doit pouvoir lister/consulter les chambres)
hotelRouter.get('/list', listHotel)
hotelRouter.get('/rooms/:id', singleHotel)

// Écriture réservée à l'admin : adminAuth vérifie que l'utilisateur est authentifié en tant qu'administrateur.
// Multer récupère l'image envoyée dans le champ "image" et vérifie les éventuelles erreurs.
// Si le fichier est valide, la requête est transmise au contrôleur addHotel pour créer l'hôtel.
hotelRouter.post('/add', adminAuth, (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, addHotel)

hotelRouter.post('/remove', adminAuth, removeHotel)

export default hotelRouter
