// Serializa alterações do mesmo profissional nesta instância do servidor.
// Uma publicação com múltiplas instâncias precisará de coordenação no banco.
const queues = new Map();

module.exports = (handler) => async (req, res, next) => {
  const owner = req.user._id.toString();
  const previous = queues.get(owner) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  queues.set(owner, current);
  await previous;
  try {
    await handler(req, res, next);
  } finally {
    release();
    if (queues.get(owner) === current) queues.delete(owner);
  }
};
