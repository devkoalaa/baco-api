import { PrismaClient } from "@prisma/client";
import express from "express";

const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));

app.get("/items", async (req, res) => {
  console.log('UHUUUUUUUUUUUUUUUUU GALINHA DA API!!!')
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json(items);
});

app.post("/items", async (req, res) => {
  const item = await prisma.item.create({
    data: {
      name: req.body.name ?? "Sem nome",
      quantity: req.body.quantity ?? 0,
      image: req.body.quantity ?? 'https://github.com/devkoalaa.png',
      createdAt: new Date(),
    },
  });

  return res.json(item);
});

app.get("/items/:id", async (req, res) => {
  const id = req.params.id;
  const item = await prisma.item.findUnique({
    where: { id },
  });

  return res.json(item);
});

app.put("/items/:id", async (req, res) => {
  const id = req.params.id;
  const item = await prisma.item.update({
    where: { id },
    data: req.body,
  });

  return res.json(item);
});

app.delete("/items/:id", async (req, res) => {
  const id = req.params.id;
  await prisma.item.delete({
    where: { id },
  });

  return res.send({ status: "ok" });
});

app.get("/", async (req, res) => {
  res.send(
    `
  <h1>Item REST API</h1>
  <h2>Available Routes</h2>
  <pre>
    GET, POST /items
    GET, PUT, DELETE /items/:id
  </pre>
  `.trim(),
  );
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
