import "dotenv/config";
import { app } from "./app.js";
const port = Number(process.env.PORT || 4000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters");
app.listen(port, "0.0.0.0", () => console.log(`RePlate API listening on ${port}`));
