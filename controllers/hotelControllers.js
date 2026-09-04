import hotelModel from "../models/hotelModels.js";
import reservationModel from "../models/reservationModels.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

const addHotel = async (req, res) => {
    try {
        const { name, price, description, capacity } = req.body;
        const image = req.file;

        // --- Validation métier ---
        if (!name || !description || price === undefined || price === null) {
            return res.status(400).json({ success: false, message: "Nom, description et prix sont requis" });
        }

        const numericPrice = Number(price);
        if (Number.isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ success: false, message: "Le prix doit être un nombre supérieur à 0" });
        }

        const numericCapacity = capacity !== undefined ? Number(capacity) : 2;
        if (Number.isNaN(numericCapacity) || numericCapacity < 1) {
            return res.status(400).json({ success: false, message: "La capacité doit être un nombre supérieur ou égal à 1" });
        }

        let imageUrl = "";
        if (image) {
            const result = await cloudinary.uploader.upload(image.path, { resource_type: "image" });
            imageUrl = result.secure_url;
        } else {
            imageUrl = "https://via.placeholder.com/150";
        }

        const hotelData = {
            name: name.trim(),
            description: description.trim(),
            price: numericPrice,
            capacity: numericCapacity,
            image: imageUrl,
        };

        const hotel = new hotelModel(hotelData);
        await hotel.save();

        res.status(201).json({ success: true, message: "Chambre ajoutée avec succès", hotel });
    } catch (error) {
        console.log(error);
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors).map((e) => e.message).join(", ");
            return res.status(400).json({ success: false, message });
        }
        res.status(500).json({ success: false, message: "Erreur lors de l'ajout de la chambre" });
    }
};

const listHotel = async (req, res) => {
    try {
        // par défaut on ne montre que les chambres actives (isActive: true)
        // "?all=true" (ex: admin) renvoie tout, y compris les chambres désactivées
        const filter = req.query.all === "true" ? {} : { isActive: true };
        const hotels = await hotelModel.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, hotels });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération des chambres" });
    }
};

const removeHotel = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ success: false, message: "Identifiant de chambre invalide" });
        }

        const hotel = await hotelModel.findById(_id);
        if (!hotel) {
            return res.status(404).json({ success: false, message: "Chambre introuvable" });
        }

        // --- Intégrité référentielle ---
        // On empêche la suppression d'une chambre tant qu'elle a des réservations
        // confirmées à venir, pour ne pas laisser de réservations orphelines
        // (roomId pointant vers un hôtel supprimé).
        const now = new Date();
        const hasActiveReservations = await reservationModel.exists({
            roomId: _id,
            status: "confirmed",
            checkout: { $gte: now },
        });

        if (hasActiveReservations) {
            return res.status(409).json({
                success: false,
                message: "Impossible de supprimer cette chambre : des réservations actives y sont liées. Désactivez-la plutôt (isActive:false), ou annulez d'abord les réservations concernées.",
            });
        }

        await hotelModel.findByIdAndDelete(_id);
        res.json({ success: true, message: "Chambre supprimée avec succès" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erreur lors de la suppression de la chambre" });
    }
};

const singleHotel = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Identifiant de chambre invalide" });
        }

        const hotel = await hotelModel.findById(id);
        if (!hotel) {
            return res.status(404).json({ success: false, message: "Chambre introuvable" });
        }
        res.json({ success: true, hotel });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération de la chambre" });
    }
};

export { addHotel, listHotel, removeHotel, singleHotel };
