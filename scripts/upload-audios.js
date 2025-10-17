const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Carrega variáveis de ambiente do arquivo .env em desenvolvimento
require('dotenv').config();

// Configuração via variável de ambiente
cloudinary.config({
  secure: true
});

// Diretório dos áudios
const AUDIO_DIR = path.join(__dirname, '..', 'assets', 'audio', 'posts');

// Função para gerar hash do arquivo
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// Função para extrair ano do nome do arquivo
function extractYearFromFilename(filename) {
  // Exemplo: 2025-09-18.mp3 -> 2025
  const match = filename.match(/^(\d{4})-\d{2}-\d{2}/);
  if (match) {
    return match[1];
  }
  return null;
}

// Função para verificar se arquivo já existe no Cloudinary
async function checkIfExists(publicId) {
  try {
    await cloudinary.api.resource(publicId, { resource_type: 'video' });
    return true;
  } catch (error) {
    if (error.http_code === 404) {
      return false;
    }
    throw error;
  }
}

// Função principal de upload
async function uploadAudios() {
  const results = [];
  
  if (!fs.existsSync(AUDIO_DIR)) {
    console.log('Diretório de áudios não encontrado');
    return results;
  }

  const files = fs.readdirSync(AUDIO_DIR, { recursive: true })
    .filter(file => /\.(mp3|wav|ogg|m4a)$/i.test(file));

  console.log(`Encontrados ${files.length} arquivos de áudio`);

  for (const file of files) {
    const filePath = path.join(AUDIO_DIR, file);
    const fileName = path.basename(file);
    const fileHash = getFileHash(filePath);
    
    // Extrai o ano do nome do arquivo
    const year = extractYearFromFilename(fileName);
    
    if (!year) {
      console.warn(`⚠ Arquivo com formato inválido (esperado: YYYY-MM-DD.ext): ${fileName}`);
      results.push({ file: fileName, status: 'error', error: 'Formato de nome inválido' });
      continue;
    }
    
    // Formato: audio/2025/2025-09-18_hash
    const fileNameWithoutExt = path.parse(fileName).name;
    const publicId = `audio/${year}/${fileNameWithoutExt}_${fileHash}`;

    try {
      // Verifica se já existe
      const exists = await checkIfExists(publicId);
      
      if (exists) {
        console.log(`✓ Arquivo já existe: ${fileName} (${year})`);
        const url = cloudinary.url(publicId, { resource_type: 'video' });
        results.push({ file: fileName, year, url, status: 'exists' });
      } else {
        // Faz upload
        console.log(`↑ Uploading: ${fileName} → audio/${year}/`);
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: 'video',
          public_id: publicId,
          folder: `audio/${year}`,
          overwrite: false,
          tags: ['blog-tech', 'audio', year]
        });
        
        console.log(`✓ Upload completo: ${fileName}`);
        results.push({ file: fileName, year, url: result.secure_url, status: 'uploaded' });
      }
    } catch (error) {
      console.error(`✗ Erro em ${fileName}:`, error.message);
      results.push({ file: fileName, year, status: 'error', error: error.message });
    }
  }

  // Salva URLs em arquivo JSON para uso no Jekyll
  const outputPath = path.join(__dirname, '..', '_data', 'cloudinary-urls.json');
  const urlsData = {};
  results.forEach(r => {
    if (r.url) {
      // Usa o nome do arquivo sem extensão como chave
      const key = path.parse(r.file).name;
      urlsData[key] = {
        url: r.url,
        year: r.year
      };
    }
  });
  
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(urlsData, null, 2));
  
  console.log(`\nURLs salvas em: ${outputPath}`);
  return results;
}

uploadAudios()
  .then(results => {
    console.log('\n=== Resumo ===');
    console.log(`Total: ${results.length}`);
    console.log(`Já existentes: ${results.filter(r => r.status === 'exists').length}`);
    console.log(`Novos uploads: ${results.filter(r => r.status === 'uploaded').length}`);
    console.log(`Erros: ${results.filter(r => r.status === 'error').length}`);
    
    // Agrupa por ano
    const byYear = {};
    results.forEach(r => {
      if (r.year) {
        byYear[r.year] = (byYear[r.year] || 0) + 1;
      }
    });
    
    console.log('\n=== Por Ano ===');
    Object.entries(byYear).sort().forEach(([year, count]) => {
      console.log(`${year}: ${count} arquivo(s)`);
    });
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
