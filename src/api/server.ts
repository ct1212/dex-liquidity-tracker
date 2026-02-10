import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
export function startServer(port: number = PORT) {
  return app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export { app };
