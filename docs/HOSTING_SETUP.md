# Hosting Setup: Awaiting Account and Budget

Status: deployment package prepared; no cloud resources or public URL created.
The Dockerfile builds React and runs Flask/Waitress in one service. Local Docker
is unavailable on the current development machine; a container build on the host
must pass before this can be considered deployment-verified.

## Proposed Render Setup

This is a proposal, not permission to incur hosting charges. Review the current
dashboard price before creating the service. The existing app requires persistent
disk; Render free web services cannot supply it.

1. Sign in to Render and connect the GitHub repository TTHeang520/cutsmart.
2. Create a Web Service using Docker, branch main, Dockerfile at repository root.
3. Select a paid instance supporting disk. Keep one instance.
4. Attach a persistent disk at /data (start with 1 GB if sufficient).
5. Retain CUTSMART_ENV=production, CUTSMART_DATA_DIR=/data and HOST=0.0.0.0.
   The Docker image supplies these defaults. Render may supply PORT itself.
6. Use /api/test as the health check. No database records or local photos are
   shipped in the Docker image; the hosted database starts empty.
7. Complete the initial build, then verify HTTPS on the assigned service URL.
8. Resolve proxy client-IP handling before user invitations: current defaults
   ignore forwarded headers and could count all users in one rate-limit bucket.
   Do not set a wildcard trusted proxy merely to make this appear to work.
9. Test login, two-account isolation, photos, all logs and journey history; check
   persistence after restart and redeploy. Establish a private backup/restore path.

The default platform HTTPS URL avoids buying a custom domain initially. A custom
domain is optional. A GitHub push alone does not create this hosting service.

## Access Required

The available Render/Railway integrations report disabled-by-admin, and no hosting
CLI is installed here. The user must sign in and connect GitHub through the hosting
dashboard, or arrange an approved hosting connection. Never paste passwords,
payment details or API tokens into the handoff document or public repository.

## Sources

- https://render.com/docs/docker
- https://render.com/docs/disks
- https://render.com/docs/free
- https://render.com/pricing
