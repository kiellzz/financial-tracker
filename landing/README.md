# Landing page EZSaldo

Página estática, sem build ou dependências. O ponto de entrada é `index.html`.

## Publicação no GitHub Pages

O workflow em `.github/workflows/landing-pages.yml` publica **somente** o conteúdo de `landing/` quando há push em `master` alterando esta pasta, ou por execução manual. No repositório, em **Settings → Pages**, selecione **GitHub Actions** como origem. A URL esperada é `https://kiellzz.github.io/financial-tracker/`.

## APK no GitHub Releases

Os botões de Android apontam para `https://github.com/kiellzz/financial-tracker/releases`. Crie um release e anexe o APK gerado em `mobile/builds/EZSaldo-v1.0.0.apk` (arquivo local, ignorado pelo Git). Assim, visitantes poderão baixá-lo em **Assets** da versão mais recente. A landing não hospeda o APK diretamente.

Os botões da versão web apontam para `https://ezsaldo.vercel.app`.
