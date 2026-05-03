import mongoose from "mongoose";
function ConnectDB(){
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("❌ MONGO_URL is not defined in environment variables!");
    return;
  }

  mongoose.connect(mongoUrl).then((res)=>{
    console.log('✅ MongoDB Connected Successfully');
  }).catch((error)=>{
    console.error('❌ MongoDB Connection Failed:', error.message);
  })
}
export default ConnectDB;