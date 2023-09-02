import { PrismaClient } from "@prisma/client";
import express from "express";
import { Stream } from "stream";
const fileUpload = require('express-fileupload');
const GOOGLE_API_FOLDER_ID = "1EUjB4GdBUhMUnl1tTfKXudpAsq6_D9BC";
const stream = require('stream');
const { google } = require('googleapis')

const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));
app.use(fileUpload());

function consoleLog(rota: string) {
  let date_ob = new Date();
  let date = ("0" + date_ob.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours() - 3;
  let minutes = date_ob.getMinutes();
  console.log(rota, date + "/" + month + "/" + year + " " + hours + ":" + minutes);
}

async function uploadFile(file: Stream, name: string) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'baco-api.json',
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
  consoleLog('upload')
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
  consoleLog('get')
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "asc" },
  });

  res.json(items);
});

app.post("/items", async (req, res) => {
  consoleLog('post')
  const item = await prisma.item.create({
    data: {
      name: req.body.name ?? "Sem nome",
      quantity: req.body.quantity ?? 0,
      image: req.body.image ?? 'https://github.com/devkoalaa.png',
      createdAt: new Date(),
    },
  });

  return res.json(item);
});

app.get("/items/:id", async (req, res) => {
  consoleLog('getById')
  const id = req.params.id;
  const item = await prisma.item.findUnique({
    where: { id },
  });

  return res.json(item);
});

app.put("/items/:id", async (req, res) => {
  consoleLog('put')
  const id = req.params.id;
  const item = await prisma.item.update({
    where: { id },
    data: req.body,
  });

  return res.json(item);
});

app.delete("/items/:id", async (req, res) => {
  consoleLog('delete')
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
