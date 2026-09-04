import express from "express"
import {adminLogin} from "../controllers/userControllers.js"
import { loginLimiter } from "../middleware/rateLimit.js"  


const userRouter = express.Router()

userRouter.post('/admin', loginLimiter, adminLogin)   

export default userRouter