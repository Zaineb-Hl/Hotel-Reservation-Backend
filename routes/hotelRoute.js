import express from 'express';
import { addHotel, listHotel, removeHotel, singleHotel } from '../controllers/hotelControllers.js'
import upload from '../middleware/multer.js'
import adminAuth from '../middleware/adminAuth.js'

const hotelRouter = express.Router()

// Lecture publique (le site vitrine doit pouvoir lister/consulter les chambres)
hotelRouter.get('/list', listHotel)
hotelRouter.get('/rooms/:id', singleHotel)

// Écriture réservée à l'admin (auparavant accessible sans authentification)
hotelRouter.post('/add', adminAuth, upload.single("image"), addHotel)
hotelRouter.post('/remove', adminAuth, removeHotel)

export default hotelRouter
