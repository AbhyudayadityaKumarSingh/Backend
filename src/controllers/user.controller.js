import  {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    const [fullname,username, email, password] = req.body
    res.status(200).json({
        success: true,
        message: "User registered successfully",
        data: {
            name,
            email
        }
    })
})

export {registerUser}