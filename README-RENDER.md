# Vídeo IA — teste gratuito no Render

Esta versão usa Docker para instalar Node.js e FFmpeg no mesmo serviço.

## Publicar no Render

1. Envie os arquivos deste projeto para um repositório GitHub.
2. No Render, escolha **New → Web Service** e conecte o repositório.
3. Selecione **Docker** como ambiente. O Render detecta o `Dockerfile`.
4. Selecione o plano **Free** e crie o serviço.
5. Aguarde o deploy e abra o endereço `*.onrender.com` gerado.

O arquivo `render.yaml` também descreve o serviço para uso com Blueprint.

## Teste

- Envie de 5 a 30 imagens JPG, PNG ou WebP (até 12 MB por foto).
- Aguarde a geração e teste a prévia e o download do MP4.

## Limitações importantes do teste gratuito

- O serviço gratuito pode dormir após 15 minutos sem acessos e levar cerca de um minuto para acordar.
- O disco é temporário: vídeos e arquivos locais podem desaparecer quando o serviço reiniciar, dormir ou for publicado novamente.
- A instância gratuita tem 512 MB de RAM; vídeos longos ou muitas fotos podem falhar por falta de memória ou tempo.
- O vídeo gerado fica acessível no mesmo serviço até o arquivo temporário ser perdido. Não use para guardar vídeos importantes nem para atender clientes ainda.
- Esta versão não tem login, pagamentos, banco de dados, fila, armazenamento permanente, limites por usuário ou proteção de produção.

O Render documenta essas limitações em https://render.com/docs/free.
