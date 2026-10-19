const express = require('express');
const app = express();

app.use(express.json());

// Puxa as credenciais diretamente dos Segredos/Variáveis salvos na GoDaddy
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "roseone_token_seguro_2026";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1435255489662797";

// 1. Rota de Validação exigida pela Meta
app.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("WEBHOOK VALIDADO COM SUCESSO!");
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

// 2. Rota principal para receber e processar mensagens do WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
    const body = req.body;

    try {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const message = body.entry[0].changes[0].value.messages[0];
            const fromNumber = message.from;
            const text = message.text ? message.text.body : "";
            
            // Tratamento seguro para evitar queda do servidor se o contato não tiver nome
            const customerName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || "Cliente";

            let resposta = "";
            const textLower = text.toLowerCase();

            // Roteamento de mensagens
            if (textLower.includes("psi") || textLower.includes("psicolog")) {
                resposta = `Olá, Dr(a). ${customerName}! 🌿 Seja bem-vindo ao *RoseOne PSI*.\n\nSou a Beatriz da equipe de atendimento. Como posso te ajudar na gestão do seu consultório hoje?`;
            } else {
                resposta = `Olá, ${customerName}! 🚀 Seja bem-vindo à *RoseOne*.\n\nSou a Renata. Como posso te ajudar com nossas soluções corporativas (*Sales*, *Dental Clinic*, *Your Health* ou *ERP*) hoje?`;
            }

            // Envia a resposta via Meta API
            await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: fromNumber,
                    type: "text",
                    text: { body: resposta }
                })
            });
        }
    } catch (error) {
        console.error("Erro no processamento:", error);
    }

    res.status(200).send("EVENT_RECEIVED");
});

// Porta dinâmica exigida pelo servidor GoDaddy
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));