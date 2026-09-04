import reservationModel from "../models/reservationModels.js";
import hotelModel from "../models/hotelModels.js";
import mongoose from "mongoose";
import validator from "validator";

const PHONE_REGEX = /^[0-9+\s()-]{8,20}$/;

const createReservation = async (req, res) => {
    try {
        const { name, email, phone, checkin, checkout, guests, roomId } = req.body;

        // --- 1. Champs obligatoires ---
        if (!name || !email || !phone || !checkin || !checkout || !guests || !roomId) {
            return res.status(400).json({ success: false, message: "Tous les champs sont requis" });
        }

        // --- 2. Format email / téléphone ---
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Adresse email invalide" });
        }
        if (!PHONE_REGEX.test(phone)) {
            return res.status(400).json({ success: false, message: "Numéro de téléphone invalide" });
        }

        // --- 3. roomId doit être un ObjectId valide, ET la chambre doit exister ---
        // (avant: roomId était un simple String jamais vérifié -> réservations
        // possibles sur des chambres inexistantes, aucune relation réelle)
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ success: false, message: "Identifiant de chambre invalide" });
        }
        const room = await hotelModel.findById(roomId);
        if (!room || room.isActive === false) {
            return res.status(404).json({ success: false, message: "Chambre introuvable ou indisponible" });
        }

        // --- 4. Dates ---
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(checkinDate) || isNaN(checkoutDate)) {
            return res.status(400).json({ success: false, message: "Dates invalides" });
        }
        if (checkinDate < today) {
            return res.status(400).json({ success: false, message: "La date d'arrivée ne peut pas être dans le passé" });
        }
        if (checkoutDate <= checkinDate) {
            return res.status(400).json({ success: false, message: "La date de départ doit être après la date d'arrivée" });
        }

        // --- 5. Nombre de personnes vs capacité de la chambre ---
        const numericGuests = Number(guests);
        if (Number.isNaN(numericGuests) || numericGuests < 1) {
            return res.status(400).json({ success: false, message: "Le nombre de personnes est invalide" });
        }
        if (numericGuests > room.capacity) {
            return res.status(400).json({
                success: false,
                message: `Cette chambre accepte au maximum ${room.capacity} personne(s)`,
            });
        }

        // --- 6. Anti double-réservation : chevauchement de dates sur la même chambre ---
        // Deux périodes [A,B) et [C,D) se chevauchent si A < D et C < B
        const overlappingReservation = await reservationModel.findOne({
            roomId,
            status: "confirmed",
            checkin: { $lt: checkoutDate },
            checkout: { $gt: checkinDate },
        });

        if (overlappingReservation) {
            return res.status(409).json({
                success: false,
                message: "Cette chambre est déjà réservée sur une partie de cette période",
            });
        }

        // --- Création ---
        const newReservation = new reservationModel({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            checkin: checkinDate,
            checkout: checkoutDate,
            guests: numericGuests,
            roomName: room.name,
            roomId: room._id,
        });

        await newReservation.save();

        res.status(201).json({ success: true, message: "Réservation créée avec succès", reservation: newReservation });
    } catch (error) {
        console.log(error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map((e) => e.message).join(", ");
            return res.status(400).json({ success: false, message });
        }
        res.status(500).json({ success: false, message: "Erreur lors de la création de la réservation" });
    }
};

const getAllReservation = async (req, res) => {
    try {
        // populate: on peut maintenant récupérer les infos à jour de la chambre
        // depuis la réservation grâce à la vraie relation (roomId -> hotel)
        const reservations = await reservationModel
            .find()
            .populate("roomId", "name price image capacity")
            .sort({ createdAt: -1 });
        res.json({ success: true, reservations });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération des réservations" });
    }
};

const deleteReservation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Identifiant de réservation invalide" });
        }

        const deleted = await reservationModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Réservation introuvable" });
        }
        res.json({ success: true, message: "Réservation supprimée avec succès" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erreur lors de la suppression de la réservation" });
    }
};

export { createReservation, getAllReservation, deleteReservation };
