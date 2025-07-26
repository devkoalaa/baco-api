import { PrismaClient } from "@prisma/client"
import cors from 'cors'
import dotenv from 'dotenv'
import express from "express"
import { Stream } from "stream"
import Pusher from 'pusher'

dotenv.config()
const fileUpload = require('express-fileupload')
const GOOGLE_API_FOLDER_ID = process.env.GOOGLE_API_FOLDER_ID
const stream = require('stream')
const { google } = require('googleapis')
const prisma = new PrismaClient({
  log: ['info'],
})
const timezone = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
prisma.$executeRawUnsafe(`SET time zone '${timezone}'`);
const port = process.env.PORT || 3000
const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use(express.raw({ type: "application/vnd.custom-type" }))
app.use(express.text({ type: "text/html" }))
app.use(fileUpload())

function log(rota: string, metodo: string = 'get') {
  console.info(`Acessou a rota: '${rota}', método: '${metodo}', data: '${getDate()}'\n`)
}

function getDate(toDb = false) {
  let date_ob = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  let date = new Date(date_ob)

  let day = ("0" + date.getDate()).slice(-2)
  let month = ("0" + (date.getMonth() + 1)).slice(-2)
  let year = date.getFullYear()
  let hours = ("0" + date.getHours()).slice(-2)
  let minutes = ("0" + date.getMinutes()).slice(-2)

  const result = toDb ? new Date(`${year}-${month}-${day}T${hours}:${minutes}:00-03:00`) : `${day}/${month}/${year} ${hours}h${minutes}`

  return result
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
        quantity: req.body.quantity ? Number(req.body.quantity) : 1,
        quantityPurchased: req.body.quantityPurchased ? Number(req.body.quantityPurchased) : 0,
        image: req.body.image ?? '/images/placeholder.png',
        description: req.body.description ?? 'Sem descrição',
      },
    })

    res.json(gift)
  } catch (error) {
    console.error('Erro ao criar presente:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.get("/presenceByPhone/:phone", async (req, res) => {
  log('/presenceByPhone', 'get');

  const { phone } = req.params;

  try {
    const presence = await prisma.presence.findFirst({
      where: {
        phone: phone,
        deletedAt: null,
      },
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

app.get("/presence/:id", async (req, res) => {
  log('/presence', 'get');

  const { id } = req.params;

  try {
    const presence = await prisma.presence.findFirst({
      where: {
        id,
        deletedAt: null,
      },
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
      orderBy: {
        createdAt: 'desc'
      }
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

    if (!Array.isArray(gifts)) {
      return res.status(400).json({ error: 'O corpo da requisição deve ser um array de presentes.' });
    }

    const invalidGifts = gifts.filter(
      gift => !gift.presenceId || !gift.giftId || (gift.quantity && isNaN(Number(gift.quantity)))
    );

    if (invalidGifts.length > 0) {
      return res.status(400).json({
        error: 'Alguns presentes estão com dados inválidos.',
        invalidGifts,
      });
    }

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

    res.status(500).json({
      error: 'Erro ao vincular presentes com presença. Por favor, tente novamente mais tarde.',
      details: (error as any).message,
    });
  }
});

app.delete("/presenceGift", async (req, res) => {
  log('/presenceGift', 'delete');

  try {
    const { presenceId, giftId } = req.body;

    if (!presenceId || !giftId) {
      return res.status(400).json({ error: 'Os campos presenceId e giftId são obrigatórios.' });
    }

    const existingPresenceGift = await prisma.presenceGift.findUnique({
      where: {
        presenceId_giftId: {
          presenceId,
          giftId,
        },
      },
    });

    if (!existingPresenceGift) {
      return res.status(404).json({ error: 'Presente não encontrado para o cadastro especificado.' });
    }

    const { quantity } = existingPresenceGift;

    await prisma.$transaction([
      prisma.presenceGift.delete({
        where: {
          presenceId_giftId: {
            presenceId,
            giftId,
          },
        },
      }),
      prisma.gift.update({
        where: {
          id: giftId,
        },
        data: {
          quantityPurchased: {
            decrement: quantity,
          },
        },
      }),
    ]);

    res.status(200).json({
      message: 'Presente removido com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao remover presente:', error);

    res.status(500).json({
      error: 'Erro ao remover presente. Por favor, tente novamente mais tarde.',
      details: (error as any).message,
    });
  }
});

app.patch("/presenceGift", async (req, res) => {
  log('/presenceGift', 'patch');

  try {
    const { presenceId, giftId, quantity } = req.body;

    if (!presenceId || !giftId || quantity === undefined) {
      return res.status(400).json({ error: 'Os campos presenceId, giftId e quantity são obrigatórios.' });
    }

    if (isNaN(Number(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({ error: 'O campo quantity deve ser um número válido maior ou igual a um.' });
    }

    const existingPresenceGift = await prisma.presenceGift.findUnique({
      where: {
        presenceId_giftId: {
          presenceId,
          giftId,
        },
      },
    });

    if (!existingPresenceGift) {
      return res.status(404).json({ error: 'Presente não encontrado para o cadastro especificado.' });
    }

    const quantityDifference = Number(quantity) - existingPresenceGift.quantity;

    await prisma.$transaction([
      prisma.presenceGift.update({
        where: {
          presenceId_giftId: {
            presenceId,
            giftId,
          },
        },
        data: {
          quantity: Number(quantity),
        },
      }),
      prisma.gift.update({
        where: {
          id: giftId,
        },
        data: {
          quantityPurchased: {
            increment: quantityDifference,
          },
        },
      }),
    ]);

    res.status(200).json({
      message: 'Quantidade do presente atualizada com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao atualizar a quantidade do presente:', error);

    res.status(500).json({
      error: 'Erro ao atualizar a quantidade do presente. Por favor, tente novamente mais tarde.',
      details: (error as any).message,
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

app.get("/messages", async (req, res) => {
  log('/messages')

  try {
    const messages = await prisma.message.findMany({
      where: {
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
    })

    res.json(messages)
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.post("/messages", async (req, res) => {
  log('/messages', 'post')

  try {
    const message = await prisma.message.create({
      data: {
        content: req.body.content,
        sender: req.body.sender,
      },
    })

    res.json(message)
  } catch (error) {
    console.error('Erro ao criar mensagem:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

app.post("/stream-message", async (req, res) => {
  log('/stream-message', 'post')

  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
  })

  const { mensagem, nome, valor } = req.body

  console.log(req.body)

  const response: any = await pusher.trigger(
    'canal-alertas-pix',
    'nova-doacao',
    {
      mensagem,
      nome,
      valor,
    },
  );

  res.json({ message: 'Mensagem enviada com sucesso' })
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
