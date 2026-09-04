//import the "multer" package to handle file uploads
import multer from 'multer'

//Configure storage settings for uploaded files
const storage = multer.diskStorage({
//Define the filename function to set how uploaded files should be named
filename:function(req,file,callback){
    //Use the original filename of the uploaded file
    callback(null,file.originalname)
}

})
//Create an upload instance using the defined storage configuration
const upload = multer({storage})
//Export the 'upload middleware so it can be used in other parts of the application
export default upload