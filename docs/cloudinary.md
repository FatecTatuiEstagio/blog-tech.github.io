# 📦 Integração com Cloudinary

Documentação completa da integração do Cloudinary para upload automático de áudios no blog.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Configuração Inicial](#configuração-inicial)
- [Script de Upload](#script-de-upload)
- [GitHub Actions](#github-actions)
- [Uso nos Posts](#uso-nos-posts)
- [Comandos Úteis](#comandos-úteis)

---

## 🎯 Visão Geral

A integração com Cloudinary permite:

- ✅ Upload automático de áudios durante o deploy
- ✅ Verificação de arquivos existentes (evita uploads duplicados)
- ✅ Organização por ano baseada na data do arquivo
- ✅ Cache via hash MD5 dos arquivos
- ✅ URLs geradas automaticamente e disponíveis no Jekyll

## 📁 Estrutura de Pastas

### Estrutura Local

```
blog-tech.github.io/
├── assets/
│   └── audio/
│       └── posts/
│           ├── 2025-09-04.mp3
│           ├── 2025-09-18.mp3
│           └── 2025-10-17.mp3
├── scripts/
│   └── upload-audios.js
├── _data/
│   └── cloudinary-urls.json (gerado automaticamente)
└── .github/
    └── workflows/
        └── deploy.yml
```

### Estrutura no Cloudinary

```
audio/
├── 2025/
│   ├── 2025-09-04_abc123.mp3
│   ├── 2025-09-18_def456.mp3
│   └── 2025-10-17_ghi789.mp3
├── 2024/
│   └── 2024-12-25_jkl012.mp3
└── 2026/
    └── 2026-01-01_mno345.mp3
```

**Padrão de Nomenclatura:**
- Arquivos locais: `YYYY-MM-DD.mp3`
- No Cloudinary: `audio/{ANO}/{YYYY-MM-DD}_{HASH}.mp3`

---

## ⚙️ Configuração Inicial

### 1. Configurar Exclusões do Jekyll

Adicione ao `_config.yml` para excluir arquivos desnecessários do build:

```yaml
exclude:
  - .sass-cache/
  - .jekyll-cache/
  - gemfiles/
  - Gemfile
  - Gemfile.lock
  - node_modules/
  - vendor/bundle/
  - vendor/cache/
  - vendor/gems/
  - vendor/ruby/
  - .vscode/
  - .git/
  - .github/
  - README.md
  - LICENSE
  - package.json
  - package-lock.json
  - tailwind.config.js
  - assets/audio/        # Áudios não vão para o site (só Cloudinary)
  - scripts/             # Scripts de build não vão para produção
  - docs/                # Documentação interna
```

> 💡 **Importante**: Os áudios ficam apenas no Cloudinary, não no GitHub Pages. Isso economiza espaço e melhora performance!

### 2. Instalar Dependências

Adicione ao `package.json`:

```json
{
  "scripts": {
    "upload-audios": "node scripts/upload-audios.js"
  },
  "dependencies": {
    "cloudinary": "^2.0.0"
  }
}
```

Execute:
```bash
npm install cloudinary
```

### 3. Configurar Secret no GitHub

1. Acesse: **Settings → Secrets and variables → Actions**
2. Adicione um novo secret:
   - Nome: `CLOUDINARY_URL`
   - Valor: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`

> 💡 Você encontra essas credenciais no [Dashboard do Cloudinary](https://cloudinary.com/console)

### 4. Criar Diretório de Áudios

```bash
mkdir -p assets/audio/posts
```

### 5. Configurar .gitignore

Adicione ao `.gitignore` para não versionar dados gerados:

```gitignore
# Data gerada automaticamente
_data/cloudinary-urls.json

# Arquivos de ambiente
.env
.env.local
```

### 6. Configurar Git LFS para Áudios (Recomendado)

Como arquivos de áudio são grandes, use **Git LFS** para versioná-los eficientemente:

```bash
# 1. Instalar Git LFS (se ainda não tiver)
# Windows: git lfs install
# Linux/Mac: sudo apt-get install git-lfs ou brew install git-lfs
git lfs install

# 2. Configurar Git LFS para rastrear arquivos de áudio
git lfs track "assets/audio/posts/*.mp3"
git lfs track "assets/audio/posts/*.wav"
git lfs track "assets/audio/posts/*.ogg"
git lfs track "assets/audio/posts/*.m4a"

# 3. Adicionar .gitattributes ao repositório
git add .gitattributes

# 4. Commit da configuração
git commit -m "Configura Git LFS para arquivos de áudio"
```

Isso criará um arquivo `.gitattributes` com:

```gitattributes
assets/audio/posts/*.mp3 filter=lfs diff=lfs merge=lfs -text
assets/audio/posts/*.wav filter=lfs diff=lfs merge=lfs -text
assets/audio/posts/*.ogg filter=lfs diff=lfs merge=lfs -text
assets/audio/posts/*.m4a filter=lfs diff=lfs merge=lfs -text
```

> ✅ **Vantagens do Git LFS**:
> - Repositório permanece leve (apenas ponteiros aos arquivos)
> - Clones e pulls são mais rápidos
> - GitHub Actions baixa os arquivos completos automaticamente
> - Ideal para arquivos > 1MB

> ⚠️ **Nota**: Os arquivos de áudio em `assets/audio/posts/` **devem** ser versionados no Git (via LFS), pois são necessários para o upload durante o GitHub Actions. Apenas o JSON gerado é ignorado.

### 7. Workflow para Adicionar Novos Áudios

**Com Git LFS configurado:**

```bash
# 1. Adicione o arquivo de áudio (Git LFS cuida do resto)
cp novo-audio.mp3 assets/audio/posts/2025-10-17.mp3

# 2. Adicione ao Git (será rastreado pelo LFS automaticamente)
git add assets/audio/posts/2025-10-17.mp3

# 3. Verifique que está usando LFS
git lfs ls-files

# 4. Commit e push normalmente
git commit -m "Adiciona áudio do post 2025-10-17"
git push
```

**Alternativa sem Git LFS** (não recomendado para arquivos > 50MB):

```bash
# Adicione diretamente (não recomendado para arquivos grandes)
git add assets/audio/posts/2025-10-17.mp3
git commit -m "Adiciona áudio do post 2025-10-17"
git push
```

> ⚠️ **Limite do GitHub**: Arquivos > 100MB **requerem** Git LFS. Arquivos > 50MB geram avisos.

---

## 🚀 Script de Upload

Crie o arquivo `scripts/upload-audios.js`:

```javascript
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
```

### Como Funciona:

1. **Lê todos os arquivos** de áudio em `assets/audio/posts/`
2. **Extrai o ano** do nome do arquivo (formato: `YYYY-MM-DD.ext`)
3. **Gera um hash MD5** para identificar versões diferentes
4. **Verifica se já existe** no Cloudinary antes de fazer upload
5. **Organiza no Cloudinary** como `audio/{ano}/{nome}_{hash}.ext`
6. **Salva as URLs** em `_data/cloudinary-urls.json` para uso no Jekyll

---

## 🔄 GitHub Actions

Crie/atualize o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main, israel ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      # 1. Checkout do código
      - name: Checkout repository
        uses: actions/checkout@v3
      
      # 2. Setup Node.js para Cloudinary
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      # 3. Instalar dependências Node
      - name: Install Node dependencies
        run: npm ci
      
      # 4. Upload de áudios para Cloudinary
      - name: Upload audio files to Cloudinary
        env:
          CLOUDINARY_URL: ${{ secrets.CLOUDINARY_URL }}
        run: npm run upload-audios
      
      # 5. Setup Ruby para Jekyll
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true
      
      # 6. Build do Jekyll com dados do Cloudinary
      - name: Build Jekyll site
        run: bundle exec jekyll build
        env:
          JEKYLL_ENV: production
      
      # 7. Deploy para GitHub Pages
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/israel'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./_site
          cname: blog-tech.github.io
```

### Fluxo de Deploy:

1. **Push/PR** → Trigger do workflow
2. **Checkout** → Baixa o código
3. **Node.js** → Instala dependências
4. **Upload** → Envia áudios novos para Cloudinary
5. **Jekyll** → Constrói o site com URLs do Cloudinary
6. **Deploy** → Publica no GitHub Pages

---

## 📝 Uso nos Posts

### Exemplo de Post com Áudio

**Arquivo:** `_posts/2025/9/2025-09-04-exemplo.markdown`

```markdown
---
layout: post
title: "Exemplo de Post com Áudio"
date: 2025-09-04 10:00:00 -0300
categories: tecnologia
tags: [exemplo, áudio]
---

Conteúdo do post aqui...

## Ouça o Áudio

{% assign audio_date = page.date | date: "%Y-%m-%d" %}
{% assign audio_data = site.data.cloudinary-urls[audio_date] %}

{% if audio_data %}
<div class="audio-player my-6 p-4 bg-gray-100 rounded-lg">
  <p class="text-sm text-gray-600 mb-2">🎧 Versão em áudio deste artigo:</p>
  <audio controls class="w-full">
    <source src="{{ audio_data.url }}" type="audio/mpeg">
    Seu navegador não suporta o elemento de áudio.
  </audio>
  <p class="text-xs text-gray-500 mt-2">Publicado em {{ audio_data.year }}</p>
</div>
{% else %}
<p class="text-sm text-gray-500 italic">Áudio não disponível para este post.</p>
{% endif %}
```

### Include Reutilizável

**Arquivo:** `_includes/audio-player.html`

```html
{% assign audio_date = include.date | default: page.date | date: "%Y-%m-%d" %}
{% assign audio_data = site.data.cloudinary-urls[audio_date] %}

{% if audio_data %}
<div class="audio-player my-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-100">
  <div class="flex items-center mb-3">
    <svg class="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
    </svg>
    <h3 class="text-sm font-semibold text-gray-700">Versão em Áudio</h3>
  </div>
  
  <audio controls class="w-full h-10">
    <source src="{{ audio_data.url }}" type="audio/mpeg">
    Seu navegador não suporta o elemento de áudio.
  </audio>
  
  <p class="text-xs text-gray-500 mt-2">
    📅 Publicado em {{ audio_data.year }}
  </p>
</div>
{% endif %}
```

**Uso no post:**

```markdown
---
layout: post
title: "Meu Post"
date: 2025-09-04
---

Conteúdo...

{% include audio-player.html %}
```

### Arquivo JSON Gerado

**Arquivo:** `_data/cloudinary-urls.json`

```json
{
  "2025-09-04": {
    "url": "https://res.cloudinary.com/yourcloud/video/upload/audio/2025/2025-09-04_abc123.mp3",
    "year": "2025"
  },
  "2025-09-18": {
    "url": "https://res.cloudinary.com/yourcloud/video/upload/audio/2025/2025-09-18_def456.mp3",
    "year": "2025"
  },
  "2025-10-17": {
    "url": "https://res.cloudinary.com/yourcloud/video/upload/audio/2025/2025-10-17_ghi789.mp3",
    "year": "2025"
  }
}
```

---

## 🛠️ Comandos Úteis

### Desenvolvimento Local

```bash
# Testar upload de áudios
npm run upload-audios

# Build Jekyll local
bundle exec jekyll build

# Servir site localmente
bundle exec jekyll serve

# Build com ambiente de produção
JEKYLL_ENV=production bundle exec jekyll build
```

### Adicionar Novo Áudio

```bash
# 1. Adicione o arquivo com o padrão de nome
cp meu-audio.mp3 assets/audio/posts/2025-10-17.mp3

# 2. Adicione ao Git (Git LFS cuida automaticamente se configurado)
git add assets/audio/posts/2025-10-17.mp3

# 3. Verifique se está rastreado pelo LFS
git lfs ls-files
# Saída esperada: assets/audio/posts/2025-10-17.mp3

# 4. Commit e push
git commit -m "Adiciona áudio do post 2025-10-17"
git push

# O GitHub Actions automaticamente fará o upload para Cloudinary no deploy
```

**Testar upload local antes do push (opcional):**

```bash
# Configure a variável de ambiente temporariamente
export CLOUDINARY_URL="cloudinary://KEY:SECRET@CLOUD"

# Teste o script
npm run upload-audios

# Verifique o JSON gerado
cat _data/cloudinary-urls.json
```

### Verificar Áudios no Cloudinary

```bash
# Instalar Cloudinary CLI (opcional)
npm install -g cloudinary-cli

# Listar áudios de 2025
cloudinary admin resources --prefix "audio/2025/" --resource_type video

# Detalhes de um áudio específico
cloudinary admin resource audio/2025/2025-09-04_abc123 --resource_type video
```

### Debugging

```bash
# Ver logs do GitHub Actions
# Acesse: https://github.com/{seu-usuario}/blog-tech.github.io/actions

# Testar script localmente com debug
node scripts/upload-audios.js

# Verificar se cloudinary-urls.json foi gerado
cat _data/cloudinary-urls.json | jq
```

---

## ⚠️ Notas Importantes

### Segurança

- ✅ **NUNCA** commite `CLOUDINARY_URL` ou credenciais
- ✅ Use **GitHub Secrets** para armazenar credenciais
- ✅ O script valida formatos de arquivo antes do upload
- ✅ Hashes previnem sobrescrever arquivos diferentes com mesmo nome

### Performance

- ⚡ Upload apenas de arquivos novos (cache via hash)
- ⚡ Verificação antes do upload economiza largura de banda
- ⚡ Cloudinary serve via CDN global
- ⚡ Arquivos de áudio **não** são incluídos no GitHub Pages (economia de espaço)
- ⚡ Site mais leve e rápido (áudios servidos via CDN)

### Limitações

- 📁 Nome do arquivo **deve** seguir padrão `YYYY-MM-DD.ext`
- 🎵 Formatos suportados: `.mp3`, `.wav`, `.ogg`, `.m4a`
- 💾 Limite do plano gratuito Cloudinary: ~25GB

### Manutenção

```bash
# Atualizar dependências
npm update cloudinary

# Verificar versão
npm list cloudinary

# Limpar cache (se necessário)
rm -rf _data/cloudinary-urls.json
npm run upload-audios
```

---

## 🎯 Checklist de Implementação

- [x] **Instalar Git LFS** (`git lfs install`)
- [x] **Configurar Git LFS** para rastrear áudios (`git lfs track "assets/audio/posts/*.mp3"`)
- [x] Adicionar exclusões no `_config.yml` (áudios, scripts, docs)
- [x] Instalar dependência `cloudinary`
- [x] Criar script `scripts/upload-audios.js`
- [x] Adicionar `CLOUDINARY_URL` nos GitHub Secrets
- [x] Criar diretório `assets/audio/posts/`
- [ ] Atualizar/criar `.github/workflows/deploy.yml`
- [ ] Criar include `_includes/audio-player.html`
- [ ] Adicionar áudio de teste (`YYYY-MM-DD.mp3`) via Git LFS
- [ ] Verificar com `git lfs ls-files`
- [ ] Commit e push da configuração inicial
- [ ] Verificar GitHub Actions executou com sucesso
- [ ] Verificar áudio no Cloudinary
- [ ] Testar player no post
- [ ] Verificar que `assets/audio/` não está no site publicado

---

## 📚 Recursos Adicionais

- [Documentação Cloudinary](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Jekyll Data Files](https://jekyllrb.com/docs/datafiles/)

---

**Última atualização:** 17 de outubro de 2025
