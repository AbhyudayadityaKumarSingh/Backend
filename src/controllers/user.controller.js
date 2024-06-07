import  {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

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
    console.log(avatar || "nhi hai")

    console.log("Cloud Name  :  ", process.env.CLOUDINARY_CLOUD_NAME)
    if (!avatar) {
        
        throw new ApiError(400, "error aa rha hai")
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


const loginUser = asyncHandler(async (req, res) => {
 // data fetch from req.body
 //username or email
 //find the user in db
 //check password
 // access and refresh tokens
 // send cookie

 const {username,email,password} = req.body

 if(!username && !email){
     throw new ApiError(400, "Username or email is required")
 }
    if(!password){
        throw new ApiError(400, "Password is required")
     }
     //Check if user exists already in the database
     const user = await User.findOne({
        $or : [{username}, {email}]
     })
        if(!user){
            throw new ApiError(404, "User not found")
        }
        //Check if password is correct
       const isPasswordValid =  await user.isPasswordCorrect(password) // returns a boolean value
        if(!isPasswordValid){
            throw new ApiError(401, "Invalid credentials")
        }

        const {accessToken , refreshToken} =  await generateAccessandRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        //Cookies
        const options = {
            httpOnly: true,
            secure: true
        
        }

        return res
        .status(200).cookie("refreshToken", refreshToken ,options).cookie("accessToken", accessToken, options)
        .json(new ApiResponse(200, {
            user : loggedInUser , accessToken , refreshToken
        } , "User logged in successfully" ))



})

 //making the endpoint for refreshing tokens in case of expiry of the access tokens
const refreshAccessToken  = asyncHandler(async (req, res) => {

   
    const incomingToken = req.cookies?.refreshToken || req.body.refreshToken
    if(!incomingToken){
        throw new ApiError(401, "Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET)
        const user  = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if(user?.refreshToken !== incomingToken){
            throw new ApiError(401, "Invalid Refresh Token or expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        
        }
        const {accessToken , newrefreshToken } =await generateAccessAndRefereshTokens(user._id)
       return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(new ApiResponse(200, {accessToken, refreshToken : newRefreshToken} , "Token refreshed successfully"))
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})


const logoutUser = asyncHandler(async (req, res) => {
    //remove refresh tokens from the database to logout the user
    // since token was added ,  we have access to req.user._id

    await User.findByIdAndUpdate(req.user._id, {
        $set : { refreshToken : undefined}
    })

    //clear the cookies
    const options = {
        httpOnly: true,
        secure: true,
    
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const changeUserPassword = asyncHandler(async (req, res) => {
    const {oldPassword , newPassword} = req.body
    //taking out user as he would have been logged in , using auth middleware return req.user
    const user = await User.findById(req.user._id) 
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid password")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200, req.user, "User found")
})

const updateAccount = asyncHandler(async (req, res) => {
    const {fullName, email, username} = req.body
     if(!fullName || !email || !username){
         throw new ApiError(400, "All fields are required")
     }
    const user =  User.findByIdAndUpdate(req.user._id, {
        $set : {
            fullName,
            email : email,
            username
        }
    } , {new: true}).select("-password ")
    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"))
})
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath =  req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is Missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(500, "Image upload failed")
    }
    const user=  await User.findByIdAndUpdate(req.user._id, {
        $set : {
            avatar : avatar.url
        }
      },{new: true}).select("-password")
    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))

})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is Missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage){
        throw new ApiError(500, "Image upload failed")
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set : {
            coverImage : coverImage.url
        }
    }, {new: true}).select("-password") 
    return res.status(200).json(new ApiResponse(200, user, "Cover Image updated successfully"))
})
export {
    registerUser,
     loginUser,
     logoutUser ,
      refreshAccessToken ,
       changeUserPassword , 
       getCurrentUser,
        updateAccount,
        updateUserAvatar ,
        updateUserCoverImage}

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