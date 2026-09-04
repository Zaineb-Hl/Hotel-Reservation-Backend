import express from 'express';
import { createReservation, getAllReservation, deleteReservation } from '../controllers/reservationControllers.js'
import adminAuth from '../middleware/adminAuth.js'

const reservationRouter = express.Router()

// Un client (public) doit pouvoir créer une réservation
reservationRouter.post('/create', createReservation)

// Consulter/supprimer des réservations est une action admin
reservationRouter.get('/get', adminAuth, getAllReservation)
reservationRouter.delete('/delete/:id', adminAuth, deleteReservation)

export default reservationRouter
