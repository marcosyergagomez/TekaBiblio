# Deploy y Release Automatizado

## 1. Workflow de calidad continua
Archivo: `.github/workflows/ci.yml`

Ejecuta en push y pull request:
- lint
- typecheck
- unit tests API
- unit tests Web
- e2e API

## 2. Workflow de release
Archivo: `.github/workflows/release.yml`

Se dispara en:
- tags `v*` (ejemplo: `v1.0.0`)
- manual (`workflow_dispatch`)

Acciones:
1. Instala dependencias y valida calidad.
2. Compila API y Web.
3. Genera artifacts:
- `api-dist.tar.gz`
- `web-dist.tar.gz`
4. Publica imagenes en GHCR:
- `ghcr.io/<owner>/tekabiblio-api`
- `ghcr.io/<owner>/tekabiblio-web`
5. Si es tag, crea release de GitHub con notas automaticas.

## 3. Dockerfiles
- API: `apps/api/Dockerfile`
- Web: `apps/web/Dockerfile`

## 4. Publicar una version
1. `git tag v1.0.0`
2. `git push origin v1.0.0`
3. Revisar job `Release` en GitHub Actions.
4. Validar artifacts e imagenes publicadas.

## 5. Despliegue sugerido
- API: Render/Fly/Railway usando imagen GHCR `tekabiblio-api`.
- Web: Vercel/Netlify o contenedor `tekabiblio-web`.
- Configurar variable `VITE_API_URL` apuntando a la API publicada.
