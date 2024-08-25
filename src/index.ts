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
    where: {
      deletedAt: null
    },
    orderBy: { createdAt: "asc" },
  });

  const response = items

  res.json(response);
});

app.post("/items", async (req, res) => {
  consoleLog('post')
  // const item = await prisma.item.create({
  //   data: {
  //     name: req.body.name ?? "Sem nome",
  //     quantity: req.body.quantity ?? 0,
  //     image: req.body.image ?? 'https://github.com/devkoalaa.png',
  //     createdAt: new Date(),
  //     deletedAt: null,
  //     userId: req.body.userId ?? '3a438284-d1f0-4ff1-b9f3-1a09a3aff19a'
  //   },
  // });

  const response = [{
    "id": "1",
    "name": "Isqueiro",
    "quantity": 100,
    "image": "http://github.com/devkoalaa.png",
    "createdAt": "13/01/2023",
    "deletedAt": null,
    "userId": "3a438284-d1f0-4ff1-b9f3-1a09a3aff19a"
  }]

  return res.json(response);
});

app.get("/items/:id", async (req, res) => {
  const id = req.params.id;
  consoleLog(`getById: ${id}`)
  // const item = await prisma.item.findUnique({
  //   where: { id },
  // });

  const response = {
    "id": "1",
    "name": "Isqueiro",
    "quantity": 100,
    "image": "http://github.com/devkoalaa.png",
    "createdAt": "13/01/2023",
    "deletedAt": null,
    "userId": "3a438284-d1f0-4ff1-b9f3-1a09a3aff19a"
  }

  return res.json(response);
});

app.put("/items/:id", async (req, res) => {
  const id = req.params.id;
  consoleLog(`put: ${id}`)
  // const item = await prisma.item.update({
  //   where: { id },
  //   data: req.body,
  // });

  const response = {
    "id": "1",
    "name": "Isqueiro",
    "quantity": 100,
    "image": "http://github.com/devkoalaa.png",
    "createdAt": "13/01/2023",
    "deletedAt": null,
    "userId": "3a438284-d1f0-4ff1-b9f3-1a09a3aff19a"
  }

  return res.json(response);
});

app.delete("/items/:id", async (req, res) => {
  const id = req.params.id;

  consoleLog(`delete: ${id}`)
  // const item = await prisma.item.update({
  //   where: { id },
  //   data: {
  //     deletedAt: new Date(),
  //   }
  // });

  const response = {
    "id": "1",
    "name": "Isqueiro",
    "quantity": 100,
    "image": "http://github.com/devkoalaa.png",
    "createdAt": "13/01/2023",
    "deletedAt": null,
    "userId": "3a438284-d1f0-4ff1-b9f3-1a09a3aff19a"
  }

  return res.json(response);
});

// app.get("/users", async (req, res) => {
//   consoleLog('get')
//   const users = await prisma.user.findMany({
//     where: {
//       deletedAt: null
//     },
//     orderBy: { createdAt: "asc" },
//   });

//   res.json(users);
// });

// app.post("/users", async (req, res) => {
//   consoleLog('post')
//   const user = await prisma.user.create({
//     data: {
//       name: req.body.name ?? "Sem nome",
//       image: req.body.image ?? 'https://github.com/devkoalaa.png',
//       createdAt: new Date(),
//       deletedAt: null
//     },
//   });

//   return res.json(user);
// });

app.get("/", async (req, res) => {
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
