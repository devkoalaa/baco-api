import { PrismaClient } from "@prisma/client";
import express from "express";
import { Stream } from "stream";
import dotenv from 'dotenv';

dotenv.config();
const fileUpload = require('express-fileupload');
const GOOGLE_API_FOLDER_ID = process.env.GOOGLE_API_FOLDER_ID;
const stream = require('stream');
const { google } = require('googleapis')
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));
app.use(fileUpload());

function log(rota: string, metodo: string = 'get') {
  let date_ob = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  let date = new Date(date_ob);

  let day = ("0" + date.getDate()).slice(-2);
  let month = ("0" + (date.getMonth() + 1)).slice(-2);
  let year = date.getFullYear();
  let hours = ("0" + date.getHours()).slice(-2);
  let minutes = ("0" + date.getMinutes()).slice(-2);

  console.info(`Acessou a rota: '${rota}', método: '${metodo}', data: '${day}/${month}/${year} ${hours}h${minutes}'\n`);
}

async function uploadFile(file: Stream, name: string) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
      scopes: ['https://www.googleapis.com/auth/drive']
    })

    const driveService = google.drive({
      version: "v3",
      auth
    })

    const fileMetaData = {
      'name': name,
      'parents': [GOOGLE_API_FOLDER_ID]
    }

    const media = {
      mimeType: 'image/png',
      body: file
    }

    const response = await driveService.files.create({
      resource: fileMetaData,
      media: media,
      fields: 'id'
    })

    return response.data.id
  } catch (err) {
    console.log('Erro ao criar arquivo:', err)
  }
}

app.post('/upload', async (req: any, res: any) => {
  log('/upload', 'post')

  const { image } = req.files;

  const bufferStream = new stream.PassThrough()
  bufferStream.end(image.data)

  uploadFile(bufferStream, image.name).then(data => {
    res.json({
      imageName: image.name,
      imageUrl: `https://drive.google.com/uc?export=view&id=${data}`
    })
  })
})

app.get("/items", async (req, res) => {
  log('/items')

  const items = await prisma.item.findMany({
    where: {
      deletedAt: null
    },
    orderBy: { createdAt: "asc" },
  });

  const response = items

  res.json(response);
});

app.post("/items", async (req, res) => {
  log('/items', 'post')

  const item = await prisma.item.create({
    data: {
      name: req.body.name ?? "Sem nome",
      quantity: req.body.quantity ?? 0,
      image: req.body.image ?? 'https://github.com/devkoalaa.png',
      createdAt: new Date(),
      deletedAt: null,
    },
  });

  return res.json(item);
});

app.get("/items/:id", async (req, res) => {
  const id = req.params.id;
  log(`/items/${id}`)

  const item = await prisma.item.findUnique({
    where: { id },
  });

  return res.json(item);
});

app.put("/items/:id", async (req, res) => {
  const id = req.params.id;
  log(`/items/${id}`, 'put')

  const item = await prisma.item.update({
    where: { id },
    data: req.body,
  });

  return res.json(item);
});

app.delete("/items/:id", async (req, res) => {
  const id = req.params.id;
  log(`/items/${id}`, 'delete')

  const item = await prisma.item.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    }
  });

  return res.json(item);
});

app.get("/", async (req, res) => {
  log('/')

  res.send(
    `
    <body style="background-color: #343434">
      <h1 style="color: white">BACO-API</h1>
    </body>
    `.trim(),
  );
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`\nBaco API já tá rodando em http://localhost:${port} 🚀\n`);
});
