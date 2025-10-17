# Blog Mundo Tecnológico

Blog desenvolvido com Jekyll e Tailwind CSS para compartilhar conteúdo sobre tecnologia.

## 📁 Estrutura do Projeto

```
blog-tech.github.io/
│
├── _layouts/                    # Templates de layout
│   ├── default.html            # Layout base
│   ├── home.html               # Layout da página inicial
│   ├── page.html               # Layout de páginas
│   └── post.html               # Layout de posts
│
├── _includes/                   # Componentes reutilizáveis
│   ├── navbar.html             # Barra de navegação
│   ├── footer.html             # Rodapé
│   ├── head.html               # Meta tags e links
│   ├── hero.html               # Seção hero
│   ├── post-card.html          # Card de post
│   ├── search-results.html     # Resultados de busca
│   ├── results-template.html   # Template de resultados
│   ├── social.html             # Links sociais
│   └── no-linenos.html         # Configuração de código
│
├── _posts/                      # Posts do blog
│   └── 2025/
│       └── 9/
│           └── 2025-09-04-isencao-taxa-inscricao-vestibular-fatec-tatui.markdown
│
├── assets/                      # Recursos estáticos
│   ├── css/
│   │   ├── tailwind-input.css  # Input do Tailwind
│   │   └── tailwind.css        # CSS compilado do Tailwind
│   ├── image/
│   │   ├── background-image.png # Imagem de fundo
│   │   ├── cps.png             # Logo CPS
│   │   ├── fatec.png           # Logo Fatec
│   │   ├── radio.png           # Logo Rádio Notícias
│   │   └── post/               # Imagens dos posts
│   │       └── 2025/
│   │           └── 9/
│   └── js/
│       ├── cloudinary/
│       │   └── setup.js        # Configuração Cloudinary
│       └── data/
│           └── search.json     # Dados de busca
│
├── _site/                       # Site gerado (não versionado)
├── .jekyll-cache/              # Cache do Jekyll
├── node_modules/               # Dependências Node
│
├── _config.yml                 # Configuração do Jekyll
├── index.markdown              # Página inicial
├── about.markdown              # Página sobre
├── 404.html                    # Página de erro 404
├── search.json                 # JSON de busca
├── Gemfile                     # Dependências Ruby
├── package.json                # Dependências Node
├── tailwind.config.js          # Configuração Tailwind
└── README.md                   # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos
- Ruby
- Bundler
- Node.js (para Tailwind CSS)

### Instalação

1. Instale as dependências Ruby:
```bash
bundle install
```

2. Instale as dependências Node:
```bash
npm install
```

### Desenvolvimento

Execute o servidor local:
```bash
bundle exec jekyll serve
```

O site estará disponível em `http://localhost:4000`

## 🛠️ Tecnologias Utilizadas

- **Jekyll** - Gerador de sites estáticos
- **Tailwind CSS** - Framework CSS utilitário
- **Simple Jekyll Search** - Sistema de busca
- **GitHub Pages** - Hospedagem