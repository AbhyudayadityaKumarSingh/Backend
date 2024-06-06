import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();
// Cross Origin Resource Sharing (CORS) is a security measure that prevents a malicious website from making requests to your server.
app.use(cors({
     origin :process.env.CORS_ORIGIN,
     credentials: true
})) 

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({extended: true , limit: '16kb'}));
app.use(express.static('public')); // for storing data at public folder temporarily for img , pdf files
app.use(cookieParser());

//Routes
import userRoutes from './routes/user.routes.js';

//Routes declaration
app.use('/api/v1/users' , userRoutes) // http://localhost:5000/api/vi/users/register
// localhost:5000/api/v1/users/login , etc

export {app}