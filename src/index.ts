import { PrismaClient } from "@prisma/client"
import cors from 'cors'
import dotenv from 'dotenv'
import express from "express"
import { Stream } from "stream"

dotenv.config()
const fileUpload = require('express-fileupload')
const GOOGLE_API_FOLDER_ID = process.env.GOOGLE_API_FOLDER_ID
const stream = require('stream')
const { google } = require('googleapis')
const prisma = new PrismaClient({
  log: ['info'],
})
const port = process.env.PORT || 3000
const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use(express.raw({ type: "application/vnd.custom-type" }))
app.use(express.text({ type: "text/html" }))
app.use(fileUpload())

function log(rota: string, metodo: string = 'get') {
  let date_ob = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  let date = new Date(date_ob)

  let day = ("0" + date.getDate()).slice(-2)
  let month = ("0" + (date.getMonth() + 1)).slice(-2)
  let year = date.getFullYear()
  let hours = ("0" + date.getHours()).slice(-2)
  let minutes = ("0" + date.getMinutes()).slice(-2)

  console.info(`Acessou a rota: '${rota}', método: '${metodo}', data: '${day}/${month}/${year} ${hours}h${minutes}'\n`)
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
    console.error('Erro ao criar arquivo:', err)
    throw err
  }
}

app.post('/upload', async (req: any, res: any) => {
  log('/upload', 'post')

  const { image } = req.files

  const bufferStream = new stream.PassThrough()
  bufferStream.end(image.data)

  try {
    const fileId = await uploadFile(bufferStream, image.name)
    res.json({
      imageName: image.name,
      imageUrl: `https://drive.google.com/uc?export=view&id=${fileId}`
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' })
  }
})

app.get("/gifts", async (req, res) => {
  log('/gifts')

  try {
    const gifts = await prisma.gift.findMany({
      where: {
        deletedAt: null
      },
      orderBy: { name: "asc" },
    })

    res.json(gifts)
  } catch (error) {
    console.error('Erro ao buscar presentes:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.post("/gifts", async (req, res) => {
  log('/gifts', 'post')

  try {
    const gift = await prisma.gift.create({
      data: {
        name: req.body.name ?? "Sem nome",
        quantity: req.body.quantity ? Number(req.body.quantity) : 0,
        quantityPurchased: req.body.quantityPurchased ? Number(req.body.quantityPurchased) : 0,
        image: req.body.image ?? '/images/placeholder.png',
        createdAt: new Date(),
        deletedAt: null,
        description: req.body.description ?? 'Sem descrição',
      },
    })

    res.json(gift)
  } catch (error) {
    console.error('Erro ao criar presente:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get("/presence/:id", async (req, res) => {
  log('/presence', 'get');

  const { id } = req.params;

  try {
    const presence = await prisma.presence.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        acompanhantesAdultos: true,
        acompanhantesCriancas: true,
        selectedGifts: {
          select: {
            gift: true,
            quantity: true
          }
        },
      },
    });

    if (!presence) {
      return res.status(404).json({ error: "Presença não encontrada" });
    }

    res.json(presence);
  } catch (error) {
    console.error("Erro ao buscar confirmações de presenças:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/presence", async (req, res) => {
  log('/presence', 'get');

  try {
    const presence = await prisma.presence.findMany({
      where: {
        deletedAt: null
      },
      select: {
        name: true,
        createdAt: true,
        phone: true,
        acompanhantesAdultos: true,
        acompanhantesCriancas: true,
        selectedGifts: {
          select: {
            gift: true,
            quantity: true
          }
        },
      },
    });

    if (!presence) {
      return res.status(404).json({ error: "Nenhuma confirmação de presença encontrada" });
    }

    res.json(presence);
  } catch (error) {
    console.error("Erro ao buscar confirmações presenças:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/confirmPresence", async (req, res) => {
  log('/confirmPresence', 'post')

  try {
    const presence = await prisma.presence.create({
      data: {
        name: req.body.nome ?? "Sem nome",
        phone: req.body.telefone ?? "Sem telefone",
        acompanhantesAdultos: req.body.acompanhantesAdultos ?? 0,
        acompanhantesCriancas: req.body.acompanhantesCriancas ?? 0,
      },
    })

    res.json(presence)
  } catch (error) {
    console.error('Erro ao confirmar presença:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.post("/presenceGift", async (req, res) => {
  log('/presenceGift', 'post');

  try {
    const gifts = req.body;

    // Validação inicial
    if (!Array.isArray(gifts)) {
      return res.status(400).json({ error: 'O corpo da requisição deve ser um array de presentes.' });
    }

    // Verifica se todos os campos obrigatórios estão presentes e válidos
    const invalidGifts = gifts.filter(
      gift => !gift.presenceId || !gift.giftId || (gift.quantity && isNaN(Number(gift.quantity)))
    );

    if (invalidGifts.length > 0) {
      return res.status(400).json({
        error: 'Alguns presentes estão com dados inválidos.',
        invalidGifts,
      });
    }

    // Executa a transação para criar registros e atualizar a quantidade
    const createdPresenceGifts = await prisma.$transaction(
      gifts.flatMap(gift => [
        prisma.presenceGift.upsert({
          where: {
            presenceId_giftId: {
              presenceId: gift.presenceId,
              giftId: gift.giftId,
            },
          },
          update: {
            quantity: {
              increment: gift.quantity ? Number(gift.quantity) : 1,
            },
          },
          create: {
            presenceId: gift.presenceId,
            giftId: gift.giftId,
            quantity: gift.quantity ? Number(gift.quantity) : 1,
          },
        }),
        prisma.gift.update({
          where: {
            id: gift.giftId,
          },
          data: {
            quantityPurchased: {
              increment: gift.quantity ? Number(gift.quantity) : 1,
            },
          },
        }),
      ])
    );

    res.status(201).json({
      message: 'Presentes vinculados com sucesso.',
      createdPresenceGifts,
    });
  } catch (error) {
    console.error('Erro ao vincular presentes com presença:', error);

    // Retorna um erro genérico
    res.status(500).json({
      error: 'Erro ao vincular presentes com presença. Por favor, tente novamente mais tarde.',
      details: (error as any).message, // Inclui detalhes para debugging
    });
  }
});

app.get("/items", async (req, res) => {
  log('/items')

  try {
    const items = await prisma.item.findMany({
      where: {
        deletedAt: null
      },
      orderBy: { createdAt: "asc" },
    })

    res.json(items)
  } catch (error) {
    console.error('Erro ao buscar itens:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.post("/items", async (req, res) => {
  log('/items', 'post')

  try {
    const item = await prisma.item.create({
      data: {
        name: req.body.name ?? "Sem nome",
        quantity: req.body.quantity ? Number(req.body.quantity) : 0,
        image: req.body.image ?? 'https://github.com/devkoalaa.png',
        createdAt: new Date(),
        deletedAt: null,
      },
    })

    res.json(item)
  } catch (error) {
    console.error('Erro ao criar item:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get("/items/:id", async (req, res) => {
  const id = req.params.id
  log(`/items/${id}`)

  try {
    const item = await prisma.item.findUnique({
      where: { id },
    })

    res.json(item)
  } catch (error) {
    console.error('Erro ao buscar item:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.put("/items/:id", async (req, res) => {
  const id = req.params.id
  log(`/items/${id}`, 'put')

  try {
    const item = await prisma.item.update({
      where: { id },
      data: req.body,
    })

    res.json(item)
  } catch (error) {
    console.error('Erro ao atualizar item:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.delete("/items/:id", async (req, res) => {
  const id = req.params.id
  log(`/items/${id}`, 'delete')

  try {
    const item = await prisma.item.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      }
    })

    res.json(item)
  } catch (error) {
    console.error('Erro ao deletar item:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get("/", async (req, res) => {
  log('/')

  res.send(
    `
    <body style="background-color: #343434">
      <h1 style="color: white">BACO-API</h1>
    </body>
    `.trim(),
  )
})

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`\nBaco API já tá rodando em http://localhost:${port} 🚀\n`)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

module.exports = app;
