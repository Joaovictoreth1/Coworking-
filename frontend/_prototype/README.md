# _prototype — mockup estático da landing (arquivado)

`landing-mockup.html` é o protótipo **vanilla JS** original da vitrine de
coworking (126 espaços de São Paulo *hardcoded*, mapa Leaflet, Tailwind via CDN).

Ele **não** consome a API (`/api`) e **não** faz parte do app React em `src/`.
Até 2026-11, ele era — por acidente — o `index.html` que o Vite usava como
entry, de modo que o `vite build` publicava este mockup e o app React nunca era
montado. O entry do Vite passou a ser o novo `frontend/index.html` (shell React).

Mantido aqui como referência de design (layout da landing, clusterização do
mapa). Não é servido nem incluído no build.
