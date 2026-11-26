export const config = {
  api: { bodyParser: false, responseLimit: false },
  maxDuration: 300,
};

export default async function workspace(req, res) {
  const { handleWorkspaceRequest } = await import('../../server.mjs');
  return handleWorkspaceRequest(req, res);
}
