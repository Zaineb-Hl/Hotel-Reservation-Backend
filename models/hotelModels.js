import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Le nom de la chambre est requis"],
        trim: true,
        minlength: [2, "Le nom doit contenir au moins 2 caractères"],
        maxlength: [120, "Le nom ne peut pas dépasser 120 caractères"],
    },
    price: {
        type: Number,
        required: [true, "Le prix est requis"],
        min: [1, "Le prix doit être supérieur à 0"],
        max: [100000, "Le prix semble invalide"],
    },
    description: {
        type: String,
        required: [true, "La description est requise"],
        trim: true,
        minlength: [10, "La description doit contenir au moins 10 caractères"],
        maxlength: [2000, "La description ne peut pas dépasser 2000 caractères"],
    },
    image: {
        type: String,
        required: [true, "L'image est requise"],
    },
    capacity: {
        // nombre max de personnes que la chambre peut accueillir
        // utilisé pour valider "guests" lors d'une réservation
        type: Number,
        required: [true, "La capacité (nombre de personnes) est requise"],
        min: [1, "La capacité doit être d'au moins 1 personne"],
        max: [20, "La capacité semble invalide"],
        default: 2,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

const hotelModel = mongoose.models.hotel || mongoose.model("hotel", hotelSchema);

export default hotelModel;
