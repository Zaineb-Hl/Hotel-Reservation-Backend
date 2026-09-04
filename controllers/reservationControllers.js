import reservationModel from "../models/reservationModels.js";
import hotelModel from "../models/hotelModels.js";
import mongoose from "mongoose";
import validator from "validator";

// Expression régulière permettant de vérifier le format du numéro de téléphone
const PHONE_REGEX = /^[0-9+\s()-]{8,20}$/;


// ============================================================
// FONCTION : créer une réservation
// Cette fonction reçoit les informations envoyées par le client,
// vérifie leur validité puis crée la réservation dans MongoDB.
// ============================================================
const createReservation = async (req, res) => {
    try {

        // Récupération des données envoyées dans le corps de la requête
        const { name, email, phone, checkin, checkout, guests, roomId } = req.body;


        // ------------------------------------------------------------
        // 1. Vérification des champs obligatoires
        // On vérifie que toutes les informations nécessaires
        // à la création d'une réservation sont présentes.
        // ------------------------------------------------------------
        if (!name || !email || !phone || !checkin || !checkout || !guests || !roomId) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont requis"
            });
        }


        // ------------------------------------------------------------
        // 2. Vérification du format de l'email et du téléphone
        // validator.isEmail() permet de vérifier si l'adresse email
        // possède un format valide.
        //
        // PHONE_REGEX vérifie que le numéro contient uniquement
        // des chiffres et certains caractères autorisés (+, espaces,
        // parenthèses et tirets).
        // ------------------------------------------------------------
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Adresse email invalide"
            });
        }

        if (!PHONE_REGEX.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Numéro de téléphone invalide"
            });
        }


        // ------------------------------------------------------------
        // 3. Vérification du roomId et existence de la chambre
        //
        // MongoDB utilise des ObjectId pour identifier les documents.
        // On vérifie donc d'abord que roomId possède un format valide.
        // ------------------------------------------------------------
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Identifiant de chambre invalide"
            });
        }


        // Recherche de la chambre correspondante dans la collection
        const room = await hotelModel.findById(roomId);


        // Vérifie que la chambre existe et qu'elle est active/disponible
        if (!room || room.isActive === false) {
            return res.status(404).json({
                success: false,
                message: "Chambre introuvable ou indisponible"
            });
        }


        // ------------------------------------------------------------
        // 4. Vérification des dates
        //
        // Conversion des dates reçues en objets Date JavaScript.
        // ------------------------------------------------------------
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        const today = new Date();

        // On remet l'heure à 00:00:00 afin de comparer uniquement
        // les dates et non l'heure actuelle.
        today.setHours(0, 0, 0, 0);


        // Vérifie que les deux dates sont valides
        if (isNaN(checkinDate) || isNaN(checkoutDate)) {
            return res.status(400).json({
                success: false,
                message: "Dates invalides"
            });
        }


        // La date d'arrivée ne peut pas être antérieure à aujourd'hui
        if (checkinDate < today) {
            return res.status(400).json({
                success: false,
                message: "La date d'arrivée ne peut pas être dans le passé"
            });
        }


        // La date de départ doit obligatoirement être après
        // la date d'arrivée
        if (checkoutDate <= checkinDate) {
            return res.status(400).json({
                success: false,
                message: "La date de départ doit être après la date d'arrivée"
            });
        }


        // ------------------------------------------------------------
        // 5. Vérification du nombre de personnes
        //
        // Conversion de guests en nombre.
        // ------------------------------------------------------------
        const numericGuests = Number(guests);


        // Vérifie que le nombre de personnes est :
        // - un nombre
        // - un entier
        // - supérieur ou égal à 1
        if (
            Number.isNaN(numericGuests) ||
            !Number.isInteger(numericGuests) ||
            numericGuests < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Le nombre de personnes est invalide"
            });
        }


        // Vérifie que le nombre de personnes ne dépasse pas
        // la capacité maximale de la chambre
        if (numericGuests > room.capacity) {
            return res.status(400).json({
                success: false,
                message: `Cette chambre accepte au maximum ${room.capacity} personne(s)`,
            });
        }


        // ============================================================
        // TRANSACTION MONGODB
        //
        // Une transaction permet de regrouper plusieurs opérations
        // et de garantir qu'elles sont exécutées correctement.
        //
        // Ici, on vérifie d'abord qu'il n'existe pas déjà une
        // réservation pour cette chambre pendant la même période,
        // puis on crée la nouvelle réservation.
        // ============================================================

        const session = await mongoose.startSession();

        try {

            // Début de la transaction
            session.startTransaction();


            // --------------------------------------------------------
            // 6. Vérification des réservations qui se chevauchent
            //
            // On cherche une réservation :
            // - pour la même chambre
            // - avec le statut "confirmed"
            // - dont les dates se chevauchent avec celles demandées
            //
            // Cette vérification permet d'éviter qu'une même chambre
            // soit réservée deux fois pendant la même période.
            // --------------------------------------------------------
            const overlappingReservation = await reservationModel.findOne({
                roomId,
                status: "confirmed",

                // La réservation existante commence avant
                // la date de départ demandée
                checkin: { $lt: checkoutDate },

                // La réservation existante se termine après
                // la date d'arrivée demandée
                checkout: { $gt: checkinDate },

            }).session(session);


            // Si une réservation existe déjà pendant cette période,
            // on annule la transaction et on retourne une erreur 409.
            if (overlappingReservation) {

                // Annulation de la transaction
                await session.abortTransaction();

                return res.status(409).json({
                    success: false,
                    message: "Cette chambre est déjà réservée sur une partie de cette période",
                });
            }


            // --------------------------------------------------------
            // CRÉATION DE LA RÉSERVATION
            //
            // Création d'un nouveau document à partir du modèle
            // reservationModel.
            // --------------------------------------------------------
            const newReservation = new reservationModel({

                // Suppression des espaces inutiles au début et à la fin
                name: name.trim(),

                // Suppression des espaces + conversion de l'email
                // en minuscules
                email: email.trim().toLowerCase(),

                // Suppression des espaces inutiles du téléphone
                phone: phone.trim(),

                // Dates converties en objets Date
                checkin: checkinDate,
                checkout: checkoutDate,

                // Nombre de personnes converti en nombre
                guests: numericGuests,

                // Nom de la chambre récupéré depuis le document
                // de la chambre
                roomName: room.name,

                // Identifiant MongoDB de la chambre réservée
                roomId: room._id,
            });


            // Sauvegarde de la réservation dans MongoDB
            // en utilisant la session de la transaction
            await newReservation.save({ session });


            // Si toutes les opérations précédentes ont réussi,
            // on valide définitivement la transaction.
            await session.commitTransaction();


            // Réponse envoyée au client avec le statut HTTP 201
            // indiquant que la réservation a été créée.
            res.status(201).json({
                success: true,
                message: "Réservation créée avec succès",
                reservation: newReservation
            });


        } catch (error) {

            // En cas d'erreur pendant la transaction,
            // toutes les opérations effectuées dans la transaction
            // sont annulées.
            await session.abortTransaction();

            // On relance l'erreur afin qu'elle soit récupérée
            // par le catch extérieur.
            throw error;

        } finally {

            // Fermeture de la session MongoDB dans tous les cas :
            // succès ou erreur.
            session.endSession();
        }


    } catch (error) {

        // Affichage de l'erreur dans la console du serveur
        console.log(error);


        // ------------------------------------------------------------
        // Gestion des erreurs de validation Mongoose
        //
        // Si les données ne respectent pas les règles définies
        // dans le modèle Mongoose, on récupère les différents
        // messages d'erreur et on les regroupe.
        // ------------------------------------------------------------
        if (error.name === "ValidationError") {

            const message = Object.values(error.errors)
                .map((e) => e.message)
                .join(", ");

            return res.status(400).json({
                success: false,
                message
            });
        }


        // Si l'erreur n'est pas une erreur de validation,
        // on retourne une erreur serveur 500.
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création de la réservation"
        });
    }
};


// ============================================================
// FONCTION : récupérer toutes les réservations
//
// Cette fonction récupère toutes les réservations enregistrées
// dans la base de données.
// ============================================================
const getAllReservation = async (req, res) => {
    try {

        // Recherche de toutes les réservations
        const reservations = await reservationModel

            // Récupération de tous les documents
            .find()

            // Remplace roomId par les informations correspondantes
            // de la chambre : nom, prix, image et capacité.
            //
            // Cela permet d'obtenir directement les informations
            // de la chambre associée à chaque réservation.
            .populate("roomId", "name price image capacity")

            // Trie les réservations de la plus récente
            // à la plus ancienne.
            .sort({ createdAt: -1 });


        // Retourne les réservations au frontend
        res.json({
            success: true,
            reservations
        });


    } catch (error) {

        // Affichage de l'erreur dans la console
        console.log(error);

        // Réponse en cas d'erreur serveur
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des réservations"
        });
    }
};


// ============================================================
// FONCTION : supprimer une réservation
//
// Cette fonction supprime une réservation à partir de son ID.
// ============================================================
const deleteReservation = async (req, res) => {
    try {

        // Récupération de l'ID depuis les paramètres de l'URL
        // Exemple : /delete/65abc123...
        const { id } = req.params;


        // Vérification du format de l'ID MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Identifiant de réservation invalide"
            });
        }


        // Recherche de la réservation par son ID
        // puis suppression de celle-ci
        const deleted = await reservationModel.findByIdAndDelete(id);


        // Si aucune réservation n'a été trouvée avec cet ID
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Réservation introuvable"
            });
        }


        // Si la suppression a réussi
        res.json({
            success: true,
            message: "Réservation supprimée avec succès"
        });


    } catch (error) {

        // Affichage de l'erreur dans la console
        console.log(error);

        // Réponse en cas d'erreur serveur
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de la réservation"
        });
    }
};


export {createReservation, getAllReservation, deleteReservation };
