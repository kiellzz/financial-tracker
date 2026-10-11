# Landing page EZSaldo

Página estática, sem build ou dependências. O ponto de entrada é `index.html`.

## Publicação no GitHub Pages

O workflow em `.github/workflows/landing-pages.yml` publica **somente** o conteúdo de `landing/` quando há push em `master` alterando esta pasta, ou por execução manual. No repositório, em **Settings → Pages**, selecione **GitHub Actions** como origem. A URL esperada é `https://kiellzz.github.io/financial-tracker/`.

## APK no GitHub Releases

Os botões de Android apontam diretamente para `https://github.com/kiellzz/financial-tracker/releases/latest/download/EZSaldo.apk`. O link usa o arquivo `EZSaldo.apk` do release mais recente; mantenha esse nome nos próximos releases para que o botão continue funcionando. O rodapé oferece um link para a lista de releases. A landing não hospeda o APK diretamente.

Os botões da versão web apontam para `https://ezsaldo.vercel.app`.
