# 🎵 Guia Rápido: Adicionar Áudio ao Blog

## Pré-requisitos

Certifique-se de ter Git LFS instalado:

```bash
# Verificar se Git LFS está instalado
git lfs version

# Se não estiver instalado:
# Windows (com Git for Windows): já vem incluído
# Linux: sudo apt-get install git-lfs
# Mac: brew install git-lfs

# Inicializar Git LFS no repositório (apenas uma vez)
git lfs install
```

## Passo a Passo para Adicionar um Novo Áudio

### 1. Preparar o Arquivo de Áudio

```bash
# Renomeie o arquivo seguindo o padrão: YYYY-MM-DD.mp3
# Exemplo: 2025-10-17.mp3

# Copie para a pasta correta
cp seu-audio.mp3 assets/audio/posts/2025-10-17.mp3
```

### 2. Adicionar ao Git com LFS

```bash
# Adicionar o arquivo (Git LFS cuida automaticamente)
git add assets/audio/posts/2025-10-17.mp3

# Verificar que está sendo rastreado pelo LFS
git lfs ls-files

# Você deve ver algo como:
# a1b2c3d4 * assets/audio/posts/2025-10-17.mp3
```

### 3. Commit e Push

```bash
# Commit com mensagem descritiva
git commit -m "Adiciona áudio do post: [Título do Post] - 2025-10-17"

# Push para o GitHub
git push origin israel  # ou main, dependendo da sua branch
```

### 4. Verificar Deploy Automático

1. Acesse: https://github.com/FatecTatuiEstagio/blog-tech.github.io/actions
2. Verifique se o workflow "Deploy to GitHub Pages" está rodando
3. Aguarde a conclusão (ícone verde ✅)
4. O áudio será automaticamente enviado para o Cloudinary

### 5. Usar no Post

Crie ou edite seu post em `_posts/2025/10/2025-10-17-titulo-do-post.markdown`:

```markdown
---
layout: post
title: "Título do Post"
date: 2025-10-17 10:00:00 -0300
categories: tecnologia
tags: [tag1, tag2]
---

Conteúdo do post...

## Ouça o Áudio

{% include audio-player.html %}
```

## 📊 Verificações

### Verificar Status do LFS

```bash
# Ver todos os arquivos rastreados pelo LFS
git lfs ls-files

# Ver estatísticas
git lfs status
```

### Verificar Upload no Cloudinary

```bash
# Ver logs do GitHub Actions
# https://github.com/FatecTatuiEstagio/blog-tech.github.io/actions

# Ou verificar localmente (requer credenciais)
export CLOUDINARY_URL="cloudinary://KEY:SECRET@CLOUD"
npm run upload-audios
```

### Verificar JSON Gerado

Após o deploy, verifique se `_data/cloudinary-urls.json` foi gerado corretamente:

```json
{
  "2025-10-17": {
    "url": "https://res.cloudinary.com/.../2025-10-17_abc123.mp3",
    "year": "2025"
  }
}
```

## ⚠️ Solução de Problemas

### Arquivo não está sendo rastreado pelo LFS

```bash
# Re-rastrear o arquivo
git lfs track "assets/audio/posts/*.mp3"
git add .gitattributes
git add -f assets/audio/posts/2025-10-17.mp3
git commit --amend
```

### Arquivo muito grande (> 100MB)

```bash
# Git LFS é obrigatório para arquivos > 100MB
# Verifique se o arquivo está realmente usando LFS:
git lfs ls-files | grep 2025-10-17

# Se não aparecer, force o re-add:
git rm --cached assets/audio/posts/2025-10-17.mp3
git add assets/audio/posts/2025-10-17.mp3
```

### GitHub Actions falhou

1. Verifique os logs em: Actions → Workflow → Build details
2. Erros comuns:
   - `CLOUDINARY_URL` não configurado nos Secrets
   - Formato de nome de arquivo inválido (deve ser `YYYY-MM-DD.ext`)
   - Arquivo corrompido

## 📝 Checklist Rápido

- [ ] Arquivo renomeado para formato `YYYY-MM-DD.mp3`
- [ ] Arquivo copiado para `assets/audio/posts/`
- [ ] `git add` executado
- [ ] `git lfs ls-files` mostra o arquivo
- [ ] Commit feito com mensagem descritiva
- [ ] Push realizado
- [ ] GitHub Actions executou com sucesso (ícone verde)
- [ ] Post criado/atualizado com `{% include audio-player.html %}`
- [ ] Site testado localmente ou em produção

## 🚀 Atalho Completo

```bash
# Comando único para adicionar um novo áudio
cp novo-audio.mp3 assets/audio/posts/2025-10-17.mp3 && \
git add assets/audio/posts/2025-10-17.mp3 && \
git lfs ls-files && \
git commit -m "Adiciona áudio: 2025-10-17" && \
git push
```

---

**Dica**: Crie um alias no Git para facilitar:

```bash
# Adicione ao ~/.gitconfig ou execute:
git config --global alias.add-audio '!f() { \
  git add assets/audio/posts/$1 && \
  git lfs ls-files | grep $1 && \
  echo "✅ Arquivo rastreado pelo LFS!"; \
}; f'

# Uso:
git add-audio 2025-10-17.mp3
```
