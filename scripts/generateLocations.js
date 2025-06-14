// scripts/generateLocations.js
const fs = require('fs');
const fetch = require('node-fetch');

(async function main() {
  try {
    // 1) Scarichiamo il GeoJSON delle province
    const provincesRes = await fetch(
      'https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_provinces.geojson'
    );
    if (!provincesRes.ok) throw new Error(`Provincia fetch failed: ${provincesRes.status}`);
    const provincesJson = await provincesRes.json();

    // 2) Mappiamo per ogni regione l’array delle province corrispondenti
    const provinceByRegione = provincesJson.features.reduce((acc, f) => {
      const regName = f.properties.reg_name;
      acc[regName] = acc[regName] || [];
      const provName = f.properties.name;
      if (!acc[regName].includes(provName)) {
        acc[regName].push(provName);
      }
      return acc;
    }, {});

    // Ordiniamo alfabeticamente i nomi delle province
    Object.keys(provinceByRegione).forEach(reg => {
      provinceByRegione[reg].sort((a, b) => a.localeCompare(b, 'it'));
    });

    // 3) Deriviamo la lista di regioni (ordine alfabetico, stabile)
    const regioni = Object.keys(provinceByRegione).sort((a, b) => a.localeCompare(b, 'it'));

    // 4) Scarichiamo il GeoJSON delle municipalità (comuni)
    const comuniRes = await fetch(
      'https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_municipalities.geojson'
    );
    if (!comuniRes.ok) throw new Error(`Comuni fetch failed: ${comuniRes.status}`);
    const comuniJson = await comuniRes.json();

    // 5) Creiamo il mapping provincia → array di comuni
    const comuniByProvincia = comuniJson.features.reduce((acc, feat) => {
      const provName = feat.properties.prov_name;
      acc[provName] = acc[provName] || [];
      const comName = feat.properties.name;
      if (!acc[provName].includes(comName)) {
        acc[provName].push(comName);
      }
      return acc;
    }, {});

    // Ordiniamo alfabeticamente i nomi dei comuni
    Object.keys(comuniByProvincia).forEach(prov => {
      comuniByProvincia[prov].sort((a, b) => a.localeCompare(b, 'it'));
    });

    // 6) Ricostruiamo gli oggetti per avere chiavi in ordine alfabetico
    const sortedProvinceByRegione = {};
    regioni.forEach(reg => {
      sortedProvinceByRegione[reg] = provinceByRegione[reg];
    });

    const comuniProvKeys = Object.keys(comuniByProvincia).sort((a, b) => a.localeCompare(b, 'it'));
    const sortedComuniByProvincia = {};
    comuniProvKeys.forEach(prov => {
      sortedComuniByProvincia[prov] = comuniByProvincia[prov];
    });

    // 7) Formattiamo e scriviamo il file
    const header = `// Questo file è generato automaticamente da scripts/generateLocations.js`
      + `\n// Non editare a mano.\n\n`;

    const body = [];
    body.push(`export const regioni = ${JSON.stringify(regioni, null, 2)};`);
    body.push(``);
    body.push(`export const provinceByRegione = ${JSON.stringify(sortedProvinceByRegione, null, 2)};`);
    body.push(``);
    body.push(`export const comuniByProvincia = ${JSON.stringify(sortedComuniByProvincia, null, 2)};`);

    fs.writeFileSync('data/locations.js', header + body.join('\n'), 'utf8');

    console.log(
      `✅ data/locations.js generato con ${regioni.length} regioni, ` +
      `${regioni.reduce((sum, r) => sum + sortedProvinceByRegione[r].length, 0)} province e ` +
      `${Object.values(sortedComuniByProvincia).reduce((sum, arr) => sum + arr.length, 0)} comuni.`
    );
  } catch (err) {
    console.error('Errore durante generazione locations:', err);
    process.exit(1);
  }
})();
