const fs = require('fs');

const buscarPrecoSteam = (id, codigo_pais='BR') => {
    fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=${codigo_pais}&l=portuguese`)
        .then(response => response.json())
        .then(data => {
            if(data[id]['success'] === true){
                const gratuidade = data[id]['data']['is_free'];
                const nome = data[id]['data']['name'];
                const preco = gratuidade === true ? 'Gratuito' : data[id]['data']['price_overview']['final_formatted'];
                const desconto = gratuidade ? null : (data[id]['data']['price_overview'] ? data[id]['data']['price_overview']['discount_percent'] : 0);
                const url = `https://store.steampowered.com/app/${id}/`;
                
                const jogo = {
                    "Id": id,
                    "Nome": nome,
                    "Preco": preco,
                    "Desconto": desconto,
                    "URL": url
                };

                const jogoJSON = JSON.stringify(jogo, null, 2) + ',\n';
                console.log(jogoJSON);

                fs.appendFile('jogos.json', jogoJSON, (err) => {
                    if (err) {
                        console.error('Erro ao salvar dados no arquivo', err);
                    } else {
                        console.log('Dados salvos com sucesso em jogos.json');
                    }
                });
            }
        }).catch((e) => console.error('Erro ao buscar dados da API', e));
    
    };

async function exibirPreco() {
    const ids = [1030300,1809540,504230,391540,774361,2114740, 485510, 730];
    ids.forEach(id => buscarPrecoSteam(id));
}

const umMinuto = 6000000;

(async function cicloDeBusca() {
    await exibirPreco();

    setTimeout(cicloDeBusca, umMinuto);
})();