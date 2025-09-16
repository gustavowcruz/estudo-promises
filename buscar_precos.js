const fs = require('fs');
const axios = require('axios');

const WEBHOOK_URL = "https://discord.com/api/webhooks/1417555779480846337/sgwsh4qta7jnQXMaRhkowErHmPh6m-jyI34bXhFlsU8tKGDbQoX3iEGMbkqu4zrVfEQD";

const buscarPrecoSteam = async (id, codigo_pais='BR') => {
    try {
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=${codigo_pais}&l=portuguese`);
        const data = await response.json();
        if(data[id]['success'] === true){
            const gratuidade = data[id]['data']['is_free'];
            const nome = data[id]['data']['name'];
            const preco = gratuidade === true ? 'Gratuito' : data[id]['data']['price_overview']['final_formatted'];
            const desconto = gratuidade ? 0 : (data[id]['data']['price_overview'] ? data[id]['data']['price_overview']['discount_percent'] > 0 ? data[id]['data']['price_overview']['discount_percent'] : 0 : 0);
            const url = `https://store.steampowered.com/app/${id}/`;

            const jogo = {
                id: id,
                nome: nome,
                preco: preco,
                desconto: desconto,
                url: url
            };

            const jogoJSON = JSON.stringify(jogo, null, 2) + ',\n';
            console.log(jogoJSON);

            fs.appendFile('jogos.json', jogoJSON, (err) => {
                if (err) {
                    console.error('Erro ao salvar dados no arquivo', err);
                }
            });
        }
    } catch (e) {
        console.error('Erro ao buscar dados da API', e);
    }
};

async function exibirPreco() {
    const ids = [1030300,1809540,504230,391540,774361,2114740, 485510, 730];
    for (const id of ids) {
        await buscarPrecoSteam(id);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos entre requisições
    }
}

(async function cicloDeBusca() {
    await exibirPreco();

    setTimeout(cicloDeBusca, 60000);
})();

module.exports = { buscarPrecoSteam, exibirPreco };