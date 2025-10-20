const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Carrega variáveis de ambiente do arquivo .env em desenvolvimento
require('dotenv').config();

// Classe de erros customizados
class CloudinaryUploadError extends Error {
  constructor(message, file, originalError) {
    super(message);
    this.name = 'CloudinaryUploadError';
    this.file = file;
    this.originalError = originalError;
  }
}

class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Validação das variáveis de ambiente
function validateEnvironment() {
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Variáveis de ambiente faltando: ${missingVars.join(', ')}\n` +
      'Configure-as no arquivo .env ou nas variáveis de ambiente do sistema.'
    );
  }
}

// Configuração via variável de ambiente
try {
  validateEnvironment();
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} catch (error) {
  console.error('❌ Erro na configuração do Cloudinary:', error.message);
  process.exit(1);
}

// Diretório dos áudios
const AUDIO_DIR = path.join(__dirname, '..', 'assets', 'audio', 'posts');

// Função para gerar hash do arquivo
function getFileHash(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  } catch (error) {
    throw new Error(`Erro ao gerar hash do arquivo ${filePath}: ${error.message}`);
  }
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

// Função para remover duplicatas do objeto JSON (segurança extra)
function removeDuplicates(urlsData) {
  const seen = new Set();
  const cleaned = {};
  
  Object.entries(urlsData).forEach(([key, value]) => {
    // Verifica se a chave já foi vista
    if (seen.has(key)) {
      console.warn(`⚠ Chave duplicada removida: ${key}`);
      return;
    }
    
    // Valida estrutura do valor
    if (value && typeof value === 'object' && value.url && value.year) {
      cleaned[key] = value;
      seen.add(key);
    } else {
      console.warn(`⚠ Entrada inválida removida: ${key}`);
    }
  });
  
  return cleaned;
}

// Função para verificar se arquivo já existe no Cloudinary
async function checkIfExists(publicId) {
  try {
    await cloudinary.api.resource(publicId, { resource_type: 'video' });
    console.log('Encontrado no Cloudinary:', publicId);
    return true;
  } catch (error) {
    // Verifica se é 404 tanto no http_code quanto na mensagem de erro
    //audio/2025/audio/2025/2025-08-20_cea269695ca84912049657479a8261fa
    if (error.http_code === 404 || (error.error && error.error.http_code === 404)) {
      console.log('Não encontrado no Cloudinary:', publicId);
      return false;
    }
    // Erros de autenticação ou rede
    if (error.http_code === 401) {
      console.error('❌ Erro de autenticação com o Cloudinary:', error.message);
      throw new ConfigurationError('Credenciais do Cloudinary inválidas');
    }
    if (error.http_code === 403) {
      console.error('❌ Acesso negado ao Cloudinary:', error.message);
      throw new ConfigurationError('Acesso negado ao Cloudinary. Verifique suas permissões.');
    }
    
    // Melhor tratamento de erros com mais informações
    const errorMessage = error.message || error.error?.message || 'Erro desconhecido';
    const httpCode = error.http_code ? ` (HTTP ${error.http_code})` : '';
    const errorDetails = error.error ? ` - ${JSON.stringify(error.error)}` : '';
    console.error(`❌ Erro ao verificar existência no Cloudinary${httpCode}: ${errorMessage}${errorDetails}`);
    throw new Error(`Erro ao verificar existência no Cloudinary${httpCode}: ${errorMessage}${errorDetails}`);
  }
}

// Função principal de upload
async function uploadAudios() {
  const results = [];
  
  try {
    if (!fs.existsSync(AUDIO_DIR)) {
      console.warn('⚠ Diretório de áudios não encontrado:', AUDIO_DIR);
      console.log('Criando diretório...');
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
      console.log('✓ Diretório criado. Nenhum arquivo para processar.');
      return results;
    }

    const files = fs.readdirSync(AUDIO_DIR, { recursive: true })
      .filter(file => /\.(mp3|wav|ogg|m4a)$/i.test(file));

    if (files.length === 0) {
      console.log('ℹ Nenhum arquivo de áudio encontrado no diretório.');
      return results;
    }

    console.log(`Encontrados ${files.length} arquivo(s) de áudio`);

    for (const file of files) {
      const filePath = path.join(AUDIO_DIR, file);
      const fileName = path.basename(file);
      
      try {
        // Verifica se o arquivo ainda existe (pode ter sido deletado durante o processamento)
        if (!fs.existsSync(filePath)) {
          throw new Error('Arquivo não encontrado');
        }

        const fileHash = getFileHash(filePath);
        
        // Extrai o ano do nome do arquivo
        const year = extractYearFromFilename(fileName);
        
        if (!year) {
          throw new Error('Formato de nome inválido (esperado: YYYY-MM-DD.ext)');
        }
        
        // Formato: audio/2025/2025-09-18_hash
        const fileNameWithoutExt = path.parse(fileName).name;
        const publicId = `audio/${year}/${fileNameWithoutExt}_${fileHash}`;

        // Verifica se já existe
        console.log(publicId);
        const exists = await checkIfExists(publicId);
        console.log(exists ? 'ⓘ' : '➤', fileName);
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
            overwrite: false,
            tags: ['blog-tech', 'audio', year]
          });
          
          console.log(`✓ Upload completo: ${fileName}`);
          results.push({ file: fileName, year, url: result.secure_url, status: 'uploaded' });
        }
      } catch (error) {
        console.error(`✗ Erro ao processar ${fileName}:`, error.message);
        
        // Se for erro de configuração, interrompe o processo
        if (error instanceof ConfigurationError) {
          throw error;
        }
        
        results.push({ 
          file: fileName, 
          status: 'error', 
          error: error.message,
          errorType: error.name 
        });
      }
    }
  } catch (error) {
    // Erros fatais que interrompem todo o processo
    if (error instanceof ConfigurationError) {
      throw error;
    }
    console.error('❌ Erro ao ler diretório de áudios:', error.message);
    throw new Error(`Erro fatal ao processar áudios: ${error.message}`);
  }

  // Salva URLs em arquivo JSON para uso no Jekyll
  try {
    const outputPath = path.join(__dirname, '..', '_data', 'cloudinary-urls.json');
    
    // Lê o arquivo JSON existente (se existir)
    let urlsData = {};
    if (fs.existsSync(outputPath)) {
      try {
        const existingData = fs.readFileSync(outputPath, 'utf8');
        const parsedData = JSON.parse(existingData);
        
        // Valida que é um objeto e não um array
        if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
          urlsData = parsedData;
          console.log(`\n📄 Arquivo JSON existente carregado: ${Object.keys(urlsData).length} registro(s)`);
        } else {
          console.warn('⚠ Arquivo JSON existente tem formato inválido. Criando novo arquivo.');
          urlsData = {};
        }
      } catch (parseError) {
        console.warn('⚠ Erro ao ler arquivo JSON existente. Criando novo arquivo.');
        urlsData = {};
      }
    }
    
    // Adiciona ou atualiza os novos resultados
    let newEntries = 0;
    let updatedEntries = 0;
    let skippedEntries = 0;
    
    results.forEach(r => {
      if (r.url) {
        // Usa o nome do arquivo sem extensão como chave
        const key = path.parse(r.file).name;
        
        // Valida a chave (não pode ser vazia ou inválida)
        if (!key || key.trim() === '') {
          console.warn(`⚠ Chave inválida para arquivo: ${r.file}`);
          return;
        }
        
        const existingEntry = urlsData[key];
        const isNew = !existingEntry;
        
        // Se já existe e é idêntico, pula
        if (existingEntry && 
            existingEntry.url === r.url && 
            existingEntry.year === r.year) {
          skippedEntries++;
          return;
        }
        
        // Adiciona ou atualiza
        urlsData[key] = {
          url: r.url,
          year: r.year
        };
        
        if (isNew) {
          newEntries++;
          console.log(`  ➕ Nova entrada: ${key}`);
        } else {
          updatedEntries++;
          console.log(`  🔄 Atualizada: ${key}`);
        }
      }
    });
    
    // Cria diretório se não existir
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Remove duplicatas e valida estrutura (segurança extra)
    urlsData = removeDuplicates(urlsData);
    
    // Salva o arquivo JSON
    fs.writeFileSync(outputPath, JSON.stringify(urlsData, null, 2), 'utf8');
    
    console.log(`\n✓ URLs salvas em: ${outputPath}`);
    console.log(`  Total de URLs: ${Object.keys(urlsData).length}`);
    console.log(`  Novas entradas: ${newEntries}`);
    console.log(`  Entradas atualizadas: ${updatedEntries}`);
    console.log(`  Entradas sem alteração: ${skippedEntries}`);
  } catch (error) {
    console.error('❌ Erro ao salvar arquivo JSON:', error.message);
    throw new Error(`Falha ao salvar URLs: ${error.message}`);
  }
  
  return results;
}

uploadAudios()
  .then(results => {
    console.log('\n=== Resumo ===');
    console.log(`Total: ${results.length}`);
    console.log(`Já existentes: ${results.filter(r => r.status === 'exists').length}`);
    console.log(`Novos uploads: ${results.filter(r => r.status === 'uploaded').length}`);
    console.log(`Erros: ${results.filter(r => r.status === 'error').length}`);
    
    // Mostra detalhes dos erros se houver
    const errors = results.filter(r => r.status === 'error');
    if (errors.length > 0) {
      console.log('\n=== Detalhes dos Erros ===');
      errors.forEach(err => {
        console.log(`  • ${err.file}: ${err.error}`);
      });
    }
    
    // Agrupa por ano
    const byYear = {};
    results.forEach(r => {
      if (r.year) {
        byYear[r.year] = (byYear[r.year] || 0) + 1;
      }
    });
    
    if (Object.keys(byYear).length > 0) {
      console.log('\n=== Por Ano ===');
      Object.entries(byYear).sort().forEach(([year, count]) => {
        console.log(`${year}: ${count} arquivo(s)`);
      });
    }
    
    // Define código de saída baseado nos resultados
    if (errors.length > 0 && errors.length === results.length) {
      console.error('\n❌ Todos os arquivos falharam no processamento');
      process.exit(1);
    } else if (errors.length > 0) {
      console.warn('\n⚠ Processo concluído com alguns erros');
      process.exit(0); // Sucesso parcial
    } else {
      console.log('\n✓ Processo concluído com sucesso!');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error.message);
    
    if (error instanceof ConfigurationError) {
      console.error('\nVerifique a configuração do Cloudinary e tente novamente.');
    } else if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  });
