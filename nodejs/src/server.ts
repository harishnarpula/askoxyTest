import Fastify from "fastify";
import cors from "@fastify/cors";
import aiRoutes from "./routes/ai";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

const app = Fastify();

app.register(cors, { origin: "*" });

// ✅ Register Swagger
app.register(swagger, {
  swagger: {
    info: {
      title: "AskOxy AI API",
      description: "AI-powered application builder APIs",
      version: "1.0.0"
    },
    host: "localhost:3000",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"]
  }
});

// ✅ Swagger UI
app.register(swaggerUI, {
  routePrefix: "/docs"
});


// Routes
app.get("/", async () => {
  return { message: "🚀 Server is running" };
});

app.register(aiRoutes, { prefix: "/api/ai" });

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log("Server running at http://localhost:3000");
    console.log("Swagger at http://localhost:3000/docs");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();