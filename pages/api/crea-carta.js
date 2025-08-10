// pages/api/crea-carta.js
import { withAuth } from '../../lib/auth/withAuth';
import { connectToDatabase } from '../../lib/mongodb';

import { ObjectId } from 'mongodb';

// === Moduli esistenti nel tuo progetto
import { parseForm } from '../../lib/services/carta/formParser';                  // LOG
import { extractAndValidateData } from '../../lib/services/carta/dataExtractor'; // LOG
import { checkRestaurantLimit } from '../../lib/services/limits/planLimiter';     // (se presente)
import { saveAttivita } from '../../lib/services/attivita/saveAttivita';          // LOG
import { processMenuFile } from '../../lib/services/carta/textProcessor';         // LOG
import { processPinecone } from '../../lib/services/carta/wineSelection';         // LOG
import { saveCartaToMongo } from '../../lib/services/carta/mongoUpload';          // LOG
import { supabaseUpload } from '../../lib/services/carta/supabaseUpload';         // LOG

// === Moduli NUOVI del flusso “grounded”
import { getRecentWineKeys, enforceNovelty } from '../../lib/services/carta/noveltyPolicy'; // LOG
import { parseMenuToDishes } from '../../lib/services/carta/parseMenutoDishes';               // LOG (path CORRETTO)
import { computeWineDistribution } from '../../lib/services/carta/distribution';             // LOG
import { curateCandidates, mapWineFamily } from '../../lib/services/carta/compatibility';    // LOG
import { generateWineExplanationsGrounded } from '../../lib/services/carta/promptGrounded';  // LOG
import { lintAndClampDescription } from '../../lib/services/carta/lintFacts';                // LOG
import { computePricePolicy, getPrice } from '../../lib/services/carta/pricePolicy';         // LOG

export const config = { api: { bodyParser: false } };

const log = (...args) => console.log('[crea-carta]', ...args);
const time = (label) => {
  const start = Date.now();
  return () => log(`${label} finito in ${Date.now() - start}ms`);
};

// util per novità (% nuove vs chiavi recenti)
function canonicalKey(md = {}) {
  const prod = (md?.produttore || md?.cantina || '').toString().trim().toLowerCase();
  const denom = (md?.denominazione || md?.nomeVino || md?.nome_completo || '').toString().trim().toLowerCase();
  return `${prod}||${denom}`;
}

async function handler(req, res, session) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    log('Avvio crea-carta per user:', session?.user?.email, 'plan:', session?.user?.plan);
    const userId = session.user.id;
    const userPlan = session.user.plan || 'free';

    log('Chiamo file: lib/mongodb.js → connectToDatabase()');
    const { db } = await connectToDatabase();
    log('Connesso a MongoDB');

    // 1) Parse form (file + campi)
    log('Chiamo file: lib/services/carta/formParser.js → parseForm()');
    const endParseForm = time('parseForm');
    const { fields, files } = await parseForm(req);
    endParseForm();

    // Limite per piano (se usi questo controllo)
    if (typeof checkRestaurantLimit === 'function') {
      log('Chiamo file: lib/services/limits/planLimiter.js → checkRestaurantLimit()');
      await checkRestaurantLimit(db, userId, userPlan);
    }

    // 2) Estrai meta attività dai campi
    log('Chiamo file: lib/services/carta/dataExtractor.js → extractAndValidateData()');
    const vd = extractAndValidateData({ fields, files });
    const baseActivityData = {
      nome: vd.nome,
      regione: vd.regione,
      provincia: vd.provincia,
      comune: vd.comune,
      fascia: vd.fascia
    };
    log('Dati attività estratti:', baseActivityData);

    // 3) Crea/recupera attività
    const endSaveAtt = time('saveAttivita');
    let activityData, activityId;
    const actIdField = fields.activityId?.[0];
    if (!actIdField || actIdField === 'new') {
      log('Chiamo file: lib/services/attivita/saveAttivita.js → saveAttivita()');
      activityId = await saveAttivita({ userId, userEmail: session.user.email, ...baseActivityData });
      activityData = { _id: new ObjectId(activityId), ...baseActivityData };
    } else {
      log('Uso attività esistente:', actIdField);
      activityId = actIdField;
      activityData = await db.collection('attività').findOne({ _id: new ObjectId(activityId), userId });
      if (!activityData) throw new Error('Attività non valida o non trovata');
    }
    endSaveAtt();

    // 4) Upload file su Supabase
    const upload = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!upload?.filepath) throw new Error('File menù mancante');
    const { filepath, mimetype } = upload;

    log('Chiamo file: lib/services/carta/supabaseUpload.js → supabaseUpload()');
    const endUpload = time('supabaseUpload');
    const publicUrl = await supabaseUpload(filepath, mimetype);
    endUpload();
    log('File caricato su:', publicUrl);

    // 5) OCR/estrazione testo + embedding
    log('Chiamo file: lib/services/carta/textProcessor.js → processMenuFile()');
    const endProcessMenu = time('processMenuFile');
    const { text: menuText, embedding: menuEmbedding } = await processMenuFile({
      filePath: filepath,
      fileType: mimetype
    });
    endProcessMenu();
    log('Menu estratto. Lunghezza testo:', menuText?.length, 'Embedding OK');

    // 6) Parsing piatti → features (NUOVO)
    log('Chiamo file: lib/services/menu/parseMenuToDishes.js → parseMenuToDishes()');
    const endParseDishes = time('parseMenuToDishes');
    const dishes = await parseMenuToDishes(menuText);
    endParseDishes();
    log('Piatti estratti:', dishes.length);

    // 7) Distribuzione dinamica (senza dolci)
    log('Chiamo file: lib/services/carta/distribution.js → computeWineDistribution()');
    const distribution = computeWineDistribution(dishes, 12, { allowDolci: false });
    log('Distribuzione slot:', distribution);

    // 8) Price policy (cap + min per fascia)
    log('Chiamo file: lib/services/carta/pricePolicy.js → computePricePolicy()');
    const pricePolicy = computePricePolicy({ fascia: activityData.fascia, cap: 250 });
    log('Policy prezzi applicata:', pricePolicy);

    // 9) Novità: recupero chiavi recenti per l’attività
    log('Chiamo file: lib/services/carta/noveltyPolicy.js → getRecentWineKeys()');
    const { recentIds, recentKeys, since } = await getRecentWineKeys(db, {
      attivitaId: activityId,
      lookbackCards: 3,
      cooldownDays: 30
    });
    log('Esclusioni recenti (da', since.toISOString(), '):', { ids: recentIds.length, keys: recentKeys.length });

    // 10) Retrieval ampio da Pinecone (pool)
    log('Chiamo file: lib/services/carta/wineSelection.js → processPinecone() (pool=80)');
    const endPine = time('processPinecone');
    const { topSelections: pool } = await processPinecone({
      menuEmbedding,
      selectK: 80,
      excludedIds: recentIds,   // escludi quelli usati di recente (per id)
      excludedKeys: recentKeys, // escludi per chiave canonica produttore||denominazione
      pricePolicy               // applica cap anche in pooling (server/client side)
    });
    endPine();
    log('Pool candidati ricevuto:', pool.length);

    // LOG prezzi sul POOL
    {
      const prices = pool.map(p => getPrice(p.metadata)).filter(x => x != null).sort((a,b)=>a-b);
      const overCap = prices.filter(x => x > pricePolicy.max).length;
      const belowMin = prices.filter(x => x < pricePolicy.min).length;
      const unknown = pool.length - prices.length;
      log('POOL prezzi →',
          prices.length
            ? `min: ${prices[0]} | mediana: ${prices[Math.floor(prices.length/2)]} | max: ${prices[prices.length-1]}`
            : 'nessun prezzo disponibile nei metadata');
      log('POOL fuori policy →', { overCap, belowMin, unknown });
    }

    // 11) Curazione per famiglia + compatibilità + prezzo (NUOVO)
    log('Chiamo file: lib/services/carta/compatibility.js → curateCandidates()');
    const endCurate = time('curateCandidates');
    let selected = curateCandidates(pool, dishes, distribution, pricePolicy);
    endCurate();
    log('Selezionati (pre-novità):', selected.length);

    // LOG prezzi sui SELEZIONATI (pre-novità)
    {
      const pricesS = selected.map(p => getPrice(p.metadata)).filter(x => x != null).sort((a,b)=>a-b);
      const overCapS = pricesS.filter(x => x > pricePolicy.max).length;
      const belowMinS = pricesS.filter(x => x < pricePolicy.min).length;
      const unknownS = selected.length - pricesS.length;
      log('SELECTED prezzi →',
          pricesS.length
            ? `min: ${pricesS[0]} | mediana: ${pricesS[Math.floor(pricesS.length/2)]} | max: ${pricesS[pricesS.length-1]}`
            : 'nessun prezzo disponibile nei metadata');
      log('SELECTED fuori policy →', { overCap: overCapS, belowMin: belowMinS, unknown: unknownS });
    }

    // 12) Garanzia novità minima (es. 60%)
    log('Chiamo file: lib/services/carta/noveltyPolicy.js → enforceNovelty()');
    const endNovel = time('enforceNovelty');
    const recentKeySet = new Set(recentKeys);
    selected = enforceNovelty(selected, pool, { recentKeys: recentKeySet, minNoveltyRatio: 0.6 });
    endNovel();
    {
      const noveltyPct = Math.round(
        (selected.filter(v => !recentKeySet.has(canonicalKey(v.metadata))).length / Math.max(1, selected.length)) * 100
      );
      log('Novità finale %:', `${noveltyPct}%`);
    }

    // 13) Prepara FACTS per generazione blindata
    const allowedDishNames = dishes.slice(0, 12).map(d => d.name);
    const wineFactsList = selected.map(v => {
      const md = v.metadata || {};
      const producer = md.produttore || md.cantina || '';
      const denom = md.denominazione || md.nomeVino || md.nome_completo || '';
      const grapes = md.uvaggio || md.vitigni || null;
      const region = md.regione || null;
      const country = md.paese || 'Italia';
      const family = mapWineFamily(md);
      return {
        name: producer ? `${producer} – ${denom}` : denom, // SENZA annata
        facts: { producer, denomination: denom, grapes, region, country, family },
        allowedDishes: allowedDishNames
      };
    });

    // 14) Generazione descrizioni grounded (NUOVO)
    log('Chiamo file: lib/services/carta/promptGrounded.js → generateWineExplanationsGrounded()');
    const endGen = time('generateWineExplanationsGrounded');
    const spiegazioniRaw = await generateWineExplanationsGrounded({
      context: {
        nome: activityData.nome,
        regione: activityData.regione,
        provincia: activityData.provincia,
        comune: activityData.comune,
        fascia: activityData.fascia,
        menuText
      },
      wines: wineFactsList
    });
    endGen();
    log('Descrizioni generate:', Array.isArray(spiegazioniRaw) ? spiegazioniRaw.length : 0);

    // 15) Linter anti-hallucination (NUOVO)
    log('Chiamo file: lib/services/carta/lintFacts.js → lintAndClampDescription()');
    const endLint = time('lintAndClampDescription');
    const spiegazioni = spiegazioniRaw.map((obj, i) =>
      lintAndClampDescription(obj, wineFactsList[i]?.facts)
    );
    endLint();

    // 16) Salvataggio carta
    log('Chiamo file: lib/services/carta/mongoUpload.js → saveCartaToMongo()');
    const endSave = time('saveCartaToMongo');
    const cartaId = await saveCartaToMongo({
      userId,
      userEmail: session.user.email,
      attivitaId: activityId,
      nomeLocale: activityData.nome,
      regione: activityData.regione,
      provincia: activityData.provincia,
      comune: activityData.comune,
      fascia: activityData.fascia,
      risultati: selected,
      spiegazioniJson: spiegazioni,
      fileUrl: publicUrl,
      menuText,
      menuEmbedding,
      dishes,         // NEW
      distribution,   // NEW
      pricePolicy,    // NEW (utile per audit)
      userPlan
    });
    endSave();
    log('Carta salvata con _id:', cartaId);

    return res.status(201).json({ success: true, id: cartaId });
  } catch (err) {
    console.error('[crea-carta][ERRORE]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export default withAuth(handler);
