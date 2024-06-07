import  {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("avatarLocalPath: ", avatarLocalPath);
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )


export {registerUser}

/*
const registerUser = asyncHandler(async (req, res) => {
//     const [fullname,username, email, password] = req.body
//     res.status(200).json({
//         success: true,
//         message: "User registered successfully",
//         data: {
//             name,
//             email
//         }
//     })
// })


/*                             STEPS :
  // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res                               
    
*/
/*
// get user details from frontend
const {fullName, username, email, password} = req.body
console.log(email) 
// check if any field is empty : Validation
if ([fullName,username,email,password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required")
    
} 
// check if user already exists
const regiteredUser = User.findOne(
    $or : [{email}, {username}]
)

if(registeredUser){
    throw new ApiError(409, "User already exists") }

}
// Taking out the images path using the multer
const avatarLocalpath = req.files?.avatar[0]?.path

const coverImageLocalpath = req.files?.coverImage[0]?.path
// check if both images are uploaded on the local server
if(!avatarLocalpath || !coverImageLocalpath){
    throw new ApiError(400, "Both Image files are required")
}
// upload images on cloudinary
const avatar = await uploadOnCloudinary(avatarLocalpath)
const coverImage = await uploadOnCloudinary(coverImageLocalpath)
   //chech if file is uploaded onto cloudinary 
if(!avatar || !coverImage){
    throw new ApiError(500, "Image upload failed")
}    
//Upload the data to the database
const user = await User.create({
    fullName,
    username,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage.url
})
)
*/