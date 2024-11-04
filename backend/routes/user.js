const express=require("express");
const zod=require("zod");
const JWT_SECRET=require("./config");
const jwt = require("jsonwebtoken");
const authMiddleware=require("../middleware");
const {User, Account } = require("../db");
const router=express.Router();


const signupSchema = zod.object({
    username: zod.string().min(3).max(30).email(), // Align with Mongoose
    password: zod.string().min(6),          // Minimum length
    firstName: zod.string().max(50),        // Add max length
    lastName: zod.string().max(50),         // Add max length
});

const signinSchema = zod.object({
    username: zod.string().email(),
	password: zod.string()
});

const updateSchema=zod.object({
    firstName:zod.string(),
    lastName:zod.string(),
    password:zod.string(),
});




//signup
router.post("/signup",async(req,res)=>{
    const {username,firstName,lastName,password}=req.body;
    const result=await signupSchema.safeParse(req.body);
    if(!result.success)
    {
        res.status(411).json({message:" Incorrect inputs" });
        }
 const user = await User.findOne({
    username: username 
 })
 if(user){
    res.status(411).json({message:"User already exists"});
 }
 


 const newUser = await User.create({
    username: req.body.username,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
})

    await Account.create(
        {
            userId: newUser._id,
            balance: 1 + Math.random() * 10000
        }
    )

    const token=jwt.sign({
        userId:newUser._id,
     },JWT_SECRET);
 res.status(200).json({message:"User created successfully",token:token});

    });




//signin
router.post("/signin", async(req,res)=>{
    const { success,error } = signinSchema.safeParse(req.body)
    if (!success) {
        return res.status(411).json({
            message: "Email already taken / Incorrect inputs",
            errors: error.flatten().fieldErrors 
        })
    }
    const user = await User.findOne({
        username: req.body.username,
        password: req.body.password
    });

    if (user) {
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);   
        res.status(200).json({token:token});
        return;
        } 
            res.status(411).json({   message: "Error while logging in" });
           
});





//update
router.put("/", authMiddleware, async (req, res) => {
    const { success } = updateSchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({ message: "Error while updating information" });
        }
        const { username, firstName, lastName, password } = req.body;
        const user = await User.findByIdAndUpdate(req.user.userId, {
            username: username,
            firstName:firstName,
            lastName:lastName,
            password:password}
            );
            res.status(200).json({message:"User updated successfully"});
            });
        

//filter
router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";
         
   const users = await User.find({
        $or: [{
                     firstName: {
              "$regex": filter
                     }
                 }, {
            lastName: {
                         "$regex": filter
                     }
         }]
             })
         
res.json({
         user: users.map(user => ({        
              username: user.username,
             firstName: user.firstName,
             lastName: user.lastName,
                     _id: user._id
         })
        )
   })
         })


module.exports=router;
 