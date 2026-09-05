import express from 'express';
import { createReservation, getAllReservation, cancelReservation ,deleteReservation } from '../controllers/reservationControllers.js'
import adminAuth from '../middleware/adminAuth.js'
import { reservationLimiter } from '../middleware/rateLimit.js'

const reservationRouter = express.Router()

// Un client (public) doit pouvoir créer une réservation
reservationRouter.post('/create', reservationLimiter, createReservation)

// Consulter/supprimer des réservations est une action admin
reservationRouter.get('/get', adminAuth, getAllReservation)
reservationRouter.patch('/cancel/:id', adminAuth, cancelReservation)
reservationRouter.delete('/delete/:id', adminAuth, deleteReservation)

export default reservationRouter
