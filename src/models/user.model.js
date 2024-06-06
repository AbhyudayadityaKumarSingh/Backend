import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema  = new mongoose.Schema({
    username :{
        type: String,
        required: true,
        unique: true ,
        trim: true,
        lowercase: true ,
        index : true , //used for searching
    },
    email : {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    fullName : {
        type: String,
        required: true,
        trim: true,
        index : true,
    },
    avatar : {
        type: String, // Cloudinary URL 
        required: true,
    
    },
    coverImage :{
        type: String, // Cloudinary URL
        required: false ,
    },
    watchHistory : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video"
    }]
    ,
    password : {
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken : {
        type: String,
       
    },
},{timestamps: true}) ;

//Making hash of password before saving it to the database on user creation
userSchema.pre("save", async function(next){
    if(!this.isModified("password")){return next()} 
    this.password = await bcrypt.hash(this.password, 8);
    next();
})
//Checking of hash password and plain password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
    //this.password : encrpyted password
    // password : plain password
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign( {
        id : this._id,
        username : this.username,
        email : this.email,
        fullName : this.fullName, 
    }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRY} )
};
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign( {
        id : this._id,
        username : this.username,
        email : this.email,
        fullName : this.fullName, 
    }, process.env.REFRESH_TOKEN_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
)}
        



export const User = mongoose.model("User", userSchema)