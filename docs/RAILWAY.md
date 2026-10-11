# Deploy FlagshipRouter on Railway

FlagshipRouter is a long-running Node.js server with a local SQLite database. Deploy it on Railway as a Docker service, not as a Vercel serverless build.

## Create the service

1. Create a Railway project and deploy this GitHub repository as a service.
2. Leave the service root directory at the repository root, where `Dockerfile` is located.
3. Let Railway detect and build the `Dockerfile`. Do not override the build command, start command, or output directory.
4. In the service's **Settings → Deploy**, configure the healthcheck path as `/api/health`.
5. In **Settings → Networking**, generate a public domain.
6. Add a Railway volume to this service and set its mount path to `/app/data`.
7. Set the variables below, then deploy.

```text
DATA_DIR=/app/data
INITIAL_PASSWORD=<a unique, strong dashboard password>
JWT_SECRET=<a unique random secret>
API_KEY_SECRET=<a different unique random secret>
MACHINE_ID_SALT=<another unique random secret>
AUTH_COOKIE_SECURE=true
```

Generate each secret independently and enter it only in Railway's service variables. Do not commit secrets to this repository. Keep these values stable between deploys: changing `JWT_SECRET` invalidates dashboard sessions, and changing `API_KEY_SECRET` can invalidate existing API keys.

Railway provides `PORT` at runtime; do not set a fixed `PORT` in the service variables. The Docker image binds the server to `0.0.0.0` and uses the provided port. `NODE_ENV=production` is already set by the Dockerfile.

## Important operational notes

- Keep the service at **one replica**. The app uses SQLite on a mounted volume and is not configured for multiple concurrent server instances.
- The volume at `/app/data` preserves the database and app data across deploys. Back it up before deleting or replacing the volume.
- Sign in with the `INITIAL_PASSWORD` you configured, then create an API key in the dashboard for clients using `/v1`.
- Railway volumes are attached at runtime, not during image build. Do not expect database files created during a build to persist.
