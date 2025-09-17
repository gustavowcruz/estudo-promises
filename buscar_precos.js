const fs = require('fs');
const axios = require('axios');

const WEBHOOK_URL = fs.readFileSync('webhook_url.txt', 'utf-8').trim();

function adcionarJogoJSON(jogo) {
    const arquivo = 'jogos.json';
    let jogos = [];
    
    try {
        if (fs.existsSync(arquivo)) {
            const conteudo = fs.readFileSync(arquivo, 'utf-8');
            jogos = JSON.parse(conteudo);
        }
    } catch (e) {
        console.error('Erro ao ler jogos.json:', e);
    }

    const ja_existe = jogos.some(j => j.id === jogo.id);
    if (!ja_existe) {
        jogos.push(jogo);
        const jogosJSON = JSON.stringify(jogos, null, 2);
        console.log(jogosJSON);
        fs.writeFile(arquivo, jogosJSON, (err) => {
            if (err) {
                console.error('Erro ao salvar dados no arquivo', err);
            }
        });
    } else {
        console.log(`Jogo com id ${jogo.id} já existe em jogos.json, não será adicionado novamente.`);
    }
}

function adcionarIdJogoJSON(id) {
    const arquivo = 'ids.json';
    let ids = [];

    try {
        if (fs.existsSync(arquivo)) {
            const conteudo = fs.readFileSync(arquivo, 'utf-8');
            ids = JSON.parse(conteudo);
        }
    } catch (e) {
        console.error('Erro ao ler ids.json:', e);
    }

    const ja_existe = ids.some(i => i === id);
    if (!ja_existe) {
        ids.push(id);
        const idsJSON = JSON.stringify(ids, null, 2);
        fs.writeFile(arquivo, idsJSON, (err) => {
            if (err) {
                console.error('Erro ao salvar dados no arquivo', err);
            }
        });
    } else {
        console.log(`ID ${id} já existe em ids.json, não será adicionado novamente.`);
    }
}

const buscarPrecoSteam = async (id, codigo_pais='BR') => {
    try {
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=${codigo_pais}&l=portuguese`);
        const data = await response.json();
        if(data[id]['success'] === true){
            const gratuidade = data[id]['data']['is_free'] ? true : false;
            const nome = data[id]['data']['name'];
            const preco = gratuidade === true ? 'Gratuito' : data[id]['data']['price_overview']['final_formatted'];            
            const preco_inicial = gratuidade === true ? 'Gratuito' : data[id]['data']['price_overview'] ? data[id]['data']['price_overview']['initial_formatted'] : 'Indisponível';
            const preco_real = gratuidade === true ? 0 : data[id]['data']['price_overview'] ? (data[id]['data']['price_overview']['final'] / 100) : 0;
            const preco_inicial_real = gratuidade === true ? 0 : data[id]['data']['price_overview'] ? (data[id]['data']['price_overview']['initial'] / 100) : 0;
            const desconto = gratuidade ? 0 : (data[id]['data']['price_overview'] ? data[id]['data']['price_overview']['discount_percent'] > 0 ? data[id]['data']['price_overview']['discount_percent'] : 0 : 0);
            const url = `https://store.steampowered.com/app/${id}/`;
            const imagem = data[id]['data']['header_image'];

            const jogos =
            {
                id: id,
                nome: nome,
                preco: preco,
                preco_inicial: preco_inicial,
                desconto: desconto,
                imagem: imagem,
                url: url,
                preco_real: preco_real,
                preco_inicial_real: preco_inicial_real
            };

            adcionarJogoJSON(jogos);
            adcionarIdJogoJSON(id);
            return jogos;

        } else {
            console.error(`Erro ao buscar dados do jogo com ID ${id}`);
            return null;
        }
    } catch (error) {
            console.error('Erro na requisição:', error);
            return null;
        }
    }

async function exibirPreco() {
    const ids = fs.existsSync('ids.json') ? JSON.parse(fs.readFileSync('ids.json', 'utf-8')) : [];
    for (const id of ids) {
        await buscarPrecoSteam(id);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre requisições
    }
}

async function enviarNotificacaoDiscord(jogo){
    if (!jogo) {
        console.error('Objeto jogo não fornecido para enviarNotificacaoDiscord');
        return;
    }

    const preco = jogo.preco;
    const preco_inicial = jogo.preco_inicial;
    const cor_embed = 0x28a745;
    const mensagem_promo = `O jogo **${jogo.nome}** está em promoção na Steam!`;

    const payload = {
        content: mensagem_promo,
        embeds: [
            {
                image: jogo.imagem ? { url: jogo.imagem } : undefined,
                title: jogo.nome,
                url: jogo.url,
                color: cor_embed,
                fields: [
                    {
                        name: "De:",
                        value: `~~${preco_inicial}~~`,
                        inline: true

                    },
                    {
                        name: "Por:",
                        value: `**${preco}**`,
                        inline: true
                    },
                ],
                footer: {
                    text: "Notificação enviada via Webhook"
                }
            }
        ]
            };
    try {
        await axios.post(WEBHOOK_URL, payload);
        console.log('Notificação enviada com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
    }
}

async function monitorarPrecos(){
    const ids = fs.existsSync('ids.json') ? JSON.parse(fs.readFileSync('ids.json', 'utf-8')) : [];
    for(const id of ids){
        const jogo = await buscarPrecoSteam(id);
        if(jogo) {
            if(jogo.desconto > 0 && !jaFoiAnunciado(jogo.id)){
                await enviarNotificacaoDiscord(jogo);
                marcarAnunciado(jogo.id);
            } else if(jogo.desconto === 0 && jaFoiAnunciado(jogo.id)) {
                removerAnunciado(jogo.id);
            }
        }
    }

    function jaFoiAnunciado(id) {
        const arquivo = 'anunciados.json';
        let anunciados = [];
        try {
            if (fs.existsSync(arquivo)) {
                const conteudo = fs.readFileSync(arquivo, 'utf-8');
                anunciados = JSON.parse(conteudo);
            }
        } catch (e) {
            console.error('Erro ao ler anunciados.json:', e);
        }
        return anunciados.includes(id);
    }

    function marcarAnunciado(id) {
        const arquivo = 'anunciados.json';
        let anunciados = [];
        try {
            if (fs.existsSync(arquivo)) {
                const conteudo = fs.readFileSync(arquivo, 'utf-8');
                anunciados = JSON.parse(conteudo);
            }
        } catch (e) {
            console.error('Erro ao ler anunciados.json:', e);
        }
        if (!anunciados.includes(id)) {
            anunciados.push(id);
            fs.writeFile(arquivo, JSON.stringify(anunciados, null, 2), (err) => {
                if (err) {
                    console.error('Erro ao salvar dados no arquivo', err);
                }
            });
        }
    }
    
    function removerAnunciado(id) {
    const arquivo = 'anunciados.json';
    let anunciados = [];
    try {
        if (fs.existsSync(arquivo)) {
            const conteudo = fs.readFileSync(arquivo, 'utf-8');
            anunciados = JSON.parse(conteudo);
        }
    } catch (e) {
        console.error('Erro ao ler anunciados.json:', e);
    }
    const novoArray = anunciados.filter(item => item !== id);
    fs.writeFileSync(arquivo, JSON.stringify(novoArray, null, 2));
    }
}


(async function cicloDeBusca() {
    await exibirPreco();
    await monitorarPrecos();

    setTimeout(cicloDeBusca, 3600000);
})();