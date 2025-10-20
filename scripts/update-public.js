const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const CLOUDINARY_JSON_PATH = path.join(__dirname, '..', '_data', 'cloudinary-urls.json');
const POSTS_DIR = path.join(__dirname, '..', '_posts');

/**
 * Lê o arquivo cloudinary-urls.json
 * @returns {Object} Objeto com os dados do Cloudinary
 */
function readCloudinaryData() {
  try {
    if (!fs.existsSync(CLOUDINARY_JSON_PATH)) {
      throw new Error(`Arquivo não encontrado: ${CLOUDINARY_JSON_PATH}`);
    }

    const fileContent = fs.readFileSync(CLOUDINARY_JSON_PATH, 'utf8');
    const data = JSON.parse(fileContent);

    console.log('✓ Arquivo cloudinary-urls.json carregado com sucesso');
    console.log(`  Total de registros: ${Object.keys(data).length}`);

    return data;
  } catch (error) {
    console.error('❌ Erro ao ler arquivo cloudinary-urls.json:', error.message);
    throw error;
  }
}

/**
 * Extrai todas as chaves (public_id) do objeto
 * @param {Object} cloudinaryData - Dados do Cloudinary
 * @returns {Array} Array de objetos com public_id e informações relacionadas
 */
function extractPublicIds(cloudinaryData) {
  const publicIds = [];

  Object.entries(cloudinaryData).forEach(([publicId, data]) => {
    publicIds.push({
      publicId: publicId,
      url: data.url,
      year: data.year,
      // Extrai o nome do arquivo do public_id (ex: audio/2025/2025-08-20_hash -> 2025-08-20)
      fileName: extractFileNameFromPublicId(publicId)
    });
  });

  return publicIds;
}

/**
 * Extrai o nome do arquivo a partir do public_id
 * @param {string} publicId - Ex: audio/2025/2025-08-20_cea269695ca84912049657479a8261fa
 * @returns {string} Nome do arquivo sem hash - Ex: 2025-08-20
 */
function extractFileNameFromPublicId(publicId) {
  // Remove o prefixo audio/YYYY/ e o hash
  const match = publicId.match(/audio\/\d{4}\/(.+)_[a-f0-9]{32}$/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Busca todos os arquivos markdown nos posts
 * @returns {Array} Array de caminhos dos arquivos
 */
function findPostFiles() {
  const postFiles = [];

  function scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.isFile() && /\.md(own)?$/i.test(item.name)) {
        postFiles.push(fullPath);
      }
    });
  }

  scanDirectory(POSTS_DIR);
  return postFiles;
}

/**
 * Extrai a data do nome do arquivo do post
 * @param {string} filePath - Caminho do arquivo
 * @returns {string|null} Data no formato YYYY-MM-DD ou null
 */
function extractDateFromPostFile(filePath) {
  const fileName = path.basename(filePath);
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Lê o front matter de um arquivo markdown
 * @param {string} filePath - Caminho do arquivo
 * @returns {Object} Objeto com content e frontMatter
 */
function readFrontMatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Suporta tanto \n (LF) quanto \r\n (CRLF)
  const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  
  if (!frontMatterMatch) {
    return { content: content, frontMatter: '', body: content, hasFrontMatter: false };
  }
  
  return {
    content: content,
    frontMatter: frontMatterMatch[1],
    body: frontMatterMatch[2],
    hasFrontMatter: true
  };
}

/**
 * Atualiza ou adiciona o public_id no front matter
 * @param {string} frontMatter - Front matter atual
 * @param {string} publicId - Public ID a ser adicionado
 * @returns {string} Front matter atualizado
 */
function updatePublicIdInFrontMatter(frontMatter, publicId) {
  // Verifica se já existe public_id no front matter
  const publicIdRegex = /^public_id:\s*"[^"]*"$/m;
  
  if (publicIdRegex.test(frontMatter)) {
    // Atualiza o public_id existente
    return frontMatter.replace(publicIdRegex, `public_id: "${publicId}"`);
  } else {
    // Adiciona o public_id (antes da última linha ou no final)
    return frontMatter.trim() + `\npublic_id: "${publicId}"`;
  }
}

/**
 * Salva o arquivo atualizado
 * @param {string} filePath - Caminho do arquivo
 * @param {string} frontMatter - Front matter atualizado
 * @param {string} body - Corpo do post
 */
function saveUpdatedPost(filePath, frontMatter, body) {
  // Usa o mesmo separador de linha do sistema
  const newContent = `---\n${frontMatter}\n---\n${body}`;
  fs.writeFileSync(filePath, newContent, 'utf8');
}

/**
 * Atualiza um arquivo de post com o public_id
 * @param {string} postFile - Caminho do arquivo
 * @param {string} publicId - Public ID a ser adicionado
 * @returns {boolean} True se foi atualizado, false caso contrário
 */
function updatePostWithPublicId(postFile, publicId) {
  try {
    const { frontMatter, body, hasFrontMatter } = readFrontMatter(postFile);
    
    if (!hasFrontMatter) {
      console.warn(`⚠ Arquivo sem front matter: ${path.basename(postFile)}`);
      return false;
    }
    
    const updatedFrontMatter = updatePublicIdInFrontMatter(frontMatter, publicId);
    
    // Verifica se houve mudança
    if (updatedFrontMatter === frontMatter) {
      return false; // Não houve mudança
    }
    
    saveUpdatedPost(postFile, updatedFrontMatter, body);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${path.basename(postFile)}:`, error.message);
    return false;
  }
}

/**
 * Função principal
 */
function main() {
  console.log('=== Atualizador de Public IDs nos Posts ===\n');

  try {
    // Lê os dados do Cloudinary
    const cloudinaryData = readCloudinaryData();

    // Extrai os public_ids
    const publicIds = extractPublicIds(cloudinaryData);

    console.log('\n=== Public IDs Encontrados ===');
    publicIds.forEach(item => {
      console.log(`📌 ${item.fileName} -> ${item.publicId}`);
    });

    // Busca arquivos de posts
    console.log('\n=== Buscando Posts ===');
    const postFiles = findPostFiles();
    console.log(`✓ Encontrados ${postFiles.length} arquivo(s) de post\n`);

    // Mapeia posts com seus public_ids correspondentes e atualiza
    console.log('=== Atualizando Posts ===');
    const mappings = [];
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    postFiles.forEach(postFile => {
      const postDate = extractDateFromPostFile(postFile);
      const fileName = path.basename(postFile);
      
      if (!postDate) {
        console.log(`⚠ Não foi possível extrair data de: ${fileName}`);
        skippedCount++;
        return;
      }

      // Busca public_id correspondente pela data
      const matchingPublicId = publicIds.find(item => {
        // Compara a data do arquivo com a data do cloudinary
        const cloudinaryDate = cloudinaryData[item.publicId].date;
        return cloudinaryDate === postDate;
      });

      if (matchingPublicId) {
        // Atualiza o arquivo
        const wasUpdated = updatePostWithPublicId(postFile, matchingPublicId.publicId);
        
        mappings.push({
          postFile: postFile,
          postDate: postDate,
          publicId: matchingPublicId.publicId,
          url: matchingPublicId.url,
          updated: wasUpdated
        });
        
        if (wasUpdated) {
          console.log(`✓ ${fileName} -> Atualizado com public_id`);
          updatedCount++;
        } else {
          console.log(`ℹ ${fileName} -> Já possui public_id correto`);
          skippedCount++;
        }
      } else {
        console.log(`⚠ ${fileName} -> Nenhum áudio encontrado para ${postDate}`);
        notFoundCount++;
      }
    });

    console.log(`\n=== Resumo ===`);
    console.log(`Total de public_ids: ${publicIds.length}`);
    console.log(`Total de posts: ${postFiles.length}`);
    console.log(`Posts atualizados: ${updatedCount}`);
    console.log(`Posts já corretos: ${skippedCount}`);
    console.log(`Posts sem áudio: ${notFoundCount}`);
    
    if (updatedCount > 0) {
      console.log(`\n✅ ${updatedCount} post(s) atualizado(s) com sucesso!`);
    } else {
      console.log(`\n✓ Todos os posts já estão atualizados!`);
    }

    return mappings;

  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Executa o script
if (require.main === module) {
  main();
}

// Exporta funções para uso em outros scripts
module.exports = {
  readCloudinaryData,
  extractPublicIds,
  extractFileNameFromPublicId,
  findPostFiles,
  extractDateFromPostFile,
  updatePostWithPublicId,
  readFrontMatter,
  updatePublicIdInFrontMatter
};
