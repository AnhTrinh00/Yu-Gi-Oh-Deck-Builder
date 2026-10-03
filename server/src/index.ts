import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "Yu-Gi-Oh Deck Builder backend is running"
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})