import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Le nom est requis"],
            trim: true,
            minlength: [2, "Le nom doit contenir au moins 2 caractères"],
            maxlength: [100, "Le nom ne peut pas dépasser 100 caractères"],
        },
        email: {
            type: String,
            required: [true, "L'email est requis"],
            trim: true,
            lowercase: true,

        },
        phone: {
            type: String,
            required: [true, "Le téléphone est requis"],
            trim: true,
        },
        checkin: {
            type: Date,
            required: [true, "La date d'arrivée est requise"],
        },
        checkout: {
            type: Date,
            required: [true, "La date de départ est requise"],
        },
        guests: {
            type: Number,
            required: [true, "Le nombre de personnes est requis"],
            min: [1, "Il faut au moins 1 personne"],
        },
        roomName: {
            type: String,
            required: [true, "Le nom de la chambre est requis"],
        },

        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "hotel",
            required: [true, "La chambre (roomId) est requise"],
        },
        status: {

            type: String,
            enum: ["confirmed", "cancelled"],
            default: "confirmed",
        },
    },
    { timestamps: true }
);


reservationSchema.index({ roomId: 1, status: 1, checkin: 1, checkout: 1 });

export default mongoose.models.Reservation || mongoose.model("Reservation", reservationSchema);
