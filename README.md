# Vídeo IA — protótipo funcional

Protótipo web para receber 5–30 fotos e gerar um MP4 vertical usando FFmpeg.

## Requisitos

- Node.js 20.9 ou superior
- npm
- FFmpeg instalado e disponível no PATH
- Memória e espaço em disco suficientes para os arquivos enviados

## Executar localmente

1. Descompacte o projeto.
2. Abra um terminal na pasta.
3. Instale dependências:

   ```bash
   npm install
   ```

4. Instale FFmpeg:
   - Windows: `winget install Gyan.FFmpeg` (depois reabra o terminal).
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt update && sudo apt install ffmpeg`

5. Confirme que está instalado:

   ```bash
   ffmpeg -version
   ```

6. Inicie:

   ```bash
   npm run dev
   ```

7. Acesse http://localhost:3000

## O que este protótipo já faz

- Interface web responsiva.
- Cadastro temporário de nome e WhatsApp no formulário.
- Upload de 5 a 30 imagens JPG, PNG ou WebP.
- Validação de formato e tamanho (12 MB por foto).
- Montagem real de vídeo MP4 vertical 1080x1920 com FFmpeg.
- Pré-visualização e download.

## Limitações deliberadas desta primeira prova

- Não há login, banco de dados, assinatura ou cobrança.
- Nome e WhatsApp ainda não são inseridos como cartelas no vídeo.
- Não há trilha musical nesta versão.
- O processamento acontece dentro da rota web e grava o MP4 em `public/generated`. Isso serve para desenvolvimento local, não para escala.
- Não é seguro publicar esta versão diretamente para clientes: faltam autenticação, limites por usuário, armazenamento privado, limpeza de arquivos, fila de renderização, proteção contra abuso e observabilidade.
- O vídeo usa uma montagem básica. A análise semântica por IA, seleção inteligente de sequência, textos comerciais e templates serão a próxima etapa.

## Próxima arquitetura de produção

1. Next.js para interface e API de controle.
2. Supabase Auth + PostgreSQL para contas, empresas, projetos e créditos.
3. Upload direto para Cloudflare R2 usando URLs assinadas.
4. Fila (Cloud Tasks) para solicitar renderização.
5. Worker Docker no Cloud Run com FFmpeg.
6. Callback autenticado atualizando o status do projeto.
7. URL assinada para baixar o vídeo final.

Nunca exponha chaves privadas do Supabase, R2 ou provedor de IA no navegador.

## Observação sobre upload

O limite de 30 fotos e 12 MB por arquivo é uma regra da aplicação. Hospedagens serverless podem impor limites menores ao corpo da requisição; em produção, o navegador deverá enviar diretamente para o armazenamento usando URLs assinadas.
