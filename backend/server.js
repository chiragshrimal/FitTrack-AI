import app from './app.js';
import connectToDB from './configs/dbconnection.js';


const PORT = process.env.PORT || 5000;


app.listen(PORT, "0.0.0.0",async () => {
  // Connect to DB
  await connectToDB();
  console.log(`App is running at http://localhost:${PORT}`);
});

